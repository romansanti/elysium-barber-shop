const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Configurando horarios de trabajo...');

  // Buscamos tu perfil de peluquero
  const barber = await prisma.barber.findFirst({
    where: { displayName: 'Santi' }
  });

  if (!barber) {
    console.log('Error: No se encontró al peluquero Santi.');
    return;
  }

  // Limpiamos horarios viejos por las dudas
  await prisma.barberSchedule.deleteMany({
    where: { barberId: barber.id }
  });

  // Días de Lunes (1) a Viernes (5)
  const dias = [1, 2, 3, 4, 5];
  const horarios = dias.map(dia => ({
    barberId: barber.id,
    weekday: dia,
    startTime: '09:00',
    endTime: '18:00',
    active: true
  }));

  // Guardamos los horarios en la base de datos
  await prisma.barberSchedule.createMany({
    data: horarios
  });

  console.log('¡Horarios asignados con éxito! Ya podés recibir clientes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });   