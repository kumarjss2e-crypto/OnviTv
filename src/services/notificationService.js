import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<Object>} - Permission status
 */
export const requestNotificationPermissions = async () => {
  try {
    if (!Device.isDevice) {
      return {
        success: false,
        error: 'Must use physical device for Push Notifications',
      };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return {
        success: false,
        error: 'Permission not granted for notifications',
      };
    }

    return {
      success: true,
      status: finalStatus,
    };
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get push notification token
 * @returns {Promise<string>} - Push token
 */
export const getPushToken = async () => {
  try {
    if (!Device.isDevice) {
      throw new Error('Must use physical device for Push Notifications');
    }

    // For Android, set notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'onvi-iptv-player',
    });

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    throw error;
  }
};

/**
 * Save push token to Firestore
 * @param {string} userId - User ID
 * @param {string} token - Push token
 * @returns {Promise<Object>} - Save result
 */
export const savePushToken = async (userId, token) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pushToken: token,
      pushTokenUpdatedAt: new Date().toISOString(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error saving push token:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Register for push notifications
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Registration result
 */
export const registerForPushNotifications = async (userId) => {
  try {
    // Request permissions
    const permissionResult = await requestNotificationPermissions();
    if (!permissionResult.success) {
      return permissionResult;
    }

    // Get push token
    const token = await getPushToken();

    // Save token to Firestore
    await savePushToken(userId, token);

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get user notification preferences
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Notification preferences
 */
export const getNotificationPreferences = async (userId) => {
  try {
    const prefsRef = doc(db, 'notificationPreferences', userId);
    const prefsSnap = await getDoc(prefsRef);

    if (prefsSnap.exists()) {
      return {
        success: true,
        data: prefsSnap.data(),
      };
    } else {
      // Return default preferences
      return {
        success: true,
        data: {
          enabled: true,
          newContent: true,
          recommendations: true,
          watchReminders: true,
          systemUpdates: true,
          promotions: false,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        },
      };
    }
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update notification preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Notification preferences
 * @returns {Promise<Object>} - Update result
 */
export const updateNotificationPreferences = async (userId, preferences) => {
  try {
    const prefsRef = doc(db, 'notificationPreferences', userId);
    
    await setDoc(prefsRef, {
      ...preferences,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send local notification
 * @param {Object} notification - Notification data
 * @returns {Promise<string>} - Notification ID
 */
export const sendLocalNotification = async (notification) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: notification.sound || 'default',
        badge: notification.badge,
      },
      trigger: notification.trigger || null, // null means immediate
    });

    return notificationId;
  } catch (error) {
    console.error('Error sending local notification:', error);
    throw error;
  }
};

/**
 * Cancel notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
    throw error;
  }
};

/**
 * Cancel all notifications
 * @returns {Promise<void>}
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
    throw error;
  }
};

/**
 * Get notification badge count
 * @returns {Promise<number>} - Badge count
 */
export const getBadgeCount = async () => {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
};

/**
 * Set notification badge count
 * @param {number} count - Badge count
 * @returns {Promise<void>}
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};

/**
 * Clear all notifications
 * @returns {Promise<void>}
 */
export const clearAllNotifications = async () => {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await setBadgeCount(0);
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

/**
 * Check if in quiet hours
 * @param {Object} preferences - Notification preferences
 * @returns {boolean} - True if in quiet hours
 */
export const isInQuietHours = (preferences) => {
  if (!preferences.quietHoursEnabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime < endTime) {
    return currentTime >= startTime && currentTime < endTime;
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime < endTime;
  }
};

/**
 * Setup notification listeners
 * @param {Function} onNotificationReceived - Callback when notification received
 * @param {Function} onNotificationTapped - Callback when notification tapped
 * @returns {Object} - Subscription objects
 */
export const setupNotificationListeners = (onNotificationReceived, onNotificationTapped) => {
  // Listener for when notification is received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  return {
    receivedSubscription,
    responseSubscription,
  };
};

/**
 * Remove notification listeners
 * @param {Object} subscriptions - Subscription objects
 */
export const removeNotificationListeners = (subscriptions) => {
  if (subscriptions.receivedSubscription) {
    subscriptions.receivedSubscription.remove();
  }
  if (subscriptions.responseSubscription) {
    subscriptions.responseSubscription.remove();
  }
};
