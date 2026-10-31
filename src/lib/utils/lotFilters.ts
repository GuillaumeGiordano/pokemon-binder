import type { CardVariant } from '$lib/records/card';
import type { CardCondition, CardLanguage } from '$lib/records/collection';
import type { CollectionItemVM } from '$lib/viewmodels/collection';

// Filters and sorting of a profile's card list (D40). Pure: runs in the browser on every change.

export const LOT_SORTS = ['value-desc', 'value-asc', 'name', 'number', 'recent'] as const;
export type LotSort = (typeof LOT_SORTS)[number];

export type LotFilters = {
	/** Name or reference: « pikachu », « 025 », « 025/198 ». */
	text: string;
	variant: CardVariant | '';
	setId: string;
	condition: CardCondition | '';
	language: CardLanguage | '';
	sort: LotSort;
};

export const NO_FILTERS: LotFilters = { text: '', variant: '', setId: '', condition: '', language: '', sort: 'value-desc' };

/** Lowercase without accents: « Salamèche » matches « salameche ». */
const normalize = (value: string) =>
	value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();

/** « 25 », « 025 » or « 025/198 » against a card numbered 025 in a set of 198. */
function matchesReference(lot: CollectionItemVM, text: string): boolean {
	const match = /^(\d{1,3})\s*(?:\/\s*(\d{1,3}))?$/.exec(text);
	if (!match) return false;
	const sameNumber = /^\d+$/.test(lot.card.localId) && Number(lot.card.localId) === Number(match[1]);
	return sameNumber && (!match[2] || Number(match[2]) === lot.card.officialCount);
}

const byNumber = (a: CollectionItemVM, b: CollectionItemVM) =>
	a.card.setName.localeCompare(b.card.setName, 'fr') ||
	a.card.localId.localeCompare(b.card.localId, 'fr', { numeric: true });

/** Unknown prices last, whatever the direction. */
const byValue = (direction: 1 | -1) => (a: CollectionItemVM, b: CollectionItemVM) => {
	if (a.currentMarketPrice === null) return b.currentMarketPrice === null ? 0 : 1;
	if (b.currentMarketPrice === null) return -1;
	return direction * (a.currentMarketPrice - b.currentMarketPrice);
};

const SORTERS: Record<LotSort, (a: CollectionItemVM, b: CollectionItemVM) => number> = {
	'value-desc': byValue(-1),
	'value-asc': byValue(1),
	name: (a, b) => a.card.name.localeCompare(b.card.name, 'fr') || byNumber(a, b),
	number: byNumber,
	recent: (a, b) => b.acquiredAt.localeCompare(a.acquiredAt)
};

export function filterAndSortLots(lots: CollectionItemVM[], filters: LotFilters): CollectionItemVM[] {
	const text = normalize(filters.text);
	return lots
		.filter(
			(lot) =>
				(!text || normalize(lot.card.name).includes(text) || matchesReference(lot, text)) &&
				(!filters.variant || lot.variant === filters.variant) &&
				(!filters.setId || lot.card.setId === filters.setId) &&
				(!filters.condition || lot.condition === filters.condition) &&
				(!filters.language || lot.language === filters.language)
		)
		.sort(SORTERS[filters.sort]);
}
