import { StyleSheet, Text, TouchableOpacity, View, FlatList, Image, BackHandler, Appearance } from 'react-native'
import React, { useState, useEffect, useCallback, memo, useContext, useRef } from 'react'
import { horizontalscale, verticalScale, moderateScale, scaleFont } from '../utils/DesignHelper';
import { getAuth } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather'
import { themecontext } from '../utils/ThemeContext';
import CustomModal from '../CustomComponent/CustomModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

// 1. MEMOIZED CHAT ITEM: Prevents unnecessary re-renders of list rows
const ChatItem = memo(({ item, chat, theme, navigation, formatTime }) => {
    const lastMessage = chat.lastMessage || "No messages yet";
    const lastTime = chat.lastTime ? formatTime(chat.lastTime) : "";

    return (
        <TouchableOpacity
            style={[styles.chatContainer, { backgroundColor: theme.viewcolor }]}
            onPress={() => navigation.navigate("ChatScreen", { selectedUser: item })}
        >
            <Image
                source={item.photoURL ? { uri: item.photoURL } : require('../utils/images/user.jpg')}
                style={styles.chatlistimg}
            />

            <View style={{ flex: 1, marginLeft: horizontalscale(10) }}>
                <Text style={[styles.userListtxt, { color: theme.textcolor }]}>{item.name}</Text>
                <Text style={[styles.lastMsgTxt, { color: theme.textcolor }]} numberOfLines={1}>
                    {lastMessage}
                </Text>
            </View>

            {lastTime ? (
                <Text style={[styles.timeTxt, { color: theme.textcolor }]}>{lastTime}</Text>
            ) : null}
        </TouchableOpacity>
    );
});

const Mainscreen = ({ user, allUser }) => {
    const { theme } = useContext(themecontext);
    const navigation = useNavigation();
    const currentUser = getAuth().currentUser;

    const [userChats, setUserChats] = useState({});
    const [exitmodal, setExitModal] = useState(false);

    // Reference to store active listeners and avoid duplicates
    const unsubscribesRef = useRef({});

    useEffect(() => {
        if (!currentUser?.uid) return;

        const syncToken = async () => {
            const token = await messaging().getToken();
            console.log(token);
            

            await firestore()
                .collection('users')
                .doc(currentUser.uid)
                .set(
                    { fcmToken: token },
                    { merge: true }
                );
        };

        syncToken();

        const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
            await firestore()
                .collection('users')
                .doc(currentUser.uid)
                .set({ fcmToken: newToken }, { merge: true });
        });

        return unsubscribe;
    }, [currentUser?.uid]);

    useFocusEffect(
        useCallback(() => {
            const backAction = () => {
                setExitModal(true);
                return true;
            };
            const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
            return () => handler.remove();
        }, [])
    );

    const generateChatId = (uid1, uid2) => {
        return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
    };

    // 2. OPTIMIZED FIRESTORE LISTENERS
    useEffect(() => {
        if (!currentUser || allUser.length === 0) return;

        allUser.forEach(otherUser => {
            // Skip if listener for this user already exists
            if (unsubscribesRef.current[otherUser.id]) return;

            const chatId = generateChatId(currentUser.uid, otherUser.id);

            const unsubscribe = firestore()
                .collection('chats')
                .doc(chatId)
                .collection('messages')
                .orderBy('localTime', 'desc')
                .limit(1)
                .onSnapshot(snapshot => {
                    let lastMessage = 'No messages yet';
                    let lastTime = null;

                    if (!snapshot.empty) {
                        const msg = snapshot.docs[0].data();
                        lastTime = msg.localTime || null;

                        if (msg.type === 'image') {
                            lastMessage = msg.uploading ? '📷 Uploading photo...' : '📷 Photo';
                        } else if (msg.type === 'audio') {
                            if (msg.uploading) {
                                lastMessage = '🎤 Uploading audio...';
                            } else {
                                const mins = Math.floor((msg.duration || 0) / 60);
                                const secs = (msg.duration || 0) % 60;
                                lastMessage = `🎤 Audio ${mins}:${secs.toString().padStart(2, '0')}`;
                            }
                        } else {
                            lastMessage = msg.text || '';
                        }
                    }

                    setUserChats(prev => ({
                        ...prev,
                        [otherUser.id]: { lastMessage, lastTime },
                    }));
                }, error => console.error("Snapshot error:", error));

            unsubscribesRef.current[otherUser.id] = unsubscribe;
        });

        // Cleanup: Unsubscribe all when component unmounts
        return () => {
            Object.values(unsubscribesRef.current).forEach(unsub => unsub && unsub());
            unsubscribesRef.current = {};
        };
    }, [allUser, currentUser?.uid]);

    const formatTime = useCallback((timestamp) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    }, []);

    const renderItem = useCallback(({ item }) => (
        <ChatItem
            item={item}
            chat={userChats[item.id] || {}}
            theme={theme}
            navigation={navigation}
            formatTime={formatTime}
        />
    ), [userChats, theme, navigation, formatTime]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <Text style={[styles.headertxt, { color: theme.textcolor }]}>{"Enjoy Messaging!"}</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
                    <Icon name="settings" size={moderateScale(28)} color={theme.textcolor} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={allUser}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                // 3. FLATLIST PERFORMANCE PROPS
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                ListEmptyComponent={
                    <Text style={{ color: theme.textcolor, textAlign: 'center', marginTop: verticalScale(20) }}>
                        No other users found.
                    </Text>
                }
            />

            <CustomModal
                visible={exitmodal}
                title="Exit App"
                message="Are you sure you want to exit?"
                cancelText="Cancel"
                confirmText="Exit"
                onCancel={() => setExitModal(false)}
                onConfirm={() => BackHandler.exitApp()}
            />
        </View>
    );
};

export default Mainscreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: verticalScale(20),
        paddingHorizontal: horizontalscale(15),
        marginBottom: verticalScale(20),
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        elevation: 5
    },
    headertxt: { fontSize: scaleFont(26), fontWeight: 'bold' },
    chatContainer: {
        height: verticalScale(75),
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: horizontalscale(10),
        borderRadius: moderateScale(10),
        marginBottom: verticalScale(10),
        paddingHorizontal: horizontalscale(10)
    },
    chatlistimg: {
        height: moderateScale(60),
        width: moderateScale(60),
        borderRadius: moderateScale(30),
    },
    userListtxt: { fontWeight: '600', fontSize: scaleFont(18) },
    lastMsgTxt: { marginTop: verticalScale(3), fontSize: scaleFont(14), fontWeight: '400' },
    timeTxt: { fontSize: scaleFont(12), fontWeight: '400' }
});