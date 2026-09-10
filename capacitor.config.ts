import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeroclub.app',
  appName: 'Zero Club',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    // Edge to edge: the web layer runs up behind the status bar and the Dynamic
    // Island, and the app pads itself with env(safe-area-inset-*). 'always'
    // made iOS inset the content instead, leaving a band above the header.
    contentInset: 'never',
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
