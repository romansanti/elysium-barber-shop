const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const barber = await prisma.barber.findFirst({ where: { displayName: 'Santi' } });
  const service = await prisma.service.findFirst({ where: { name: 'Corte Clásico' } });

  // Limpiamos turnos de prueba anteriores
  await prisma.appointment.deleteMany();

  // Creamos o reutilizamos al cliente
  const customer = await prisma.customer.upsert({
    where: { whatsapp: '+5493815555555' },
    update: {},
    create: {
      firstName: 'Juan',
      lastName: 'Pérez',
      whatsapp: '+5493815555555',
    }
  });

  // Creamos el turno para el LUNES 16 a las 10:00
  await prisma.appointment.create({
    data: {
      customerId: customer.id,
      barberId: barber.id,
      serviceId: service.id,
      appointmentDate: new Date('2026-11-16T00:00:00Z'),
      startTime: '10:00',
      endTime: '10:30',
      priceSnapshot: service.price,
      durationSnapshot: service.durationMinutes,
      status: 'CONFIRMED',
      cancellationCode: crypto.randomBytes(8).toString('hex'),
    }
  });

  console.log('¡Listo! Turno movido al lunes 16 a las 10:00.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());