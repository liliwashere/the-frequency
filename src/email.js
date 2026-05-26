import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_FROM_ADDRESS,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  });
}

function extractSubject(html) {
  const match = html.match(/<!--\s*subject:\s*(.+?)\s*-->/);
  if (!match) throw new Error('[email] Could not extract subject from email-latest.html');
  return match[1];
}

function personalize(html, subscriberId = '') {
  return html
    .replace(/\{\{name\}\}/g, 'there')
    .replace(/\{\{subscriber_id\}\}/g, encodeURIComponent(subscriberId));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendToAll(subscribers, ctx) {
  const transport = createTransport();
  const emailHtml = readFileSync(path.join(PUBLIC, 'email-latest.html'), 'utf8');
  const subject = extractSubject(emailHtml);
  const from = `The Frequency <${process.env.GMAIL_FROM_ADDRESS}>`;
  const result = { sent: 0, failed: 0, errors: [] };

  console.log(`[email] Sending Issue #${ctx.issue_number} to ${subscribers.length} subscriber(s) via Gmail...`);

  for (const subscriber of subscribers) {
    try {
      await transport.sendMail({
        from,
        to: subscriber.email,
        subject,
        html: personalize(emailHtml, subscriber.id ?? ''),
      });
      result.sent++;
      if (result.sent % 10 === 0) {
        console.log(`[email] Sent ${result.sent}/${subscribers.length}...`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push({ email: subscriber.email, error: err.message });
      console.warn(`[email] Failed to send to ${subscriber.email}: ${err.message}`);
    }

    await sleep(150);
  }

  console.log(`[email] Done — sent: ${result.sent}, failed: ${result.failed}`);
  if (result.errors.length) {
    console.warn('[email] Failed addresses:', result.errors.map(e => e.email).join(', '));
  }

  return result;
}
