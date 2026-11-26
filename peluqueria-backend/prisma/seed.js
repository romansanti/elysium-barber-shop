const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de datos...');

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

  const legacySantis = await prisma.barber.findMany({ where: { displayName: 'Santi' }, select: { id: true, userId: true } });
  for (const legacy of legacySantis) {
    await prisma.$transaction([
      prisma.barber.update({ where: { id: legacy.id }, data: { active: false } }),
      prisma.user.update({ where: { id: legacy.userId }, data: { active: false } }),
    ], { maxWait: 10000, timeout: 20000 });
  }

  const ownerUser = await prisma.user.findFirst({
    where: { OR: [{ username: 'marcosmayo23' }, { email: 'mayomarcosfabian@gmail.com' }, { email: 'admin@peluqueria.com' }] },
  }).then((existing) => existing
    ? prisma.user.update({
        where: { id: existing.id },
        data: {
          name: 'Marcos Mayo',
          username: 'marcosmayo23',
          email: 'mayomarcosfabian@gmail.com',
          roleId: adminRole.id,
          active: true,
        },
      })
    : prisma.user.create({
        data: {
          roleId: adminRole.id,
          name: 'Marcos Mayo',
          username: 'marcosmayo23',
          email: 'mayomarcosfabian@gmail.com',
          passwordHash: 'hashed_password_123',
          active: true,
        },
      }));

  await prisma.barber.upsert({
    where: { userId: ownerUser.id },
    update: { displayName: 'Marcos Mayo', commissionRate: 100, active: true },
    create: { userId: ownerUser.id, displayName: 'Marcos Mayo', commissionRate: 100, active: true },
  });

  await prisma.service.upsert({
    where: { id: 1 },
    update: { imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80' },
    create: {
      name: 'Corte Clásico',
      description: 'Corte tradicional a tijera o máquina',
      price: 6000,
      durationMinutes: 30,
      imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
    },
  });
  await prisma.service.upsert({
    where: { id: 2 },
    update: { imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80' },
    create: {
      name: 'Corte + Barba',
      description: 'Corte con perfilado de barba',
      price: 8000,
      durationMinutes: 45,
      imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80',
    },
  });
  await prisma.service.upsert({
    where: { id: 3 },
    update: { imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80' },
    create: {
      name: 'Corte niño',
      description: 'Corte infantil',
      price: 5000,
      durationMinutes: 30,
      imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    },
  });

  await prisma.productCategory.findFirst().then(async (category) => {
    if (!category) await prisma.productCategory.create({ data: { name: 'Bebidas' } });
  });

  console.log('¡Datos cargados sin crear el peluquero Santi!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());