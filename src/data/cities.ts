// Cidades e imagens fixas por cidade foram removidas: a lista de cidades reais
// vem de platform_settings.cities (ver @/lib/queries#fetchPlatformSettings).
// Mantemos apenas um util de exibição, sem inventar abreviações fixas.
export const cityShort = (name: string): string => name;
