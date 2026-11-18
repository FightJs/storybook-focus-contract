import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import './workbench.css';

const steps = [
  ['Enter', '打开弹层', 'close'], ['等待可见', '弹层已呈现', 'close'],
  ['Tab', '移至下一个控件', 'secondary'], ['Shift+Tab', '返回关闭按钮', 'close'],
  ['Escape', '关闭并恢复焦点', 'trigger'], ['等待隐藏', '弹层已卸载', 'trigger'],
  ['点击 trigger', '再次打开弹层', 'close'], ['点击 close', '关闭并恢复焦点', 'trigger'],
];
function FocusMark() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/></svg>;
}
function SettingsIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="9" cy="7" r="2.5" fill="var(--color-paper)" stroke="currentColor" strokeWidth="1.6"/><circle cx="15" cy="17" r="2.5" fill="var(--color-paper)" stroke="currentColor" strokeWidth="1.6"/></svg>;
}
function Popover({ restoreFocus = true }: { restoreFocus?: boolean }) {
  const [open, setOpen] = useState(false);
  const [observed, setObserved] = useState('尚未进入画布');
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) close.current?.focus(); }, [open]);
  useEffect(() => {
    const sync = () => queueMicrotask(() => {
      const element = document.activeElement;
      setObserved(element?.getAttribute('data-testid') ?? (element === document.body ? 'document.body' : element?.tagName.toLowerCase() ?? '无'));
    });
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', sync);
    return () => { document.removeEventListener('focusin', sync); document.removeEventListener('focusout', sync); };
  }, []);
  useEffect(() => {
    if (!open && observed !== '尚未进入画布') {
      const frame = requestAnimationFrame(() => {
        const element = document.activeElement;
        setObserved(element?.getAttribute('data-testid') ?? (element === document.body ? 'document.body' : element?.tagName.toLowerCase() ?? '无'));
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);
  function dismiss() {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }
  const mode = restoreFocus ? 'working' : 'broken';
  return <div className="focus-app">
    <header className="app-header">
      <div className="brand"><FocusMark/><span>Focus Contract</span></div>
      <span className="header-context">Storybook 焦点实验室</span>
      <a className="header-link" href="#reproduce">本地验证</a>
    </header>
    <main className="app-main">
      <section className="intro" aria-labelledby="page-title">
        <h1 id="page-title">焦点，回到预期。</h1>
        <p>定义键盘交互的预期，观察组件的真实响应。</p>
      </section>
      <div className="case-toolbar">
        <div><h2>Popover 焦点恢复</h2><span className="case-subtitle">关闭弹层后，焦点回到哪里？</span></div>
        <nav className="variant-switch" aria-label="选择示例">
          <a href="?id=demo-popover--working&viewMode=story" aria-current={restoreFocus ? 'page' : undefined}>正常示例</a>
          <a href="?id=demo-popover--broken&viewMode=story" aria-current={!restoreFocus ? 'page' : undefined}>错误示例</a>
        </nav>
      </div>
      <div className="workbench">
        <section className="interaction" aria-labelledby="canvas-title">
          <div className="region-heading"><h3 id="canvas-title">交互画布</h3><span>同文档 Portal</span></div>
          <div className="canvas">
            <div className="sample">
              <span className="sample-icon"><SettingsIcon/></span>
              <h3>你的工作区，随时调整。</h3>
              <p>先聚焦触发器，用 Enter 打开设置。</p>
              <div className="sample-actions">
                <button type="button" className="button button-primary" ref={trigger} data-testid="trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'settings-panel' : undefined} onClick={() => setOpen(true)}>打开设置</button>
                <button type="button" className="button button-secondary" data-testid="after">下一个按钮</button>
              </div>
              <div className="key-guide" aria-label="可用按键"><kbd>Enter</kbd><span>打开</span><kbd>Tab</kbd><span>移动</span><kbd>Esc</kbd><span>关闭</span></div>
            </div>
          </div>
          <div className="focus-inspector">
            <div><span className="inspector-label">实时焦点</span><output data-testid="focus-observation" aria-live="polite">{observed}</output></div>
            <span className="observation-note">仅观察，不代表测试通过</span>
          </div>
          <div className={`case-note ${restoreFocus ? '' : 'case-note-broken'}`}><span className="case-symbol" aria-hidden="true">{restoreFocus ? '✓' : '!'}</span><p>{restoreFocus ? '关闭弹层后，焦点恢复到触发器。' : '此例故意遗漏恢复逻辑，关闭后焦点会落到 body。'}<span>当前版本：{restoreFocus ? '恢复触发器焦点' : '故意遗漏焦点恢复'}。</span></p></div>
        </section>
        <aside className="contract" aria-labelledby="contract-title">
          <div className="region-heading"><h3 id="contract-title">预期焦点契约</h3><span>{steps.length} 步</span></div>
          <div className="contract-start"><span>起始焦点</span><code>trigger</code></div>
          <ol className="step-list">{steps.map(([key, description, target], index) => <li key={index} className={index === 4 ? 'recovery-step' : undefined}><span className="step-number">{index + 1}</span><div><span className="step-key">{key}</span><span className="step-description">{description}</span></div><code>{target}</code></li>)}</ol>
          <p className="contract-caption">每步声明预期目标，真实结果由 Playwright 验证。</p>
        </aside>
      </div>
      <section className="reproduce" id="reproduce" aria-labelledby="reproduce-title">
        <div><h2 id="reproduce-title">从观察，到验证。</h2><p>在本地运行契约，获得逐步报告与失败截图。</p></div>
        <div className="command"><span>项目目录下执行</span><code>npm run focus -- run contracts/{mode}.json<br/> --base-url http://localhost:6006</code></div>
      </section>
      <footer className="app-footer"><p>原创合成示例，不是对某个上游组件库故障的复现声明。</p><span>React / Vite / Chromium</span></footer>
    </main>
    {open && createPortal(<div className="popover-position"><section className="settings-popover" id="settings-panel" role="dialog" aria-labelledby="settings-title" aria-describedby="settings-description" data-testid="panel" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); dismiss(); } }}>
      <div className="popover-heading"><SettingsIcon/><h2 id="settings-title">示例设置</h2></div>
      <p id="settings-description">Escape 关闭此弹层。{restoreFocus ? '焦点将回到打开设置按钮。' : '错误版本会将焦点留给 body。'}</p>
      <div className="popover-actions"><button type="button" className="button button-primary" ref={close} data-testid="close" onClick={dismiss}>关闭</button><button type="button" className="button button-secondary" data-testid="secondary">其他设置</button></div>
      <p className="popover-hint">用 Tab 和 Shift+Tab 观察焦点顺序</p>
    </section></div>, document.body)}
  </div>;
}
const meta = { title: 'Demo/Popover', component: Popover } satisfies Meta<typeof Popover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Working: Story = { args: { restoreFocus: true } };
export const Broken: Story = { args: { restoreFocus: false } };
export const PortalOnly: Story = {
  render: () => createPortal(<button type="button" className="button button-primary" data-testid="portal-only" disabled>Portal only</button>, document.body),
  play: async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    document.querySelector<HTMLButtonElement>('[data-testid="portal-only"]')!.disabled = false;
  },
};
