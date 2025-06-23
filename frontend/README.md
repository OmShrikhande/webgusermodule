# 🚀 WebGUser Mobile App Frontend 🚀

<div align="center">
  
  ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

  <p align="center">
    <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/l0HlHFRbmaZtBRhXG/giphy.gif" width="450" />
  </p>

  <h3>A modern, responsive mobile application built with Expo and React Native</h3>
</div>

## ✨ Features

- 📱 Cross-platform (iOS, Android, Web) support
- 🔐 Secure authentication system
- 📷 Profile image upload and management
- 🔔 Real-time notifications
- 📍 Location tracking capabilities
- 📊 Task management and tracking
- 🌓 Light/Dark theme support
- 🚀 Optimized performance with Expo

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or newer)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For iOS development: macOS with Xcode
- For Android development: Android Studio with SDK

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd webgusermodule/frontend
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables (if needed)**

Create a `.env` file in the root directory and add your environment variables.

## 🚀 Running the App

### Development Mode

```bash
# Start the development server
npm start
# or
npx expo start
```

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/3o7qE4opCd6f1NJeuY/giphy.gif" width="400" />
</p>

### Platform Specific

```bash
# Run on iOS
npm run ios
# or
npx expo start --ios

# Run on Android
npm run android
# or
npx expo start --android

# Run on Web
npm run web
# or
npx expo start --web
```

## 📱 App Structure

```
frontend/
├── app/                  # Main application screens using Expo Router
│   ├── (tabs)/           # Tab-based navigation screens
│   │   ├── home.jsx      # Home screen
│   │   ├── profile.jsx   # Profile screen
│   │   └── notifications.jsx # Notifications screen
│   ├── image-picker.jsx  # Image picker functionality
│   ├── login.jsx         # Authentication screen
│   └── _layout.jsx       # Root layout component
├── assets/               # Static assets (images, fonts)
├── components/           # Reusable UI components
│   ├── home/             # Home screen components
│   ├── profile/          # Profile screen components
│   └── ui/               # UI elements
├── constants/            # App constants and theme
├── context/              # React context providers
├── hooks/                # Custom React hooks
└── utils/                # Utility functions
```

## 🔄 State Management

The app uses React's Context API for state management, with the following main contexts:
- ThemeContext - For managing app theme
- AuthContext - For managing user authentication state

## 📡 API Integration

The app communicates with a backend server using Axios. The base URL is dynamically determined based on the environment.

## 🧩 Key Components

- **Image Picker**: Allows users to select or take profile pictures
- **Notification System**: Real-time notifications with Expo Notifications
- **Location Tracking**: Background location tracking with Expo Location
- **Task Management**: View and manage assigned tasks

## 🛠️ Troubleshooting

### Common Issues

1. **Expo server not starting**
   ```bash
   # Clear cache and restart
   npx expo start -c
   ```

2. **Dependencies issues**
   ```bash
   # Reset cache and reinstall
   rm -rf node_modules
   npm install
   ```

3. **Metro bundler issues**
   ```bash
   # Reset Metro cache
   npx expo start --clear
   ```

## 🔄 Updates and Maintenance

To update Expo SDK and dependencies:

```bash
npx expo-doctor
npx expo upgrade
```

## 📞 Contact

For questions or support, please contact:
- Email: omshrikhande73@gmail.com

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  <p>Built with ❤️ using Expo and React Native</p>
  
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/du3J3cXyzhj75IOgvA/giphy.gif" width="100" />
</div>
