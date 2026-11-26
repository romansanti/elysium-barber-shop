const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { sendNewAppointmentEmail } = require('../services/mail.service');
const prisma = new PrismaClient();

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (mins) => {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
};

const getAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { customer: true, barber: true, service: true },
      orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los turnos' });
  }
};

const createAppointment = async (req, res) => {
  try {
    const body = req.body || {};
    const customerInput = body.customer || {};
    const firstName = body.firstName || customerInput.firstName || customerInput.name || '';
    const lastName = body.lastName || customerInput.lastName || '';
    const whatsapp = body.whatsapp || customerInput.whatsapp || '';
    const email = body.email || customerInput.email || null;
    const barberValue = body.barberId ?? body.barber?.id;
    const serviceId = body.serviceId ?? body.service?.id;
    const date = body.appointmentDate || body.date;
    const startTime = body.startTime || body.time;
    const notes = body.notes || null;

    if (!firstName || !whatsapp || !serviceId || !date || !startTime) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para reservar el turno.' });
    }

    const service = await prisma.service.findUnique({ where: { id: parseInt(serviceId) } });
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });

    const startMins = timeToMinutes(startTime);
    const endMins = startMins + service.durationMinutes;
    const endTime = minutesToTime(endMins);
    const dateObj = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(dateObj.getTime())) return res.status(400).json({ error: 'Fecha inválida.' });
    const weekday = dateObj.getUTCDay();

    let barberId = null;
    const chooseAny = !barberValue || String(barberValue).toUpperCase() === 'ANY';

    if (chooseAny) {
      const barbers = await prisma.barber.findMany({ where: { active: true }, include: { schedules: true } });
      for (const barber of barbers) {
        const schedules = await prisma.barberSchedule.findMany({
          where: { barberId: barber.id, weekday, active: true },
        });
        const fits = schedules.some((s) => startMins >= timeToMinutes(s.startTime) && endMins <= timeToMinutes(s.endTime));
        if (!fits) continue;
        const occupied = await prisma.appointment.findMany({
          where: { barberId: barber.id, appointmentDate: dateObj, status: { in: ['PENDING', 'CONFIRMED'] } },
        });
        const free = !occupied.some((appt) => startMins < timeToMinutes(appt.endTime) && endMins > timeToMinutes(appt.startTime));
        if (free) { barberId = barber.id; break; }
      }
      if (!barberId) return res.status(409).json({ error: 'No hay un barbero disponible en ese horario.' });
    } else {
      barberId = parseInt(barberValue);
      const schedules = await prisma.barberSchedule.findMany({
        where: { barberId, weekday, active: true },
      });
      if (schedules.length === 0) return res.status(400).json({ error: 'El local permanece cerrado ese día.' });
      const fits = schedules.some((s) => startMins >= timeToMinutes(s.startTime) && endMins <= timeToMinutes(s.endTime));
      if (!fits) return res.status(400).json({ error: 'El horario elegido está fuera del horario de atención.' });

      const occupied = await prisma.appointment.findMany({
        where: { barberId, appointmentDate: dateObj, status: { in: ['PENDING', 'CONFIRMED'] } },
      });
      const conflict = occupied.some((appt) => startMins < timeToMinutes(appt.endTime) && endMins > timeToMinutes(appt.startTime));
      if (conflict) return res.status(409).json({ error: 'Ese horario ya fue ocupado. Por favor elegí otro.' });
    }

    const customer = await prisma.customer.upsert({
      where: { whatsapp },
      update: { firstName, lastName, ...(email && { email }) },
      create: { firstName, lastName, whatsapp, email },
    });

    const newAppointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        barberId,
        serviceId: parseInt(serviceId),
        appointmentDate: dateObj,
        startTime,
        endTime,
        priceSnapshot: service.price,
        durationSnapshot: service.durationMinutes,
        status: 'CONFIRMED',
        cancellationCode: crypto.randomBytes(8).toString('hex'),
        notes,
      },
      include: { customer: true, barber: { include: { user: true } }, service: true },
    });

    sendNewAppointmentEmail(newAppointment).catch((err) => console.error('Error enviando correo de turno:', err));
    res.status(201).json(newAppointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el turno.' });
  }
};

const getAvailability = async (req, res) => {
  try {
    const { barberId, serviceId, date } = req.query;

    if (!barberId || !serviceId || !date) {
      return res.status(400).json({ error: 'Faltan parámetros: barberId, serviceId o date' });
    }

    const service = await prisma.service.findUnique({ where: { id: parseInt(serviceId) } });
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });

    const dateObj = new Date(date);
    const weekday = dateObj.getUTCDay();

    const schedules = await prisma.barberSchedule.findMany({
      where: { barberId: parseInt(barberId), weekday, active: true },
      orderBy: { startTime: 'asc' },
    });

    if (schedules.length === 0) {
      return res.json({ message: 'Los domingos el local permanece cerrado.', availableSlots: [] });
    }

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        barberId: parseInt(barberId),
        appointmentDate: dateObj,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    const availableSlots = [];

    for (const schedule of schedules) {
      const startMinutes = timeToMinutes(schedule.startTime);
      const endMinutes = timeToMinutes(schedule.endTime);
      let currentSlotMinutes = startMinutes;

      while (currentSlotMinutes + service.durationMinutes <= endMinutes) {
        const slotStart = currentSlotMinutes;
        const slotEnd = currentSlotMinutes + service.durationMinutes;

        const isBooked = bookedAppointments.some((appt) => {
          const apptStart = timeToMinutes(appt.startTime);
          const apptEnd = timeToMinutes(appt.endTime);
          return slotStart < apptEnd && slotEnd > apptStart;
        });

        if (!isBooked) {
          availableSlots.push(minutesToTime(slotStart));
        }

        currentSlotMinutes += service.durationMinutes;
      }
    }

    res.json({ date, availableSlots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error calculando disponibilidad' });
  }
};

const cancelAppointmentByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { cancellationCode: code },
    });

    if (!appointment) return res.status(404).json({ error: 'Código de cancelación inválido.' });
    if (appointment.status === 'CANCELLED') return res.status(400).json({ error: 'Este turno ya fue cancelado.' });

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Turno cancelado correctamente.', appointment: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cancelar el turno.' });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Estado inválido.' });

    const updated = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el estado del turno.' });
  }
};

module.exports = {
  getAppointments,
  createAppointment,
  getAvailability,
  cancelAppointmentByCode,
  updateAppointmentStatus,
};