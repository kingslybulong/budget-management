import { Role } from './role.enum';

/**
 * User model representing a family member in the system
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  createdAt: Date;
  isActive: boolean;
}
