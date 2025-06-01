
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.matchscribeanalytics',
  appName: 'match-scribe-analytics',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: "https://74280347-ef15-4f4a-8bd7-8fa8910fd688.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav"
    }
  }
};

export default config;
