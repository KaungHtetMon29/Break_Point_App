/**
 * Axios API Client
 * Base configuration and interceptors
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GenerateBreakpointResponse } from "./types";
import { API_URL } from "../config/api";

// Storage keys
const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "user_data";
const USER_PREFERENCES_KEY = "user_preferences";
const USER_SUBSCRIPTION_KEY = "user_subscription";
const BREAKPOINT_PREF_UUID_KEY = "breakpoint_pref_uuid";
const BREAKPOINT_DATA_KEY = "breakpoint_data";
const BREAKPOINT_GENERATE_KEY = "breakpoint_generate";
const OFFLINE_REQUEST_QUEUE_KEY = "offline_request_queue";
const OFFLINE_REQUEST_QUEUE_LIMIT = 500;

type OfflineMethod = "post" | "put" | "patch" | "delete";

interface OfflineRequestItem {
  id: string;
  method: OfflineMethod;
  url: string;
  data?: unknown;
  createdAt: string;
}

type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
};

// JWT payload interface (matches backend JWT structure)
export interface JWTPayload {
  name: string;
  email: string;
  uuid: string;
  exp?: number; // Expiration timestamp
  iat?: number; // Issued at timestamp
}

const decodeBase64 = (base64: string): string => {
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(base64);
  }
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = "";
  let i = 0;
  while (i < base64.length) {
    const enc1 = chars.indexOf(base64.charAt(i++));
    const enc2 = chars.indexOf(base64.charAt(i++));
    const enc3 = chars.indexOf(base64.charAt(i++));
    const enc4 = chars.indexOf(base64.charAt(i++));
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    str += String.fromCharCode(chr1);
    if (enc3 !== 64) {
      str += String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      str += String.fromCharCode(chr3);
    }
  }
  return str;
};

/**
 * Decode JWT token payload (without verification)
 * Note: Verification is done on the backend
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    // JWT structure: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("Invalid JWT format");
      return null;
    }

    // Decode base64url payload (second part)
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      base64.length % 4 === 0
        ? base64
        : base64.padEnd(base64.length + (4 - (base64.length % 4)), "=");
    const jsonPayload = decodeBase64(padded);
    // Parse JSON
    return JSON.parse(jsonPayload) as JWTPayload;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isFlushingOfflineQueue = false;

const isOfflineAxiosError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  if (!error.response) {
    return true;
  }
  const code = error.code || "";
  return code === "ECONNABORTED" || code === "ERR_NETWORK";
};

export const isNetworkError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && !error.response;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  if (isNetworkError(error)) {
    return "No internet connection. Please try again when you are online.";
  }
  if (axios.isAxiosError(error)) {
    const payload = (error.response?.data || {}) as ApiErrorPayload;
    if (typeof payload.message === "string" && payload.message.trim() !== "") {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim() !== "") {
      return payload.error;
    }
    if (error.response?.status === 401) {
      return "Session expired. Please log in again.";
    }
    if ((error.response?.status || 0) >= 500) {
      return "Server is unavailable right now. Please try again later.";
    }
  }
  return fallback;
};

const getOfflineRequestQueue = async (): Promise<OfflineRequestItem[]> => {
  const raw = await AsyncStorage.getItem(OFFLINE_REQUEST_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OfflineRequestItem[];
  } catch {
    return [];
  }
};

const setOfflineRequestQueue = async (
  queue: OfflineRequestItem[]
): Promise<void> => {
  await AsyncStorage.setItem(OFFLINE_REQUEST_QUEUE_KEY, JSON.stringify(queue));
};

export const enqueueOfflineRequest = async (request: {
  method: OfflineMethod;
  url: string;
  data?: unknown;
}): Promise<void> => {
  const queue = await getOfflineRequestQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: request.method,
    url: request.url,
    data: request.data,
    createdAt: new Date().toISOString(),
  });
  const nextQueue =
    queue.length > OFFLINE_REQUEST_QUEUE_LIMIT
      ? queue.slice(queue.length - OFFLINE_REQUEST_QUEUE_LIMIT)
      : queue;
  await setOfflineRequestQueue(nextQueue);
};

export const flushOfflineRequestQueue = async (): Promise<number> => {
  if (isFlushingOfflineQueue) return 0;
  isFlushingOfflineQueue = true;
  try {
    const queue = await getOfflineRequestQueue();
    if (queue.length === 0) return 0;
    const remainingQueue: OfflineRequestItem[] = [];
    let successCount = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];
      try {
        await apiClient.request({
          method: item.method,
          url: item.url,
          data: item.data,
          headers: { "X-Offline-Replay": "1" },
        });
        successCount += 1;
      } catch (error) {
        if (isOfflineAxiosError(error)) {
          remainingQueue.push(...queue.slice(index));
          break;
        }
      }
    }
    await setOfflineRequestQueue(remainingQueue);
    return successCount;
  } finally {
    isFlushingOfflineQueue = false;
  }
};

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    void flushOfflineRequestQueue();
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (
      error.response?.status === 401 &&
      originalRequest?.headers?.["X-Offline-Replay"] !== "1"
    ) {
      // Clear token and redirect to login
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      // You could emit an event here to trigger logout in the app
    }

    return Promise.reject(error);
  }
);

// Helper functions for token management
export const setAuthToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

  // Decode and store user data from JWT
  const payload = decodeJWT(token);
  if (payload) {
    await setUserData(payload);
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
};

export const clearAuthToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await clearUserData();
  await AsyncStorage.removeItem(USER_PREFERENCES_KEY);
  await AsyncStorage.removeItem(USER_SUBSCRIPTION_KEY);
};

// Helper functions for user data management
export const setUserData = async (data: JWTPayload): Promise<void> => {
  await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
};

export const getUserData = async (): Promise<JWTPayload | null> => {
  const data = await AsyncStorage.getItem(USER_DATA_KEY);
  if (data) {
    try {
      return JSON.parse(data) as JWTPayload;
    } catch {
      return null;
    }
  }
  return null;
};

export const clearUserData = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_DATA_KEY);
};

/**
 * Check if the stored token is expired
 */
