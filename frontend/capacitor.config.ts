import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.voxpilot.app',
  appName: 'VoxPilot AI',
  webDir: 'dist/frontend/browser',
  server: {
    // Production: point at your hosted API. The Angular app uses relative
    // /api + /socket.io URLs so the same bundle works on web and mobile.
    androidScheme: 'https',
    allowNavigation: ['voxpilot.ai', '*.voxpilot.ai'],
  },
  android: { allowMixedContent: false },
};

export default config;
