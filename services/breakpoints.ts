/**
 * Breakpoints API Service
 * Handles breakpoint-related endpoints
 */

import apiClient, { enqueueOfflineRequest, isNetworkError } from "./api";
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
    const response = await apiClient.get<BreakpointTechnique[]>(
      "/breakpoints/get_adaptive_alarm"
    );
    return response.data;
  },

  updateSchedule: async (
    id: string,
    alarmPatterns: AlarmPatterns[]
  ): Promise<{ buffered: boolean }> => {
    try {
      await apiClient.post(`/breakpoints/${id}/schedule_update`, {
        alarm_patterns: alarmPatterns,
      });
      return { buffered: false };
    } catch (error) {
      if (!isNetworkError(error)) {
        throw error;
      }
      await enqueueOfflineRequest({
        method: "post",
        url: `/breakpoints/${id}/schedule_update`,
        data: {
          alarm_patterns: alarmPatterns,
        },
      });
      return { buffered: true };
    }
  },
};

export default breakpointsService;
