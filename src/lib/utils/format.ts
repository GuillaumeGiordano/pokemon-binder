const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** 1.5 → "1,50 €"; null → "—". */
export const formatEur = (value: number | null) => (value === null ? '—' : eur.format(value));

/** "2026-10-30" → "30/10/2026". */
export const formatDay = (isoDay: string) => isoDay.split('-').reverse().join('/');
