import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

const FROM = 'The Frequency <newsletter@lilitarutyunyan.com>';

function extractSubject(html) {
  const match = html.match(/<!--\s*subject:\s*(.+?)\s*-->/);
  if (!match) throw new Error('[email] Could not extract subject from email-latest.html');
  return match[1];
}

function personalize(html, subscriber) {
  return html.replace(/\{\{name\}\}/g, subscriber.name?.trim() || 'there');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendToAll(subscribers, ctx) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const emailHtml = readFileSync(path.join(PUBLIC, 'email-latest.html'), 'utf8');
  const subject = extractSubject(emailHtml);
  const result = { sent: 0, failed: 0, errors: [] };

  console.log(`[email] Sending Issue #${ctx.issue_number} to ${subscribers.length} subscriber(s)...`);

  for (const subscriber of subscribers) {
    try {
      await resend.emails.send({
        from: FROM,
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
