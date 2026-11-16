const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendNewAppointmentEmail = async (appointment) => {
  const barberEmail = appointment.barber?.user?.email;
  if (!barberEmail) return;

  const dateStr = new Date(appointment.appointmentDate).toISOString().split('T')[0];
  const clientName = `${appointment.customer.firstName} ${appointment.customer.lastName}`;
  const subject = `Nuevo Turno en Elysium: ${clientName} (${dateStr} - ${appointment.startTime} hs)`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #111; color: #f4f4f5; padding: 24px; border-radius: 12px; border: 1px solid #27272a;">
      <h2 style="color: #f59e0b; margin-top: 0;">Nuevo Turno Reservado</h2>
      <p style="color: #d4d4d8;">Hola <strong>${appointment.barber.displayName}</strong>, tenés una nueva reserva en <strong>Elysium Barber Shop</strong>:</p>
      <div style="background: #18181b; padding: 16px; border-radius: 8px; border: 1px solid #3f3f46; line-height: 1.6;">
        <p style="margin: 4px 0;"><strong>Cliente:</strong> ${clientName}</p>
        <p style="margin: 4px 0;"><strong>WhatsApp:</strong> ${appointment.customer.whatsapp}</p>
        <p style="margin: 4px 0;"><strong>Servicio:</strong> ${appointment.service.name} ($${appointment.priceSnapshot})</p>
        <p style="margin: 4px 0;"><strong>Fecha:</strong> ${dateStr}</p>
        <p style="margin: 4px 0;"><strong>Horario:</strong> ${appointment.startTime} a ${appointment.endTime} hs</p>
        ${appointment.notes ? `<p style="margin: 4px 0; color: #fbbf24;"><strong>Nota del cliente:</strong> ${appointment.notes}</p>` : ''}
      </div>
      <p style="font-size: 12px; color: #71717a; margin-top: 16px;">Av. Juan B. Justo 2219 · San Miguel de Tucumán</p>
    </div>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[AVISO MAIL - Configurar SMTP_USER y SMTP_PASS en .env] Destinatario: ${barberEmail} | ${subject}`);
    return;
  }

  await transporter.sendMail({
    from: `"Elysium Barber Shop" <${process.env.SMTP_USER}>`,
    to: barberEmail,
    subject,
    html,
  });

  console.log(`Mail de turno enviado correctamente a ${barberEmail}`);
};

module.exports = { sendNewAppointmentEmail };
