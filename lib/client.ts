// Identifiant anonyme du client : hash de l'IP avec un sel secret. L'IP elle-même n'est jamais stockée.
// Sur Vercel, le premier élément de x-forwarded-for est l'IP vue par Vercel (le client ne peut pas l'imposer).
import { hashIp } from './submissions';

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function clientHash(request: Request, salt: string): string {
  return hashIp(clientIp(request), salt);
}
