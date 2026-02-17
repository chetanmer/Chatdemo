import { FlatList, PermissionsAndroid, Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, AppState, Linking, ActivityIndicator, StatusBar, Button } from 'react-native'
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { moderateScale, verticalScale, horizontalscale, scaleFont } from '../utils/DesignHelper';
import Icon from 'react-native-vector-icons/Ionicons'
import { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon2 from 'react-native-vector-icons/MaterialIcons'
import Icon3 from 'react-native-vector-icons/FontAwesome'
import IconFea from 'react-native-vector-icons/Feather'
import { themecontext } from '../utils/ThemeContext';
import AudioRecord from 'react-native-audio-record';
import Sound from 'react-native-sound';
import CustomAudioWaveForm from '../CustomComponent/CustomAudioWaveForm';
import Modal from 'react-native-modal';
import { launchImageLibrary } from 'react-native-image-picker';
import FastImage from 'react-native-fast-image'
import ImageViewer from 'react-native-image-zoom-viewer';
import { BACKEND_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET,AGORA_APP_ID } from '@env'

const ChatScreen = ({ route, navigation }) => {

    const { theme } = useContext(themecontext);

    const { selectedUser } = route.params;
    const currentUser = getAuth().currentUser;


    const [text, setText] = useState('');
    const [messages, setMessages] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef(null);
    const [playingId, setPlayingId] = useState(null); // message id
    const soundRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);
    const [modalvisible, setModalVisible] = useState(false);
    const [modalImage, setModalImage] = useState(false);
    const [selectedImage, setSelectedImage] = useState([]);

    const flatListRef = useRef(null);
    const audioInitializedRef = useRef(false);


    const generateChatId = (uid1, uid2) => {
        return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
    };

    const ChatId = generateChatId(currentUser.uid, selectedUser.uid)

    useEffect(() => {
        const showSub = Keyboard.addListener("keyboardDidShow", () => {
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }, 100);
        });

        return () => {
            showSub.remove();
        };
    }, []);


    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState !== 'active' && soundRef.current) {
                soundRef.current.pause();
                setIsPaused(true); // ✅ keep playingId
            }
        });

        return () => subscription.remove();
    }, []);

    const startVoiceCall = async () => {
        try {
            const callRef = firestore().collection('calls').doc();
            const callId = callRef.id;

            // ✅ Navigate immediately
            navigation.navigate('VoiceCallScreen', {
                callId: callId,
                isCaller: true,
                otherUser: selectedUser
            });

            // ✅ Background tasks
            const performBackgroundTasks = async () => {

                await callRef.set({
                    callerId: currentUser.uid,
                    callerName: currentUser.displayName || "Someone",
                    callerImage: currentUser.photoURL || null,
                    receiverId: selectedUser.uid,
                    receiverName: selectedUser.name,
                    receiverImage: selectedUser.photoURL,
                    status: 'ringing',
                    type: 'voice', // 🔥 changed
                    createdAt: firestore.FieldValue.serverTimestamp(),
                });

                await fetch(`${BACKEND_URL}/send-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: selectedUser.fcmToken,
                        title: 'Incoming Voice Call',
                        body: `${currentUser.displayName || 'Someone'} is calling you`,
                        data: {
                            type: 'call',
                            callId: callId,
                            callerId: currentUser.uid,
                            callType: 'voice', // 🔥 changed
                        },
                    }),
                });

            };

            performBackgroundTasks();

        } catch (error) {
            console.error("Error starting voice call: ", error);
            alert("Could not start voice call");
        }
    };

    const startVideoCall = async () => {
        // 1. Generate a ID locally so we can navigate IMMEDIATELY
        // If you don't have a custom ID, just let Firestore create one, 
        // but move navigation to the TOP.

        try {
            // Create a reference first to get the ID
            const callRef = firestore().collection('calls').doc();
            const callId = callRef.id;

            // 2. NAVIGATE IMMEDIATELY (Don't await anything yet)
            navigation.navigate('VideoCallScreen', {
                callId: callId,
                isCaller: true,
                otherUser: selectedUser
            });

            // 3. Run the heavy stuff in the background (Remove 'await' from the start)
            const performBackgroundTasks = async () => {
                await callRef.set({
                    callerId: currentUser.uid,
                    callerName: currentUser.displayName || "Someone",
                    callerImage: currentUser.photoURL || null,
                    receiverId: selectedUser.uid,
                    status: 'ringing',
                    type: 'video',
                    createdAt: firestore.FieldValue.serverTimestamp(),
                });

                await fetch(`${BACKEND_URL}/send-notification`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: selectedUser.fcmToken, // receiver token
                        title: 'Incoming Video Call',
                        body: `${currentUser.displayName || 'Someone'} is calling you`,
                        data: {
                            type: 'call',
                            callId: callId,
                            callerId: currentUser.uid,
                            callType: 'video',
                        },
                    }),
                });
            };

            performBackgroundTasks(); // Execute without blocking the UI

        } catch (error) {
            console.error("Error starting call: ", error);
            alert("Could not start call");
        }
    };

    const requestImagePermission = async () => {
        if (Platform.OS !== 'android') return true;

        // For Android 14 (API 34) and above
        if (Platform.Version >= 34) {
            const statuses = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED,
            ]);

            const fullAccess = statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED;
            const partialAccess = statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED] === PermissionsAndroid.RESULTS.GRANTED;

            return fullAccess || partialAccess;
        }

        // For Android 13 (API 33)
        if (Platform.Version === 33) {
            const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
            return result === PermissionsAndroid.RESULTS.GRANTED;
        }

        // For Android 12 and below
        const oldResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        return oldResult === PermissionsAndroid.RESULTS.GRANTED;
    };

    const PickImage = async () => {
        // Permission checks (existing logic)
        if (Platform.OS === 'android' && Platform.Version < 33) {
            const hasPermission = await requestImagePermission();
            if (!hasPermission) return;
        }

        launchImageLibrary({
            mediaType: 'photo',
            quality: 0.5,
            includeBase64: true
        }, async (response) => {
            if (response.didCancel || !response.assets) return;

            const asset = response.assets[0];
            const localUri = asset.uri; // This is the path on the phone
            setModalVisible(false);

            // 1. Create the message document first to get an ID
            const messageRef = firestore()
                .collection('chats')
                .doc(ChatId)
                .collection('messages')
                .doc();

            // 2. OPTIMISTIC UPDATE: Save to Firestore using the LOCAL URI
            // The sender will see the image instantly because the file is on their phone
            await messageRef.set({
                type: 'image',
                imageUrl: localUri,
                localPath: localUri,
                sender: currentUser.uid,
                receiver: selectedUser.uid,
                localTime: Date.now(),
                uploading: true, // Flag to show a loader
                delivered: false,
                seen: false
            });

            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

            // 3. BACKGROUND UPLOAD: Start Cloudinary upload
            try {
                const remoteUrl = await uploadImageToCloudinary(asset.base64);

                if (remoteUrl) {
                    // 4. FINAL SWAP: Replace local path with permanent Cloudinary URL
                    // This triggers the onSnapshot, and the "uploading" icon disappears
                    await messageRef.update({
                        imageUrl: remoteUrl,
                        uploading: false
                    });
                }
            } catch (error) {
                console.error("Upload failed", error);
                await messageRef.update({ uploading: false, uploadError: true });
            }
        });
    }

    const uploadImageToCloudinary = async (rawBase64) => {
        try {
            const data = new FormData();
            data.append('file', `data:image/jpeg;base64,${rawBase64}`);
            data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            data.append('cloud_name', CLOUDINARY_CLOUD_NAME);

            let res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data,
            });

            let json = await res.json();
            return json.secure_url; // ← public image URL
        } catch (error) {
            console.log("Upload error:", error);
            return null;
        }
    };

    const initAudioRecorder = async () => {
        if (audioInitializedRef.current) return;

        AudioRecord.init({
            sampleRate: 44100,
            channels: 1,
            bitsPerSample: 16,
            audioSource: 1,
            wavFile: `voice_${Date.now()}.wav`,
        });

        audioInitializedRef.current = true;
    };

    useEffect(() => {
        const msgUnsub = firestore()
            .collection('chats')
            .doc(ChatId)
            .collection('messages')
            .orderBy('localTime', 'desc')
            .onSnapshot(snapshot => {
                const List = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMessages(List);

                // Mark messages as delivered + seen for current chat
                snapshot.docs.forEach(doc => {
                    const data = doc.data();

                    // Message sent by selectedUser → mark seen by me
                    if (data.receiver === currentUser.uid && !data.seen) {
                        doc.ref.update({ delivered: true, seen: true });
                    }

                    // Message sent by me → mark delivered if user opened chat
                    if (data.receiver === selectedUser.uid && !data.delivered) {
                        doc.ref.update({ delivered: true });
                    }
                });
            });

        return () => msgUnsub();
    }, []);

    const uploadAudioToCloudinary = async (filePath) => {
        try {
            const data = new FormData();

            data.append('file', {
                uri: Platform.OS === 'android' ? `file://${filePath}` : filePath,
                type: 'audio/wav',
                name: `voice_${Date.now()}.wav`,
            });

            data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
                {
                    method: 'POST',
                    body: data,
                }
            );

            const json = await res.json();
            return json.secure_url;
        } catch (error) {
            console.log('Cloudinary upload error:', error);
            return null;
        }
    };

    const uploadAndUpdateAudio = async (audioFile, messageRef) => {
        try {
            const audioUrl = await uploadAudioToCloudinary(audioFile);
            if (!audioUrl) return;

            await messageRef.update({
                audioUrl,
                localAudioPath: null,
                uploading: false,
            });
        } catch (error) {
            console.log('Upload failed:', error);

            await messageRef.update({
                uploading: false,
                uploadError: true,
            });
        }
    };


    const requestMicPermission = async () => {
        if (Platform.OS !== 'android') return true;

        try {
            const alreadyGranted = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );

            if (alreadyGranted) {
                return true;
            }

            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );

            if (result === PermissionsAndroid.RESULTS.GRANTED) {
                return true;
            }

            if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                console.log('Permission blocked, open settings');
                // Optional: open app settings
                Linking.openSettings();
            }

            return false;

        } catch (error) {
            console.log('Permission error:', error);
            return false;
        }
    };


    const toggleRecording = async () => {
        if (isRecording) {

            // Stop Recording
            try {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;

                const audioFile = await AudioRecord.stop();
                setIsRecording(false);

                if (!audioFile || recordingTime < 1) return;

                const messageRef = firestore()
                    .collection('chats')
                    .doc(ChatId)
                    .collection('messages')
                    .doc();

                // ✅ instant render
                await messageRef.set({
                    type: 'audio',
                    localAudioPath: audioFile,
                    audioUrl: null,
                    uploading: true,
                    duration: recordingTime,
                    sender: currentUser.uid,
                    receiver: selectedUser.uid,
                    localTime: Date.now(),
                    delivered: false,
                    seen: false,
                });

                setRecordingTime(0);

                // 🔥 background upload (separate function)
                uploadAndUpdateAudio(audioFile, messageRef);

            } catch (err) {
                console.log('Stop record error:', err);
                setIsRecording(false);
            }
        } else {

            // Start Recording
            try {
                const hasPermission = await requestMicPermission();
                if (!hasPermission) return;

                await initAudioRecorder(); // ✅ GUARANTEED INIT

                setIsRecording(true);
                setRecordingTime(0);

                recordingIntervalRef.current = setInterval(() => {
                    setRecordingTime(prev => prev + 1);
                }, 1000);

                await AudioRecord.start();
            } catch (err) {
                console.log('Start record error:', err);
                setIsRecording(false);
            }
        }
    };


    const togglePlayPause = useCallback((id, audioUrl, localAudioPath) => {
        const source = audioUrl || localAudioPath;
        if (!source) return;

        // SAME AUDIO
        if (playingId === id && soundRef.current) {
            if (isPaused) {
                soundRef.current.play(onPlaybackEnd);
                setIsPaused(false);
            } else {
                soundRef.current.pause();
                setIsPaused(true);
            }
            return;
        }

        // STOP OLD AUDIO
        if (soundRef.current) {
            soundRef.current.stop(() => {
                soundRef.current.release();
                soundRef.current = null;
            });
        }
        // PLAY NEW
        const sound = new Sound(source, '', (error) => {
            if (error) {
                console.log('Sound load error', error);
                return;
            }

            soundRef.current = sound;
            setPlayingId(id);
            setIsPaused(false);

            sound.play(onPlaybackEnd);
        });
    }, [playingId, isPaused, onPlaybackEnd])


    const onPlaybackEnd = useCallback(() => {
        setPlayingId(null);
        setIsPaused(false);

        if (soundRef.current) {
            soundRef.current.release();
            soundRef.current = null;
        }
    }, [])


    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.release();
            }
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        };
    }, []);

    const ListExtraData = React.useMemo(() => ({
        playingId,
        isPaused,
        theme
    }), [playingId, isPaused, theme]);

    const sendMessage = useCallback(async () => {
        if (!text.trim()) return;

        await firestore()
            .collection('chats')
            .doc(ChatId)
            .collection('messages')
            .add({
                type: 'text',
                text: text,
                sender: currentUser.uid,
                receiver: selectedUser.uid,
                createdAt: firestore.FieldValue.serverTimestamp(),
                localTime: Date.now(),
                delivered: false,
                seen: false
            });

        setText('');
    }, [text, currentUser.uid, selectedUser.uid, ChatId])

    const renderItem = useCallback(({ item }) => {
        const isMe = item.sender === currentUser.uid;
        const isPlaying = playingId === item.id && !isPaused;
        const imageSource = (isMe && item.localPath) ? item.localPath : item.imageUrl;

        return (
            <View style={[
                styles.msgBox,
                isMe ? styles.myMsg : styles.otherMsg,
                item.type === 'image' && { padding: 0, overflow: 'hidden' }
            ]}>
                {item.type === 'audio' ? (
                    /* --- VOICE CHAT BOX --- */
                    <View style={styles.verticalStack}>
                        <View style={styles.audioRow}>
                            <TouchableOpacity onPress={() => togglePlayPause(item.id, item.audioUrl, item.localAudioPath)}>
                                <Icon name={isPlaying ? 'pause' : 'play'} size={26} color={isMe ? '#fff' : '#000'} />
                            </TouchableOpacity>
                            <CustomAudioWaveForm isPlaying={isPlaying} isMe={isMe} />
                            <Text style={[styles.durationText, { color: isMe ? '#fff' : '#666' }]}>{item.duration}s</Text>
                        </View>

                        {/* Ticks directly under the waveform */}
                        {isMe && (
                            <View style={styles.tickUnderContent}>
                                {item.seen ? <Icon name="checkmark-done" size={15} color="#34B7F1" />
                                    : <Icon name="checkmark-done" size={15} color="#fff" />}
                            </View>
                        )}
                    </View>

                ) : item.type === 'image' ? (
                    /* --- IMAGE BOX --- */
                    <TouchableOpacity
                        style={styles.imageContainer}
                        activeOpacity={0.8}
                        onPress={() => {
                            setSelectedImage([{ url: item.imageUrl }])
                            setModalImage(true);
                        }}
                    >
                        <FastImage source={{ uri: imageSource }} style={styles.chatImage} />
                        {isMe && (
                            <View style={styles.imageTickOverlay}>
                                <Icon name="checkmark-done" size={14} color={item.seen ? "#34B7F1" : "#fff"} />
                            </View>
                        )}
                    </TouchableOpacity>

                ) : (
                    /* --- TEXT MESSAGE BOX --- */
                    <View style={styles.verticalStack}>
                        <Text style={[styles.msgText, !isMe && { color: 'black' }]}>
                            {item.text}
                        </Text>
                        {isMe && (
                            <View style={styles.tickUnderContent}>
                                {item.seen ? <Icon name="checkmark-done" size={15} color="#34B7F1" />
                                    : <Icon name="checkmark-done" size={15} color="#fff" />}
                            </View>
                        )}
                    </View>
                )}

                {/* NO EXTERNAL TICK CONTAINER HERE */}
            </View>
        )
    }, [playingId, theme.viewcolor, isPaused, currentUser.uid, togglePlayPause])
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <View style={styles.headerchild}>
                    <TouchableOpacity
                        style={{ marginRight: horizontalscale(15) }}
                        onPress={() => { navigation.goBack() }}
                    >
                        <Icon2 name={"keyboard-backspace"} size={30} color={theme.textcolor} />
                    </TouchableOpacity>
                    <View style={styles.headerchild}>
                        <Image
                            source={
                                selectedUser.photoURL ?
                                    { uri: selectedUser.photoURL }
                                    : require('../utils/images/user.jpg')
                            }
                            style={styles.Profileimg}
                        />
                        <Text style={[styles.userNameText, { color: theme.textcolor }]}>{selectedUser.name}</Text>
                    </View>
                </View>

                <View style={styles.headerchild}>
                    <TouchableOpacity
                        style={{ marginRight: horizontalscale(25) }}
                        onPress={startVoiceCall}
                    >
                        <Icon2 name={"keyboard-voice"} size={moderateScale(28)} color={theme.textcolor} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={startVideoCall}
                    >
                        <IconFea name="video" size={moderateScale(28)} color={theme.textcolor} />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    style={{ flex: 1, backgroundColor: theme.viewcolor }}
                    extraData={ListExtraData}
                    contentContainerStyle={{ paddingBottom: verticalScale(10) }}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    scrollEventThrottle={16}
                    inverted={true}
                    maintainVisibleContentPosition={{
                        minIndexForVisible: 0,
                        autoscrollToTopThreshold: 10,
                    }}
                />

                <View style={[styles.inputcontainer, { backgroundColor: theme.viewcolor }]}>
                    {!isRecording && (
                        <TouchableOpacity style={styles.plusbtn} onPress={() => { setModalVisible(true) }}>
                            <Icon3 name="plus" color={"white"} size={moderateScale(20)} />
                        </TouchableOpacity>
                    )}
                    {isRecording ? (
                        <View style={styles.recordingIndicator}>
                            <View style={styles.redDot} />
                            <Text style={styles.recordingText}>
                                Recording... {recordingTime}s
                            </Text>
                        </View>
                    ) : (
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: theme.inputBg,
                                borderColor: theme.borderColor,
                                color: theme.textcolor
                            }]}
                            placeholder="Type message..."
                            placeholderTextColor={theme.textcolor}
                            value={text}
                            onChangeText={setText}
                        />
                    )}
                    <TouchableOpacity
                        style={[
                            styles.sendbtn,
                            isRecording && { backgroundColor: 'red' }
                        ]}
                        onPress={text.trim() ? sendMessage : toggleRecording}
                    >
                        <Icon
                            name={text.trim() ? 'send' : isRecording ? 'stop' : 'mic'}
                            size={moderateScale(20)}
                            color="white"
                        />
                    </TouchableOpacity>

                </View>
            </KeyboardAvoidingView>

            {/* Bottom sheet */}
            <Modal
                isVisible={modalvisible}
                onBackButtonPress={() => setModalVisible(false)}
                onBackdropPress={() => setModalVisible(false)}
                style={styles.Modalstyle}
                swipeDirection="down" // Allows swiping to close
                onSwipeComplete={() => setModalVisible(false)}
                backdropOpacity={0.5}
            >
                <View style={[styles.modalContent, { backgroundColor: theme.viewcolor }]}>
                    {/* Handle bar at the top for aesthetics */}
                    <View style={styles.modalTopLine} />

                    <TouchableOpacity
                        style={styles.sheetOption}
                        onPress={PickImage}
                    >
                        <Icon name="image" size={moderateScale(25)} color={theme.textcolor} />
                        <Text style={[styles.sheetText, { color: theme.textcolor }]}>Photos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.sheetOption}
                        onPress={() => {
                            setModalVisible(false);
                            // Add Camera Logic Here
                        }}
                    >
                        <Icon name="camera" size={moderateScale(25)} color={theme.textcolor} />
                        <Text style={[styles.sheetText, { color: theme.textcolor }]}>Camera</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Modal for imagePreview */}
            <Modal
                isVisible={modalImage}
                onBackButtonPress={() => setModalImage(false)}
                style={[styles.imageModal, { backgroundColor: theme.viewcolor }]}
                animationIn={'fadeIn'}
                animationOut={'fadeOut'}
            >
                <View style={styles.imageModalcontainer}>
                    <ImageViewer
                        imageUrls={selectedImage}
                        enableSwipeDown={true}
                        onSwipeDown={() => setModalImage(false)}
                        renderIndicator={() => null} // Hides the 1/1 text
                        backgroundColor={theme.viewcolor}
                        style={{ flex: 1 }}
                        renderImage={(props) => (
                            <FastImage
                                {...props}
                                style={styles.PreviewImage}
                                resizeMode={FastImage.resizeMode.contain}
                            />
                        )}
                        loadingRender={() => (
                            <ActivityIndicator color="white" size="large" />
                        )}
                        renderHeader={() => (
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={() => setModalImage(false)}
                            >
                                <Icon name="close" size={moderateScale(30)} color="white" />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

        </View>
    )
}

