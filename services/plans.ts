/**
 * Plans API Service
 * Handles subscription/plan-related endpoints
 */

import apiClient from "./api";
import {
  CurrentPlan,
  PlanHistory,
  PlanUsage,
  UpgradePlanResponse,
  SubscribePlanRequest,
  SubscribePlanResponse,
  PlanType,
} from "./types";

export const plansService = {
  /**
   * Get current plan for a user
   */
  getCurrentPlan: async (id: string): Promise<CurrentPlan> => {
    const response = await apiClient.get<CurrentPlan>(`/plans/${id}/current`);
    return response.data;
  },

  /**
   * Upgrade plan
   */
  upgradePlan: async (): Promise<UpgradePlanResponse> => {
    const response = await apiClient.post<UpgradePlanResponse>(
      "/plans/upgrade"
    );
    return response.data;
  },
  /**
   * Subscribe to a plan
   */
  subscribePlan: async (
    id: string,
    data: SubscribePlanRequest
  ): Promise<SubscribePlanResponse> => {
    const response = await apiClient.post<SubscribePlanResponse>(
      `/plans/${id}/subscribe`,
      data
    );
    return response.data;
  },

  /**
   * Get plan history for a user
   */
  getPlanHistory: async (id: string): Promise<PlanHistory[]> => {
    const response = await apiClient.get<PlanHistory[]>(
      `/plans/${id}/plan_history`
    );
    return response.data;
  },

  /**
   * Get plan usage for a user
   */
  getPlanUsage: async (id: string): Promise<PlanUsage[]> => {
    const response = await apiClient.get<PlanUsage[]>(`/plans/${id}/usage`);
    return response.data;
  },
};

export default plansService;
