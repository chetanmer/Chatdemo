import { ActivityIndicator, Image, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native'
import React, { useContext, useState, useCallback, useMemo } from 'react'
import { horizontalscale, moderateScale, scaleFont, verticalScale } from '../utils/DesignHelper'
import { getAuth } from '@react-native-firebase/auth';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { themecontext } from '../utils/ThemeContext';
import FastImage from 'react-native-fast-image';
import { CLOUDINARY_UPLOAD_PRESET ,CLOUDINARY_CLOUD_NAME} from '@env'

const EditProfile = ({ route, navigation }) => {
    const { theme } = useContext(themecontext);
    const { currentUserData } = route.params;
    const user = getAuth().currentUser;
    
    const [name, setName] = useState(currentUserData?.name || "");
    const [photo, setPhoto] = useState(currentUserData?.photoURL);
    const [rawBase64, setRawBase64] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState({});

    // Optimization: Memoize the permission request to avoid recreation
    const requestImagePermission = useCallback(async () => {
        if (Platform.OS !== 'android') return true;

        if (Platform.Version >= 33) {
            const permission = Platform.Version >= 34
                ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VISUAL_USER_SELECTED
                : PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;

            const result = await PermissionsAndroid.request(permission);
            return result === PermissionsAndroid.RESULTS.GRANTED || result === 'never_ask_again';
        }

        const oldResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        return oldResult === PermissionsAndroid.RESULTS.GRANTED;
    }, []);

    const PickImage = useCallback(async () => {
        if (Platform.OS === 'android' && Platform.Version < 33) {
            const hasPermission = await requestImagePermission();
            if (!hasPermission) return;
        }

        const options = {
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.5, // Good for performance/bandwidth
            includeBase64: true
        };

        launchImageLibrary(options, response => {
            if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                setRawBase64(asset.base64);
                setPhoto(`data:${asset.type};base64,${asset.base64}`);
            }
        });
    }, [requestImagePermission]);

    // Optimization: Memoize Cloudinary logic
    const uploadToCloudinary = useCallback(async (base64String) => {
        try {
            const data = new FormData();
            data.append('file', `data:image/jpeg;base64,${base64String}`);
            data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            data.append('cloud_name', CLOUDINARY_CLOUD_NAME);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data,
            });

            const json = await res.json();
            return json.secure_url;
        } catch (err) {
            console.error("Upload error:", err);
            return null;
        }
    }, []);

    const handleUpdate = async () => {
        // Validation logic
        if (!name.trim() || name.trim().length < 3) {
            setError({ name: "Name must be at least 3 characters" });
            return;
        }

        if (name === currentUserData.name && !rawBase64) {
            ToastAndroid.show("Nothing to update", ToastAndroid.SHORT);
            return;
        }

        try {
            setLoading(true);
            setError({});
            let imageurl = currentUserData.photoURL || user.photoURL;

            if (rawBase64) {
                const uploadedUrl = await uploadToCloudinary(rawBase64);
                if (!uploadedUrl) throw new Error("Upload failed");
                imageurl = uploadedUrl;
            }

            await user.updateProfile({photoURL:imageurl})

            console.log(user);
            
            await firestore()
                .collection('users')
                .doc(user.uid)
                .update({
                    name: name.trim(),
                    photoURL: imageurl
                });

            ToastAndroid.show("Profile Updated", ToastAndroid.SHORT);
            navigation.goBack();
        } catch (err) {
            ToastAndroid.show("Update failed", ToastAndroid.SHORT);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="keyboard-backspace" size={30} color={theme.textcolor} />
                </TouchableOpacity>
                <Text style={[styles.headerText, { color: theme.textcolor }]}>Edit Profile</Text>
            </View>

            {/* Form Container */}
            <View style={[styles.innercontainer, { backgroundColor: theme.viewcolor }]}>
                <FastImage
                    key={photo} // 1. Crucial: Forces FastImage to refresh when the string changes
                    source={
                        photo && typeof photo === 'string'
                            ? {
                                uri: photo,
                                priority: FastImage.priority.high, // 2. High priority for Base64
                                cache: FastImage.cacheControl.immutable
                            }
                            : require('../utils/images/user.jpg')
                    }
                    style={styles.profileimg}
                    resizeMode={FastImage.resizeMode.cover} // 3. Use 'cover' to fill the circle
                    onLoadStart={() => console.log("FastImage Loading Started")}
                    onError={() => console.log("FastImage Loading Error - Check Base64 format")}
                />

                <TouchableOpacity onPress={PickImage} disabled={loading}>
                    <Text style={styles.editbtn}>Edit Photo</Text>
                </TouchableOpacity>

                <TextInput
                    value={name}
                    placeholder="Enter Name"
                    placeholderTextColor={theme.textcolor + '80'} // Slight transparency
                    style={[styles.input, {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.borderColor,
                        color: theme.textcolor,
                        opacity: loading ? 0.7 : 1
                    }]}
                    onChangeText={setName}
                    editable={!loading}
                />

                {error.name && <Text style={styles.errortext}>{error.name}</Text>}

                <TouchableOpacity
                    style={[styles.btn, { opacity: loading ? 0.8 : 1 }]}
                    onPress={handleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Text style={styles.btntxt}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default EditProfile;

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        width: "100%",
        flexDirection: "row",
        paddingVertical: verticalScale(20),
        paddingHorizontal: horizontalscale(15),
        alignItems: "center",
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        elevation: 5,
    },
    headerText: {
        fontSize: scaleFont(24),
        fontWeight: "bold",
        marginLeft: horizontalscale(15)
    },
    innercontainer: {
        marginHorizontal: horizontalscale(20),
        alignItems: 'center',
        padding: moderateScale(20),
        elevation: 4,
        borderRadius: 12,
        marginTop: verticalScale(10)
    },
    input: {
        height: verticalScale(50),
        width: '100%',
        paddingHorizontal: horizontalscale(12),
        borderWidth: 1,
        marginVertical: verticalScale(15),
        fontSize: scaleFont(16),
        borderRadius: 10,
    },
    btn: {
        height: verticalScale(50),
        width: '100%',
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: '#075E54',
        marginTop: verticalScale(10)
    },
    btntxt: { color: 'white', fontSize: scaleFont(16), fontWeight: 'bold' },
    profileimg: {
        width: moderateScale(110),
        height: moderateScale(110),
        borderRadius: 55,
    },
    editbtn: {
        color: '#075E54',
        fontWeight: 'bold',
        fontSize: scaleFont(14),
        marginTop: verticalScale(8),
        padding: moderateScale(5)
    },
    errortext: {
        color: 'red',
        fontSize: scaleFont(12),
        alignSelf: 'flex-start',
        marginBottom: verticalScale(10)
    },
});