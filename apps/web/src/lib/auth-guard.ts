import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { StaffRole } from '@/lib/types';

// ─── Session user shape (mirrors next-auth.d.ts augmentation) ───

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  twoFactorEnabled?: boolean;
}

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/**
 * Require an authenticated session.
 *
 * - Checks that a valid session exists with a user id.
 * - MaxAge is natively configured in Auth.js.
 *
 * Usage in route handlers:
 * ```ts
 * const sessionAuth = await requireSession();
 * if (!sessionAuth.ok) return sessionAuth.response;
 * // sessionAuth.user.id, sessionAuth.user.role, etc.
 * ```
 */
export async function requireSession(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  return {
    ok: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      twoFactorEnabled: session.user.twoFactorEnabled,
    },
  };
}

/**
 * Require an authenticated session with one of the specified roles.
 *
 * Usage:
 * ```ts
 * const auth = await requireRole('OWNER', 'COORDINATOR');
 * if (!auth.ok) return auth.response;
 * ```
 */
export async function requireRole(...roles: StaffRole[]): Promise<AuthResult> {
  const session = await requireSession();
  if (!session.ok) return session;

  if (!roles.includes(session.user.role as StaffRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Required role: ${roles.join(' or ')}. Your role: ${session.user.role}` },
        { status: 403 },
      ),
    };
  }

  return session;
}

/**
 * Convenience: require OWNER role only.
 */
export async function requireOwner(): Promise<AuthResult> {
  return requireRole('OWNER');
}

// ─── Role hierarchy for future use ───

/** Roles ordered from highest to lowest privilege */
export const ROLE_HIERARCHY: StaffRole[] = ['OWNER', 'COORDINATOR', 'APPROVER', 'VIEWER'];

/**
 * Check if a role has at least the minimum privilege level.
 * e.g. `hasMinimumRole('COORDINATOR', 'OWNER')` → true (OWNER > COORDINATOR)
 */
export function hasMinimumRole(actual: StaffRole, minimum: StaffRole): boolean {
  const actualIdx = ROLE_HIERARCHY.indexOf(actual);
  const minIdx = ROLE_HIERARCHY.indexOf(minimum);
  return actualIdx <= minIdx; // Lower index = higher privilege
}