export default ChatScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    Profileimg: {
        height: moderateScale(60),
        width: moderateScale(60),
        borderRadius: moderateScale(30)
    },
    userNameText: {
        fontSize: scaleFont(17),
        fontWeight: 'bold',
        color: 'black',
        marginLeft: horizontalscale(5)
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: "space-between",
        backgroundColor: 'white',
        paddingVertical: verticalScale(10),
        paddingHorizontal: horizontalscale(15),
        marginBottom: verticalScale(4),
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        elevation: 5,
    },
    headerchild: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    inputcontainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: horizontalscale(10),
        // marginBottom: verticalScale(10)
    },
    input: {
        height: verticalScale(45),
        width: '70%',
        borderWidth: 0.6,
        borderRadius: moderateScale(15),
        paddingHorizontal: horizontalscale(10),
        backgroundColor: '#ffffff',
        marginVertical: verticalScale(10),
        elevation: 5
    },
    sendbtn: {
        backgroundColor: 'green',
        height: moderateScale(45),
        width: moderateScale(45),
        borderRadius: moderateScale(15),
        justifyContent: 'center',
        alignItems: 'center'
    },
    plusbtn: {
        height: moderateScale(40),
        width: moderateScale(40),
        borderRadius: moderateScale(20),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'green'
    },
    msgBox: {
        marginVertical: verticalScale(5),
        padding: moderateScale(10),
        borderRadius: 15, // Smooth corners
        maxWidth: '80%',  // Allow image box to be wider
        marginHorizontal: horizontalscale(10),
        flexDirection: 'column'
    },
    myMsg: {
        backgroundColor: '#0084ff',
        alignSelf: 'flex-end',
    },
    otherMsg: {
        backgroundColor: '#E0E0E0',
        alignSelf: 'flex-start',
    },
    msgText: {
        color: 'white',
        fontSize: scaleFont(15),
    },
    verticalStack: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Keeps content to the left
    },
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(2), // Space between audio and ticks
    },
    tickUnderContent: {
        flexDirection: "row",
        alignSelf: "flex-end", // Pushes the tick to the bottom-right of the bubble
        marginTop: verticalScale(2),
        marginLeft: horizontalscale(10)
    },
    recordingIndicator: {
        height: verticalScale(45),
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: horizontalscale(10),
        marginVertical: verticalScale(10),
    },
    redDot: {
        width: moderateScale(10),
        height: moderateScale(10),
        borderRadius: 5,
        backgroundColor: 'red',
        marginRight: horizontalscale(8),
    },
    recordingText: {
        color: 'red',
        fontWeight: '600',
    },
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        // minWidth: horizontalscale(150),
        paddingVertical: verticalScale(5),
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: horizontalscale(10),
        height: verticalScale(30),
    },
    waveBar: {
        width: horizontalscale(3),
        borderRadius: 2,
        marginHorizontal: horizontalscale(1.5),
    },
    durationText: {
        fontSize: scaleFont(12),
        marginLeft: horizontalscale(5),
        flexShrink: 1
    },
    imageContainer: {
        borderRadius: 15,
        overflow: 'hidden',
        position: 'relative', // Necessary for absolute positioning of the loader
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderOverlay: {
        position: 'absolute', // Sits on top of the image
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)', // Light dark overlay
        borderRadius: 10,
        width: '100%',
        height: '100%',
    },
    chatImage: {
        // Increase width/height for a better "box" feel
        width: horizontalscale(230),
        height: verticalScale(280),
        backgroundColor: '#333', // Dark placeholder
    },
    imageTickOverlay: {
        position: 'absolute',
        bottom: 8,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: horizontalscale(4),
        borderRadius: 10,
        flexDirection: 'row',
    },
    tickContainer: {
        flexDirection: "row",
        marginTop: verticalScale(3),
        marginHorizontal: horizontalscale(5),
        alignSelf: "flex-end"
    },
    Modalstyle: {
        margin: 0, // Makes the modal span the full width of the screen
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: moderateScale(20),
        paddingBottom: verticalScale(30), // Extra padding for bottom notch area
        minHeight: verticalScale(200),   // Set a base height for your sheet
    },
    modalTopLine: {
        width: horizontalscale(40), height: verticalScale(5), backgroundColor: '#ccc',
        borderRadius: 3, alignSelf: 'center', marginBottom: verticalScale(20)
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(15),
    },
    sheetText: {
        fontSize: moderateScale(16),
        marginLeft: horizontalscale(15),
        fontWeight: '500'
    },
    imageModal: {
        flex: 1,
        margin: 0,
        padding: 0
    },
    imageModalcontainer: {
        flex: 1,
        justifyContent: 'center'
    },
    closeBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        right: 20,
        zIndex: 999,
        padding: moderateScale(10),
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 25,
    },
    PreviewImage: {
        width: '100%',
        height: '100%',
        priority: FastImage.priority.high,
        cache: FastImage.cacheControl.immutable,

    }

})