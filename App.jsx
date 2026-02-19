import {
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigator from './src/Navigation/Navigator';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import NoInternetScreen from './src/Screens/NoInternetScreen';
import Animation from './src/Screens/Animation';
import { themecontext, ThemeProvider } from './src/utils/ThemeContext'; // Ensure this is exported correctly
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidCategory,
  AndroidImportance,
} from '@notifee/react-native';
import * as Sentry from '@sentry/react-native';

// 1. Create a "Main" component to handle the logic that needs the Theme
const AppContent = () => {
  // Now this will work because it's inside <ThemeProvider>
  const { theme } = useContext(themecontext);

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [allUser, setAllUser] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const setupNotifications = async () => {
    // Create Channel
    await notifee.createChannel({
      id: 'calls',
      name: 'Incoming Calls',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    });

    // Request Permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    }
  };

  useEffect(() => {
    setupNotifications();

    const unsubscribeFCM = messaging().onMessage(async remoteMessage => {
      await notifee.displayNotification({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: { callId: remoteMessage.data.callId },
        android: {
          channelId: 'calls',
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.CALL,
          pressAction: { id: 'default', launchActivity: 'default' },
          fullScreenAction: {
            id: 'default',
            launchActivity: 'default',
          },
          actions: [
            {
              title: 'Reject',
              pressAction: { id: 'Reject' },
            },
            {
              title: 'Accept',
              pressAction: { id: 'Accept' },
            },
          ],
        },
      });
    });

    // return unsubscribeFCM;
    return () => {
      unsubscribeFCM();
      // unsubscribeNotifee();
    };
  }, []);

  // Auth & Firestore Listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(getAuth(), firebaseUser => {
      setUser(firebaseUser);
      setAuthChecked(true);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!user) {
      setAllUser([]);
      return;
    }

    const unsubscribeStore = firestore()
      .collection('users')
      .onSnapshot(snapshot => {
        const list = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== user.uid);

        // OPTIMIZATION: Only update state if the data actually changed
        setAllUser(prevUserList => {
          if (JSON.stringify(prevUserList) === JSON.stringify(list)) {
            return prevUserList; // This prevents a re-render!
          }
          return list;
        });
      });

    return unsubscribeStore;
  }, [user?.uid]); // Use user.uid specifically to avoid re-running if the user object reference changes

  // Internet Listener
  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return unsubscribeNet;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer); // Clean up if component unmounts
  }, []);

  if (showSplash || !authChecked) {
    return <Animation />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Fallback to 'white' if theme is not yet loaded */}
      <StatusBar
        backgroundColor={theme?.background || 'white'}
        barStyle={
          theme?.background === 'white' ? 'dark-content' : 'light-content'
        }
      />

      <Navigator user={user} allUser={allUser} />

      <NoInternetScreen
        visible={!isConnected}
        onRetry={() =>
          NetInfo.fetch().then(state => setIsConnected(state.isConnected))
        }
      />
    </GestureHandlerRootView>
  );
};

// 2. The actual App component just provides the context
const App = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
