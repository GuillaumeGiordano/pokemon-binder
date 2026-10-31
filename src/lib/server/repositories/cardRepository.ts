import { prisma } from '$lib/server/db';
import type { CardVariant } from '$lib/server/prisma/client';

// Local cache of TCGdex (D4): sets, cards and one price snapshot per card per day.

export type SetData = {
	id: string;
	name: string;
	logoUrl: string | null;
	symbolUrl: string | null;
	officialCount: number;
	totalCount: number;
};

export type CardData = {
	id: string;
	setId: string;
	localId: string;
	name: string;
	imageUrl: string | null;
	rarity: string | null;
	variants: CardVariant[];
	cardmarketId: number | null;
};

export type PriceData = {
	trend: number | null;
	trendHolo: number | null;
	low: number | null;
	avg: number | null;
};

/** A cached card with its set and its latest price snapshot. */
export const findCardWithLatestPrice = (id: string) =>
	prisma.card.findUnique({
		where: { id },
		include: { set: true, prices: { orderBy: { date: 'desc' }, take: 1 } }
	});

export type CardWithLatestPrice = NonNullable<Awaited<ReturnType<typeof findCardWithLatestPrice>>>;

/** Cards in at least one profile that were not refreshed since `since` (D21). */
export const findOwnedCardIdsSyncedBefore = async (since: Date) =>
	(
		await prisma.card.findMany({
			where: { items: { some: {} }, syncedAt: { lt: since } },
			select: { id: true },
			orderBy: { syncedAt: 'asc' }
		})
	).map((card) => card.id);

/** Sets with at least one card in a profile whose full catalog is missing or older than `since` (D41). */
export const findOwnedSetIdsToCatalog = async (since: Date) =>
	(
		await prisma.cardSet.findMany({
			where: {
				cards: { some: { items: { some: {} } } },
				OR: [{ catalogSyncedAt: null }, { catalogSyncedAt: { lt: since } }]
			},
			select: { id: true },
			orderBy: { catalogSyncedAt: { sort: 'asc', nulls: 'first' } }
		})
	).map((set) => set.id);

/** When each cached card of a set was last refreshed (absent: never fetched). */
export const findSyncDatesOfSet = async (setId: string) =>
	new Map(
		(await prisma.card.findMany({ where: { setId }, select: { id: true, syncedAt: true } })).map((card) => [
			card.id,
			card.syncedAt
		])
	);

export const markCatalogSynced = (setId: string) =>
	prisma.cardSet.update({ where: { id: setId }, data: { catalogSyncedAt: new Date() } });

/**
 * Value of complete sets (D41): the latest `trend` of every cached card of these sets, one copy
 * each, secret cards included. Only meaningful once the set's catalog is synced.
 */
export const findSetCatalogs = (setIds: string[]) =>
	prisma.cardSet.findMany({
		where: { id: { in: setIds } },
		select: {
			id: true,
			catalogSyncedAt: true,
			cards: { select: { prices: { orderBy: { date: 'desc' }, take: 1, select: { trend: true } } } }
		}
	});

/** Save a card fetched from TCGdex, with its set and today's price, in one transaction. */
export async function saveCard(set: SetData, card: CardData, price: PriceData | null, day: Date) {
	await prisma.$transaction([
		prisma.cardSet.upsert({ where: { id: set.id }, create: set, update: set }),
		prisma.card.upsert({
			where: { id: card.id },
			create: { ...card, syncedAt: new Date() },
			update: { ...card, syncedAt: new Date() }
		}),
		...(price
			? [
					prisma.priceSnapshot.upsert({
						where: { cardId_date: { cardId: card.id, date: day } },
						create: { cardId: card.id, date: day, ...price },
						update: price
					})
				]
			: [])
	]);
}
