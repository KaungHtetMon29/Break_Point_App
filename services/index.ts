/**
 * API Services - Central export
 */

// Export API client and helpers
export {
  default as apiClient,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  setUserData,
  getUserData,
  clearUserData,
  decodeJWT,
  isTokenExpired,
  setUserPreferences,
  getUserPreferencesFromStorage,
  clearUserPreferences,
  setBreakpointData,
  setBreakpointPrefUuid,
  getBreakpointPrefUuidFromStorage,
  setBreakpointGenerateData,
  getBreakpointGenerateData,
  setUserSubscription,
  getUserSubscriptionFromStorage,
  clearUserSubscription,
  isNetworkError,
  getApiErrorMessage,
} from "./api";

// Export types
export type {
  JWTPayload,
  StoredPreferences,
  StoredBreakpointData,
  StoredSubscription,
} from "./api";

// Export all services
export { authService } from "./auth";
export { userService } from "./user";
export { breakpointsService } from "./breakpoints";
export { plansService } from "./plans";
export { adminService } from "./admin";
export { pingService } from "./ping";

// Export all types
export * from "./types";
