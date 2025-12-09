# App Icon Setup Guide

## Current Status
Your app currently uses the default Expo/React Native icon. Let's set up a custom OnviTV icon!

## Required Icon Sizes

### Android (all required):
- **mdpi**: 48x48px
- **hdpi**: 72x72px
- **xhdpi**: 96x96px
- **xxhdpi**: 144x144px
- **xxxhdpi**: 192x192px

### iOS (if you plan to build for iOS):
- Various sizes from 20x20 to 1024x1024

## Quick Setup (Recommended)

### Option 1: Use Expo's Icon Generator (Easiest)

1. **Create a single 1024x1024px icon** (PNG with transparency)
   - Design your OnviTV logo
   - Save as `icon.png` in project root

2. **Update `app.json`**:
```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0F172A"
      }
    }
  }
}
```

3. **Run Expo prebuild** (generates all sizes):
```bash
npx expo prebuild --clean
```

### Option 2: Use Online Icon Generator

1. Go to: https://icon.kitchen/ or https://easyappicon.com/
2. Upload your 1024x1024px icon
3. Download the Android icon pack
4. Extract and replace files in:
   - `android/app/src/main/res/mipmap-mdpi/`
   - `android/app/src/main/res/mipmap-hdpi/`
   - `android/app/src/main/res/mipmap-xhdpi/`
   - `android/app/src/main/res/mipmap-xxhdpi/`
   - `android/app/src/main/res/mipmap-xxxhdpi/`

### Option 3: Manual Setup (Most Control)

**Step 1: Create Your Icon Design**
- Size: 1024x1024px
- Format: PNG with transparency
- Design: OnviTV logo (TV + streaming theme)
- Colors: Match your app theme (purple/cyan)

**Step 2: Generate Multiple Sizes**

Use an image editor or online tool to create:

| Folder | Size | File Names |
|--------|------|------------|
| mipmap-mdpi | 48x48 | ic_launcher.png, ic_launcher_round.png |
| mipmap-hdpi | 72x72 | ic_launcher.png, ic_launcher_round.png |
| mipmap-xhdpi | 96x96 | ic_launcher.png, ic_launcher_round.png |
| mipmap-xxhdpi | 144x144 | ic_launcher.png, ic_launcher_round.png |
| mipmap-xxxhdpi | 192x192 | ic_launcher.png, ic_launcher_round.png |

**Step 3: Replace Icon Files**

Copy your generated icons to:
```
android/app/src/main/res/mipmap-mdpi/ic_launcher.png
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-hdpi/ic_launcher.png
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
```

**Step 4: Rebuild APK**
```bash
cd android
.\gradlew assembleRelease
```

## Icon Design Suggestions

### OnviTV Icon Ideas:

**Option 1: TV + Play Button**
```
┌─────────────┐
│   ┌─────┐   │
│   │  ▶  │   │  <- Play button inside TV screen
│   └─────┘   │
│   ═══════   │  <- TV stand
└─────────────┘
```

**Option 2: Streaming Waves**
```
    ◉◉◉
   ◉ O ◉        <- Waves radiating from center
    ◉◉◉         <- Represents streaming/broadcast
```

**Option 3: Modern TV Icon**
```
╔═══════════╗
║ ONVI  TV  ║   <- Text-based with modern frame
╚═══════════╝
```

### Color Scheme:
- **Primary**: Purple (#9333EA) - from your app theme
- **Secondary**: Cyan (#06B6D4)
- **Background**: Dark slate (#0F172A)
- **Accent**: White/Light gray for contrast

## Using AI to Generate Icon

You can use AI tools to generate your icon:

1. **DALL-E / Midjourney Prompt**:
   ```
   "Modern minimalist app icon for IPTV streaming app called OnviTV, 
   purple and cyan gradient, TV screen with play button, 
   flat design, simple, professional, 1024x1024"
   ```

2. **Canva** (Free):
   - Use their app icon templates
   - Customize with OnviTV branding
   - Export as 1024x1024 PNG

3. **Figma** (Free):
   - Design custom icon
   - Export at multiple sizes

## Quick Test

After replacing icons:

1. **Uninstall old app** from your phone
2. **Install new APK**
3. **Check home screen** - your new icon should appear!

## Adaptive Icons (Android 8.0+)

For modern Android devices, you can also create an adaptive icon:

**File**: `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

This allows the icon to adapt to different device shapes (circle, square, rounded square).

## Troubleshooting

**Icon not updating?**
1. Uninstall the app completely
2. Clear app data
3. Reinstall the APK
4. Restart your phone

**Icon looks blurry?**
- Make sure you're using the correct sizes
- Use PNG format (not JPG)
- Ensure high resolution source image

**Icon has white background?**
- Use PNG with transparency
- Check alpha channel is preserved

## Current Icon Locations

Your current icons are at:
```
android/app/src/main/res/
├── mipmap-mdpi/
│   ├── ic_launcher.png (48x48)
│   └── ic_launcher_round.png (48x48)
├── mipmap-hdpi/
│   ├── ic_launcher.png (72x72)
│   └── ic_launcher_round.png (72x72)
├── mipmap-xhdpi/
│   ├── ic_launcher.png (96x96)
│   └── ic_launcher_round.png (96x96)
├── mipmap-xxhdpi/
│   ├── ic_launcher.png (144x144)
│   └── ic_launcher_round.png (144x144)
└── mipmap-xxxhdpi/
    ├── ic_launcher.png (192x192)
    └── ic_launcher_round.png (192x192)
```

## Next Steps

1. **Design or generate your icon** (1024x1024px)
2. **Use an online generator** to create all sizes
3. **Replace the icon files** in the mipmap folders
4. **Rebuild the APK**: `cd android && .\gradlew assembleRelease`
5. **Install and test** on your device

---

**Need help with icon design?** Share your logo/brand colors and I can help create a design concept!
