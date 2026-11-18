# 推广准备与事实记录

## 定位

面向维护 Storybook 的组件库作者：把“Escape 后应该回到哪个触发器”的业务意图写成小契约，用真实 Chromium 检查，并导出可重跑的 Playwright 测试。

与 codegen 的区别是预期焦点契约和逐步 expected/actual 报告；不声称 codegen 无法手写焦点断言。与静态无障碍扫描互补，不声称全面检查 WCAG。

## 可用素材

- 源码、中文 README、contracts/working.json 与 broken.json、自带 Storybook：本地材料。
- 两个 Popover story 均为原创合成案例；不能写成已复现 Radix 当前 bug。
- 实际验收证据见 docs/VERIFICATION.md；新版真实界面图位于 docs/ui/，独立界面评分与返修记录见 docs/UI-REVIEW.md。
- [公开 GitHub 仓库](https://github.com/FightJs/storybook-focus-contract)与 [Pages 在线 Demo](https://fightjs.github.io/storybook-focus-contract/iframe.html?id=demo-popover--working&viewMode=story)已发布；2026-11-18 浏览器实测正常与错误示例。npm 包未发布。
- Star、真实用户采用、反馈：未知。
- 当前范围从 addon 缩为手写契约工具；五维评分待重新独立复核。

## 两个优先渠道

1. GitHub README / 组件 PR：先以正常与错误案例展示同一份焦点意图，再展示真实失败步骤、截图和重跑命令；准备源码仓库和 Storybook Demo 后再填写公开链接。
2. CSDN 技术文章：用“静态检查通过，为什么 Escape 后仍可能丢焦点”解释契约意图、真实键盘输入和适用边界。文章只引用真实生成的报告，不暗示通用无障碍认证。

此轮不准备对外稿件、不发帖；后续如准备 CSDN / X 具体稿件，按总计划调用 csdn-x-publish，检查当时平台规则并完成独立稿件审核。不能把本文件当作审核通过或发布记录。

## 待发布前完成

核对 README 所有命令、实际截图及测试版本；已核验 MIT 许可证、公开仓库及 Demo 地址；后续按当时规则准备稿件。无增长保证，不批量联系用户、不刷星、不重复发布旧帖。
