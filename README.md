# OnviTV - IPTV Streaming Platform

A comprehensive IPTV streaming platform built with React Native and Expo, featuring both admin-curated content and user-imported playlists.

## 🎯 Platform Overview

OnviTV provides **two types of content**:

### 1. **General Content** (Admin-Curated)
- High-quality, curated movies, series, and live TV channels
- Visible to all users
- Managed through Admin Panel
- Located in **Movies** and **Live TV** tabs

### 2. **Personal Content** (User-Imported)
- User's own M3U/Xtream Codes playlists
- Private, user-specific content
- Self-managed by users
- Located in **My Playlist** tab

## ✨ Features

### 🎬 Content Management
- **Movies Tab** - Browse admin-curated movies and TV series
- **Live TV Tab** - Watch admin-curated live channels
- **My Playlist Tab** - Access your personal imported playlists
- **M3U Parser** - Import M3U/M3U8 playlists
- **Xtream Codes** - Full Xtream API integration
- **EPG Support** - Electronic Program Guide integration

### 📺 Video Playback
- **expo-av Player** - Full-featured video player
- **Custom Controls** - Play/pause, seek, rewind/forward (10s)
- **Auto-retry** - Automatic retry on stream failure (up to 5 attempts)
- **Progress Tracking** - Resume playback from last position
- **Responsive** - Works on all screen sizes (portrait & landscape)
- **YouTube-style UI** - Professional error handling and loading states

### 👤 User Features
- **Authentication** - Email/password with Firebase Auth
- **Continue Watching** - Resume from where you left off
- **Favorites** - Save your favorite content
- **Watch History** - Track viewing progress
- **Multi-Playlist** - Manage multiple M3U/Xtream playlists
- **Profile Management** - User settings and preferences

### 🎨 UI/UX
- **Modern Design** - Beautiful gradients and animations
- **Dark Theme** - Eye-friendly dark mode
- **Responsive Layout** - Adapts to any screen size
- **Smooth Animations** - React Native Reanimated
- **Glassmorphism** - Modern glass effects
- **Custom Components** - Reusable UI components

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Firebase account

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd OnviTV-ReactNative

# Install dependencies
npm install

# Install expo-av and slider
npx expo install expo-av
npm install @react-native-community/slider

# Start development server
npm start
```

### Running the App

```bash
# Web
npm start
# Press 'w' to open in browser

# iOS (requires Mac)
npm run ios

# Android
npm run android

# Mobile Device (Recommended for video playback)
# 1. Install Expo Go app on your device
# 2. Scan QR code from terminal
```

## 📱 App Structure

### Navigation
```
App
├── Splash Screen
├── Onboarding
├── Login / Signup
└── Main Tabs
    ├── Movies (Default)
    ├── Live TV
    ├── My Playlist
    └── More
```

### Key Screens

1. **Movies Screen** - Browse general movies & series
2. **Live TV Screen** - Browse general live channels
3. **My Playlist Screen** - User's personal content hub
4. **Video Player Screen** - Full-screen video playback
5. **Playlist Management** - Add/edit/delete playlists
6. **More Screen** - Settings and profile

## 🗄️ Database Structure

### Firebase Collections

**General Content (Admin):**
- `generalChannels` - Admin-curated live TV channels
- `generalMovies` - Admin-curated movies
- `generalSeries` - Admin-curated TV series

**Personal Content (User):**
- `channels` - User's imported channels
- `movies` - User's imported movies
- `series` - User's imported series
- `playlists` - User's M3U/Xtream playlists

**User Data:**
- `users` - User accounts and preferences
- `favorites` - User's favorite content
- `watchHistory` - Viewing history and progress

See `DATABASE_STRUCTURE.md` for complete schema.

## 🎨 Tech Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and tools
- **React Navigation** - Navigation library
- **expo-av** - Video/audio playback
- **Firebase** - Backend services

### UI Libraries
- **Expo Linear Gradient** - Beautiful gradients
- **React Native Reanimated** - Smooth animations
- **Ionicons** - Icon library
- **@react-native-community/slider** - Seek bar component

### Backend
- **Firebase Auth** - User authentication
- **Firestore** - NoSQL database
- **Firebase Storage** - File storage

## 📚 Documentation

- **[PLATFORM_STRUCTURE.md](./PLATFORM_STRUCTURE.md)** - Complete platform architecture
- **[DATABASE_STRUCTURE.md](./DATABASE_STRUCTURE.md)** - Database schema and security rules
- **[TODO.md](./TODO.md)** - Development roadmap and progress

## 🔐 Security

- Firebase Authentication for user management
- Firestore security rules for data protection
- Encrypted Xtream Codes credentials
- User-specific content isolation

## 📊 Progress

**Current Status:** 35% Complete

✅ **Completed:**
- Authentication system
- Navigation structure
- Playlist management (M3U & Xtream)
- Live TV screen with general channels
- Video player with custom controls
- My Playlist screen
- Database architecture

⏳ **In Progress:**
- Movies screen (general content integration)
- Admin panel development

🔜 **Upcoming:**
- EPG integration
- Downloads feature
- Parental controls
- Multi-device sync

## 👥 Contributing

This is a private project. For questions or issues, please contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ using React Native and Expo**
