/**
 * Ping API Service
 * Health check endpoints
 */

import apiClient from "./api";
import { Pong } from "./types";

export const pingService = {
  /**
   * Ping endpoint
   */
  ping: async (): Promise<Pong> => {
    const response = await apiClient.get<Pong>("/ping");
    return response.data;
  },

  /**
   * Ping1 endpoint
   */
  ping1: async (): Promise<Pong> => {
    const response = await apiClient.get<Pong>("/ping1");
    return response.data;
  },
};

export default pingService;
