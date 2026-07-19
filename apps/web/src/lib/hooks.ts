'use client';
import { useSession } from 'next-auth/react';
import type { StaffRole } from '@/lib/types';

export function useCurrentUser() {
  const { data: session, status } = useSession();
  return {
    user: session?.user ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  };
}

/**
 * Check if the current user has any of the specified roles.
 * @param roles - One or more StaffRole values to check against.
 * @returns true if the user is authenticated and has at least one matching role.
 */
export function hasRole(user: { role?: string | null } | null, ...roles: StaffRole[]): boolean {
  if (!user?.role) return false;
  return roles.includes(user.role as StaffRole);
}

/**
 * Check if the current user's role meets or exceeds the minimum privilege level.
 * Roles: OWNER > COORDINATOR > APPROVER > VIEWER
 */
export function hasMinimumRole(
  user: { role?: string | null } | null,
  minimum: StaffRole,
): boolean {
  const hierarchy: StaffRole[] = ['OWNER', 'COORDINATOR', 'APPROVER', 'VIEWER'];
  if (!user?.role) return false;
  const actualIdx = hierarchy.indexOf(user.role as StaffRole);
  const minIdx = hierarchy.indexOf(minimum);
  return actualIdx >= 0 && actualIdx <= minIdx;
}
