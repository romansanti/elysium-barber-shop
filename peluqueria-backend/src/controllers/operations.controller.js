const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const transactionOptions = { maxWait: 10000, timeout: 20000 };

const validMethods = ['CASH', 'TRANSFER', 'QR', 'SOCIOS'];

const getCashMovements = async (req, res) => {
  try {
    const { date } = req.query;
    let where = {};
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      where.createdAt = { gte: start, lt: end };
    }
    const movements = await prisma.cashMovement.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener movimientos de caja' });
  }
};

const createCashMovement = async (req, res) => {
  try {
    const { type, category, description, amount, paymentMethod, barberId, registeredBy } = req.body;
    const normalizedAmount = Number(amount);
    const normalizedBarberId = barberId ? Number(barberId) : null;
    if (!['INCOME', 'EXPENSE'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
    if (!validMethods.includes(String(paymentMethod).toUpperCase())) return res.status(400).json({ error: 'Medio de pago inválido' });
    if (!category || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return res.status(400).json({ error: 'Datos de movimiento incompletos' });

    const isAdvance = type === 'EXPENSE' && String(category).toLowerCase() === 'adelanto';
    if (isAdvance) {
      if (!normalizedBarberId) return res.status(400).json({ error: 'El adelanto requiere seleccionar un peluquero.' });
      const barber = await prisma.barber.findFirst({ where: { id: normalizedBarberId, active: true, user: { active: true } } });
      if (!barber) return res.status(400).json({ error: 'Peluquero no válido o desactivado.' });
    }

    const movement = await prisma.cashMovement.create({
      data: {
        type,
        category,
        description: description || null,
        amount: normalizedAmount,
        paymentMethod: String(paymentMethod).toUpperCase(),
        barberId: isAdvance ? normalizedBarberId : normalizedBarberId,
        settled: false,
        settlementId: null,
      },
    });
    res.status(201).json(movement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar movimiento de caja' });
  }
};

const deleteCashMovement = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.cashMovement.delete({ where: { id } });
    res.json({ message: 'Movimiento eliminado' });
  } catch (error) {
    res.status(404).json({ error: 'Movimiento no encontrado' });
  }
};

const getPendingSettlement = async (req, res) => {
  try {
    const barberId = Number(req.params.barberId);
    const sales = await prisma.sale.findMany({
      where: { barberId, settled: false, status: 'COMPLETED' },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'asc' },
    });
    const advances = await prisma.cashMovement.findMany({
      where: { barberId, type: 'EXPENSE', category: 'Adelanto', settled: false },
      orderBy: { createdAt: 'asc' },
    });

    const barber = await prisma.barber.findUnique({ where: { id: barberId } });
    const commissionRate = Number(barber?.commissionRate ?? 100);
    const byDate = {};
    for (const sale of sales) {
      const date = sale.createdAt.toISOString().slice(0, 10);
      if (!byDate[date]) byDate[date] = { date, sales: 0, grossAmount: 0, commissionAmount: 0, servicesCount: 0 };
      byDate[date].sales += 1;
      for (const item of sale.items) {
        if (item.itemType === 'SERVICE') {
          const serviceAmount = Number(item.subtotal || 0);
          byDate[date].grossAmount += serviceAmount;
          byDate[date].commissionAmount += Number(item.commissionAmount || 0) > 0
            ? Number(item.commissionAmount)
            : serviceAmount * commissionRate / 100;
          byDate[date].servicesCount += Number(item.quantity || 1);
        }
      }
    }

    res.json({
      barberId,
      days: Object.values(byDate),
      advances,
      totalAdvances: advances.reduce((sum, a) => sum + Number(a.amount), 0),
      advancesDeducted: advances.reduce((sum, a) => sum + Number(a.amount), 0),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener liquidación pendiente' });
  }
};

const createSettlement = async (req, res) => {
  try {
    const { barberId, selectedDates, selectedAdvanceIds } = req.body;
    if (!barberId || !Array.isArray(selectedDates) || selectedDates.length === 0) {
      return res.status(400).json({ error: 'barberId y selectedDates son obligatorios' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const sales = await tx.sale.findMany({
        where: { barberId: Number(barberId), settled: false, status: 'COMPLETED' },
        include: { items: true },
      });
      const selectedSet = new Set(selectedDates);
      const selectedSales = sales.filter((sale) => selectedSet.has(sale.createdAt.toISOString().slice(0, 10)));

      const barber = await tx.barber.findUnique({ where: { id: Number(barberId) } });
      const commissionRate = Number(barber?.commissionRate ?? 100);
      let servicesCount = 0;
      let grossAmount = 0;
      let commissionAmount = 0;
      for (const sale of selectedSales) {
        for (const item of sale.items) {
          if (item.itemType === 'SERVICE') {
            const serviceAmount = Number(item.subtotal || 0);
            grossAmount += serviceAmount;
            commissionAmount += Number(item.commissionAmount || 0) > 0
              ? Number(item.commissionAmount)
              : serviceAmount * commissionRate / 100;
            servicesCount += Number(item.quantity || 1);
          }
        }
      }

      const advanceIds = Array.isArray(selectedAdvanceIds)
        ? selectedAdvanceIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
        : [];
      const advances = advanceIds.length
        ? await tx.cashMovement.findMany({
            where: { id: { in: advanceIds }, barberId: Number(barberId), type: 'EXPENSE', category: 'Adelanto', settled: false },
          })
        : [];
      const advancesDeducted = advances.reduce((sum, advance) => sum + Number(advance.amount), 0);

      const settlement = await tx.settlement.create({
        data: {
          barberId: Number(barberId),
          dateFrom: selectedDates.slice().sort()[0],
          dateTo: selectedDates.slice().sort().at(-1),
          servicesCount,
          grossAmount,
          commissionAmount,
          advancesDeducted,
          netPaid: commissionAmount - advancesDeducted,
        },
      });

      for (const sale of selectedSales) {
        await tx.sale.update({ where: { id: sale.id }, data: { settled: true, settlementId: settlement.id } });
        await tx.saleItem.updateMany({ where: { saleId: sale.id }, data: { settled: true, settlementId: settlement.id } });
      }
      if (advances.length) {
        await tx.cashMovement.updateMany({
          where: { id: { in: advances.map((a) => a.id) } },
          data: { settled: true, settlementId: settlement.id },
        });
      }
      return settlement;
    }, transactionOptions);

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la liquidación' });
  }
};

const securityDefaults = [
  ['EDIT_CASH', 'Editar caja'],
  ['DELETE_CASH', 'Eliminar movimiento'],
  ['EDIT_ITEM_COMMISSION', 'Editar comisión de ítem'],
  ['SETTLE_PAYMENT', 'Liquidar pago'],
  ['APPLY_DISCOUNT', 'Aplicar descuento'],
];

const getSecurityPins = async (req, res) => {
  try {
    for (const [actionKey, label] of securityDefaults) {
      await prisma.securityPin.upsert({
        where: { actionKey },
        update: {},
        create: { actionKey, label, pin: null },
      });
    }
    res.json(await prisma.securityPin.findMany({ orderBy: { actionKey: 'asc' } }));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener PINs' });
  }
};

const updateSecurityPin = async (req, res) => {
  try {
    const { actionKey } = req.params;
    const { pin } = req.body;
    if (pin !== null && (!/^\d{4}$/.test(String(pin)))) {
      return res.status(400).json({ error: 'El PIN debe tener exactamente 4 dígitos' });
    }
    const defaultLabel = securityDefaults.find(([key]) => key === actionKey)?.[1] || actionKey;
    const record = await prisma.securityPin.upsert({
      where: { actionKey },
      update: { pin: pin === null ? null : String(pin) },
      create: { actionKey, label: defaultLabel, pin: pin === null ? null : String(pin) },
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar PIN' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ include: { items: true, customer: true } });
    const appointments = await prisma.appointment.findMany({ where: { status: { in: ['CONFIRMED', 'COMPLETED'] } } });

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const breakdown = { services: 0, products: 0, beverages: 0 };
    for (const sale of sales) {
      for (const item of sale.items) {
        const amount = Number(item.subtotal);
        if (item.itemType === 'SERVICE') breakdown.services += amount;
        else if (item.itemType === 'BEVERAGE') breakdown.beverages += amount;
        else breakdown.products += amount;
      }
    }

    const customerSaleCounts = {};
    for (const sale of sales) {
      if (sale.customerId) customerSaleCounts[sale.customerId] = (customerSaleCounts[sale.customerId] || 0) + 1;
    }
    const customerIds = Object.keys(customerSaleCounts);
    const newCustomers = customerIds.filter((id) => customerSaleCounts[id] === 1).length;
    const frequentCustomers = customerIds.filter((id) => customerSaleCounts[id] > 1).length;

    const hours = {};
    for (const appointment of appointments) {
      const hour = appointment.startTime.slice(0, 2);
      hours[hour] = (hours[hour] || 0) + 1;
    }
    const mostDemandedHours = Object.entries(hours).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hour, count]) => ({ hour: `${hour}:00`, count }));

    res.json({
      totalRevenue,
      breakdown,
      averageTicket: sales.length ? totalRevenue / sales.length : 0,
      customersAttended: { new: newCustomers, frequent: frequentCustomers },
      mostDemandedHours,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular analytics' });
  }
};

module.exports = {
  getCashMovements,
  createCashMovement,
  deleteCashMovement,
  getPendingSettlement,
  createSettlement,
  getSecurityPins,
  updateSecurityPin,
  getAnalytics,
};
