/**
 * User API Service
 * Handles user-related endpoints
 */

import apiClient from "./api";
import {
  UserDetail,
  UpdateUserRequest,
  UpdateUserResponse,
  UserPreferences,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
} from "./types";

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
};

export default userService;
