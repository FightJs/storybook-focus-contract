# Storybook Focus Contract · 首版规范

## 固定环境与入口

Node.js 22.12+；实际验收使用 22.23.1。固定 Storybook / @storybook/react-vite 10.6.7、React / React DOM 19.3.1、Vite 7.3.1、@playwright/test 1.65.1、TypeScript 5.9.3。完整依赖由 package-lock.json 固定。

命令在项目根目录执行：

- `npm run focus -- validate <contract.json>`：校验格式，成功退出 0。
- `npm run focus -- run <contract.json> --base-url <Storybook根地址>`：新建 results 下的独立运行目录，真实执行；通过退出 0，失败退出 1。
- `npm run focus -- export <contract.json> --out <不存在的目录>`：导出独立测试包；目标已存在即拒绝，不覆盖文件。

CLI 不自动启动或安装用户的 Storybook，也不自动安装浏览器。导出包只依赖固定版本 Playwright，运行前需设置 STORYBOOK_URL。

## 契约格式

```json
{
  "version": 1,
  "storyId": "demo-popover--working",
  "initialFocus": "trigger",
  "steps": [
    { "action": "press", "key": "Enter", "expectFocus": "close" },
    { "action": "wait", "target": "panel", "state": "visible" },
    { "action": "press", "key": "Escape", "expectFocus": "trigger" }
  ]
}
```

顶层只允许 version、storyId、initialFocus、steps；步骤只允许对应操作的字段。version 必须为 1；storyId 为小写字母/数字开头，后续仅小写字母、数字、下划线、短横线，总长不超过 200。test ID 是非空、无控制字符、不超过 200 字符的字符串；按原样匹配，不自动 trim。

steps 为 1–20 步。click 必填 target 与 expectFocus；press 必填 key 与 expectFocus，key 仅 Tab / Shift+Tab / Enter / Escape；wait 必填 target、state（visible / hidden），可填 expectFocus。未知字段、缺失字段、错误类型均拒绝。

## 执行与边界

根地址仅允许 HTTP(S)，拒绝账号密码、query 和 fragment；保留部署子路径，拼出 iframe.html?id=...&viewMode=story。不支持传入 manager 或 iframe 文件地址，也不传自定义 args、globals、登录状态或任意脚本；使用 story 本身的默认环境。每次 CLI 创建全新浏览器上下文，viewport 1280×720。

等待 Storybook 10.6.7 channel 的 storyFinished 信号与对应 story ID，确认渲染/play 成功，且页面未显示错误/无预览状态。支持 root 为空的 portal-only story；该版本内部 channel 接口在升级 Storybook 时需要复核。initialFocus 可选，只在设置阶段调用 focus 并验证；随后仅使用 Playwright click 与 keyboard.press。目标查询覆盖整个文档，因此可找到同文档 portal。

导航、定位、操作和断言默认分别限时 5 秒。点击与预期焦点目标必须唯一且存在。visible 等待同样要求唯一存在；hidden 等待允许元素已卸载或单个元素不可见，重复目标失败。按键和点击后的最终焦点通过 toBeFocused 重试断言；这不证明没有瞬态焦点泄漏。跨页面导航不在支持范围，步骤前后检测到 URL 改变或主文档重新导航（含同 URL 重载）即失败。

## 输出与错误

首个失败后停止执行，firstFailure 使用从 1 开始的步骤编号；0 表示加载/初始焦点失败。输出 report.json、report.md，失败时尽力保存 failure.png；截图失败记录 screenshotError，不伪造截图。JSON 包含契约、story ID、URL、起始时间、Node/Playwright/Chromium/工具版本、每步 expected/actual 与错误。actual 记录当前元素的 tag、data-testid、id、role；最多保留 200 次 focusin 观察，不代表捕获全部焦点变化。

浏览器启动失败时 CLI 退出 1 并记录 launch-error.json；契约格式、URL 和文件读取错误输出到 stderr 并退出 1，不生成假执行报告。

导出包包含 focus.contract.json、focus.spec.ts、同一套 runner/校验模块、Playwright 配置、package.json 与使用说明。测试用例无重试、仅 Chromium，并附加 JSON 报告。它需要原业务 Storybook 与源码，不是可独立重建组件的报告。独立安装会生成自己的锁文件。

工具无上传端点。被测试页面及安装工具仍可能按自身行为联网；报告错误信息和截图可能包含页面数据。请自行检查后再分享。仅支持同文档 light DOM；shadow DOM、跨 frame、读屏、多浏览器、全部 roving 键值、任意竞态检测均不在支持范围。

## 验收

执行 npm run typecheck、npm test、npm run build-storybook、npm run test:e2e。覆盖契约边界、真实正反向 Tab、Enter/Escape、portal、隐藏/卸载、目标缺失/重复、服务不可达、story 不存在、初始定位失败；正常 Popover 通过，错误版本在第 5 步 Escape 后报告 body，独立安装的两份导出包与 CLI 结论一致。

## 后续开发交接提示词

> 读取本项目 PRD.md 与 SPEC.md，维护手写契约→Chromium 真实执行→首个偏差报告→独立测试导出的首版闭环。先复跑现有单元与浏览器测试，再处理明确问题；运行器与导出包必须共用执行逻辑。不要把研究里的点选面板、全浏览器、托管服务自动加回。按实际代码与验证结果更新中文 README 和 PROMOTION.md。远程建仓、部署、npm 发布与发帖不在当前交付范围；不要虚构运行、采用或增长数据。
