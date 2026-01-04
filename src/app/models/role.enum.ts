/**
 * User roles for the Household Budget Management System
 * - ADMIN: Budget holder with full access
 * - USER: Family members who can submit expense requests
 * - VIEWER: Read-only access to all data (e.g., Mother)
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}
