import * as binderRepository from '$lib/server/repositories/binderRepository';
import * as itemRepository from '$lib/server/repositories/collectionItemRepository';
import { toBinderSummaryVM, toCollectionItemVM } from '$lib/server/mappers/collectionMapper';
import { getCardDetail } from '$lib/server/services/cardService';
import { Prisma } from '$lib/server/prisma/client';
import { CARD_VARIANTS, type CardVariant } from '$lib/records/card';
import { CARD_CONDITIONS, CARD_LANGUAGES, type CardCondition, type CardLanguage } from '$lib/records/collection';
import { parseEuroInput, referencePrice, roundCents, valueOf } from '$lib/utils/price';
import type {
	BinderDetailVM,
	BinderSummaryVM,
	CollectionItemVM,
	CollectionOverviewVM
} from '$lib/viewmodels/collection';

// Binders (D15) and lots (D11): adding an identical copy merges into the existing lot with
// weighted average prices (D20); the market price is frozen at acquisition (D17).

/** A user input the service refuses: its message is shown in the form. */
export class CollectionError extends Error {}

const BINDER_NAME_MAX = 60;
const QUANTITY_MAX = 999;

function binderName(raw: string): string {
	const name = raw.trim();
	if (!name) throw new CollectionError('Donne un nom au classeur.');
	if (name.length > BINDER_NAME_MAX) throw new CollectionError(`${BINDER_NAME_MAX} caractères maximum.`);
	return name;
}

function quantity(raw: string): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value < 1 || value > QUANTITY_MAX)
		throw new CollectionError(`La quantité doit être comprise entre 1 et ${QUANTITY_MAX}.`);
	return value;
}

function purchasePrice(raw: string): string | null {
	const value = parseEuroInput(raw);
	if (value === undefined) throw new CollectionError('Prix payé invalide (ex. 4,50).');
	return value;
}

function oneOf<T extends string>(values: readonly T[], raw: string, message: string): T {
	if (!(values as readonly string[]).includes(raw)) throw new CollectionError(message);
	return raw as T;
}

/** Weighted average of two unit prices (D20); an unknown price does not count. */
function weightedAverage(
	a: Prisma.Decimal | null,
	quantityA: number,
	b: Prisma.Decimal | null,
	quantityB: number
): Prisma.Decimal | null {
	const known = [
		[a, quantityA],
		[b, quantityB]
	].filter((entry): entry is [Prisma.Decimal, number] => entry[0] !== null);
	if (known.length === 0) return null;
	const total = known.reduce((sum, [price, qty]) => sum.add(price.mul(qty)), new Prisma.Decimal(0));
	const count = known.reduce((sum, [, qty]) => sum + qty, 0);
	// 4 decimals, like the column: rounding to the cent here would drift once multiplied back.
	return total.div(count).toDecimalPlaces(4);
}

// --- Binders ---

export async function listBinders(ownerSub: string): Promise<BinderSummaryVM[]> {
	return (await binderRepository.listByOwner(ownerSub)).map(toBinderSummaryVM);
}

/** My binders and the value of the whole collection (D23). */
export async function getCollectionOverview(ownerSub: string): Promise<CollectionOverviewVM> {
	const binders = await listBinders(ownerSub);
	return {
		totalValue: roundCents(binders.reduce((sum, binder) => sum + binder.value, 0)),
		unpricedCount: binders.reduce((sum, binder) => sum + binder.unpricedCount, 0),
		binders
	};
}

export async function getBinder(id: string, ownerSub: string): Promise<BinderDetailVM | null> {
	const binder = await binderRepository.findOwned(id, ownerSub);
	if (!binder) return null;
	const items = binder.items.map(toCollectionItemVM);
	return {
		id: binder.id,
		name: binder.name,
		...valueOf(items.map((item) => ({ quantity: item.quantity, unitPrice: item.currentMarketPrice }))),
		items
	};
}

export const createBinder = (ownerSub: string, rawName: string) => binderRepository.create(ownerSub, binderName(rawName));

export const renameBinder = async (id: string, ownerSub: string, rawName: string) =>
	(await binderRepository.rename(id, ownerSub, binderName(rawName))) > 0;

