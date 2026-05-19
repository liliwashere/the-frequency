import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const body = await res.json();
  if (body.error) {
    throw new Error(`[email] OAuth2 token refresh failed: ${body.error} — ${body.error_description}`);
  }
  return body.access_token;
}

function extractSubject(html) {
  const match = html.match(/<!--\s*subject:\s*(.+?)\s*-->/);
  if (!match) throw new Error('[email] Could not extract subject from email-latest.html comment');
  return match[1];
}

function personalize(html, subscriber) {
  const name = subscriber.name?.trim() || 'there';
  return html.replace(/\{\{name\}\}/g, name);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendToAll(subscribers, ctx) {
  const emailHtml = readFileSync(path.join(PUBLIC, 'email-latest.html'), 'utf8');
  const subject = extractSubject(emailHtml);

  const accessToken = await getAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_FROM_ADDRESS,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      accessToken,
    },
  });

  const result = { sent: 0, failed: 0, errors: [] };

  console.log(`[email] Sending Issue #${ctx.issue_number} to ${subscribers.length} subscriber(s)...`);

  for (const subscriber of subscribers) {
    try {
      await transporter.sendMail({
        from: `"The Frequency" <${process.env.GMAIL_FROM_ADDRESS}>`,
        to: subscriber.email,
        subject,
        html: personalize(emailHtml, subscriber),
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

    await sleep(100);
  }

  console.log(`[email] Done — sent: ${result.sent}, failed: ${result.failed}`);
  if (result.errors.length) {
    console.warn('[email] Failed addresses:', result.errors.map(e => e.email).join(', '));
  }

  return result;
}
