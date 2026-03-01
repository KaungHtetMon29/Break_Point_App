/**
 * Breakpoints API Service
 * Handles breakpoint-related endpoints
 */

import apiClient, { getAuthToken } from "./api";
import {
  BreakpointTechnique,
  GenerateBreakpointResponse,
  BreakpointHistory,
  AlarmPatterns,
} from "./types";

export const breakpointsService = {
  /**
   * Get breakpoint techniques for a user
   */
  getTechniques: async (id: string): Promise<BreakpointTechnique[]> => {
    const response = await apiClient.get<BreakpointTechnique[]>(
      `/breakpoints/${id}/techniques`
    );
    return response.data;
  },

  /**
   * Generate a new breakpoint
   */
  generate: async (userUuid: string): Promise<GenerateBreakpointResponse> => {
    const response = await apiClient.post<GenerateBreakpointResponse>(
      "/breakpoints/generate",
      { user_uuid: userUuid }
    );
    return response.data;
  },

  /**
   * Get breakpoint history for a user
   */
  getHistory: async (id: string): Promise<BreakpointHistory[]> => {
    const response = await apiClient.get<BreakpointHistory[]>(
      `/breakpoints/${id}/history`
    );
    return response.data;
  },

  getAdaptiveAlarm: async (): Promise<BreakpointTechnique[]> => {
    const url = "/breakpoints/get_adaptive_alarm";
    const token = await getAuthToken();
    const requestHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const headers = {
      ...(apiClient.defaults.headers.common || {}),
      ...requestHeaders,
    };
    if ("Authorization" in headers) {
      headers.Authorization = "Bearer ***";
    }
    console.log("Adaptive alarm request", { url, headers });
    const response = await apiClient.get<BreakpointTechnique[]>(url, {
      headers: requestHeaders,
    });
    return response.data;
  },

  updateSchedule: async (
    id: string,
    alarmPatterns: AlarmPatterns[]
  ): Promise<void> => {
    const endpoint = `/breakpoints/${id}/schedule_update`;
    const body = { alarm_patterns: alarmPatterns };
    console.log("Schedule update request", { endpoint, uuid: id, body });
    await apiClient.post(endpoint, {
      alarm_patterns: alarmPatterns,
    });
  },
};

export default breakpointsService;
