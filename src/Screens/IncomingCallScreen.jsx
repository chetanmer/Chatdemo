import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useContext, useEffect, useRef, useState } from 'react'
import firestore from '@react-native-firebase/firestore'
import { useScrollToTop } from '@react-navigation/native';
import { themecontext } from '../utils/ThemeContext';
import { horizontalscale, moderateScale, scaleFont, verticalScale } from '../utils/DesignHelper';
import MIcon from 'react-native-vector-icons/MaterialIcons'
import FeaIcon from 'react-native-vector-icons/Feather'
import FastImage from 'react-native-fast-image';
import auth from '@react-native-firebase/auth'

const IncomingCallScreen = ({ route, navigation }) => {
    const { callId } = route.params;

    const [DisplayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [DisplayImage, setDisplayImage] = useState(null);
    const [callType, setCallType] = useState('video');

    const hasNavigated = useRef(false);
    const { theme } = useContext(themecontext)

    const safeGoBack = () => {
        if (hasNavigated.current) return;
        hasNavigated.current = true;
        navigation.goBack();
    };


    useEffect(() => {
        let isMounted = true;

        const unsubscribe = firestore()
            .collection('calls')
            .doc(callId)
            .onSnapshot(doc => {
                if (!isMounted) return;

                if (!doc.exists) {
                    safeGoBack()
                    return;
                }

                const data = doc.data();
                const currentUseruid = auth().currentUser.uid;

                const isCaller = currentUseruid === data?.callerId
                const newImage = isCaller ? data.receiverImage : data.callerImage
                const newName = isCaller ? data.receiverName : data.callerName

                setDisplayImage(prev => prev !== newImage ? newImage : prev);
                setDisplayName(prev => prev !== newName ? newName : prev)

                setCallType(prev => prev !== (data?.type || 'video')
                    ? (data?.type || 'video')
                    : prev
                );


                if (data?.status === "accepted" && !hasNavigated.current) {
                    hasNavigated.current = true;

                    if (data?.type === 'voice') {
                        navigation.replace('VoiceCallScreen', {
                            callId,
                            isCaller: false,
                        });
                    } else {
                        navigation.replace('VideoCallScreen', {
                            callId,
                            isCaller: false,
                        });
                    }
                }


                if (
                    ['ended', 'rejected', 'missed', 'cancelled'].includes(data?.status) &&
                    !hasNavigated.current
                ) {
                    safeGoBack();
                }

            });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [callId]);


    const endCall = async () => {
        if (loading) return;
        setLoading(true);
        await firestore()
            .collection('calls')
            .doc(callId)
            .update({ status: 'rejected' });

        safeGoBack()
    }

    const acceptCall = async () => {

        if (loading) return;
        setLoading(true);
        await firestore()
            .collection('calls')
            .doc(callId)
            .update({ status: 'accepted' });
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            <FastImage
                source={
                    DisplayImage ? {
                        uri: DisplayImage,
                        priority: FastImage.priority.high,
                        cache: FastImage.cacheControl.immutable,
                    } : require('../utils/images/user.jpg')
                }
                resizeMode={FastImage.resizeMode.cover}
                style={styles.img}
            />

            <Text style={[styles.callername, { color: theme.textcolor }]}>
                {DisplayName}
            </Text>

            <Text style={{ color: theme.textcolor, marginTop: verticalScale(10) }}>
                {callType == 'voice' ? 'Voice Call' : 'Video Call'}
            </Text>

            <View style={styles.btnwrapper}>

                {/* Reject */}
                <TouchableOpacity
                    disabled={loading}
                    style={[
                        styles.btn,
                        { backgroundColor: '#E53935', opacity: loading ? 0.6 : 1 }
                    ]}
                    onPress={endCall}
                >


                    <MIcon name={"call-end"} size={moderateScale(28)} color={theme.textcolor} />
                </TouchableOpacity>

                {/* Accept */}
                <TouchableOpacity
                    disabled={loading}
                    style={[
                        styles.btn,
                        { backgroundColor: '#4CAF50', opacity: loading ? 0.6 : 1 }
                    ]}
                    onPress={acceptCall}
                >

                    <FeaIcon name={"phone-call"} size={moderateScale(28)} color={theme.textcolor} />
                </TouchableOpacity>

            </View>
        </View>
    );
};

export default IncomingCallScreen

const styles = StyleSheet.create({
    container: {
        flex: 1, justifyContent: 'center', alignItems: 'center'
    },
    btnwrapper: {
        position: 'absolute',
        bottom: verticalScale(80),
        flexDirection: 'row',
        width: '60%',
        justifyContent: 'space-between'
    },
    btn: {
        width: moderateScale(70),
        height: moderateScale(70),
        borderRadius: moderateScale(35),
        justifyContent: 'center',
        alignItems: 'center'
    },
    callername: {
        fontSize: scaleFont(26), fontWeight: 'bold'
    },
    img: {
        width: moderateScale(140),
        height: moderateScale(140),
        borderRadius: moderateScale(70),
        marginBottom: verticalScale(20),
        borderWidth: 3,
        borderColor: '#fff'
    }
})