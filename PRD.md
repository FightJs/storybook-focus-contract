# Storybook Focus Contract · 轻量 PRD

## 谁在什么场景下用

组件库与设计系统维护者希望说明并验证：用户按下 Tab、Enter 或 Escape 后，焦点应落到哪个业务元素。静态 DOM 检查和焦点历史可以辅助观察，但不能替作者决定正确的交互意图。

## 首版闭环

作者为目标元素添加唯一 `data-testid`，手写一个最多 20 步的 JSON 契约；CLI 在 Storybook standalone 页面使用真实 Chromium 输入，断言每步预期焦点，生成首个失败报告与截图。契约可导出为可在独立目录安装并运行的 Playwright 测试包。

附带原创 Popover 正常/故意错误对照：关闭后恢复触发器与遗漏恢复。示例用于教学和工具验证，不声称复现某个上游库当前未修复的问题。

## 范围与取舍

只验证 React/Vite Storybook 10.6.7、Chromium、同文档 light DOM 和 portal。操作限 click、Tab、Shift+Tab、Enter、Escape、显式 visible/hidden 等待。不做编辑面板、点选录制、自动猜测焦点顺序、axe 扫描、组件修复、托管执行或账号系统。

本轮用户选择先做手写契约工具，而不是研究中的完整 addon。省去了安装面板与点选，但保留意图→真实执行→偏差报告；原五维 8/8/8/8/8 不直接沿用，轻量范围待独立复核。

## 成功标准与传播假设

使用者能按 README 跑通正常案例，看到错误案例在 Escape 后失败，并把同一契约导出重跑获得相同结论。契约和报告可以用于组件 PR 讨论；是否值得收藏、是否带来采用或 Star 尚无数据。
