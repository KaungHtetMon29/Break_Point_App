import { Platform } from "react-native";

/**
 * API Configuration
 *
 * IMPORTANT: Your Go server is binding to [::1]:1323 (IPv6 localhost only)
 * This means external connections won't work without one of these solutions:
 *
 * OPTION 1: Use ngrok (easiest for physical device)
 *   1. Install ngrok: https://ngrok.com/download
 *   2. Run: ngrok http 1323
 *   3. Copy the https URL and paste it below as NGROK_URL
 *
 * OPTION 2: Use adb reverse (for emulator or USB-connected device)
 *   1. Run: adb reverse tcp:1323 tcp:1323
 *   2. Set USE_ADB_REVERSE = true below
 *   3. This makes localhost:1323 work on the device
 *
 * OPTION 3: Fix your Go server to bind to 0.0.0.0:1323
 *   Then physical device can connect via your local IP
 */

// Your computer's local IP (run `ipconfig` to find it)
const LOCAL_IP = "192.168.1.37";

const API_PORT = "1323";

// If using ngrok, paste your ngrok URL here (e.g., "https://abc123.ngrok.io")
const NGROK_URL = "";

// Set to true if you ran `adb reverse tcp:1323 tcp:1323`
const USE_ADB_REVERSE = false;

// API URLs for different environments
const API_URLS = {
  // For Android emulator (without adb reverse)
  androidEmulator: `http://10.0.2.2:${API_PORT}`,

  // For adb reverse (localhost works on device)
  adbReverse: `http://localhost:${API_PORT}`,

  // For iOS simulator
  iosSimulator: `http://localhost:${API_PORT}`,

  // For physical devices via local IP (requires server on 0.0.0.0)
  physicalDevice: `http://${LOCAL_IP}:${API_PORT}`,

  // For ngrok tunnel
  ngrok: NGROK_URL,

  // Production URL (update when you deploy)
  production: "https://api.yourapp.com",
};

// Get the appropriate API URL based on platform and environment
export const getApiUrl = (): string => {
  if (__DEV__) {
    // Priority 1: Use ngrok if configured
    if (NGROK_URL) {
      return API_URLS.ngrok;
    }

    // Priority 2: Use adb reverse (localhost works on device)
    if (USE_ADB_REVERSE) {
      return API_URLS.adbReverse;
    }

    // Priority 3: Platform-specific defaults
    if (Platform.OS === "android") {
      return API_URLS.androidEmulator;
    }

    return API_URLS.iosSimulator;
  }

  return API_URLS.production;
};

export const API_URL = getApiUrl();

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    me: `${API_URL}/auth/me`,
    login: `${API_URL}/auth/login`,
    logout: `${API_URL}/auth/logout`,
    googleSignIn: `${API_URL}/auth/google`,
    googleAuth: `${API_URL}/auth/google/auth`,
    signup: `${API_URL}/auth/signup`,
    callback: `${API_URL}/auth/callback`,
  },
};
