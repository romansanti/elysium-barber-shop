const { PrismaClient } = require('@prisma/client');
const { syncCatalogDefaults } = require('../src/services/catalogSync.service');

const prisma = new PrismaClient();

async function main() {
  console.log('Sincronizando imágenes de servicios y peluqueros activos en la base de datos...');
  const result = await syncCatalogDefaults(prisma, { force: true, createMissing: false });
  console.log('Resultado:', JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error('Error sincronizando TiDB/DB:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
