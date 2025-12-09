import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on web and mobile
 */
export const showAlert = (title, message, buttons = []) => {
  if (Platform.OS === 'web') {
    // For web, use window.alert or custom implementation
    if (buttons && buttons.length > 0) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    // For mobile, use native Alert
    Alert.alert(title, message, buttons);
  }
};

export const showError = (message) => {
  showAlert('Error', message);
};

export const showSuccess = (message, onPress) => {
  showAlert('Success', message, onPress ? [{ text: 'OK', onPress }] : []);
};
