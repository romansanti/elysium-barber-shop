const { PrismaClient } = require('@prisma/client');
const { syncCatalogDefaults } = require('../src/services/catalogSync.service');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de datos...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  await prisma.role.upsert({
    where: { name: 'BARBER' },
    update: {},
    create: { name: 'BARBER' },
  });

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

  await syncCatalogDefaults(prisma, { force: true, createMissing: true });

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