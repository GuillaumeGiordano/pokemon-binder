/** The search page URL for a query, a results page and the profile it was started from. */
export function searchHref({ q, page, profileId }: { q?: string | null; page?: number | null; profileId?: string | null }) {
	const params = new URLSearchParams();
	if (q) params.set('q', q);
	if (page && page > 1) params.set('page', String(page));
	if (profileId) params.set('profil', profileId);
	const query = params.toString();
	return `/recherche${query ? `?${query}` : ''}`;
}

/** A card page URL that remembers the search it was opened from (for the « back to results » link). */
export function cardHref(id: string, { q, page, profileId }: { q?: string | null; page?: number | null; profileId?: string | null }) {
	const params = new URLSearchParams();
	if (profileId) params.set('profil', profileId);
	if (q) params.set('q', q);
	if (page && page > 1) params.set('page', String(page));
	const query = params.toString();
	return `/cartes/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;
}