export const isTokenExpired = async (): Promise<boolean> => {
  const userData = await getUserData();
  if (!userData?.exp) {
    return false;
  }
  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= userData.exp * 1000;
};

// User preferences interface
export interface StoredPreferences {
  uuid?: string | null;
  preference: string | null;
}

export interface StoredBreakpointData {
  uuid: string;
  pref_uuid?: string | null;
  is_active: boolean;
  techniques: string;
}

// Helper functions for user preferences management
export const setUserPreferences = async (
  preferences: StoredPreferences | null
): Promise<void> => {
  if (preferences === null) {
    await AsyncStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(null));
  } else {
    await AsyncStorage.setItem(
      USER_PREFERENCES_KEY,
      JSON.stringify(preferences)
    );
  }
};

export const getUserPreferencesFromStorage =
  async (): Promise<StoredPreferences | null> => {
    const data = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
    if (data) {
      try {
        return JSON.parse(data) as StoredPreferences | null;
      } catch {
        return null;
      }
    }
    return null;
  };

export const clearUserPreferences = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_PREFERENCES_KEY);
};

export const setBreakpointPrefUuid = async (
  prefUuid: string | null
): Promise<void> => {
  if (prefUuid) {
    await AsyncStorage.setItem(BREAKPOINT_PREF_UUID_KEY, prefUuid);
  } else {
    await AsyncStorage.removeItem(BREAKPOINT_PREF_UUID_KEY);
  }
};

export const getBreakpointPrefUuidFromStorage =
  async (): Promise<string | null> => {
    return AsyncStorage.getItem(BREAKPOINT_PREF_UUID_KEY);
  };

export const setBreakpointData = async (
  data: StoredBreakpointData | null
): Promise<void> => {
  if (data === null) {
    await AsyncStorage.setItem(BREAKPOINT_DATA_KEY, JSON.stringify(null));
  } else {
    await AsyncStorage.setItem(BREAKPOINT_DATA_KEY, JSON.stringify(data));
  }
};


export const setBreakpointGenerateData = async (
  data: GenerateBreakpointResponse | null
): Promise<void> => {
  if (data === null) {
    await AsyncStorage.setItem(BREAKPOINT_GENERATE_KEY, JSON.stringify(null));
  } else {
    await AsyncStorage.setItem(BREAKPOINT_GENERATE_KEY, JSON.stringify(data));
  }
};

export const getBreakpointGenerateData =
  async (): Promise<GenerateBreakpointResponse | null> => {
    const data = await AsyncStorage.getItem(BREAKPOINT_GENERATE_KEY);
    if (data) {
      try {
        return JSON.parse(data) as GenerateBreakpointResponse | null;
      } catch {
        return null;
      }
    }
    return null;
  };

// Subscription storage
export interface StoredSubscription {
  is_active: boolean;
  tier: string;
  expire_date: string;
}

export const setUserSubscription = async (
  subscription: StoredSubscription | null
): Promise<void> => {
  if (subscription === null) {
    await AsyncStorage.setItem(USER_SUBSCRIPTION_KEY, JSON.stringify(null));
  } else {
    await AsyncStorage.setItem(
      USER_SUBSCRIPTION_KEY,
      JSON.stringify(subscription)
    );
  }
};

export const getUserSubscriptionFromStorage =
  async (): Promise<StoredSubscription | null> => {
    const data = await AsyncStorage.getItem(USER_SUBSCRIPTION_KEY);
    if (data) {
      try {
        return JSON.parse(data) as StoredSubscription | null;
      } catch {
        return null;
      }
    }
    return null;
  };

export const clearUserSubscription = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_SUBSCRIPTION_KEY);
};

export default apiClient;
