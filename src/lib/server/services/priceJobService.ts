import * as cardRepository from '$lib/server/repositories/cardRepository';
import { syncCard, today } from '$lib/server/services/cardService';
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

const globalForJob = globalThis as unknown as { priceJobTimer?: ReturnType<typeof setInterval> };

/** Start the hourly check (once per process, even across dev reloads). */
export function startPriceJob(): void {
	if (globalForJob.priceJobTimer) return;
	const run = () => refreshOwnedCardPrices().catch((err) => console.error('[pokemon-binder] price job failed', err));
	globalForJob.priceJobTimer = setInterval(run, CHECK_EVERY_MS);
	setTimeout(run, 30 * 1000); // first run shortly after start-up
}