export const deleteBinder = async (id: string, ownerSub: string) => (await binderRepository.remove(id, ownerSub)) > 0;

// --- Lots ---

export async function getLot(id: string, ownerSub: string): Promise<CollectionItemVM | null> {
	const item = await itemRepository.findOwned(id, ownerSub);
	return item && toCollectionItemVM(item);
}

export type AddToBinderInput = {
	binderId: string;
	cardId: string;
	variant: string;
	condition: string;
	language: string;
	quantity: string;
	purchaseUnitPrice: string;
};

/**
 * Add copies of a card to a binder. Null: binder or card not found. `merged`: the copies joined an
 * identical lot (same binder, card, variant, condition, language).
 */
export async function addToBinder(
	ownerSub: string,
	input: AddToBinderInput
): Promise<{ itemId: string; merged: boolean } | null> {
	if (!(await binderRepository.existsOwned(input.binderId, ownerSub))) return null;
	// Refreshes the card if needed: the frozen price is today's market price.
	const card = await getCardDetail(input.cardId);
	if (!card) return null;

	const variant = oneOf<CardVariant>(CARD_VARIANTS, input.variant, 'Choisis une variante.');
	if (card.variants.length > 0 && !card.variants.includes(variant))
		throw new CollectionError("Cette variante n'existe pas pour cette carte.");
	const key: itemRepository.LotKey = {
		binderId: input.binderId,
		cardId: card.id,
		variant,
		condition: oneOf<CardCondition>(CARD_CONDITIONS, input.condition, 'Choisis un état.'),
		language: oneOf<CardLanguage>(CARD_LANGUAGES, input.language, 'Choisis une langue.')
	};
	const added = quantity(input.quantity);
	const paid = purchasePrice(input.purchaseUnitPrice);
	const market = referencePrice(variant, card.price);

	const paidDecimal = paid === null ? null : new Prisma.Decimal(paid);
	const marketDecimal = market === null ? null : new Prisma.Decimal(market).toDecimalPlaces(2);

	// Read-then-write: two simultaneous adds of the same new lot hit the unique constraint (P2002);
	// the second one then merges on a retry.
	for (let attempt = 0; ; attempt++) {
		const existing = await itemRepository.findByKey(key);
		try {
			if (!existing) {
				const item = await itemRepository.create({
					...key,
					quantity: added,
					purchaseUnitPrice: paidDecimal,
					acquisitionMarketPrice: marketDecimal
				});
				return { itemId: item.id, merged: false };
			}
			if (existing.quantity + added > QUANTITY_MAX)
				throw new CollectionError(`Un lot ne peut pas dépasser ${QUANTITY_MAX} cartes.`);
			await itemRepository.update(existing.id, {
				quantity: existing.quantity + added,
				purchaseUnitPrice: weightedAverage(existing.purchaseUnitPrice, existing.quantity, paidDecimal, added),
				acquisitionMarketPrice: weightedAverage(existing.acquisitionMarketPrice, existing.quantity, marketDecimal, added)
				// acquiredAt is kept: the first acquisition (D20)
			});
			return { itemId: existing.id, merged: true };
		} catch (err) {
			const duplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
			if (!duplicate || attempt > 0) throw err;
		}
	}
}

/** Change the quantity and the average price paid of a lot. False: not found or not owned. */
export async function updateLot(
	id: string,
	ownerSub: string,
	input: { quantity: string; purchaseUnitPrice: string }
): Promise<boolean> {
	const lot = await itemRepository.findOwned(id, ownerSub);
	if (!lot) return false;
	const paid = purchasePrice(input.purchaseUnitPrice);
	// The form shows the average rounded to the cent (0,67): sent back unchanged, it must not
	// overwrite the precise average (0.6667).
	const unchanged = paid !== null && lot.purchaseUnitPrice?.toFixed(2) === paid;
	return (
		(await itemRepository.updateOwned(id, ownerSub, {
			quantity: quantity(input.quantity),
			...(unchanged ? {} : { purchaseUnitPrice: paid })
		})) > 0
	);
}

export const deleteLot = async (id: string, ownerSub: string) => (await itemRepository.removeOwned(id, ownerSub)) > 0;
