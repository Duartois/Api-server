import nodemailer from 'nodemailer';

export async function sendOrderDetailsViaEmail(orderDetails) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'bichinhos.ousados@gmail.com',
    subject: `Novo Pedido Recebido - Pedido Nº ${orderDetails.id}`,
    text: `
  Novo Pedido Confirmado!\n
  🆔 Pedido Nº: ${orderDetails.id}\n
  📦 Produtos:\n${orderDetails.items.map(item => `- ${item.description}: ${item.quantity}`).join('\n')}
  💰 Total: R$ ${orderDetails.total}\n
  📍 Endereço: ${orderDetails.address}\n
  🧍 Cliente: ${orderDetails.customerName}
`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] E-mail enviado com sucesso:', info.response);
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar e-mail:', error.message);
  }
}
