const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de datos...');

  // 1. Crear Roles
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

  // 2. Crear el Usuario Dueño (Admin)
  const ownerUser = await prisma.user.upsert({
    where: { email: 'admin@peluqueria.com' },
    update: {},
    create: {
      roleId: adminRole.id,
      name: 'Santiago (Dueño)',
      email: 'admin@peluqueria.com',
      passwordHash: 'hashed_password_123', // Después le meteremos bcrypt
      active: true,
    },
  });

  // 3. Crear el perfil de Peluquero para el dueño
  await prisma.barber.upsert({
    where: { userId: ownerUser.id },
    update: {},
    create: {
      userId: ownerUser.id,
      displayName: 'Santi',
      active: true,
    },
  });

  // 4. Crear Servicios (Cortes)
  await prisma.service.createMany({
    data: [
      { name: 'Corte Clásico', description: 'Corte tradicional a tijera o máquina', price: 6000, durationMinutes: 30 },
      { name: 'Corte + Barba', description: 'Corte con perfilado de barba', price: 8000, durationMinutes: 45 },
    ],
    skipDuplicates: true,
  });

  // 5. Crear Categoría y Producto (Bebidas)
  const category = await prisma.productCategory.create({
    data: { name: 'Bebidas' },
  });

  await prisma.product.create({
    data: {
      categoryId: category.id,
      name: 'Cerveza Corona',
      price: 2500,
      costPrice: 1200,
      stock: 24,
      minStock: 6,
    },
  });

  console.log('¡Datos de prueba cargados con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });