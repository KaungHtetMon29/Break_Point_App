/**
 * API Types generated from OpenAPI spec (oapi.yaml)
 */

// ============ Common Types ============

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// ============ Auth Types ============

export interface JWT {
  token: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface GoogleAuthResponse {
  token: string;
  subscription?: Subscription | null;
  preference?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  token?: string; // JWT token if returned
}

export interface SignUpRequest {
  email: string;
  password: string;
  username?: string;
}

export interface SignUpResponse {
  token: string;
}

export interface ProfileResponse {
  status: string;
}

// ============ User Types ============

export interface UserDetail {
  uuid: string;
  username: string;
  email: string;
}

export interface UpdateUserRequest {
  username: string;
}

export interface UpdateUserResponse {
  username: string;
  updated_at: string;
}

export interface UserPreferences {
  uuid?: string | null;
  preference: string;
}

export interface UpdatePreferencesRequest {
  preference: string;
}

export interface UpdatePreferencesResponse {
  uuid?: string | null;
  preference: string;
  updated_at: string;
}

export interface PreferenceHistoryItem {
  uuid: string;
  preference: string;
  is_active?: boolean;
}

export interface ChoosePreferenceResponse {
  preference: PreferenceHistoryItem;
  breakpoint: BreakpointData;
}

export interface StripeKeyResponse {
  stripe_key: string;
}

export interface SubscribeResponse {
  customer_id: string;
  payment_intent: string;
}

export type ActivityAction = "snooze" | "skip" | "break";
export type ActivityTimeBlock = "morning" | "evening" | "night";

export interface RecordActivityRequest {
  action: ActivityAction;
  time_block: ActivityTimeBlock;
  alarm_time: string;
  prefernce_uuid: string;
}

export interface RecordActivityResponse {
  status: "success" | "failed";
}

export interface CanGenerateAdaptiveResponse {
  days_left?: number;
  can_generate?: boolean;
}

export interface ConsentResponse {
  status: "success" | "failed";
}

// ============ Breakpoints Types ============

export interface BreakpointTechnique {
  uuid: string;
  pref_uuid?: string | null;
  is_active: boolean;
  techniques: string;
}

export interface BreakpointData {
  uuid: string;
  pref_uuid?: string | null;
  is_active: boolean;
  techniques: string;
}

export interface AlarmDetails {
  alarm_time: string;
  label?: string;
}

export interface AlarmPatterns {
  start_time?: AlarmDetails;
  stop_time?: AlarmDetails;
}

export interface GenerateBreakpointResponse {
  uuid?: string;
  alarm_patterns?: AlarmPatterns[];
  pref_uuid?: string;
  status?: string;
}

export interface BreakpointHistory {
  uuid: string;
  created_at: string;
}

// ============ Plans Types ============

export interface CurrentPlan {
  uuid: string;
  plan_type: string;
  start_date: string;
  end_date: string;
}

export interface PlanHistory {
  uuid: string;
  plan_type: string;
  start_date: string;
  end_date: string;
}

export interface PlanUsage {
  generation_count: number;
  date: string;
}

export interface UpgradePlanResponse {
  status: string;
}

export type PlanType = "free" | "premium";

export interface SubscribePlanRequest {
  plan_type: PlanType;
}

export interface SubscribePlanResponse {
  status: string;
}

// ============ Subscription Types ============
export interface Subscription {
  is_active: boolean;
  tier: string;
  expire_date: string;
}

// ============ Admin Types ============

export interface AdminUser {
  status: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  status: string;
}

// ============ Ping Types ============

export interface Pong {
  ping: string;
}
