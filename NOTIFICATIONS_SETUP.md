# Firebase Cloud Messaging Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in OnviTV.

## Prerequisites

- Firebase project (already created for authentication)
- Expo account
- Physical device for testing (notifications don't work on emulators)

## Step 1: Install Required Packages

The following packages are already included in package.json:
```bash
expo install expo-notifications expo-device
```

## Step 2: Configure Firebase Cloud Messaging

### For Android:

1. **Download google-services.json**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click on your Android app
   - Download `google-services.json`
   - Place it in `android/app/google-services.json`

2. **Update android/build.gradle**
   ```gradle
   buildscript {
     dependencies {
       // Add this line
       classpath 'com.google.gms:google-services:4.3.15'
     }
   }
   ```

3. **Update android/app/build.gradle**
   ```gradle
   apply plugin: 'com.android.application'
   // Add this line
   apply plugin: 'com.google.gms.google-services'
   
   dependencies {
     // Add these lines
     implementation platform('com.google.firebase:firebase-bom:32.0.0')
     implementation 'com.google.firebase:firebase-messaging'
   }
   ```

### For iOS:

1. **Download GoogleService-Info.plist**
   - Go to Firebase Console
   - Select your project
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click on your iOS app
   - Download `GoogleService-Info.plist`
   - Place it in `ios/` directory

2. **Enable Push Notifications in Xcode**
   - Open `ios/OnviTV.xcworkspace` in Xcode
   - Select your project in the navigator
   - Go to "Signing & Capabilities"
   - Click "+ Capability"
   - Add "Push Notifications"
   - Add "Background Modes" and check "Remote notifications"

3. **Update AppDelegate.m**
   ```objective-c
   #import <Firebase.h>
   
   - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
   {
     [FIRApp configure];
     // ... rest of the code
   }
   ```

## Step 3: Configure Expo

1. **Update app.json**
   ```json
   {
     "expo": {
       "android": {
         "googleServicesFile": "./google-services.json",
         "useNextNotificationsApi": true
       },
       "ios": {
         "googleServicesFile": "./GoogleService-Info.plist",
         "useNextNotificationsApi": true
       },
       "plugins": [
         [
           "expo-notifications",
           {
             "icon": "./assets/notification-icon.png",
             "color": "#7C3AED",
             "sounds": ["./assets/notification-sound.wav"]
           }
         ]
       ]
     }
   }
   ```

2. **Get Expo Project ID**
   - Run `expo whoami` to check if logged in
   - Run `expo login` if needed
   - Run `eas build:configure` to get project ID
   - Update `notificationService.js` with your project ID

## Step 4: Enable Cloud Messaging in Firebase

1. Go to Firebase Console
2. Navigate to Cloud Messaging
3. Enable Cloud Messaging API
4. Note your Server Key (for backend use)

## Step 5: Test Notifications

### Test Local Notifications:
```javascript
import { sendLocalNotification } from './services/notificationService';

await sendLocalNotification({
  title: 'Test Notification',
  body: 'This is a test notification',
  data: { screen: 'Home' },
});
```

### Test Push Notifications:
1. Get device token from app
2. Use Firebase Console > Cloud Messaging > Send test message
3. Enter the device token
4. Send notification

## Step 6: Backend Integration (Optional)

To send notifications from your backend:

### Using Firebase Admin SDK (Node.js):
```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const message = {
  notification: {
    title: 'New Content Available',
    body: 'Check out the latest episodes!',
  },
  data: {
    screen: 'Series',
    contentId: '12345',
  },
  token: userDeviceToken,
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
```

### Using HTTP API:
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_TOKEN",
    "notification": {
      "title": "New Content",
      "body": "Check it out!"
    },
    "data": {
      "screen": "Home"
    }
  }'
```

## Notification Types in OnviTV

The app supports the following notification types:

1. **New Content** - When new movies/series are added
2. **Recommendations** - Personalized content suggestions
3. **Watch Reminders** - Continue watching reminders
4. **System Updates** - App updates and maintenance
5. **Promotions** - Special offers and deals

## Quiet Hours

Users can set quiet hours to mute notifications during specific times:
- Default: 22:00 - 08:00
- Configurable in NotificationsScreen

## Handling Notifications in App

Notifications are handled in `App.js`:

```javascript
import { setupNotificationListeners } from './services/notificationService';

useEffect(() => {
  const subscriptions = setupNotificationListeners(
    (notification) => {
      // Handle received notification
      console.log('Notification received:', notification);
    },
    (response) => {
      // Handle notification tap
      const { screen, contentId } = response.notification.request.content.data;
      navigation.navigate(screen, { id: contentId });
    }
  );

  return () => {
    removeNotificationListeners(subscriptions);
  };
}, []);
```

## Troubleshooting

### Android Issues:

1. **Notifications not received**
   - Check if google-services.json is in the correct location
   - Verify FCM is enabled in Firebase Console
   - Check device has Google Play Services

2. **Build errors**
   - Clean build: `cd android && ./gradlew clean`
   - Rebuild: `./gradlew assembleRelease`

### iOS Issues:

1. **Notifications not received**
   - Check if GoogleService-Info.plist is in the correct location
   - Verify Push Notifications capability is enabled
   - Check APNs certificates in Firebase Console

2. **Permission denied**
   - Check Info.plist has notification permissions
   - Reset app permissions in device settings

## Testing Checklist

- [ ] Local notifications work
- [ ] Push notifications received when app is closed
- [ ] Push notifications received when app is open
- [ ] Tapping notification navigates to correct screen
- [ ] Quiet hours work correctly
- [ ] Badge count updates
- [ ] Notification preferences save correctly
- [ ] Permissions request works on first launch

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)

## Support

For issues or questions, refer to:
- Expo Forums: https://forums.expo.dev/
- Firebase Support: https://firebase.google.com/support
