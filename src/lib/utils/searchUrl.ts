/** The search page URL for a query, a results page and the profile it was started from. */
export function searchHref({ q, page, profileId }: { q?: string | null; page?: number | null; profileId?: string | null }) {
	const params = new URLSearchParams();
	if (q) params.set('q', q);
	if (page && page > 1) params.set('page', String(page));
	if (profileId) params.set('profil', profileId);
	const query = params.toString();
	return `/recherche${query ? `?${query}` : ''}`;
}

/**
 * A card page URL that remembers where it was opened from, for its back link: the search results
 * (`q`, `page`) or a missing card of a profile's set view (`profileId` + `setId`, D37).
 */
export function cardHref(
	id: string,
	{ q, page, profileId, setId }: { q?: string | null; page?: number | null; profileId?: string | null; setId?: string | null }
) {
	const params = new URLSearchParams();
	if (profileId) params.set('profil', profileId);
	if (setId) params.set('extension', setId);
	if (q) params.set('q', q);
	if (page && page > 1) params.set('page', String(page));
	const query = params.toString();
	return `/cartes/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;
}

/** A profile's view of a set. */
export const profileSetHref = (profileId: string, setId: string) =>
	`/profils/${encodeURIComponent(profileId)}/extensions/${encodeURIComponent(setId)}`;
