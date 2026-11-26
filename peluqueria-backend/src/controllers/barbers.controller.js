const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Obtener todos los peluqueros activos con sus horarios
const getBarbers = async (req, res) => {
  try {
    const barbers = await prisma.barber.findMany({
      where: { active: true, user: { active: true } },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, active: true } },
        schedules: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json(barbers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los peluqueros' });
  }
};

// Actualizar un barbero
const updateBarber = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { commissionRate, displayName, active } = req.body;
    const data = {};
    if (displayName !== undefined) data.displayName = String(displayName).trim();
    if (active !== undefined) data.active = Boolean(active);
    if (commissionRate !== undefined) {
      const rate = Number(commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({ error: 'La comisión debe estar entre 0 y 100.' });
      }
      data.commissionRate = rate;
    }

    const barber = await prisma.barber.update({
      where: { id },
      data,
      include: { user: { select: { id: true, active: true, name: true, username: true } } },
    });
    if (active !== undefined) {
      await prisma.user.update({ where: { id: barber.userId }, data: { active: Boolean(active) } });
    }
    res.json(barber);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el barbero' });
  }
};

// Crear un nuevo barbero
const createBarber = async (req, res) => {
  try {
    const { name, username, password, role, commissionRate } = req.body;
    const normalizedName = String(name || '').trim();
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedName || !normalizedUsername || normalizedPassword.length < 6) {
      return res.status(400).json({ error: 'Completá nombre, usuario y una contraseña de al menos 6 caracteres.' });
    }

    const rate = Number(commissionRate ?? 50);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ error: 'La comisión debe estar entre 0 y 100.' });
    }

    const roleName = String(role || 'BARBER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'BARBER';
    const roleRecord = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: normalizedUsername }, { email: `${normalizedUsername}@peluqueria.local` }] },
    });
    if (existing) return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    const user = await prisma.user.create({
      data: {
        roleId: roleRecord.id,
        name: normalizedName,
        username: normalizedUsername,
        email: `${normalizedUsername}@peluqueria.local`,
        passwordHash,
        active: true,
        barber: {
          create: {
            displayName: normalizedName,
            commissionRate: rate,
            active: true,
          },
        },
      },
      include: { barber: true },
    });

    res.status(201).json(user.barber);
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') return res.status(409).json({ error: 'Ya existe un usuario con esos datos.' });
    res.status(500).json({ error: 'Error al crear el peluquero' });
  }
};

// Desactivar un barbero
const deactivateBarber = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const barber = await prisma.barber.findUnique({ where: { id } });
    if (!barber) return res.status(404).json({ error: 'Peluquero no encontrado.' });

    await prisma.$transaction([
      prisma.barber.update({ where: { id }, data: { active: false } }),
      prisma.user.update({ where: { id: barber.userId }, data: { active: false } }),
    ], { maxWait: 10000, timeout: 20000 });

    res.json({ message: 'Peluquero desactivado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el peluquero' });
  }
};

module.exports = { getBarbers, updateBarber, createBarber, deactivateBarber };