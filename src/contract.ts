export type Step =
  | { action: 'click'; target: string; expectFocus: string }
  | { action: 'press'; key: 'Tab' | 'Shift+Tab' | 'Enter' | 'Escape'; expectFocus: string }
  | { action: 'wait'; target: string; state: 'visible' | 'hidden'; expectFocus?: string };
export interface Contract { version: 1; storyId: string; initialFocus?: string; steps: Step[] }

function object(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${where}: expected an object`);
  return value as Record<string, unknown>;
}
function fields(value: Record<string, unknown>, allowed: string[], where: string) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`${where}: unknown field ${key}`);
}
function id(value: unknown, where: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[\x00-\x1f\x7f]/.test(value)) throw new Error(`${where}: expected a non-empty ID (max 200 characters, no control characters)`);
}
export function validateContract(input: unknown): Contract {
  const c = object(input, 'contract');
  fields(c, ['version', 'storyId', 'initialFocus', 'steps'], 'contract');
  if (c.version !== 1) throw new Error('version: only 1 is supported');
  if (typeof c.storyId !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,199}$/.test(c.storyId)) throw new Error('storyId: expected a Storybook story ID');
  if ('initialFocus' in c) id(c.initialFocus, 'initialFocus');
  if (!Array.isArray(c.steps) || c.steps.length < 1 || c.steps.length > 20) throw new Error('steps: expected 1–20 steps');
  c.steps.forEach((value, index) => {
    const where = `steps[${index}]`, s = object(value, where);
    if (s.action === 'click') {
      fields(s, ['action', 'target', 'expectFocus'], where); id(s.target, `${where}.target`); id(s.expectFocus, `${where}.expectFocus`);
    } else if (s.action === 'press') {
      fields(s, ['action', 'key', 'expectFocus'], where);
      if (!['Tab', 'Shift+Tab', 'Enter', 'Escape'].includes(s.key as string)) throw new Error(`${where}.key: unsupported key`);
      id(s.expectFocus, `${where}.expectFocus`);
    } else if (s.action === 'wait') {
      fields(s, ['action', 'target', 'state', 'expectFocus'], where); id(s.target, `${where}.target`);
      if (s.state !== 'visible' && s.state !== 'hidden') throw new Error(`${where}.state: expected visible or hidden`);
      if ('expectFocus' in s) id(s.expectFocus, `${where}.expectFocus`);
    } else throw new Error(`${where}.action: unsupported action`);
  });
  return structuredClone(c) as unknown as Contract;
}
export function storyUrl(baseUrl: string, storyId: string): string {
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('base URL must be HTTP(S), without credentials, query or fragment');
  url.pathname = `${url.pathname.replace(/\/$/, '')}/iframe.html`;
  url.search = new URLSearchParams({ id: storyId, viewMode: 'story' }).toString();
  return url.href;
}
