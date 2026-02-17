import React, { useEffect, useRef, memo } from 'react'; // 1. Import memo
import { View, Animated, StyleSheet } from 'react-native';

const BAR_COUNT = 8;

// 2. Wrap the component in memo
const CustomAudioWaveForm = memo(({ isPlaying, isMe }) => {
    const animations = useRef(
        [...Array(BAR_COUNT)].map(() => new Animated.Value(0))
    ).current;

    useEffect(() => {
        if (isPlaying) {
            const loops = animations.map((anim, index) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 300,
                            delay: index * 80,
                            useNativeDriver: false, // height doesn't support native driver
                        }),
                        Animated.timing(anim, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: false,
                        }),
                    ])
                )
            );

            Animated.parallel(loops).start();
        } else {
            animations.forEach(anim => {
                anim.stopAnimation();
                anim.setValue(0);
            });
        }

        return () => {
            animations.forEach(anim => anim.stopAnimation());
        };
    }, [isPlaying]);

    return (
        <View style={styles.container}>
            {animations.map((anim, i) => {
                const height = anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 22],
                });

                return (
                    <Animated.View
                        key={i}
                        style={[
                            styles.bar,
                            {
                                height,
                                backgroundColor: isMe ? '#fff' : '#555',
                            },
                        ]}
                    />
                );
            })}
        </View>
    );
}, (prevProps, nextProps) => {
    // 3. Optional: Fine-grained control
    // Only re-render if playing status or ownership changes
    return prevProps.isPlaying === nextProps.isPlaying && prevProps.isMe === nextProps.isMe;
});

export default CustomAudioWaveForm;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        height: 26,
    },
    bar: {
        width: 3,
        marginHorizontal: 2,
        borderRadius: 2,
    },
});