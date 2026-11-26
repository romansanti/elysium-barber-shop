const { PrismaClient } = require('@prisma/client');
const { findServiceConfig, syncCatalogDefaults } = require('../services/catalogSync.service');
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
    if (!name || price === undefined || !durationMinutes) {
      return res.status(400).json({ error: 'Nombre, precio y duración son obligatorios.' });
    }
    const defaultConfig = findServiceConfig(name);
    const service = await prisma.service.create({
      data: {
        name,
        description: description || '',
        price: Number(price),
        durationMinutes: parseInt(durationMinutes),
        imageUrl: defaultConfig?.imageUrl || null,
      }
    });
    res.status(201).json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el servicio.' });
  }
};

const syncDefaultServices = async (req, res) => {
  try {
    const result = await syncCatalogDefaults(prisma, { force: true, createMissing: false });
    res.json({ message: 'Catálogo sincronizado correctamente', ...result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al sincronizar los servicios por defecto.' });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, durationMinutes, active, isActive } = req.body;
    const existing = await prisma.service.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Servicio no encontrado.' });

    const effectiveName = name !== undefined ? String(name).trim() : existing.name;
    const defaultConfig = findServiceConfig(effectiveName);
    const updated = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: effectiveName }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(durationMinutes !== undefined && { durationMinutes: parseInt(durationMinutes) }),
        ...(defaultConfig && { imageUrl: defaultConfig.imageUrl }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(isActive !== undefined && { active: Boolean(isActive) })
      }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el servicio.' });
  }
};

const deleteService = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [appointments, salesItems] = await Promise.all([
      prisma.appointment.count({ where: { serviceId: id } }),
      prisma.saleItem.count({ where: { serviceId: id } }),
    ]);

    if (appointments > 0 || salesItems > 0) {
      const updated = await prisma.service.update({ where: { id }, data: { active: false } });
      return res.json({ message: 'Servicio desactivado porque tiene turnos o ventas asociadas', service: updated });
    }

    await prisma.service.delete({ where: { id } });
    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Servicio no encontrado' });
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
};

module.exports = { getServices, createService, updateService, deleteService, syncDefaultServices };