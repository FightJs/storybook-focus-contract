import { expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { validateContract, storyUrl, type Step } from './contract.js';

interface Focus { tag: string; testId: string | null; id: string | null; role: string | null }
interface StepResult { number: number; step: Step; expected: string | null; actual: Focus | null; status: 'passed' | 'failed'; error?: string }
export interface Report {
  status: 'passed' | 'failed'; storyId: string; url: string; startedAt: string;
  versions: { tool: string; node: string; playwright: string; chromium: string };
  contract: unknown; steps: StepResult[]; focusHistory: Focus[]; firstFailure: number | null;
  error?: string; screenshot?: string; screenshotError?: string;
}
export interface RunOptions { baseUrl: string; outDir: string; timeout?: number }
const require = createRequire(import.meta.url);
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
async function focus(page: Page): Promise<Focus | null> {
  return page.evaluate(() => {
    const e = document.activeElement;
    return e ? { tag: e.tagName.toLowerCase(), testId: e.getAttribute('data-testid'), id: e.id || null, role: e.getAttribute('role') } : null;
  });
}
async function unique(page: Page, target: string, timeout: number): Promise<Locator> {
  const locator = page.getByTestId(target);
  try { await expect(locator, `target ${JSON.stringify(target)} must match exactly one unique data-testid`).toHaveCount(1, { timeout }); }
  catch { throw new Error(`target ${JSON.stringify(target)} must match exactly one unique data-testid; found ${await locator.count()}`); }
  return locator;
}
function markdown(report: Report): string {
  const describe = (f: Focus | null) => f ? `${f.tag}${f.testId ? ` [data-testid=${JSON.stringify(f.testId)}]` : ''}` : '(none)';
  const clean = (s: string) => s.replace(/[\r\n|]/g, ' ');
  return `# Focus contract: ${report.status}\n\nStory: ${report.storyId}\n\nFirst failure: ${report.firstFailure ?? 'none'} (0 = setup)\n\n| Step | Expected test ID | Actual | Status |\n| --- | --- | --- | --- |\n${report.steps.map(s => `| ${s.number} | ${clean(s.expected ?? '(wait only)')} | ${clean(describe(s.actual))} | ${s.status} |`).join('\n')}\n\n${report.error ? `Error:\n\n\`\`\`text\n${report.error.replaceAll('```', "'''")}\n\`\`\`\n` : ''}${report.screenshot ? '\n![Failure](failure.png)\n' : ''}\nVersions: ${JSON.stringify(report.versions)}\n\nOnly settled focus is asserted. This does not prove absence of transient focus leaks. Reproduction requires the original Storybook service and source. Screenshots may contain rendered page data.\n`;
}
export async function executeContract(page: Page, input: unknown, options: RunOptions): Promise<Report> {
  const contract = validateContract(input);
  const url = storyUrl(options.baseUrl, contract.storyId);
  const timeout = options.timeout ?? 5000;
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('timeout must be positive');
  await mkdir(options.outDir, { recursive: true });
  const report: Report = {
    status: 'passed', storyId: contract.storyId, url, startedAt: new Date().toISOString(),
    versions: { tool: '0.1.0', node: process.version, playwright: require('@playwright/test/package.json').version, chromium: page.context().browser()?.version() ?? 'unknown' },
    contract, steps: [], focusHistory: [], firstFailure: null,
  };
  let documentTimeOrigin = 0;
  const assertDocument = async () => {
    const sameDocument = await page.evaluate(origin => performance.timeOrigin === origin, documentTimeOrigin);
    if (!sameDocument || page.url() !== url) throw new Error('Story navigation or reload is outside the supported single-document contract');
  };
  let current = 0;
  let active: StepResult | undefined;
  try {
    await page.addInitScript(() => {
      const history: Focus[] = [];
      Object.assign(window, { __focusContractHistory: history });
      document.addEventListener('focusin', event => {
        const e = event.target;
        if (e instanceof Element) {
          history.push({ tag: e.tagName.toLowerCase(), testId: e.getAttribute('data-testid'), id: e.id || null, role: e.getAttribute('role') });
          if (history.length > 200) history.shift();
        }
      }, true);
    });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    if (!response?.ok()) throw new Error(`Storybook HTTP response: ${response?.status() ?? 'none'}`);
    documentTimeOrigin = await page.evaluate(() => performance.timeOrigin);
    // shortcut: Storybook 10.6.7 channel completion API; re-evaluate on a Storybook upgrade.
    const ready = await page.waitForFunction(storyId => {
      const preview = (window as unknown as { __STORYBOOK_PREVIEW__?: { channel?: { last?: (event: string) => { storyId: string; status: string }[] | undefined } } }).__STORYBOOK_PREVIEW__;
      const finished = preview?.channel?.last?.('storyFinished')?.[0];
      if (finished?.storyId !== storyId) return false;
      return { status: finished.status, errorDisplay: document.body.classList.contains('sb-show-errordisplay') || document.body.classList.contains('sb-show-nopreview') };
    }, contract.storyId, { timeout });
    const state = await ready.jsonValue();
    await ready.dispose();
    if (!state || state.status !== 'success' || state.errorDisplay) throw new Error('Storybook rendering or play failed');
    await assertDocument();
    if (contract.initialFocus) {
      const start = await unique(page, contract.initialFocus, timeout);
      await start.focus({ timeout });
      await expect(start).toBeFocused({ timeout });
    }
    for (const [index, step] of contract.steps.entries()) {
      current = index + 1;
      active = { number: current, step, expected: step.expectFocus ?? null, actual: null, status: 'passed' };
      report.steps.push(active);
      if (step.action === 'click') await (await unique(page, step.target, timeout)).click({ timeout });
      else if (step.action === 'press') await page.keyboard.press(step.key);
      else {
        const target = page.getByTestId(step.target);
        if (step.state === 'visible') await expect(await unique(page, step.target, timeout)).toBeVisible({ timeout });
        else {
          const count = await target.count();
          if (count > 1) throw new Error(`target ${JSON.stringify(step.target)} must be unique; found ${count}`);
          await expect(target).toBeHidden({ timeout });
        }
        if (await target.count() > 1) throw new Error(`target ${JSON.stringify(step.target)} must be unique`);
      }
      await assertDocument();
      if (step.expectFocus) {
        const expected = await unique(page, step.expectFocus, timeout);
        await expect(expected).toBeFocused({ timeout });
        await expect(expected).toHaveCount(1, { timeout });
      }
      active.actual = await focus(page);
      await assertDocument();
    }
  } catch (error) {
    report.status = 'failed'; report.firstFailure = current; report.error = errorText(error);
    if (active) { active.status = 'failed'; active.error = report.error; active.actual = await focus(page).catch(() => null); }
    try {
      await page.screenshot({ path: join(options.outDir, 'failure.png'), timeout: Math.max(timeout, 5000), fullPage: true });
      report.screenshot = 'failure.png';
    } catch (screenshotError) { report.screenshotError = errorText(screenshotError); }
  }
  report.focusHistory = await page.evaluate(() => (window as unknown as { __focusContractHistory?: Focus[] }).__focusContractHistory ?? []).catch(() => []);
  await writeFile(join(options.outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(join(options.outDir, 'report.md'), markdown(report));
  return report;
}
