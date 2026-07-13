import { z } from 'zod';

export const UserRole = {
  Admin: 'admin',
  User: 'user',
} as const;

export const UserRoleSchema = z.enum(
  Object.values(UserRole) as [string, ...string[]],
);

export type UserRole = z.infer<typeof UserRoleSchema>;
