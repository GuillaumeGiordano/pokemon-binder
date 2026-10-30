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

/** Cards in at least one binder that were not refreshed since `since` (D21). */
export const findOwnedCardIdsSyncedBefore = async (since: Date) =>
	(
		await prisma.card.findMany({
			where: { items: { some: {} }, syncedAt: { lt: since } },
			select: { id: true },
			orderBy: { syncedAt: 'asc' }
		})
	).map((card) => card.id);

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
