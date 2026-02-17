import { StyleSheet } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { createNavigationContainerRef, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import Signup from '../Screens/Signup';
import Login from '../Screens/Login';
import Mainscreen from '../Screens/Mainscreen';
import ChatScreen from '../Screens/ChatScreen';
import Settings from '../Screens/Settings';
import EditProfile from '../Screens/EditProfile';
import { themecontext } from '../utils/ThemeContext';
import VideoCallScreen from '../Screens/VideoCallScreen';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native'
import IncomingCallScreen from '../Screens/IncomingCallScreen';
import VoiceCallScreen from '../Screens/VoiceCallScreen';

const stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

const Navigator = ({ user, allUser }) => {
  const { theme } = useContext(themecontext);

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.background
    }
  };

  useEffect(() => {

    // App opened from background
    const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
      if (remoteMessage?.data?.type === 'call') {
        if (navigationRef.isReady()) {
          navigationRef.navigate('IncomingCallScreen', {
            callId: remoteMessage.data.callId,
            // isCaller: false,
          });
        }
      }
    });

    // App opened from killed state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage?.data?.type === 'call') {
          if (navigationRef.isReady()) {
            navigationRef.navigate('IncomingCallScreen', {
              callId: remoteMessage.data.callId,
              // isCaller: false,
            });
          }
        }
      });

    // Screen opened when app is in forground
    const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {

      const callType = detail.notification?.data?.callType; // 👈 GET THIS
      console.log(callType);

      // When user taps notification body
      if (type === EventType.PRESS) {
        const callId = detail.notification?.data?.callId;

        if (callId && navigationRef.isReady()) {
          navigationRef.navigate('IncomingCallScreen', {
            callId: callId,
            // isCaller: false,
          });
        }
        notifee.cancelNotification(detail.notification.id); // ✅ ADD THIS

      }

      // When user taps Accept or Reject buttons
      if (type === EventType.ACTION_PRESS) {

        const callId = detail.notification?.data?.callId;

        if (detail.pressAction.id === 'Accept') {
          console.log('Accepted');

          if (callId && navigationRef.isReady()) {
            navigationRef.navigate('IncomingCallScreen', {
              callId,
            });
          }
          notifee.cancelNotification(detail.notification.id);
        }

        if (detail.pressAction.id === 'Reject') {
          console.log('Rejected');
          notifee.cancelNotification(detail.notification.id);
        }
      }

    });




    return () => {
      unsubscribe();
      unsubscribeNotifee();
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <stack.Navigator screenOptions={{ headerShown: false }}>

        {!user ? (
          <>
            <stack.Screen name="Login" component={Login} />
            <stack.Screen name="Signup" component={Signup} />
          </>
        ) : (
          <>
            <stack.Screen name="Mainscreen">
              {(props) => <Mainscreen {...props} user={user} allUser={allUser} />}
            </stack.Screen>
            <stack.Screen name="Settings" component={Settings} />
            <stack.Screen name="ChatScreen" component={ChatScreen} />
            <stack.Screen name="EditProfile" component={EditProfile} />
            <stack.Screen name="IncomingCallScreen" component={IncomingCallScreen} />
            <stack.Screen name="VoiceCallScreen" component={VoiceCallScreen} />
            <stack.Screen name="VideoCallScreen" component={VideoCallScreen} />
          </>
        )}

      </stack.Navigator>
    </NavigationContainer>
  );
};
export default Navigator;
