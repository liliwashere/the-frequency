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

export async function sendPreviewEmail(ctx, previewUrl = null) {
  const transport = createTransport();
  const emailHtml = readFileSync(path.join(PUBLIC, 'email-latest.html'), 'utf8');
  const baseSubject = extractSubject(emailHtml);
  const subject = `[PREVIEW] ${baseSubject}`;
  const from = `The Frequency <${process.env.GMAIL_FROM_ADDRESS}>`;

  const previewBanner = previewUrl
    ? `<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-family:sans-serif;font-size:14px;">
        <strong>⚠️ PREVIEW — Issue #${ctx.issue_number}</strong><br>
        This is a Monday preview. The issue goes live Tuesday 09:00 Lisbon.<br>
        <a href="${previewUrl}" style="color:#6c47ff;">View on site →</a>
      </div>`
    : `<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-family:sans-serif;font-size:14px;">
        <strong>⚠️ PREVIEW — Issue #${ctx.issue_number}</strong><br>
        This is a Monday preview. The issue goes live Tuesday 09:00 Lisbon.
      </div>`;

  const previewHtml = emailHtml.replace('<body', '<body').replace(
    /<body[^>]*>/,
    match => match + previewBanner
  );

  await transport.sendMail({
    from,
    to: 'lilitalent@gmail.com',
    subject,
    html: previewHtml,
  });
}
