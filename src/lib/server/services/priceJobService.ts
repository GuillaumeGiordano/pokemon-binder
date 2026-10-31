import * as cardRepository from '$lib/server/repositories/cardRepository';
import { syncCard, today } from '$lib/server/services/cardService';
import { fetchSet } from '$lib/server/services/completionService';
import { TcgdexError } from '$lib/server/tcgdex';

// Daily price refresh (D21): every card in at least one profile gets today's price snapshot.
// TCGdex updates its prices once a day, so a card synced today is skipped. The job runs in the
// server process (started from hooks.server.ts `init`) and checks every hour: it is idempotent,
// so a restart or a missed hour only delays the refresh.

const CHECK_EVERY_MS = 3600 * 1000;
/** Pause between two TCGdex calls, to stay polite with a free API. */
const DELAY_BETWEEN_CARDS_MS = 300;

let running = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Refresh the owned cards not synced today. Stops early when TCGdex is down. */
export async function refreshOwnedCardPrices(): Promise<void> {
	if (running) return;
	running = true;
	try {
		const ids = await cardRepository.findOwnedCardIdsSyncedBefore(today());
		if (ids.length === 0) return;
		console.info(`[pokemon-binder] price job: refreshing ${ids.length} card(s)`);
		let refreshed = 0;
		for (const id of ids) {
			try {
				if (await syncCard(id)) refreshed++;
			} catch (err) {
				if (err instanceof TcgdexError) {
					console.warn(`[pokemon-binder] price job: TCGdex unavailable, retry next hour (${err.message})`);
					return;
				}
				console.error(`[pokemon-binder] price job: card ${id} failed`, err);
			}
			await sleep(DELAY_BETWEEN_CARDS_MS);
		}
		console.info(`[pokemon-binder] price job: ${refreshed}/${ids.length} card(s) refreshed`);
	} finally {
		running = false;
	}
}

// --- Catalogs of the collected sets (D41) ---
// The value of a complete set needs the price of EVERY card of it, owned or not, and TCGdex only
// gives prices card by card (its set list and GraphQL API have none). So every set a profile has a
// card of is fetched card by card once, then a card nobody owns is refreshed weekly (owned cards
// stay daily, above): about 200 calls for a set of 200 cards, ~1 minute.

/** A card nobody owns is refreshed at most once a week. */
const CATALOG_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

let catalogRunning = false;

/** Wait before retrying a failed card: a single network hiccup must not stop the whole job. */
const RETRY_DELAY_MS = 5000;

/**
 * One card, retried once after a pause. Seen on 2026-10-31: a dropped connection (« fetch failed »)
 * and a database transaction that could not start in time, both passing — not worth an hour's wait.
 */
async function syncCardWithRetry(id: string): Promise<void> {
	try {
		await syncCard(id);
	} catch {
		await sleep(RETRY_DELAY_MS);
		await syncCard(id); // a second failure is reported by the caller
	}
}

/** Fetch the cards of every collected set whose catalog is missing or a week old. */
export async function refreshSetCatalogs(): Promise<void> {
	if (catalogRunning) return;
	catalogRunning = true;
	try {
		const staleBefore = new Date(Date.now() - CATALOG_MAX_AGE_MS);
		for (const setId of await cardRepository.findOwnedSetIdsToCatalog(staleBefore)) {
			const set = await fetchSet(setId);
			if (!set) continue;
			const syncedAt = await cardRepository.findSyncDatesOfSet(setId);
			const toFetch = set.cards.filter((card) => {
				const last = syncedAt.get(card.id);
				return !last || last < staleBefore; // never fetched, or a week old
			});
			console.info(`[pokemon-binder] catalog job: ${set.name}, ${toFetch.length}/${set.cards.length} card(s) to fetch`);
			for (const card of toFetch) {
				try {
					await syncCardWithRetry(card.id);
				} catch (err) {
					if (err instanceof TcgdexError) {
						console.warn(`[pokemon-binder] catalog job: TCGdex unavailable, retry next hour (${err.message})`);
						return;
					}
					console.error(`[pokemon-binder] catalog job: card ${card.id} failed`, err);
				}
				await sleep(DELAY_BETWEEN_CARDS_MS);
			}
			await cardRepository.markCatalogSynced(setId);
		}
	} catch (err) {
		if (!(err instanceof TcgdexError)) throw err;
		console.warn(`[pokemon-binder] catalog job: TCGdex unavailable, retry next hour (${err.message})`);
	} finally {
		catalogRunning = false;
	}
}

/** Start the catalog job now, without waiting (after a card of a new set is added). */
export function kickSetCatalogs(): void {
	refreshSetCatalogs().catch((err) => console.error('[pokemon-binder] catalog job failed', err));
}

const globalForJob = globalThis as unknown as { priceJobTimer?: ReturnType<typeof setInterval> };

/** Start the hourly check (once per process, even across dev reloads). */
export function startPriceJob(): void {
	if (globalForJob.priceJobTimer) return;
	// Owned cards first (their value is shown everywhere), then the catalogs of their sets.
	const run = () =>
		refreshOwnedCardPrices()
			.then(refreshSetCatalogs)
			.catch((err) => console.error('[pokemon-binder] price job failed', err));
	globalForJob.priceJobTimer = setInterval(run, CHECK_EVERY_MS);
	setTimeout(run, 30 * 1000); // first run shortly after start-up
}
