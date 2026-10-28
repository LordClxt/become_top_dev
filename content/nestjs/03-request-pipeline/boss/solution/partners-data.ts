export interface Partner { id: string; scopes: string[]; quotaPerMinute: number }

/** Clés des partenaires (en vrai : en base, hachées). */
export const PARTNERS: Record<string, Partner> = {
  'pk_fnac': { id: 'fnac', scopes: ['catalog:read', 'stock:read'], quotaPerMinute: 5 },
  'pk_blog': { id: 'blog', scopes: ['catalog:read'], quotaPerMinute: 2 },
};
