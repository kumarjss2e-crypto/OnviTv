import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

class CustomAlert {
  static alertInstance = null;

  static setAlertInstance(instance) {
    this.alertInstance = instance;
  }

  static alert(title, message, buttons = [{ text: 'OK' }]) {
    if (this.alertInstance) {
      this.alertInstance.show(title, message, buttons);
    }
  }
}

export class AlertProvider extends React.Component {
  state = {
    visible: false,
    title: '',
    message: '',
    buttons: [],
  };

  componentDidMount() {
    CustomAlert.setAlertInstance(this);
  }

  show = (title, message, buttons) => {
    this.setState({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
    });
  };

  hide = () => {
    this.setState({ visible: false });
  };

  handleButtonPress = (button) => {
    this.hide();
    if (button.onPress) {
      button.onPress();
    }
  };

  render() {
    const { visible, title, message, buttons } = this.state;

    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={this.hide}
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            {/* Icon based on title */}
            <View style={styles.iconContainer}>
              {title.toLowerCase().includes('error') ? (
                <Ionicons name="alert-circle" size={48} color="#ef4444" />
              ) : title.toLowerCase().includes('success') ? (
                <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
              ) : (
                <Ionicons name="information-circle" size={48} color={colors.primary.purple} />
              )}
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isDestructive && styles.destructiveButton,
                      isCancel && styles.cancelButton,
                      buttons.length === 1 && styles.singleButton,
                    ]}
                    onPress={() => this.handleButtonPress(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.destructiveButtonText,
                        isCancel && styles.cancelButtonText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: colors.neutral.slate800,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary.purple,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  singleButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cancelButtonText: {
    color: colors.text.secondary,
  },
  destructiveButtonText: {
    color: colors.text.primary,
  },
});

export default CustomAlert;
