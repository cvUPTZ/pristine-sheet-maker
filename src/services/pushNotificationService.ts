
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class PushNotificationService {
  static async initialize() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only work on native platforms');
      return;
    }

    // Request permission for push notifications
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();
    }

    // Request permission for local notifications
    await LocalNotifications.requestPermissions();

    // Setup listeners
    this.setupListeners();
  }

  static setupListeners() {
    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ' + token.value);
      // Send this token to your server to enable push notifications
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received: ', notification);
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed', notification.actionId, notification.inputValue);
    });
  }

  static async sendLocalBatteryNotification(batteryLevel: number, trackerName: string) {
    if (!Capacitor.isNativePlatform()) {
      console.log('Local notifications only work on native platforms');
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Low Battery Alert',
            body: `${trackerName}'s device battery is at ${batteryLevel}%. Please charge soon.`,
            id: Date.now(),
            sound: 'default',
            actionTypeId: 'BATTERY_LOW',
            extra: {
              batteryLevel,
              trackerName,
              type: 'battery_warning'
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  static async sendMatchAssignmentNotification(matchName: string, eventTypes: string[]) {
    if (!Capacitor.isNativePlatform()) {
      console.log('Local notifications only work on native platforms');
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'New Match Assignment',
            body: `You've been assigned to track ${matchName}. Events: ${eventTypes.join(', ')}`,
            id: Date.now(),
            sound: 'default',
            actionTypeId: 'MATCH_ASSIGNMENT',
            extra: {
              matchName,
              eventTypes,
              type: 'match_assignment'
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error scheduling match assignment notification:', error);
    }
  }

  static async sendVideoAssignmentNotification(matchName: string | null, videoTitle: string) {
    if (!Capacitor.isNativePlatform()) {
      console.log('Local notifications only work on native platforms');
      return;
    }

    try {
      let bodyText = `You've been assigned to track video: "${videoTitle}".`;
      if (matchName) {
        bodyText = `You've been assigned to video "${videoTitle}" for match: ${matchName}.`;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'New Video Tracking Assignment',
            body: bodyText,
            id: Date.now(), // Consider a more unique ID if needed
            sound: 'default',
            actionTypeId: 'VIDEO_ASSIGNMENT', // New action type
            extra: {
              matchName,
              videoTitle,
              type: 'video_assignment'
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error scheduling video assignment notification:', error);
    }
  }
}
