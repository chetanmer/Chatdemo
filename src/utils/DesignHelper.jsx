import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Guideline Base from your Figma file
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

// Horizontal Scaling (for width, padding-horizontal, margin-horizontal)
export const horizontalscale = (size) => (width / guidelineBaseWidth) * size;

// Vertical Scaling (for height, padding-vertical, margin-vertical)
export const verticalScale = (size) => (height / guidelineBaseHeight) * size;

// Moderate Scaling (Best for font sizes to prevent them from becoming too large on tablets)
export const moderateScale = (size, factor = 0.5) => {
    return size + (horizontalscale(size) - size) * factor;
};

// Font Scaling (applies moderate scale and rounds to the nearest pixel)
export const scaleFont = (size) => {
    return PixelRatio.roundToNearestPixel(moderateScale(size, 0.5));
};