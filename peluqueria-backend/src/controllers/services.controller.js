const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { id: 'asc' }
    });
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los servicios' });
  }
};

const createService = async (req, res) => {
  try {
    const { name, description, price, durationMinutes } = req.body;
    if (!name || !price || !durationMinutes) {
      return res.status(400).json({ error: 'Nombre, precio y duración son obligatorios.' });
    }
    const service = await prisma.service.create({
      data: {
        name,
        description: description || '',
        price: Number(price),
        durationMinutes: parseInt(durationMinutes)
      }
    });
    res.status(201).json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el servicio.' });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, durationMinutes, active } = req.body;
    const updated = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(durationMinutes !== undefined && { durationMinutes: parseInt(durationMinutes) }),
        ...(active !== undefined && { active })
      }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el servicio.' });
  }
};

module.exports = { getServices, createService, updateService };