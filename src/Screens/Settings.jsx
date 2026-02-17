import { FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useContext, useEffect, useState, useMemo, memo, useCallback } from 'react'
import { horizontalscale, moderateScale, scaleFont, verticalScale } from '../utils/DesignHelper'
import { getAuth } from '@react-native-firebase/auth'
import firestore from '@react-native-firebase/firestore'
import Icon from 'react-native-vector-icons/MaterialIcons'
import AntIcon from 'react-native-vector-icons/AntDesign'
import FeaIcon from 'react-native-vector-icons/Feather'
import FontIcon from 'react-native-vector-icons/FontAwesome'
import { useNavigation } from '@react-navigation/native'
import { themecontext } from '../utils/ThemeContext'
import CustomModal from '../CustomComponent/CustomModal'
import FastImage from 'react-native-fast-image'

// Static options data moved outside to prevent re-creation
const SETTINGS_OPTIONS = [
    { id: 1, name: 'Edit your profile', IconName: 'profile', type: 'AntIcon' },
    { id: 2, name: 'Privacy', IconName: 'lock-outline', type: 'MIcon' },
    { id: 3, name: 'Theme', IconName: 'light-mode', type: 'MIcon' },
    { id: 4, name: 'Notifications', IconName: 'notifications-none', type: 'MIcon' },
    { id: 5, name: 'Help', IconName: 'help-circle', type: 'Feather' },
    { id: 6, name: 'SignOut', IconName: 'sign-out', type: 'FontAwesome' }
];

// Memoized Icon Component for performance
const SettingIcon = memo(({ name, type, color }) => {
    switch (type) {
        case "AntIcon": return <AntIcon name={name} size={28} color={color} />;
        case "MIcon": return <Icon name={name} size={28} color={color} />;
        case "Feather": return <FeaIcon name={name} size={28} color={color} />;
        case "FontAwesome": return <FontIcon name={name} size={28} color={color} />;
        default: return null;
    }
});

const Settings = () => {
    const { theme, toggleTheme } = useContext(themecontext);
    const navigation = useNavigation();
    const [currentUserData, setCurrentUserData] = useState(null);
    const [logoutModal, setLogoutModal] = useState(false);


    console.log("settings");
    
    // Optimized Firebase Listener
    useEffect(() => {
        const user = getAuth().currentUser;
        if (!user) return;

        const unsubscribe = firestore()
            .collection('users')
            .doc(user.uid)
            .onSnapshot(doc => {
                if (doc?.exists) {
                    const newData = doc.data();
                    setCurrentUserData(prev => 
                        JSON.stringify(prev) !== JSON.stringify(newData) 
                        ? newData : prev
                    );
                }
            }, error => console.error("Firestore error:", error));

        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try {
            await getAuth().signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const onOptionPress = useCallback((itemName) => {
        if (itemName === 'Edit your profile') {
            navigation.navigate("EditProfile", { currentUserData });
        } else if (itemName === 'SignOut') {
            setLogoutModal(true);
        } else if (itemName === 'Theme') {
            toggleTheme();
        }
    },[navigation,currentUserData,toggleTheme])

    const renderItem = useCallback(({ item }) => (
        <TouchableOpacity
            style={[styles.otherbtn, { backgroundColor: theme.viewcolor }]}
            activeOpacity={0.7}
            onPress={() => onOptionPress(item.name)}
        >
            <SettingIcon name={item.IconName} type={item.type} color={theme.textcolor} />
            <Text style={[styles.profiletxt2, { color: theme.textcolor }]}>{item.name}</Text>
        </TouchableOpacity>
    ),[theme,onOptionPress])

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="keyboard-backspace" size={moderateScale(30)} color={theme.textcolor} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: theme.textcolor }]}>Settings</Text>
            </View>

            <View style={styles.wrapper}>
                {/* Profile Section */}
                <View style={styles.profileContainer}>
                    <FastImage
                        source={
                            currentUserData?.photoURL
                                ? { uri: currentUserData.photoURL, priority: FastImage.priority.high, cache: FastImage.cacheControl.immutable }
                                : require('../utils/images/user.jpg')
                        }
                        style={styles.profileimg}
                        resizeMode={FastImage.resizeMode.cover}
                    />
                    <Text style={[styles.profiletxt, { color: theme.textcolor }]}>
                        {currentUserData?.name || "Loading..."}
                    </Text>
                </View>

                {/* Options List */}
                <FlatList
                    data={SETTINGS_OPTIONS}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ marginTop: verticalScale(20) }}
                    removeClippedSubviews={true} // Performance boost for lists
                />

            </View>

            <CustomModal
                visible={logoutModal}
                title="Logout"
                message="Do you want to logout?"
                cancelText="No"
                confirmText="Logout"
                onCancel={() => setLogoutModal(false)}
                onConfirm={() => {
                    setLogoutModal(false);
                    handleSignOut();
                }}
            />
        </View>
    );
}

export default Settings;

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        width: "100%",
        flexDirection: "row",
        paddingVertical: verticalScale(20),
        paddingHorizontal: horizontalscale(15),
        alignItems: 'center',
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        elevation: 5,
    },
    headerText: {
        fontSize: scaleFont(26),
        fontWeight: "bold",
        marginLeft: horizontalscale(15)
    },
    profileimg: {
        height: moderateScale(100),
        width: moderateScale(100),
        borderRadius: 50,
    },
    profileContainer: {
        alignItems: "center",
        marginVertical: verticalScale(20)
    },
    profiletxt: {
        fontSize: scaleFont(25),
        marginTop: verticalScale(15),
        fontWeight: '900'
    },
    profiletxt2: {
        fontSize: scaleFont(15),
        fontWeight: '500',
        marginLeft: horizontalscale(10)
    },
    wrapper:{ flex: 1, marginHorizontal: horizontalscale(20) },
    otherbtn: {
        height: verticalScale(60),
        width: '100%',
        flexDirection: "row",
        alignItems: 'center',
        marginBottom: verticalScale(12),
        paddingHorizontal: horizontalscale(15),
        borderWidth: 0.5,
        borderColor: 'rgba(128,128,128,0.3)',
        borderRadius: 12,
    },
});