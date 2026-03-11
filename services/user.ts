/**
 * User API Service
 * Handles user-related endpoints
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./api";
import {
  UserDetail,
  UpdateUserRequest,
  UpdateUserResponse,
  EditProfileRequest,
  EditProfileResponse,
  UserPreferences,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  PreferenceHistoryItem,
  ChoosePreferenceResponse,
  StripeKeyResponse,
  SubscribeResponse,
  RecordActivityRequest,
  RecordActivityResponse,
  CanGenerateAdaptiveResponse,
  ConsentResponse,
  SubmitFeedbackRequest,
  SubmitFeedbackResponse,
} from "./types";
const STRIPE_API_KEY = "stripe_key";
export const userService = {
  /**
   * Get user details by ID
   */
  getUserDetail: async (id: string): Promise<UserDetail> => {
    const response = await apiClient.get<UserDetail>(`/user/${id}`);
    return response.data;
  },

  /**
   * Update user details
   */
  updateUserDetail: async (
    id: string,
    data: UpdateUserRequest
  ): Promise<UpdateUserResponse> => {
    const response = await apiClient.put<UpdateUserResponse>(
      `/user/${id}`,
      data
    );
    return response.data;
  },

  editProfile: async (
    data: EditProfileRequest
  ): Promise<EditProfileResponse> => {
    const response = await apiClient.post<EditProfileResponse>(
      "/user/edit_profile",
      data
    );
    return response.data;
  },

  /**
   * Get user preferences
   */
  getUserPreferences: async (id: string): Promise<UserPreferences> => {
    const response = await apiClient.get<UserPreferences>(
      `/user/${id}/preferences`
    );
    return response.data;
  },

  /**
   * Update user preferences
   */
  updateUserPreferences: async (
    id: string,
    data: UpdatePreferencesRequest
  ): Promise<UpdatePreferencesResponse> => {
    const response = await apiClient.put<UpdatePreferencesResponse>(
      `/user/${id}/preferences`,
      data
    );
    return response.data;
  },

  /**
   * Get user preference history
   */
  getPreferenceHistory: async (id: string): Promise<PreferenceHistoryItem[]> => {
    const response = await apiClient.get<PreferenceHistoryItem[]>(
      `/user/${id}/preference_history`
    );
    return response.data;
  },

  chooseUserPreference: async (
    preferenceUuid: string
  ): Promise<ChoosePreferenceResponse> => {
    const response = await apiClient.get<ChoosePreferenceResponse>(
      `/user/${preferenceUuid}/choose_preference`
    );
    return response.data;
  },

  /**
   * Get Stripe publishable key
   */
  getStripePublishableKey: async (): Promise<StripeKeyResponse> => {
    const response = await apiClient.get<StripeKeyResponse>("/user/stripe_key");
     await AsyncStorage.setItem(STRIPE_API_KEY, response.data.stripe_key);
    return response.data;
  },

  /**
   * Create subscription payment intent
   */
  subscribePlan: async (): Promise<SubscribeResponse> => {
    const response = await apiClient.post<SubscribeResponse>("/user/subscribe");
    return response.data;
  },

  recordActivity: async (
    data: RecordActivityRequest
  ): Promise<RecordActivityResponse> => {
    const response = await apiClient.post<RecordActivityResponse>(
      "/user/activity",
      data
    );
    return response.data;
  },

  canGenerateAdaptive: async (): Promise<CanGenerateAdaptiveResponse> => {
    const response = await apiClient.get<CanGenerateAdaptiveResponse>(
      "/user/can_generate_adaptive"
    );
    return response.data;
  },

  acceptConsent: async (): Promise<ConsentResponse> => {
    const response = await apiClient.post<ConsentResponse>("/user/accept_consent");
    return response.data;
  },

  submitFeedback: async (
    data: SubmitFeedbackRequest
  ): Promise<SubmitFeedbackResponse> => {
    const response = await apiClient.post<SubmitFeedbackResponse>("/user/feedback", data);
    return response.data;
  },
};

export default userService;
