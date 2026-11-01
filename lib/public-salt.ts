// Sel du hash d'IP pour les routes publiques. En local sans HASH_SALT, un sel de développement.
export function publicSalt(): string {
  return process.env.HASH_SALT || (process.env.NODE_ENV === 'production' ? '' : 'koupi-development-salt');
}
