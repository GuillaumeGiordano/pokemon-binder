// Presentation maps for cards (labels shown in the UI).

export const CARD_VARIANTS = ['NORMAL', 'REVERSE', 'HOLO', 'FIRST_EDITION'] as const;
export type CardVariant = (typeof CARD_VARIANTS)[number];

export const CARD_VARIANT_LABELS: Record<CardVariant, string> = {
	NORMAL: 'Normale',
	REVERSE: 'Reverse',
	HOLO: 'Holo',
	FIRST_EDITION: '1ʳᵉ édition'
};
