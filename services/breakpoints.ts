/**
 * Breakpoints API Service
 * Handles breakpoint-related endpoints
 */

import apiClient from "./api";
import {
  BreakpointTechnique,
  GenerateBreakpointResponse,
  BreakpointHistory,
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
};

export default breakpointsService;
