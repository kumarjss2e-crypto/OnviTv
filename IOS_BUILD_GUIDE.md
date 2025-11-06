# iOS Build Guide for OnviTV

## 📱 Building iOS App with Expo EAS

### Prerequisites

1. **Expo Account** (Free)
   - Sign up at: https://expo.dev/signup
   - You'll need this to build the iOS app

2. **Apple Developer Account** (Required for App Store)
   - **Free Account**: Can build and test on your own device (7-day limit)
   - **Paid Account ($99/year)**: Required for App Store distribution
   - Sign up at: https://developer.apple.com

---

## 🚀 Step-by-Step Build Process

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials.

### Step 3: Configure Your Project

```bash
eas build:configure
```

This will:
- Create/update `eas.json` (already done ✅)
- Link your project to Expo

### Step 4: Build for iOS

#### Option A: Build for Simulator (Testing - No Apple Account Needed)
```bash
eas build --platform ios --profile development
```

This creates a `.app` file you can run in Xcode Simulator.

#### Option B: Build for Physical Device (Testing)
```bash
eas build --platform ios --profile preview
```

You'll need to:
1. Provide your Apple ID
2. Register your device UDID
3. EAS will handle provisioning profiles

#### Option C: Build for App Store (Production)
```bash
eas build --platform ios --profile production
```

You'll need:
1. Apple Developer Account ($99/year)
2. App Store Connect access
3. Certificates and provisioning profiles (EAS handles this)

---

## 📋 Build Options Explained

### Development Build
- **Purpose**: Testing with Expo Go features
- **Output**: `.app` file for simulator
- **Requires**: Nothing (free)
- **Use Case**: Development and testing

### Preview Build
- **Purpose**: Testing on real devices
- **Output**: `.ipa` file
- **Requires**: Apple ID (free account works)
- **Use Case**: Beta testing with TestFlight or direct install

### Production Build
- **Purpose**: App Store submission
- **Output**: `.ipa` file
- **Requires**: Apple Developer Account ($99/year)
- **Use Case**: Public release

---

## 🔑 Apple Developer Setup

### For Free Account (Testing Only):

1. Go to https://developer.apple.com
2. Sign in with your Apple ID
3. Accept terms and conditions
4. Get your device UDID:
   - Connect iPhone to Mac
   - Open Finder → Select iPhone
   - Click on serial number to show UDID
   - Copy UDID

### For Paid Account (App Store):

1. Enroll at https://developer.apple.com/programs/
2. Pay $99/year
3. Complete enrollment (takes 24-48 hours)
4. Access App Store Connect

---

## 📱 Register Your iOS Device

To install on your iPhone, you need to register it:

```bash
eas device:create
```

This will:
1. Generate a registration URL
2. Open it on your iPhone
3. Install a profile
4. Register your device with EAS

---

## 🏗️ Build Commands Reference

### Check Build Status
```bash
eas build:list
```

### View Build Details
```bash
eas build:view [BUILD_ID]
```

### Download Build
```bash
eas build:download [BUILD_ID]
```

### Cancel Build
```bash
eas build:cancel [BUILD_ID]
```

---

## 📦 Install on iPhone

### Method 1: TestFlight (Recommended)

1. Build with production profile:
   ```bash
   eas build --platform ios --profile production
   ```

2. Submit to TestFlight:
   ```bash
   eas submit --platform ios
   ```

3. Install TestFlight app on iPhone
4. Accept invite and install OnviTV

### Method 2: Direct Install (Development)

1. Build with preview profile:
   ```bash
   eas build --platform ios --profile preview
   ```

2. Download `.ipa` file from build page

3. Install using one of these methods:
   - **Xcode**: Window → Devices and Simulators → Drag .ipa
   - **Apple Configurator 2**: Add .ipa to device
   - **Diawi**: Upload .ipa, scan QR code on iPhone

---

## ⚙️ Configuration Files

### `eas.json` (Already Created ✅)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  }
}
```

### `app.json` iOS Section (Already Updated ✅)
```json
{
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "com.onvitv.app",
    "buildNumber": "1.0.0",
    "infoPlist": {
      "UIBackgroundModes": ["audio"],
      "NSAppTransportSecurity": {
        "NSAllowsArbitraryLoads": true
      }
    }
  }
}
```

---

## 🎯 Quick Start (Recommended Path)

### For Testing on Your iPhone:

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   ```

3. **Configure Project**
   ```bash
   eas build:configure
   ```

4. **Register Your iPhone**
   ```bash
   eas device:create
   ```
   Open the URL on your iPhone and follow instructions.

5. **Build for Your Device**
   ```bash
   eas build --platform ios --profile preview
   ```

6. **Download and Install**
   - EAS will provide a download link
   - Open link on iPhone
   - Install the app

---

## 🔍 Troubleshooting

### Build Failed: "No valid code signing identity"
**Solution**: Run `eas build --platform ios --profile preview` and let EAS handle certificates.

### Build Failed: "Bundle identifier already in use"
**Solution**: Change `bundleIdentifier` in `app.json` to something unique:
```json
"bundleIdentifier": "com.yourname.onvitv"
```

### Can't Install on iPhone: "Untrusted Developer"
**Solution**: 
1. Go to Settings → General → VPN & Device Management
2. Trust the developer certificate
3. Try installing again

### Build Takes Too Long
**Solution**: Builds typically take 10-20 minutes. Check status:
```bash
eas build:list
```

---

## 💰 Cost Breakdown

| Option | Cost | What You Get |
|--------|------|--------------|
| **Expo Account** | Free | Build iOS apps, 30 builds/month |
| **Apple ID (Free)** | Free | Test on your device (7-day limit) |
| **Apple Developer** | $99/year | App Store, TestFlight, unlimited devices |

---

## 📊 Build Timeline

1. **Setup** (First time): 10-15 minutes
2. **Build Process**: 15-20 minutes
3. **Download**: 2-5 minutes
4. **Install**: 1-2 minutes

**Total**: ~30-40 minutes for first build

---

## 🎉 Next Steps After Build

1. **Test the app** on your iPhone
2. **Fix any iOS-specific bugs**
3. **Submit to TestFlight** for beta testing
4. **Submit to App Store** when ready

---

## 📞 Support

- **Expo Docs**: https://docs.expo.dev/build/introduction/
- **EAS Build**: https://docs.expo.dev/build/setup/
- **Apple Developer**: https://developer.apple.com/support/

---

## ✅ Checklist

- [ ] Expo account created
- [ ] EAS CLI installed
- [ ] Logged into EAS
- [ ] Project configured
- [ ] Device registered (if testing on iPhone)
- [ ] Build started
- [ ] Build completed
- [ ] App downloaded
- [ ] App installed on device
- [ ] App tested

---

**Ready to build? Run this command:**

```bash
eas build --platform ios --profile preview
```

This will create an iOS app you can install on your iPhone! 🚀
