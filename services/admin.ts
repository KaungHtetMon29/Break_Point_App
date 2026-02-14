/**
 * Admin API Service
 * Handles admin-related endpoints
 */

import apiClient from "./api";
import { AdminUser, AdminLoginRequest, AdminLoginResponse } from "./types";

export const adminService = {
  /**
   * Get all users (admin only)
   */
  getUsers: async (): Promise<AdminUser> => {
    const response = await apiClient.get<AdminUser>("/admin/users");
    return response.data;
  },

  /**
   * Get user details (admin only)
   */
  getUserDetails: async (id: string): Promise<AdminUser> => {
    const response = await apiClient.get<AdminUser>(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Update user status (admin only)
   */
  updateUserStatus: async (id: string): Promise<AdminUser> => {
    const response = await apiClient.patch<AdminUser>(
      `/admin/users/${id}/status`
    );
    return response.data;
  },

  /**
   * Add a new admin
   */
  addAdmin: async (): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>("/admin/add_admin");
    return response.data;
  },

  /**
   * Get admin detail
   */
  getAdminDetail: async (adminId: string): Promise<AdminUser> => {
    const response = await apiClient.get<AdminUser>(`/admin/${adminId}`);
    return response.data;
  },

  /**
   * Update admin detail
   */
  updateAdminDetail: async (adminId: string): Promise<AdminUser> => {
    const response = await apiClient.put<AdminUser>(`/admin/${adminId}`);
    return response.data;
  },

  /**
   * Delete admin
   */
  deleteAdmin: async (adminId: string): Promise<AdminUser> => {
    const response = await apiClient.delete<AdminUser>(`/admin/${adminId}`);
    return response.data;
  },

  /**
   * Admin login
   */
  login: async (data: AdminLoginRequest): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<AdminLoginResponse>(
      "/admin/auth/login",
      data
    );
    return response.data;
  },

  /**
   * Admin logout
   */
  logout: async (): Promise<AdminUser> => {
    const response = await apiClient.post<AdminUser>("/admin/auth/logout");
    return response.data;
  },
};

export default adminService;
