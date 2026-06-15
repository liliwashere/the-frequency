import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(PROJECT_ROOT, 'public');
const WRANGLER = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'wrangler');

export async function deploy({ preview = false } = {}) {
  const projectName = process.env.CF_PROJECT_NAME;
  const accountId = process.env.CF_ACCOUNT_ID;
  const branchFlag = preview ? ' --branch=preview' : '';

  console.log(`[deploy] Deploying public/ to Cloudflare Pages project "${projectName}"${preview ? ' (preview branch)' : ''}...`);

  const output = execSync(
    `"${WRANGLER}" pages deploy "${PUBLIC}" --project-name="${projectName}"${branchFlag}`,
    {
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: process.env.CF_API_TOKEN,
        CLOUDFLARE_ACCOUNT_ID: accountId,
      },
      cwd: PROJECT_ROOT,
    }
  ).toString();

  const urlMatch = output.match(/https?:\/\/[^\s]+pages\.dev[^\s]*/);
  const deployUrl = urlMatch?.[0] ?? `https://${projectName}.pages.dev`;

  console.log(`[deploy] Deployed: ${deployUrl}`);
  return { url: deployUrl };
}
