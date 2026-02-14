/**
 * Auth API Service
 * Handles authentication endpoints
 */

import apiClient, {
  setAuthToken,
  clearAuthToken,
  setUserPreferences,
  setUserSubscription,
} from "./api";
import {
  GoogleAuthRequest,
  GoogleAuthResponse,
  LoginRequest,
  LoginResponse,
  SignUpRequest,
  SignUpResponse,
  ProfileResponse,
} from "./types";

export const authService = {
  /**
   * Sign up with email/password
   */
  signUp: async (data: SignUpRequest): Promise<SignUpResponse> => {
    const response = await apiClient.post<SignUpResponse>("/auth/signup", data);
    if (response.data.token) {
      await setAuthToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Login with email/password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
    if (response.data.token) {
      await setAuthToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Google OAuth authentication
   * Send the idToken from Google Sign-In
   */
  googleAuth: async (idToken: string): Promise<GoogleAuthResponse> => {
    const response = await apiClient.post<GoogleAuthResponse>(
      "/auth/google/auth",
      {
        idToken,
      } as GoogleAuthRequest
    );

    if (response.data.token) {
      await setAuthToken(response.data.token);
    }
    if (response.data.preference !== undefined) {
      const prefVal = response.data.preference;
      if (prefVal && prefVal.trim() !== "") {
        await setUserPreferences({ preference: prefVal });
      } else {
        await setUserPreferences(null);
      }
    }
    if (response.data.subscription !== undefined) {
      const subVal = response.data.subscription;
      if (subVal && (subVal.tier || "").trim() !== "") {
        await setUserSubscription({
          is_active: !!subVal.is_active,
          tier: subVal.tier || "",
          expire_date: subVal.expire_date || "",
        });
      } else {
        await setUserSubscription(null);
      }
    }
    return response.data;
  },

  /**
   * Logout - clear session
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      await clearAuthToken();
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await apiClient.get<ProfileResponse>("/auth/me");
    return response.data;
  },

  /**
   * OAuth callback (if needed)
   */
  callback: async (): Promise<{ status: string }> => {
    const response = await apiClient.get<{ status: string }>("/auth/callback");
    return response.data;
  },
};

export default authService;
