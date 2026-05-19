/**
 * One-time script to get a Gmail OAuth2 refresh token.
 * Run: node get-token.js
 * Then open the printed URL, authorize, and the refresh token prints automatically.
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { createServer } from 'http';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const SCOPE = 'https://mail.google.com/';

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPE)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Sign in as lilitalent@gmail.com and allow access.');
console.log('3. The refresh token will print here automatically.\n');

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  const code = url.searchParams.get('code');

  if (!code) {
    res.end('No code found.');
    return;
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    res.end(`Error: ${tokens.error} — ${tokens.error_description}`);
    console.error('\nError:', tokens);
    server.close();
    return;
  }

  res.end('<h2>Success! Check your terminal for the refresh token. You can close this tab.</h2>');

  console.log('\n✓ Refresh token obtained:\n');
  console.log(tokens.refresh_token);
  console.log('\nPaste this into .env as GMAIL_REFRESH_TOKEN=\n');

  server.close();
  process.exit(0);
});

server.listen(3000);
