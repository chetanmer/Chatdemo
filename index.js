/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import App from './App';
import { name as appName } from './app.json';
import { ThemeProvider } from './src/utils/ThemeContext';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://fca06eb139fc9b1627065a2c828ab9a9@o4510911317278720.ingest.us.sentry.io/4510911318654976',
  sendDefaultPii: true,
  enableLogs: true,
});

// Optional: ignore log warnings
LogBox.ignoreAllLogs();
crashlytics().setCrashlyticsCollectionEnabled(true);

// 🔥 GLOBAL JS CRASH HANDLER
const defaultHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  crashlytics().recordError(error);
  Sentry.captureException(error); // 👈 VERY IMPORTANT
  defaultHandler(error, isFatal);
});

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  // Notifee usually handles the display automatically for "notification" payloads,
  // but if you send "data-only" messages, you might need notifee.displayNotification here.
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS) {
    const callId = detail.notification?.data?.callId;

    if (detail.pressAction.id === 'Accept') {
      console.log('Accepted in background', callId);
      // TODO: update firestore call status here
    }

    if (detail.pressAction.id === 'Reject') {
      console.log('Rejected in background', callId);
      // TODO: update firestore call status here
    }

    await notifee.cancelNotification(detail.notification.id);
  }
});

const Root = Sentry.wrap(() => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
))

AppRegistry.registerComponent(appName, () => Root);
