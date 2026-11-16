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

module.exports = {
  getBarbers
};