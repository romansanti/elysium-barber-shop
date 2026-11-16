const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  const barberRole = await prisma.role.upsert({
    where: { name: 'BARBER' },
    update: {},
    create: { name: 'BARBER' },
  });

  const elysiumSchedules = [
    ...[1, 2, 3, 4, 5].flatMap((weekday) => [
      { weekday, startTime: '10:00', endTime: '13:00', active: true },
      { weekday, startTime: '17:00', endTime: '21:00', active: true },
    ]),
    { weekday: 6, startTime: '10:00', endTime: '20:00', active: true },
  ];

  const marcosPass = await bcrypt.hash('admin32', 10);
  let marcosBarber = await prisma.barber.findFirst({ where: { id: 1 } });

  if (marcosBarber) {
    await prisma.user.update({
      where: { id: marcosBarber.userId },
      data: {
        name: 'Marcos Mayo',
        username: 'marcosmayo23',
        email: 'mayomarcosfabian@gmail.com',
        passwordHash: marcosPass,
      },
    });
    marcosBarber = await prisma.barber.update({
      where: { id: marcosBarber.id },
      data: { displayName: 'Marcos Mayo', commissionRate: 100, active: true },
    });
  } else {
    const marcosUser = await prisma.user.create({
      data: {
        name: 'Marcos Mayo',
        username: 'marcosmayo23',
        email: 'mayomarcosfabian@gmail.com',
        passwordHash: marcosPass,
        roleId: adminRole.id,
        barber: { create: { displayName: 'Marcos Mayo', commissionRate: 100 } },
      },
      include: { barber: true },
    });
    marcosBarber = marcosUser.barber;
  }

  const gonzaloPass = await bcrypt.hash('gonzabatalla32', 10);
  let gonzaloUser = await prisma.user.findFirst({
    where: { OR: [{ username: 'gonzabatalla23' }, { email: 'gonzabatalla131223@icloud.com' }] },
    include: { barber: true },
  });

  let gonzaloBarber;
  if (gonzaloUser?.barber) {
    await prisma.user.update({
      where: { id: gonzaloUser.id },
      data: {
        name: 'Gonzalo Batalla',
        username: 'gonzabatalla23',
        email: 'gonzabatalla131223@icloud.com',
        passwordHash: gonzaloPass,
      },
    });
    gonzaloBarber = await prisma.barber.update({
      where: { id: gonzaloUser.barber.id },
      data: { displayName: 'Gonzalo Batalla', commissionRate: 50, active: true },
    });
  } else {
    gonzaloUser = await prisma.user.create({
      data: {
        name: 'Gonzalo Batalla',
        username: 'gonzabatalla23',
        email: 'gonzabatalla131223@icloud.com',
        passwordHash: gonzaloPass,
        roleId: barberRole.id,
        barber: { create: { displayName: 'Gonzalo Batalla', commissionRate: 50 } },
      },
      include: { barber: true },
    });
    gonzaloBarber = gonzaloUser.barber;
  }

  await prisma.barberSchedule.deleteMany({
    where: { barberId: { in: [marcosBarber.id, gonzaloBarber.id] } },
  });

  for (const barber of [marcosBarber, gonzaloBarber]) {
    await prisma.barberSchedule.createMany({
      data: elysiumSchedules.map((s) => ({ ...s, barberId: barber.id })),
    });
  }

  console.log('¡Elysium listo!');
  console.log('Marcos: usuario marcosmayo23 | clave admin32 | mail mayomarcosfabian@gmail.com');
  console.log('Gonzalo: usuario gonzabatalla23 | clave gonzabatalla32 | mail gonzabatalla131223@icloud.com');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
