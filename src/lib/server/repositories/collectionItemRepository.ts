import { prisma } from '$lib/server/db';
import type { CardCondition, CardLanguage, CardVariant, Prisma } from '$lib/server/prisma/client';
import { itemInclude } from './profileRepository';

// Lots of identical copies (D11). Ownership goes through the profile's account.

export type LotKey = {
	profileId: string;
	cardId: string;
	variant: CardVariant;
	condition: CardCondition;
	language: CardLanguage;
};

export const findOwned = (id: string, ownerSub: string) =>
	prisma.collectionItem.findFirst({ where: { id, profile: { ownerSub } }, include: itemInclude });

export type CollectionItemWithCard = NonNullable<Awaited<ReturnType<typeof findOwned>>>;

/** The lots of one profile in one set (D30, D32). */
export const findOwnedInSet = (profileId: string, ownerSub: string, setId: string) =>
	prisma.collectionItem.findMany({
		where: { profileId, profile: { ownerSub }, card: { setId } },
		include: itemInclude,
		orderBy: [{ cardId: 'asc' }, { variant: 'asc' }]
	});

/** Every lot of one card in the account's profiles (the card page lists them to edit them). */
export const findOwnedByCard = (cardId: string, ownerSub: string) =>
	prisma.collectionItem.findMany({
		where: { cardId, profile: { ownerSub } },
		include: itemInclude,
		orderBy: [{ profile: { createdAt: 'asc' } }, { variant: 'asc' }, { condition: 'asc' }]
	});

/** The lot with exactly this key (D20: at most one, enforced by a unique constraint). */
export const findByKey = (key: LotKey) =>
	prisma.collectionItem.findUnique({ where: { profileId_cardId_variant_condition_language: key } });

export const create = (data: Prisma.CollectionItemUncheckedCreateInput) => prisma.collectionItem.create({ data });

export const update = (id: string, data: Prisma.CollectionItemUncheckedUpdateInput) =>
	prisma.collectionItem.update({ where: { id }, data });

/** Number of lots updated (0: not found or not owned). */
export const updateOwned = async (id: string, ownerSub: string, data: Prisma.CollectionItemUncheckedUpdateManyInput) =>
	(await prisma.collectionItem.updateMany({ where: { id, profile: { ownerSub } }, data })).count;

/** Number of lots deleted (0: not found or not owned). */
export const removeOwned = async (id: string, ownerSub: string) =>
	(await prisma.collectionItem.deleteMany({ where: { id, profile: { ownerSub } } })).count;
