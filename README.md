# BreakPoint App

A mobile application built with Expo and React Native.

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.16.0 or higher recommended)
- npm or yarn
- Expo Go app installed on your mobile device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

## 📱 Running the App

### Start the Development Server

```bash
npm start
```

This will start the Expo development server and display a QR code in your terminal.

### Run on Different Platforms

```bash
# Run on Android device/emulator
npm run android

# Run on iOS device/simulator (macOS only)
npm run ios

# Run in web browser
npm run web
```

### Using Expo Go

1. Install the Expo Go app on your mobile device
2. Run `npm start` in your project directory
3. Scan the QR code with:
   - **iOS**: Use the Camera app
   - **Android**: Use the Expo Go app

## 📁 Project Structure

```
BreakPoint App/
├── assets/           # Images and other static assets
├── App.tsx          # Main application component
├── index.ts         # Entry point
├── app.json         # Expo configuration
├── package.json     # Dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

## 🛠️ Technology Stack

- **Expo SDK**: ~54.0.32
- **React**: 19.1.0
- **React Native**: 0.81.5
- **TypeScript**: ~5.9.2

## 📝 Development Notes

- The project uses TypeScript for type safety
- Expo's new architecture is enabled (`newArchEnabled: true`)
- The app supports iOS, Android, and web platforms

## 🔧 Customization

### App Name and Icon

Edit `app.json` to customize:

- App name (`name` and `slug`)
- App icon (`icon`)
- Splash screen (`splash`)
- Platform-specific settings

### Styling

The default styles are in `App.tsx`. You can modify them or create separate style files.

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## ⚠️ Note

Your current Node.js version (v20.15.1) is slightly below the recommended version (v20.19.4). The project should still work, but consider updating Node.js if you encounter any issues.
