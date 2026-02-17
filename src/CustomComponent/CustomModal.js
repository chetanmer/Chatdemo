import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useContext } from 'react';
import { themecontext } from '../utils/ThemeContext';

const CustomModal = ({
    visible,
    title,
    message,
    onCancel,
    onConfirm,
    confirmText = "OK",
    cancelText = "Cancel"
}) => {

    const { theme } = useContext(themecontext);

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.modalBox, { backgroundColor: theme.card }]}>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.textcolor }]}>
                        {title}
                    </Text>

                    {/* Message */}
                    <Text style={[styles.message, { color: theme.textcolor }]}>
                        {message}
                    </Text>

                    {/* Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity onPress={onCancel}>
                            <Text style={[styles.cancel, { color: theme.textcolor }]}>
                                {cancelText}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onConfirm}>
                            <Text style={styles.confirm}>
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
};

export default CustomModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)"
    },
    modalBox: {
        width: "80%",
        padding: 20,
        borderRadius: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold"
    },
    message: {
        marginTop: 10,
        fontSize: 16
    },
    btnRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 25
    },
    cancel: {
        marginRight: 25,
        fontSize: 16
    },
    confirm: {
        color: "red",
        fontSize: 16,
        fontWeight: "600"
    }
});
