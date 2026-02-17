import { ActivityIndicator, Dimensions, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useContext, useRef, useState, useMemo } from 'react'
import CustomInput from '../CustomComponent/CustomInput'
import { horizontalscale, moderateScale, scaleFont, verticalScale } from '../utils/DesignHelper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword, getAuth } from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/FontAwesome'
import firestore from '@react-native-firebase/firestore';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { themecontext } from '../utils/ThemeContext';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('screen');

// Optimization: Move static object outside component to prevent recreation
const FIREBASE_MESSAGES = {
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/network-request-failed": "Network error. Please check your connection.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/internal-error": "Something went wrong. Please try again.",
  "auth/email-already-in-use": "This email is already registered.",
  "auth/weak-password": "Password is too weak. Try again.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Invalid email or password. Please try again.",
  "auth/invalid-login-credentials": "Invalid email or password. Please try again.",
  "auth/user-disabled": "Your account has been disabled. Contact support.",
  "auth/user-token-expired": "Your session has expired. Please log in again.",
  "auth/requires-recent-login": "Please log in again to continue.",
};

const getFirebaseErrorMessage = (code) => FIREBASE_MESSAGES[code] || `An unexpected error occurred. [${code}]`;

const Signup = () => {
  const { theme } = useContext(themecontext)
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [email, setemail] = useState('');
  const [pass, setpass] = useState('');
  const [cpass, setcpass] = useState('');
  const [error, seterror] = useState({});
  const [showpass, setShowpass] = useState(false);
  const [showcpass, setShowcpass] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameref = useRef();
  const emailref = useRef();
  const passref = useRef();
  const cpassref = useRef();

  // Optimization: Memoize validation logic
  const validateSignup = useCallback((name, email, pass, cpass) => {
    let errors = {};
    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^\d{6,12}$/;

    if (!name || name.trim().length < 3) {
      errors.name = "Please enter your full name (at least 3 characters).";
      isValid = false;
    }
    if (!email || !emailRegex.test(email)) {
      errors.email = "Enter a valid email address.";
      isValid = false;
    }
    if (!pass || !passwordRegex.test(pass)) {
      errors.pass = "Password must be 6 to 12 digits long (numbers only).";
      isValid = false;
    }
    if (pass !== cpass) {
      errors.cpass = "Passwords do not match.";
      isValid = false;
    }

    return { isValid, errors };
  }, []);

  // Optimization: Memoize focus helper
  const focusShift = useCallback((ref) => {
    ref.current?.focus()
  }, []);

  const handleSignup = useCallback(async () => {
    const { isValid, errors } = validateSignup(name, email, pass, cpass);
    seterror(errors);

    if (!isValid) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(getAuth(), email, pass);
      const user = userCredential.user;

      // console.log("user ++ ",user);
      
      await user.updateProfile({ displayName: name });

      const fcmToken = await messaging().getToken();

      await firestore().collection('users').doc(user.uid).set({
        uid: user.uid,
        name: name,
        email: user.email,
        fcmToken:fcmToken,
        photoURL: user.photoURL || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
      })

      await AsyncStorage.setItem('fcmToken',fcmToken);

      ToastAndroid.show("Account created successfully", ToastAndroid.SHORT)
    } catch (error) {
      seterror({ general: getFirebaseErrorMessage(error.code) })
    } finally {
      setLoading(false)
    }
  }, [name, email, pass, cpass, validateSignup]);

  useFocusEffect(
    useCallback(() => {
      setName('');
      setemail('');
      setpass('');
      setcpass('');
      seterror({});
      setShowpass(false);
      setShowcpass(false);
      setLoading(false);

      return () => { };
    }, [])
  )
  // Optimization: useMemo for themed styles
  const themedContainer = useMemo(() => [
    styles.container,
    { backgroundColor: theme.background }
  ], [theme.background]);

  const themedCard = useMemo(
    () => [styles.card, { backgroundColor: theme.viewcolor }],
    [theme.viewcolor]
  )

  return (
    <View style={themedContainer}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={verticalScale(80)}
        keyboardShouldPersistTaps={'handled'}
        showsVerticalScrollIndicator={false}
      >
        <View style={themedCard}>

          {/* FLOATING HEADER */}
          <View style={styles.headerBadge}>
            <Text style={styles.headerText}>Sign Up</Text>
          </View>


          <CustomInput
            placeholder={"Enter Your Name"}
            value={name}
            ref={nameref}
            returnKeyType={'next'}
            onSubmitEditing={() => focusShift(emailref)}
            maxLength={30}
            onChangeText={setName}
          />
          {error.name && <Text style={styles.errortext}>{error.name}</Text>}

          <CustomInput
            placeholder={"Enter Your Email"}
            value={email}
            ref={emailref}
            returnKeyType={'next'}
            onSubmitEditing={() => focusShift(passref)}
            autoCapitalize="none"
            maxLength={30}
            onChangeText={setemail}
          />
          {error.email && <Text style={styles.errortext}>{error.email}</Text>}

          <View style={styles.passcontainer}>
            <CustomInput
              placeholder={"Enter Your Password"}
              value={pass}
              ref={passref}
              returnKeyType={'next'}
              onSubmitEditing={() => focusShift(cpassref)}
              secureTextEntry={!showpass}
              maxLength={12}
              onChangeText={setpass}
            />
            <TouchableOpacity
              onPress={() => setShowpass(prev => !prev)}
              style={styles.togglebutton}
            >
              <Icon name={showpass ? 'eye-slash' : 'eye'} size={moderateScale(20)} color={theme.textcolor} />
            </TouchableOpacity>
          </View>
          {error.pass && <Text style={styles.errortext}>{error.pass}</Text>}

          <View style={styles.passcontainer}>
            <CustomInput
              placeholder={"Enter Your Confirm Password"}
              value={cpass}
              ref={cpassref}
              returnKeyType={'done'}
              secureTextEntry={!showcpass}
              maxLength={12}
              onChangeText={setcpass}
            />
            <TouchableOpacity
              onPress={() => setShowcpass(prev => !prev)}
              style={styles.togglebutton}
            >
              <Icon name={showcpass ? 'eye-slash' : 'eye'} size={moderateScale(20)} color={theme.textcolor} />
            </TouchableOpacity>
          </View>
          {error.cpass && <Text style={styles.errortext}>{error.cpass}</Text>}

          {loading ? (
            <View style={styles.btn}>
              <ActivityIndicator animating={loading} size={'large'} color={"white"} />
            </View>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={handleSignup}>
              <Text style={styles.txt}>SignUp</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footerRow}>
            <Text style={{ color: theme.textcolor }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {error.general && (
            <Text style={[styles.errortext, styles.centerError]}>
              {error.general}
            </Text>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  )
}

export default Signup

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: height * 0.2,
    paddingHorizontal: horizontalscale(10)
  },

  /* SAME CARD AS LOGIN */
  card: {
    width: '90%',
    maxWidth: horizontalscale(400),
    borderRadius: 20,
    padding: moderateScale(20),
    alignSelf: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },

  headerBadge: {
    alignSelf: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: horizontalscale(30),
    paddingVertical: verticalScale(10),
    borderRadius: 30,
    marginBottom: verticalScale(25)
  },

  headerText: {
    color: '#fff',
    fontSize: scaleFont(18),
    fontWeight: '600'
  },

  passcontainer: {
    justifyContent: 'center'
  },

  togglebutton: {
    position: 'absolute',
    right: horizontalscale(15),
    top: verticalScale(10),
    padding: moderateScale(8),
    zIndex: 10
  },

  btn: {
    height: moderateScale(50),
    width: moderateScale(300),
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075E54',
    marginTop: verticalScale(30)
  },

  txt: {
    color: 'white',
    fontSize: scaleFont(18),
    fontWeight: '600'
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: verticalScale(15)
  },

  signInLink: {
    color: '#075E54',
    fontWeight: 'bold'
  },

  errortext: {
    color: 'red',
    marginTop: verticalScale(5)
  },

  centerError: {
    textAlign: 'center',
    marginTop: verticalScale(10)
  }
})
