import React, { useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
    horizontalscale,
    scaleFont,
    verticalScale,
} from "../utils/DesignHelper";
import { themecontext } from "../utils/ThemeContext";

const NoInternetScreen = ({ visible = true, onRetry }) => {
    const { theme } = useContext(themecontext);

    return (
    <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
    >
        <View style={styles.overlay}>
            <View style={[styles.card, { backgroundColor: theme.viewcolor }]}>
                
                {/* Icon Circle */}
                <View style={styles.iconWrapper}>
                    <Icon
                        name="wifi-off"
                        size={34}
                        color="#FF6B5A"
                    />
                </View>

                <Text style={[styles.title, { color: theme.textcolor }]}>
                    No Internet Connection
                </Text>

                <Text style={[styles.subtitle, { color: theme.textcolor + "99" }]}>
                    Your connection appears to be offline.
                    {"\n"}
                    Please check your network and try again.
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={onRetry}
                    activeOpacity={0.85}
                >
                    <Text style={styles.buttonText}>Retry</Text>
                </TouchableOpacity>

            </View>
        </View>
    </Modal>
);

};

export default NoInternetScreen;
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },

    card: {
        width: "100%",
        borderRadius: 24,
        paddingVertical: verticalScale(32),
        paddingHorizontal: horizontalscale(24),
        alignItems: "center",

        elevation: 12,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
    },

    iconWrapper: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "rgba(255,107,90,0.12)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: verticalScale(20),
    },

    title: {
        fontSize: scaleFont(20),
        fontWeight: "700",
        marginBottom: verticalScale(10),
        textAlign: "center",
    },

    subtitle: {
        fontSize: scaleFont(14),
        textAlign: "center",
        lineHeight: 22,
        marginBottom: verticalScale(28),
    },

    button: {
        backgroundColor: "#FF6B5A",
        paddingVertical: verticalScale(12),
        paddingHorizontal: horizontalscale(40),
        borderRadius: 30,
        elevation: 4,
    },

    buttonText: {
        color: "#FFF",
        fontSize: scaleFont(15),
        fontWeight: "600",
        letterSpacing: 0.5,
    },
});
