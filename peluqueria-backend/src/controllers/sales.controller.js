const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const transactionOptions = { maxWait: 10000, timeout: 20000 };

// Listar todas las ventas con su detalle
const getSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        customer: true,
        barber: true,
        appointment: true,
        items: {
          include: {
            product: true,
            service: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las ventas' });
  }
};

// Registrar un cobro (servicios y/o productos/bebidas)
const createSale = async (req, res) => {
  try {
    const { barberId, customerId, appointmentId, items, payments } = req.body;

    if (!barberId || !Array.isArray(items) || items.length === 0 || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'Faltan datos obligatorios (barberId, items o payments).' });
    }

    const sale = await prisma.$transaction(async (tx) => {
      let total = 0;
      const preparedItems = [];
      const barber = await tx.barber.findFirst({
        where: { id: parseInt(barberId), active: true, user: { active: true } },
      });
      if (!barber) throw new Error('Barbero no encontrado o inactivo.');

      for (const item of items) {
        const quantity = parseInt(item.quantity) || 1;
        const itemType = String(item.itemType || '').toUpperCase();

        if (itemType === 'SERVICE') {
          const service = await tx.service.findUnique({ where: { id: parseInt(item.serviceId) } });
          if (!service) throw new Error(`Servicio ID ${item.serviceId} no encontrado.`);
          const unitPrice = Number(service.price);
          const subtotal = unitPrice * quantity;
          const commissionAmount = subtotal * (Number(barber.commissionRate) || 0) / 100;
          total += subtotal;
          preparedItems.push({ itemType: 'SERVICE', serviceId: service.id, description: service.name, quantity, unitPrice, subtotal, commissionAmount });
        } else if (itemType === 'PRODUCT' || itemType === 'BEVERAGE') {
          const product = await tx.product.findUnique({ where: { id: parseInt(item.productId) } });
          if (!product) throw new Error(`Producto/Bebida ID ${item.productId} no encontrado.`);
          if (product.stock < quantity) throw new Error(`Stock insuficiente para ${product.name} (disponible: ${product.stock}).`);

          await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: quantity } } });
          await tx.stockMovement.create({ data: { productId: product.id, type: 'OUT', quantity, reason: 'Venta en caja' } });

          const unitPrice = Number(product.price);
          const subtotal = unitPrice * quantity;
          const commissionAmount = subtotal * (Number(product.commissionRate) || 0) / 100;
          total += subtotal;
          preparedItems.push({
            itemType: product.itemGroup || itemType,
            productId: product.id,
            description: product.name,
            quantity,
            unitPrice,
            subtotal,
            commissionAmount,
          });
        } else {
          throw new Error('Tipo de ítem inválido. Debe ser SERVICE, PRODUCT o BEVERAGE.');
        }
      }

      const preparedPayments = payments.map((p) => ({ method: String(p.method).toUpperCase(), amount: Number(p.amount) }));
      const createdSale = await tx.sale.create({
        data: {
          barberId: parseInt(barberId),
          customerId: customerId ? parseInt(customerId) : null,
          appointmentId: appointmentId ? parseInt(appointmentId) : null,
          total,
          status: 'COMPLETED',
          items: { create: preparedItems },
          payments: { create: preparedPayments },
        },
        include: { items: true, payments: true, customer: true, barber: true },
      });

      if (appointmentId) {
        await tx.appointment.update({ where: { id: parseInt(appointmentId) }, data: { status: 'COMPLETED' } });
      }
      return createdSale;
    }, transactionOptions);

    res.status(201).json(sale);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Error al registrar la venta.' });
  }
};

const deleteSale = async (req, res) => {
  try {
    const saleId = Number(req.params.id);

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        if ((item.itemType === 'PRODUCT' || item.itemType === 'BEVERAGE') && item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity,
              reason: `Anulación de venta #${saleId}`
            }
          });
        }
      }

      await tx.payment.deleteMany({ where: { saleId } });
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.sale.delete({ where: { id: saleId } });
    }, transactionOptions);

    res.json({ message: 'Venta anulada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al anular la venta' });
  }
};

module.exports = {
  getSales,
  createSale,
  deleteSale
};