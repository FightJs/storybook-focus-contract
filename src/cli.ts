#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { chromium } from '@playwright/test';
import { validateContract, storyUrl } from './contract.js';
import { executeContract } from './runner.js';
import { exportContract } from './export.js';

const help = `Focus contract 0.1.0
  focus-contract validate <contract.json>
  focus-contract run <contract.json> --base-url <url>
  focus-contract export <contract.json> --out <new-directory>
Run writes a new timestamped directory under ./results. Chromium must be installed.
`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(args[0]))) { console.log(help); return; }
  const [command, file, ...rest] = args;
  if (!['validate', 'run', 'export'].includes(command) || !file || file.startsWith('-')) throw new Error(help);
  const option = command === 'run' ? '--base-url' : command === 'export' ? '--out' : null;
  if ((option && (rest.length !== 2 || rest[0] !== option || !rest[1] || rest[1].startsWith('--'))) || (!option && rest.length)) throw new Error(help);
  const contract = validateContract(JSON.parse(await readFile(resolve(file), 'utf8')));
  if (command === 'validate') { console.log(`Valid: ${contract.storyId}, ${contract.steps.length} steps`); return; }
  if (command === 'export') { await exportContract(contract, rest[1]); console.log(`Exported: ${resolve(rest[1])}`); return; }
  storyUrl(rest[1], contract.storyId);
  const parent = resolve('results');
  await mkdir(parent, { recursive: true });
  const { mkdtemp } = await import('node:fs/promises');
  const outDir = await mkdtemp(join(parent, `${new Date().toISOString().replaceAll(':', '-')}-`));
  const browser = await chromium.launch().catch(async error => {
    await writeFile(join(outDir, 'launch-error.json'), JSON.stringify({ status: 'failed', phase: 'browser-launch', error: String(error) }, null, 2));
    throw error;
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const report = await executeContract(await context.newPage(), contract, { baseUrl: rest[1], outDir });
    console.log(`${report.status.toUpperCase()}: ${contract.storyId}${report.firstFailure !== null ? ` (first failure: ${report.firstFailure}, 0=setup)` : ''}\nReport: ${outDir}`);
    if (report.status === 'failed') process.exitCode = 1;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
