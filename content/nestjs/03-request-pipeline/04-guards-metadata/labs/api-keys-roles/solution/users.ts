export interface User { id: string; name: string; roles: string[] }

/** Clés d'API connues (en vrai : en base, et hachées). */
export const API_KEYS: Record<string, User> = {
  'key-ines': { id: 'u1', name: 'Inès', roles: ['staff'] },
  'key-omar': { id: 'u2', name: 'Omar', roles: ['staff', 'admin'] },
  'key-lea': { id: 'u3', name: 'Léa', roles: ['reader'] },
};
