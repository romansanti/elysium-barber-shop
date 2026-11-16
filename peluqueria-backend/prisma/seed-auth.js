const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.update({
    where: { email: 'admin@peluqueria.com' },
    data: { passwordHash }
  });

  console.log('¡Contraseña encriptada lista! (Email: admin@peluqueria.com | Clave: admin123)');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());