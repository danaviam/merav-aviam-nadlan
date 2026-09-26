import nodemailer from 'nodemailer';
import type { ContactMessage } from '../shared/types.js';

const enabled = Boolean(process.env.SMTP_HOST && process.env.NOTIFY_EMAIL);

const transporter = enabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

export async function notifyNewMessage(msg: ContactMessage) {
  if (!transporter) return;
  const lines = [
    `שם: ${msg.name}`,
    msg.phone && `טלפון: ${msg.phone}`,
    msg.email && `אימייל: ${msg.email}`,
    msg.propertyTitle && `נכס: ${msg.propertyTitle}`,
    '',
    msg.message || '(ללא הודעה)',
  ].filter((l): l is string => typeof l === 'string');
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.NOTIFY_EMAIL,
      replyTo: msg.email || undefined,
      subject: `פנייה חדשה מהאתר: ${msg.name}`,
      text: lines.join('\n'),
    });
  } catch (err) {
    console.error('Failed to send notification email:', err);
  }
}
