import { StatusBar, StyleSheet, Text, View } from 'react-native'
import React, { useContext, useEffect } from 'react'
import LottieView from 'lottie-react-native';
import { themecontext } from '../utils/ThemeContext';

const Animation = ({navigation}) => {

    const {theme} = useContext(themecontext);

    return (
        <View style={{ flex: 1,backgroundColor:theme.background }}>
            <StatusBar backgroundColor={theme.background} barStyle={theme.background === 'white' ? 'dark-content' : 'light-content'}/>
            <LottieView
                source={require('../utils/Chat.json')}
                autoPlay
                loop
                // speed={1.5}
                style={{ flex: 1 }}
            />
        </View>
    )
}

export default Animation

const styles = StyleSheet.create({})