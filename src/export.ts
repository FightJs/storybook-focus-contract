import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve, dirname } from 'node:path';
import { validateContract } from './contract.js';

export async function exportContract(input: unknown, outDir: string): Promise<void> {
  const contract = validateContract(input);
  const destination = resolve(outDir);
  await mkdir(dirname(destination), { recursive: true });
  await mkdir(destination); // Intentionally refuse existing destinations, even empty ones.
  try {
    for (const name of ['contract.js', 'runner.js']) {
      await copyFile(fileURLToPath(new URL(name, import.meta.url)), join(destination, name));
    }
    await writeFile(join(destination, 'focus.contract.json'), JSON.stringify(contract, null, 2) + '\n');
    await writeFile(join(destination, 'focus.spec.ts'), `import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { executeContract } from './runner.js';
const contract = JSON.parse(readFileSync(new URL('./focus.contract.json', import.meta.url), 'utf8'));
test('focus contract: ' + contract.storyId, async ({ page }, testInfo) => {
  const report = await executeContract(page, contract, {
    baseUrl: process.env.STORYBOOK_URL!, outDir: testInfo.outputPath('focus'),
  });
  await testInfo.attach('focus-report', { path: testInfo.outputPath('focus', 'report.json'), contentType: 'application/json' });
  expect(report.status, report.error).toBe('passed');
});
`);
    await writeFile(join(destination, 'playwright.config.ts'), `import { defineConfig } from '@playwright/test';
if (!process.env.STORYBOOK_URL) throw new Error('Set STORYBOOK_URL to your running Storybook base URL');
export default defineConfig({
  testDir: '.', testMatch: 'focus.spec.ts', timeout: 180000, retries: 0,
  workers: 1, reporter: [['list'], ['html', { open: 'never' }]],
  use: { browserName: 'chromium', headless: true, viewport: { width: 1280, height: 720 } },
});
`);
    await writeFile(join(destination, 'package.json'), JSON.stringify({ name: 'exported-focus-contract', version: '0.1.0', private: true, type: 'module', engines: { node: '>=22.12.0' }, scripts: { test: 'playwright test' }, devDependencies: { '@playwright/test': '1.65.1' } }, null, 2) + '\n');
    await writeFile(join(destination, '.gitignore'), 'node_modules/\ntest-results/\nplaywright-report/\n');
    await writeFile(join(destination, 'README.md'), `# 焦点契约测试包\n\n需要 Node.js 22.12+ 和原项目的 Storybook 服务及源码。此包不包含业务组件。\n\n\`\`\`sh\nnpm install\nnpx playwright install chromium --only-shell\nSTORYBOOK_URL=http://localhost:6006 npm test\n\`\`\`\n\n失败信息与截图位于 test-results 下；HTML 报告位于 playwright-report。测试只断言操作后的最终焦点，不检测全部瞬态泄漏。契约和截图可能包含项目资料，请自行决定是否分享。\n`);
    // Read back the contract so partial or unwritable exports cannot be reported as success.
    validateContract(JSON.parse(await readFile(join(destination, 'focus.contract.json'), 'utf8')));
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}
