// Presentation maps for the lots of a binder (labels shown in the UI).

/** Cardmarket condition scale (D12), best first. */
export const CARD_CONDITIONS = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'] as const;
export type CardCondition = (typeof CARD_CONDITIONS)[number];

export const CARD_CONDITION_LABELS: Record<CardCondition, string> = {
	MT: 'Mint',
	NM: 'Near Mint',
	EX: 'Excellent',
	GD: 'Good',
	LP: 'Light Played',
	PL: 'Played',
	PO: 'Poor'
};

/** International card languages only (D10). */
export const CARD_LANGUAGES = ['FR', 'EN', 'DE', 'IT', 'ES', 'PT'] as const;
export type CardLanguage = (typeof CARD_LANGUAGES)[number];

export const CARD_LANGUAGE_LABELS: Record<CardLanguage, string> = {
	FR: 'Français',
	EN: 'Anglais',
	DE: 'Allemand',
	IT: 'Italien',
	ES: 'Espagnol',
	PT: 'Portugais'
};
