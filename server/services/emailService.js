const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

async function sendDealAlert(toEmail, deals) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Email not configured, skipping notification');
    return;
  }

  const dealRows = deals.map(d =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${d.keyword}</td>
      <td style="padding:8px;border-bottom:1px solid #eee"><a href="${d.link}">${d.title}</a></td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:#16a34a;font-weight:bold">
        ${d.price ? '$' + d.price.toFixed(2) : 'See deal'}
      </td>
    </tr>`
  ).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#4361ee">Discount Tracker Alert</h2>
      <p>We found ${deals.length} deal(s) matching your watchlist:</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f0f0f0">
          <th style="padding:8px;text-align:left">Keyword</th>
          <th style="padding:8px;text-align:left">Deal</th>
          <th style="padding:8px;text-align:left">Price</th>
        </tr>
        ${dealRows}
      </table>
      <p style="margin-top:16px;color:#666;font-size:12px">
        Sent by Discount Tracker. Manage your watchlist in the app.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: `Discount Alert: ${deals.length} deal(s) match your watchlist`,
    html,
  });

  console.log(`Email sent to ${toEmail} with ${deals.length} deals`);
}

module.exports = { sendDealAlert };
