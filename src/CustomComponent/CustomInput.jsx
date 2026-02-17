
import React, { useContext } from 'react'; // MUST import React
import { StyleSheet, View, TextInput, Dimensions } from 'react-native';
// Assuming horizontalscale and verticalScale are imported from '../utils/DesignHelper'
import { horizontalscale, verticalScale } from '../utils/DesignHelper';
import { themecontext } from '../utils/ThemeContext';

const { height, width } = Dimensions.get('screen')

const CustomInput = React.forwardRef(({ style, placeholder, value, onChangeText, keyboardType, ...Props }, ref) => {

  const {theme} = useContext(themecontext);
  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, {
          backgroundColor: theme.inputBg,
          borderColor: theme.borderColor,
          color: theme.textcolor
        }]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={theme.textcolor}

        // 3. Attach the 'ref' (the second argument) to the TextInput
        ref={ref}

        {...Props}
      />
    </View>
  )
});

export default CustomInput

const styles = StyleSheet.create({
  container: {
    width: '100%',         // ✅ IMPORTANT
    marginBottom: verticalScale(20),
  },
  input: {
    width: '100%',
    paddingHorizontal: horizontalscale(10),
    paddingRight: horizontalscale(40),
    height: verticalScale(50),
    borderBottomWidth: 2,
  }
})