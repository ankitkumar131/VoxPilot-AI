import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.voxpilot.app',
  appName: 'VoxPilot AI',
  webDir: 'dist/frontend/browser',
  server: {
    // http scheme for local development so the WebView can talk to a plain
    // http backend (http://<PC-IP>:4000) with no mixed-content blocking.
    // For a production release with an https API, switch to 'https'.
    androidScheme: 'http',
    allowNavigation: ['voxpilot.ai', '*.voxpilot.ai'],
  },
  android: { allowMixedContent: false },
};

export default config;
