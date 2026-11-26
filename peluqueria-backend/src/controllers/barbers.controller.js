const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Obtener todos los peluqueros activos con sus horarios
const getBarbers = async (req, res) => {
  try {
    const barbers = await prisma.barber.findMany({
      where: { active: true },
      include: {
        user: { 
          select: { name: true, email: true } // Traemos nombre y email del usuario
        },
        schedules: true // Traemos la agenda de horarios de este peluquero
      }
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
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) return res.status(400).json({ error: 'La comisión debe estar entre 0 y 100.' });
      data.commissionRate = rate;
    }
    const barber = await prisma.barber.update({ where: { id }, data });
    res.json(barber);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el barbero' });
  }
};

module.exports = {
  getBarbers,
  updateBarber
};