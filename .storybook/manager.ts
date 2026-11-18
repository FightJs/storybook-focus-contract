import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

// Storybook's theme parser needs sRGB colours; this declared theme block owns manager tokens.
const shellTheme = create({
  base: 'light',
  brandTitle: 'Focus Contract',
  brandUrl: '?path=/story/demo-popover--working',
  brandTarget: '_self',
  fontBase: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", sans-serif',
  fontCode: 'SFMono-Regular, Consolas, monospace',
  colorPrimary: '#1d1d1f', colorSecondary: '#0063cf',
  appBg: '#f5f5f7', appContentBg: '#ffffff', appPreviewBg: '#ffffff',
  appBorderColor: '#d8d8dc', appBorderRadius: 8,
  textColor: '#1d1d1f', textMutedColor: '#626268', textInverseColor: '#ffffff',
  barTextColor: '#626268', barSelectedColor: '#0063cf', barHoverColor: '#1d1d1f', barBg: '#ffffff',
  inputBg: '#ffffff', inputBorder: '#85858a', inputTextColor: '#1d1d1f', inputBorderRadius: 6,
});
addons.setConfig({ theme: shellTheme, panelPosition: 'bottom', sidebar: { showRoots: false }, initialActive: 'sidebar', layoutCustomisations: { showPanel: () => false, showToolbar: () => false } });
