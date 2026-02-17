import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View
} from 'react-native'
import React, {
  useCallback,
  useContext,
  useRef,
  useState,
  useMemo
} from 'react'
import CustomInput from '../CustomComponent/CustomInput'
import {
  horizontalscale,
  moderateScale,
  scaleFont,
  verticalScale
} from '../utils/DesignHelper'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth'
import Icon from 'react-native-vector-icons/FontAwesome'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { themecontext } from '../utils/ThemeContext'

const { height } = Dimensions.get('screen')

const MESSAGES = {
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
  "auth/requires-recent-login": "Please log in again to continue."
}

const getFirebaseErrorMessage = code =>
  MESSAGES[code] || `Unexpected error [${code}]`

const Login = () => {
  const { theme } = useContext(themecontext)
  const navigation = useNavigation()

  const [email, setemail] = useState('')
  const [pass, setpass] = useState('')
  const [error, seterror] = useState({})
  const [showpass, setShowpass] = useState(false)
  const [loading, setLoading] = useState(false)

  const emailref = useRef()
  const passref = useRef()

  const validateSignup = useCallback((email, pass) => {
    let errors = {}
    let isValid = true

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const passwordRegex = /^\d{6,12}$/

    if (!email || !emailRegex.test(email)) {
      errors.email = "Enter a valid email address."
      isValid = false
    }

    if (!pass || !passwordRegex.test(pass)) {
      errors.pass = "Password must be 6–12 digits."
      isValid = false
    }

    return { isValid, errors }
  }, [])

  const handleLogin = useCallback(async () => {
    const { isValid, errors } = validateSignup(email, pass)
    seterror(errors)

    if (!isValid) return

    setLoading(true)
    try {
      await signInWithEmailAndPassword(getAuth(), email, pass)
      ToastAndroid.show("Login successful", ToastAndroid.SHORT)
    } catch (err) {
      seterror({ general: getFirebaseErrorMessage(err.code) })
    } finally {
      setLoading(false)
    }
  }, [email, pass, validateSignup])

  useFocusEffect(
    useCallback(() => {
      // RESET STATE
      setemail('');
      setpass('');
      seterror({});
      setShowpass(false);
      setLoading(false);

      return () => { }; // cleanup not needed here
    }, [])
  );
  const themedContainer = useMemo(
    () => [styles.container, { backgroundColor: theme.background }],
    [theme.background]
  )

  const themedCard = useMemo(
    () => [styles.card, { backgroundColor: theme.viewcolor }],
    [theme.viewcolor]
  )

  return (
    <View style={themedContainer}>
      {/* 🔑 YOUR KeyboardAwareScrollView */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        extraScrollHeight={verticalScale(80)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* CARD */}
        <View style={themedCard}>

          {/* FLOATING HEADER */}
          <View style={styles.headerBadge}>
            <Text style={styles.headerText}>Login</Text>
          </View>

          <CustomInput
            placeholder="Enter Your Email"
            value={email}
            ref={emailref}
            returnKeyType="next"
            onSubmitEditing={() => passref.current.focus()}
            autoCapitalize="none"
            maxLength={30}
            onChangeText={setemail}
          />
          {error.email && <Text style={styles.errortext}>{error.email}</Text>}

          <View style={styles.passcontainer}>
            <CustomInput
              placeholder="Enter Your Password"
              value={pass}
              ref={passref}
              returnKeyType="done"
              secureTextEntry={!showpass}
              maxLength={12}
              onChangeText={setpass}
            />
            <TouchableOpacity
              style={styles.togglebutton}
              onPress={() => setShowpass(!showpass)}
              activeOpacity={0.7}
            >
              <Icon
                name={showpass ? 'eye' : 'eye-slash'}
                size={moderateScale(20)}
                color={theme.textcolor}
              />
            </TouchableOpacity>
          </View>
          {error.pass && <Text style={styles.errortext}>{error.pass}</Text>}

          {loading ? (
            <View style={styles.btn}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={handleLogin}>
              <Text style={styles.btntxt}>Sign In</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footerRow}>
            <Text style={{ color: theme.textcolor }}>
              Don’t have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signUpLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>

          {error.general && (
            <Text style={styles.generalError}>{error.general}</Text>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  )
}

export default Login

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  /* 👇 YOUR ORIGINAL SCROLL LOGIC */
  scrollContent: {
    flexGrow: 1,
    paddingTop: height * 0.25,
    paddingHorizontal: horizontalscale(10)
  },

  /* CARD DESIGN */
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
  btntxt: {
    color: 'white',
    fontSize: scaleFont(18),
    fontWeight: '600'
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: verticalScale(15)
  },
  signUpLink: {
    color: '#075E54',
    fontWeight: 'bold'
  },

  errortext: {
    color: 'red',
    marginTop: verticalScale(5)
  },
  generalError: {
    color: 'red',
    textAlign: 'center',
    marginTop: verticalScale(10)
  }
})
