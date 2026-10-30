import { prisma } from '$lib/server/db';
import type { CardCondition, CardLanguage, CardVariant, Prisma } from '$lib/server/prisma/client';
import { itemInclude } from './binderRepository';

// Lots of identical copies (D11). Ownership goes through the binder's owner.

export type LotKey = {
	binderId: string;
	cardId: string;
	variant: CardVariant;
	condition: CardCondition;
	language: CardLanguage;
};

export const findOwned = (id: string, ownerSub: string) =>
	prisma.collectionItem.findFirst({ where: { id, binder: { ownerSub } }, include: itemInclude });

export type CollectionItemWithCard = NonNullable<Awaited<ReturnType<typeof findOwned>>>;

/** The lot with exactly this key (D20: at most one, enforced by a unique constraint). */
export const findByKey = (key: LotKey) =>
	prisma.collectionItem.findUnique({ where: { binderId_cardId_variant_condition_language: key } });

export const create = (data: Prisma.CollectionItemUncheckedCreateInput) => prisma.collectionItem.create({ data });

export const update = (id: string, data: Prisma.CollectionItemUncheckedUpdateInput) =>
	prisma.collectionItem.update({ where: { id }, data });

/** Number of lots updated (0: not found or not owned). */
export const updateOwned = async (id: string, ownerSub: string, data: Prisma.CollectionItemUncheckedUpdateManyInput) =>
	(await prisma.collectionItem.updateMany({ where: { id, binder: { ownerSub } }, data })).count;

/** Number of lots deleted (0: not found or not owned). */
export const removeOwned = async (id: string, ownerSub: string) =>
	(await prisma.collectionItem.deleteMany({ where: { id, binder: { ownerSub } } })).count;
