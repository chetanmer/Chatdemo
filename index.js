/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import App from './App';
import { name as appName } from './app.json';
import { ThemeProvider } from './src/utils/ThemeContext';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';


// Optional: ignore log warnings
LogBox.ignoreAllLogs();

// Enable Crashlytics
crashlytics().setCrashlyticsCollectionEnabled(true);

// 🔥 GLOBAL JS CRASH HANDLER
const defaultHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  crashlytics().recordError(error);
  defaultHandler(error, isFatal);
});

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  // Notifee usually handles the display automatically for "notification" payloads,
  // but if you send "data-only" messages, you might need notifee.displayNotification here.
});



const Root = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

AppRegistry.registerComponent(appName, () => Root);
