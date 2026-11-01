import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from './admin-session';

/** Vrai si la requête vient d'un admin connecté (jeton signé dans le cookie). */
export function isAdminRequest(request: NextRequest): Promise<boolean> {
  return verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.SESSION_SECRET);
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
