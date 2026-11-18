# 实际验收记录

日期：2026-11-17。环境：macOS arm64、Node.js 22.23.1、npm 10.9.8；Storybook / @storybook/react-vite 10.6.7、React / React DOM 19.3.1、Vite 7.3.1、Playwright 1.65.1、Chromium 159.0.8154.6。仅该环境实测，未外推兼容性。

## 检查结果

| 检查 | 实际结果 |
| --- | --- |
| `npm ci --no-audit --no-fund` | 锁文件安装成功 |
| `npm run typecheck` | 工具、示例与 Storybook 配置类型检查通过 |
| `npm test` | 4 个测试通过，0 失败；包括多种非法契约、URL、嵌套导出目录和拒绝覆盖 |
| `npm run test:e2e` | 构建工具及真实 Storybook；4 个浏览器测试通过，0 失败 |
| 开发模式 `npm run storybook` | 在 localhost:6006 启动成功 |
| 开发模式 CLI 正常契约 | 8 步全部通过，退出码 0 |
| 开发模式 CLI 错误契约 | 第 5 步 Escape 后预期 trigger、实际 body；按设计退出码 1 |
| 两份独立导出包 | 各自在临时目录 npm install 并执行 npm test；正常包通过，错误包在相同步骤失败，报告与 CLI 一致 |

浏览器测试覆盖真实正反向 Tab、Enter、Escape、点击、同文档 portal、portal-only story 和异步 play 完成、可见与隐藏/卸载等待、目标缺失与重复、初始定位失败、Storybook 不可达及 story 不存在、延迟跨页面导航和同 URL 重载。

构建成功时 Vite 对 Storybook preview 产物给出大 chunk 提示；这是演示构建的体积提示，不是测试失败，首版未为此引入额外拆包方案。

## 可查看的真实工件

以下由开发模式下的 CLI 实际生成并复制保存，没有改写契约或预期/实际结果：

- [正常报告 JSON](evidence/working/report.json) / [可读报告](evidence/working/report.md)
- [错误报告 JSON](evidence/broken/report.json) / [可读报告](evidence/broken/report.md)
- [错误截图](evidence/broken/failure.png)

两份示例均为原创合成 Popover，不是上游故障复现。报告中的 localhost 地址用于该次本机验收，不是线上 Demo。

## 独立审查与修正

一次只读独立代码审查发现两项 Important 问题，已分别补充可复现测试并修正：

1. 延迟导航可让焦点断言在新页面上错误通过：现在步骤前后比较 URL 与文档 timeOrigin；同 URL 重载也失败，Storybook 的同 URL replaceState 不误判。
2. portal-only story 的根容器为空导致 setup 超时：改用固定版本 Storybook 的 storyFinished 信号和错误状态，等待对应 story 的渲染/play 完成。

并补充既有导出文件内容不被覆盖的测试。首次真实浏览器验收还发现示例缺少经典 JSX 转换所需的 React 导入，已修正并复验。没有未处理的 Critical / Important 审查项。

## 限制与未验证项

未测试其他 Storybook/框架版本、浏览器、操作系统、shadow DOM、跨 frame、读屏、复杂 roving 或全部瞬态焦点变化。Playwright 断言只确认操作后的最终焦点。Storybook 完成信号使用其 10.6.7 内部 channel 接口，升级时须复核。

首次浏览器安装曾因磁盘不足失败；只移除了本次下载但未用于验收的完整 Chromium 构建，保留实际使用的 headless shell，重试后安装成功。README 使用 `playwright install chromium --only-shell`，避免下载首版不需要的完整浏览器。

未建远程仓库、部署、发布 npm 包或发帖；许可证待所有者选定，采用与 Star 数据未知。

## 2026-11-18 界面重做复验

按用户指定的苹果官网式浅色、灰阶与留白重做工作台，同时统一 Storybook 外壳。新增实时焦点观察仅监听实际 activeElement，不参与焦点设置，也不冒充真实断言结果。

类型检查、4项单元/CLI测试、4项真实浏览器回归全部通过；正常/错误示例及两份独立导出包结论保持一致。额外运行 `npm run verify:ui`：320/375/768/1280/1440/1920px六档无溢出，真实键盘序列与错误版body观察均通过，正文/功能文字配色对比度最低5.909:1。

独立子agent首轮响应式6/10，发现375px打开态浮层超出29px；已用320px断言复现，再修正grid最小宽度与浮层宽度。修复后子agent独立测量375px浮层为x24/width327/right351，关闭该阻断。完整逐项评分与保留的首轮记录见 [UI-REVIEW.md](UI-REVIEW.md)，真实图在 [ui/](ui/)。此前11月17日原始CLI报告与截图保留作为历史工件。

Hallmark渲染检查包含1280/1440/1920首屏与375/1440全页，before记录保留6/6测试hook、3/3原处理器、4/4原链接；最终检查结果以.hallmark记录为准。未做真实移动设备或屏幕阅读器审计，不宣称所有浏览器兼容。
