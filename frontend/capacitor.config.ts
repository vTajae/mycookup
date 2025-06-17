import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mycookup.app',
  appName: 'MyCookup',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  }
};

export default config;
