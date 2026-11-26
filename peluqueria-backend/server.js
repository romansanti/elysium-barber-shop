const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { syncCatalogDefaults } = require('./src/services/catalogSync.service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Importar rutas y middlewares
const authRoutes = require('./src/routes/auth.routes');
const servicesRoutes = require('./src/routes/services.routes');
const barbersRoutes = require('./src/routes/barbers.routes');
const appointmentsRoutes = require('./src/routes/appointments.routes');
const productsRoutes = require('./src/routes/products.routes');
const salesRoutes = require('./src/routes/sales.routes');
const operationsRoutes = require('./src/routes/operations.routes');
const { verifyToken } = require('./src/middlewares/auth.middleware');

// Usar rutas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/barbers', barbersRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/sales', verifyToken, salesRoutes); // Ruta protegida: solo con login
app.use('/api/v1', operationsRoutes);

// Ruta de estado
app.get('/', (req, res) => {
  res.send('¡API de la Peluquería funcionando!');
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  const syncPrisma = new PrismaClient();
  syncCatalogDefaults(syncPrisma, { force: false, createMissing: false })
    .then((result) => {
      if (result.updatedServices.length || result.deactivatedBarbers.length) {
        console.log('Catálogo sincronizado al iniciar:', JSON.stringify(result));
      }
    })
    .catch((error) => console.warn('Aviso: no se pudo sincronizar el catálogo al iniciar:', error.message))
    .finally(() => syncPrisma.$disconnect());
});