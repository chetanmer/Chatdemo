import React, { useContext, useEffect, useState, useRef, memo, useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, PermissionsAndroid, Platform, LayoutAnimation, UIManager, StatusBar } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
    createAgoraRtcEngine,
    ChannelProfileType,
    ClientRoleType,
    RtcSurfaceView,
    RenderModeType,
} from 'react-native-agora';
import { themecontext } from '../utils/ThemeContext';
import { horizontalscale, moderateScale, scaleFont, verticalScale } from '../utils/DesignHelper';
import MatIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import MIcon from 'react-native-vector-icons/MaterialIcons'
import FontIcon from 'react-native-vector-icons/FontAwesome'
import FeaIcon from 'react-native-vector-icons/Feather'
import firestore from '@react-native-firebase/firestore'
import { AGORA_APP_ID } from '@env'

const APP_ID = AGORA_APP_ID;

const CallTimer = memo(({ seconds }) => {
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatTime(seconds)}</Text>
        </View>
    );
});

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


const VideoCallScreen = ({ route }) => {
    const [remoteUid, setRemoteUid] = useState(null);
    const [joined, setJoined] = useState(false);
    const [mute, setMute] = useState(false);
    const [speaker, setSpeaker] = useState(true);
    const [video, setVideo] = useState(true);
    const [seconds, setSeconds] = useState(0)

    const [isSwap, setIsSwap] = useState(false);
    const engineRef = useRef(null);

    const isFocused = useIsFocused();
    const { theme } = useContext(themecontext);
    const navigation = useNavigation();
    const { callId } = route.params || {};
    const hasNavigated = useRef(false);


    useEffect(() => {
        if (isFocused) {
            setupAgora();
        } else {
            // When user leaves screen, kill engine to release camera/mic
            destroyAgora();
        }

        return () => destroyAgora();
    }, [isFocused]);

    const safeGoBack = () => {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        navigation.goBack();
    };

    useEffect(() => {
        if (Platform.OS === 'android') {
            UIManager.setLayoutAnimationEnabledExperimental?.(true);
        }
    }, []);

    const setupAgora = async () => {
        try {
            const granted = await requestPermissions();
            if (!granted) return;

            const engine = createAgoraRtcEngine();
            engineRef.current = engine;

            // Initialize
            engine.initialize({
                appId: APP_ID,
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
            });

            // Enable Modules
            engine.enableAudio();
            engine.enableVideo();
            engine.startPreview();

            // 🎧 Set audio profile optimized for speech
            engine.setAudioProfile(
                1, // AUDIO_PROFILE_SPEECH_STANDARD
                3  // AUDIO_SCENARIO_DEFAULT
            );

            // 📢 Default route to speaker (important)
            engine.setDefaultAudioRouteToSpeakerphone(true);
            // engine.setEnableSpeakerphone(true);

            engine.muteLocalAudioStream(mute); // Ensures engine matches 'mute' state
            engine.setEnableSpeakerphone(speaker); // Ensures engine matches 'speaker' state
            engine.enableLocalVideo(video); // Ensures engine matches 'video' state

            engine.adjustRecordingSignalVolume(80);
            engine.adjustPlaybackSignalVolume(90);
            engine.setParameters('{"che.audio.enable.ns":true}');
            engine.setParameters('{"che.audio.enable.agc":true}');
            engine.setParameters('{"che.audio.enable.aec":true}');


            // Register Event Handlers
            engine.registerEventHandler({
                onJoinChannelSuccess: (connection, elapsed) => {
                    console.log('Successfully joined channel:', connection.channelId);
                    setJoined(true);
                },
                onUserJoined: (connection, uid) => {
                    console.log('Remote user joined with UID:', uid);
                    setRemoteUid(uid);
                },
                onUserOffline: () => {
                    setRemoteUid(null);
                },
                onError: (err) => console.log('Agora Error:', err),
            });

            // Join the channel (Using App ID only - Token is "")
            engine.joinChannel("", callId || 'test123', 0, {});

        } catch (e) {
            console.log('Setup Error:', e);
        }
    };

    const destroyAgora = async () => {
        if (engineRef.current) {
            try {
                engineRef.current.stopPreview();
                await engineRef.current.leaveChannel();
                engineRef.current.unregisterEventHandler();
                engineRef.current.release();
            } catch (e) {
                console.log('Destroy Error:', e);
            } finally {
                engineRef.current = null;
                setJoined(false);
                setRemoteUid(null);
            }
        }
    };

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const permissions = [
                PermissionsAndroid.PERMISSIONS.CAMERA,
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            ];
            const granted = await PermissionsAndroid.requestMultiple(permissions);
            return (
                granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
                granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
            );
        }
        return true;
    };

    const toggleMute = useCallback(() => {
        const newState = !mute;
        engineRef.current?.muteLocalAudioStream(newState);
        setMute(newState);
    }, [mute])

    const toggleSpeaker = useCallback(() => {
        const newState = !speaker
        engineRef.current?.setEnableSpeakerphone(newState);
        setSpeaker(newState);
    }, [speaker])

    const toggleVideo = useCallback(() => {
        const newState = !video
        engineRef.current?.enableLocalVideo(newState)
        setVideo(newState)
    }, [video]);

    const switchCamera = useCallback(() => {
        engineRef.current?.switchCamera();
    }, []);


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
                setSeconds((prev) => prev + 1)
            }, 1000)
        } else {
            setSeconds(0);
            clearInterval(interval);
        }
        return () => clearInterval(interval)
    }, [joined, remoteUid])

    const handleSwap = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsSwap(prev => !prev);
    }, [])

    useEffect(() => {

        if (!callId) return;

        const unsubscribe = firestore()
            .collection('calls')
            .doc(callId)
            .onSnapshot(doc => {
                const data = doc.data();

                if (!data) return;

                if (['rejected', 'ended', 'missed', 'cancelled'].includes(data?.status)) {
                    safeGoBack();
                }

            });

        return () => unsubscribe();
    }, [callId]);

    // If screen is not focused, don't render anything (kills camera)
    if (!isFocused) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            {isFocused ? (
                <StatusBar
                    barStyle="light-content"
                    backgroundColor="transparent"
                    translucent={true}
                />
            ) : (
                <StatusBar
                    backgroundColor={theme?.background || 'white'}
                    barStyle={theme?.background === 'white' ? 'dark-content' : 'light-content'}
                />
            )}

            {/* REMOTE VIDEO: The other person */}
            <View style={styles.remote}>
                {isSwap ? (
                    <RtcSurfaceView
                        canvas={{ uid: 0 }}
                        style={styles.container}
                    />
                )
                    : remoteUid ? (
                        <RtcSurfaceView
                            canvas={{ uid: remoteUid }}
                            style={styles.container}
                        />
                    ) : (
                        <View style={styles.waitingBox}>
                            <Text style={{ color: theme.textcolor }}>
                                {joined ? "Waiting for other user..." : "Connecting..."}
                            </Text>
                        </View>
                    )}
            </View>

            {/* LOCAL VIDEO: You */}
            {joined && isFocused && (
                <TouchableOpacity
                    style={styles.local}
                    onPress={handleSwap}
                    activeOpacity={0.9}
                >
                    {
                        isSwap ? (
                            <RtcSurfaceView
                                canvas={{ uid: remoteUid }}
                                style={styles.container}
                                zOrderMediaOverlay={true}
                                zOrderOnTop={true}
                            />
                        ) : (
                            <RtcSurfaceView
                                canvas={{ uid: 0 }}
                                style={styles.container}
                                zOrderMediaOverlay={true}
                                zOrderOnTop={true}
                            />
                        )
                    }

                </TouchableOpacity>

            )}

            {
                joined && remoteUid && (
                    <CallTimer seconds={seconds} />
                )
            }

            <View style={styles.btnwrapper}>
                <ControlButton
                    style={[{ backgroundColor: theme.btncolor }]}
                    onPress={toggleMute}
                >
                    <MatIcon name={mute ? 'microphone-off' : 'microphone'}
                        size={moderateScale(28)} color={mute ? '#E53935' : theme.textcolor} />
                </ControlButton>

                <ControlButton
                    style={[{ backgroundColor: theme.btncolor }]}
                    onPress={toggleVideo}
                >
                    <FeaIcon name={video ? "video" : "video-off"} size={moderateScale(28)} color={!video ? '#E53935' : theme.textcolor} />
                </ControlButton>
                <ControlButton
                    style={[styles.endCallbtn]}
                    onPress={endCall}
                >
                    <MIcon name={"call-end"} size={moderateScale(28)} color={theme.textcolor} />
                </ControlButton>
                <ControlButton
                    style={[{ backgroundColor: theme.btncolor }]}
                    onPress={switchCamera}
                >
                    <MatIcon name='camera-flip-outline' size={moderateScale(28)} color={theme.textcolor} />
                </ControlButton>
                <ControlButton
                    style={[
                        { backgroundColor: theme.btncolor },
                    ]}
                    onPress={toggleSpeaker}
                >
                    <FontIcon name="volume-up" size={moderateScale(28)} color={speaker ? '#1E88E5' : theme.textcolor} />
                </ControlButton>
            </View>

        </View>
    );
};

export default VideoCallScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    remote: { flex: 1 },
    waitingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    local: {
        width: moderateScale(120), height: moderateScale(180),
        position: 'absolute', top: verticalScale(40), right: horizontalscale(20),
        overflow: 'hidden', backgroundColor: '#000', zIndex: 10
    },
    btnwrapper: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: 'transparent',
        position: 'absolute',
        bottom: verticalScale(40),
        paddingHorizontal: horizontalscale(18),
        zIndex: 15
    },
    btn: {
        width: moderateScale(65), height: moderateScale(65),
        justifyContent: 'center', alignItems: "center",
        borderRadius: moderateScale(32.5),
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    endCallText: { color: 'white', fontWeight: 'bold', fontSize: scaleFont(16) },
    endCallbtn:{ backgroundColor: '#E53935', height: moderateScale(75), width: moderateScale(75), borderRadius: moderateScale(37.5) },
    timerContainer: {
        position: 'absolute',
        top: verticalScale(50),
        alignSelf: 'center'
    },
    timerText: {
        fontSize: scaleFont(16),
        fontWeight: '500',
        color: 'white',
        backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background for readability
        paddingHorizontal: horizontalscale(15),
        paddingVertical: verticalScale(5),
        borderRadius: 20,
    },
});