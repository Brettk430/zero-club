import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeroclub.app',
  appName: 'Zero Club',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    // The shell is the brand's ground colour, so overscroll and the area behind
    // the keyboard never flash white.
    backgroundColor: '#071615',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,      // hidden from JS once React has something to show
      backgroundColor: '#071615',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#C6FF3D',
    },
  },
};

export default config;
