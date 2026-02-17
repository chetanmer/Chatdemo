import React, { useContext, useEffect, useState, useRef, useCallback, memo } from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    StyleSheet,
    PermissionsAndroid,
    Platform,
    StatusBar,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
    createAgoraRtcEngine,
    ChannelProfileType,
} from 'react-native-agora';
import { themecontext } from '../utils/ThemeContext';
import {
    horizontalscale,
    moderateScale,
    scaleFont,
    verticalScale
} from '../utils/DesignHelper';
import MatIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MIcon from 'react-native-vector-icons/MaterialIcons';
import FontIcon from 'react-native-vector-icons/FontAwesome';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';
import auth, { getAuth } from '@react-native-firebase/auth';
import { AGORA_APP_ID } from '@env'

const APP_ID = AGORA_APP_ID;

const CallerTime = memo(({ seconds }) => {
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    };
    return (
        <Text style={styles.timerText}>
            {formatTime(seconds)}
        </Text>
    )
})

const ControlButton = memo(({ onPress, style, children }) => {
    return (
        <TouchableOpacity
            style={[styles.btn, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {children}
        </TouchableOpacity>
    )
})

const VoiceCallScreen = ({ route }) => {

    const [remoteUid, setRemoteUid] = useState(null);
    const [joined, setJoined] = useState(false);
    const [mute, setMute] = useState(false);
    const [speaker, setSpeaker] = useState(false);
    const [seconds, setSeconds] = useState(0);

    const engineRef = useRef(null);
    const isFocused = useIsFocused();
    const { theme } = useContext(themecontext);
    const navigation = useNavigation();
    const { callId, isCaller } = route.params || {};
    const hasNavigated = useRef(false);
    const [DisplayImage, setDisplayImage] = useState(null);
    const [DisplayName, setDisplayName] = useState('');

    useEffect(() => {
        if (isFocused) setupAgora();
        else destroyAgora();

        return () => destroyAgora();
    }, [isFocused]);

    const setupAgora = async () => {
        const granted = await requestPermissions();
        if (!granted) return;

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;

        engine.initialize({
            appId: APP_ID,
            channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        engine.enableAudio();
        engine.setAudioProfile(1, 3);
        engine.setDefaultAudioRouteToSpeakerphone(false);
        engine.setEnableSpeakerphone(speaker);
        engine.muteLocalAudioStream(mute);

        engine.adjustRecordingSignalVolume(80);
        engine.adjustPlaybackSignalVolume(90);
        engine.setParameters('{"che.audio.enable.ns":true}');
        engine.setParameters('{"che.audio.enable.agc":true}');
        engine.setParameters('{"che.audio.enable.aec":true}');

        engine.registerEventHandler({
            onJoinChannelSuccess: () => setJoined(true),
            onUserJoined: (_, uid) => setRemoteUid(uid),
            onUserOffline: () => setRemoteUid(null),
        });

        engine.joinChannel("", callId || 'voiceTest', 0, {});
    };

    const safeGoBack = () => {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        navigation.goBack();
    };

    const destroyAgora = async () => {
        if (engineRef.current) {
            await engineRef.current.leaveChannel();
            engineRef.current.release();
            engineRef.current = null;
            setJoined(false);
            setRemoteUid(null);
        }
    };

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    const toggleMute = useCallback(() => {
        const newState = !mute;
        engineRef.current?.muteLocalAudioStream(newState);
        setMute(newState);
    }, [mute])

    const toggleSpeaker = useCallback(() => {
        const newState = !speaker;
        engineRef.current?.setEnableSpeakerphone(newState);
        setSpeaker(newState);
    }, [speaker])

    const endCall = async () => {
        if (!callId) {
            safeGoBack();
            return;
        }

        await firestore()
            .collection('calls')
            .doc(callId)
            .update({ status: 'ended' });

        await destroyAgora();
        safeGoBack();
    };


    useEffect(() => {
        let interval;
        if (remoteUid && joined) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setSeconds(0);
        }
        return () => clearInterval(interval);
    }, [joined, remoteUid]);

    useEffect(() => {

        if (!callId) return;

        const unsubscribe = firestore()
            .collection('calls')
            .doc(callId)
            .onSnapshot(doc => {
                const data = doc.data();

                if (!data) return;
                const currentUserid = auth().currentUser?.uid;

                const isCaller = currentUserid === data.callerId;

                const newImage = isCaller ? data.receiverImage : data.callerImage;
                const newName = isCaller ? data.receiverName : data.callerName;

                setDisplayImage(prev => prev !== newImage ? newImage : prev);
                setDisplayName(prev => prev !== newName ? newName : prev);



                if (['rejected', 'ended', 'missed', 'cancelled'].includes(data?.status)) {
                    safeGoBack();
                }

            });

        return () => unsubscribe();
    }, [callId]);


    if (!isFocused) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Center Content */}
            <View style={styles.centerContainer}>
                <FastImage
                    source={
                        DisplayImage
                            ? {
                                uri: DisplayImage,
                                cache: FastImage.cacheControl.immutable,
                                priority: FastImage.priority.high,
                            }
                            : require('../utils/images/user.jpg')
                    }
                    resizeMode={FastImage.resizeMode.cover}
                    style={styles.img}
                />

                <Text style={[styles.callername, { color: theme.textcolor }]}>
                    {DisplayName}
                </Text>
                <Text style={[styles.statusText, { color: theme.textcolor }]}>
                    {remoteUid ? "In Voice Call" : joined ? "Ringing..." : "Connecting..."}
                </Text>

                {joined && remoteUid && (
                    <CallerTime seconds={seconds} />
                )}
            </View>

            {/* Bottom Controls */}
            <View style={styles.btnwrapper}>

                <ControlButton
                    style={{ backgroundColor: theme.btncolor }}
                    onPress={toggleMute}
                >
                    <MatIcon
                        name={mute ? 'microphone-off' : 'microphone'}
                        size={moderateScale(26)}
                        color={mute ? '#E53935' : theme.textcolor}
                    />
                </ControlButton>

                <ControlButton
                    style={styles.endCallBtn}
                    onPress={endCall}
                >
                    <MIcon
                        name="call-end"
                        size={moderateScale(28)}
                        color="#fff"
                    />
                </ControlButton>

                <ControlButton
                    style={{ backgroundColor: theme.btncolor }}
                    onPress={toggleSpeaker}
                >
                    <FontIcon
                        name="volume-up"
                        size={moderateScale(24)}
                        color={speaker ? '#1E88E5' : theme.textcolor}
                    />
                </ControlButton>

            </View>
        </View>
    );
};

export default VoiceCallScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
    },

    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    avatarCircle: {
        width: moderateScale(140),
        height: moderateScale(140),
        borderRadius: moderateScale(70),
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },

    statusText: {
        fontSize: scaleFont(18),
        fontWeight: '600',
        marginBottom: verticalScale(8),
    },

    timerText: {
        fontSize: scaleFont(16),
        color: '#1E88E5',
        fontWeight: '500',
    },

    btnwrapper: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingBottom: verticalScale(40),
    },

    btn: {
        width: moderateScale(65),
        height: moderateScale(65),
        borderRadius: moderateScale(32.5),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },

    endCallBtn: {
        width: moderateScale(75),
        height: moderateScale(75),
        borderRadius: moderateScale(37.5),
        backgroundColor: '#E53935',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
    img: {
        width: moderateScale(140),
        height: moderateScale(140),
        borderRadius: moderateScale(70),
        marginBottom: verticalScale(15),
        borderWidth: 3,
        borderColor: '#fff'
    },
    callername: {
        fontSize: scaleFont(26), fontWeight: 'bold', marginBottom: verticalScale(10)
    },
});
