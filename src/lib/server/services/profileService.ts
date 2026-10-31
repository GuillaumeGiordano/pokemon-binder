import * as profileRepository from '$lib/server/repositories/profileRepository';
import * as itemRepository from '$lib/server/repositories/collectionItemRepository';
import { toCollectionItemVM, toProfileSummaryVM } from '$lib/server/mappers/collectionMapper';
import * as cardRepository from '$lib/server/repositories/cardRepository';
import { getCardDetail } from '$lib/server/services/cardService';
import { kickSetCatalogs } from '$lib/server/services/priceJobService';
import { Prisma } from '$lib/server/prisma/client';
import { CARD_VARIANTS, type CardVariant } from '$lib/records/card';
import { CARD_CONDITIONS, CARD_LANGUAGES, type CardCondition, type CardLanguage } from '$lib/records/collection';
import { isOfficialNumber } from '$lib/utils/cardNumber';
import { parseEuroInput, referencePrice, roundCents, valueOf } from '$lib/utils/price';
import type {
	AccountOverviewVM,
	CollectionItemVM,
	OwnedCardVM,
	ProfileDetailVM,
	ProfileSetVM,
	ProfileSummaryVM
} from '$lib/viewmodels/collection';

// Profiles of an account (D30) and their lots (D11): adding an identical copy merges into the
// existing lot with weighted average prices (D20); the market price is frozen at acquisition (D17).

/** A user input the service refuses: its message is shown in the form. */
export class CollectionError extends Error {}

const PROFILE_NAME_MAX = 60;
const QUANTITY_MAX = 999;

function profileName(raw: string): string {
	const name = raw.trim();
	if (!name) throw new CollectionError('Donne un nom au profil.');
	if (name.length > PROFILE_NAME_MAX) throw new CollectionError(`${PROFILE_NAME_MAX} caractères maximum.`);
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

// --- Profiles ---

export async function listProfiles(ownerSub: string): Promise<ProfileSummaryVM[]> {
	return (await profileRepository.listByOwner(ownerSub)).map(toProfileSummaryVM);
}

/** Every profile of the account and the value of the whole family (D31). */
export async function getAccountOverview(ownerSub: string): Promise<AccountOverviewVM> {
	const profiles = await listProfiles(ownerSub);
	return {
		totalValue: roundCents(profiles.reduce((sum, profile) => sum + profile.value, 0)),
		unpricedCount: profiles.reduce((sum, profile) => sum + profile.unpricedCount, 0),
		profiles
	};
}

/** The sets a profile has cards of, with their completion for this profile (D16, D19, D30). */
/**
 * Value of each complete set (D41): one copy of every card, secret cards included, at its latest
 * `trend`. Null while the set's catalog has not been fetched yet (« being computed »).
 */
async function completeSetValues(setIds: string[]): Promise<Map<string, number | null>> {
	const catalogs = await cardRepository.findSetCatalogs(setIds);
	return new Map(
		catalogs.map((set) => [
			set.id,
			set.catalogSyncedAt
				? roundCents(set.cards.reduce((sum, card) => sum + (card.prices[0]?.trend?.toNumber() ?? 0), 0))
				: null
		])
	);
}

function setsOf(
	items: CollectionItemVM[],
	rawItems: profileRepository.ProfileWithItems['items'],
	completeValues: Map<string, number | null>
): ProfileSetVM[] {
	const bySet = new Map<string, { set: (typeof rawItems)[number]['card']['set']; items: CollectionItemVM[] }>();
	items.forEach((item, index) => {
		const set = rawItems[index].card.set;
		const group = bySet.get(set.id) ?? { set, items: [] };
		group.items.push(item);
		bySet.set(set.id, group);
	});

	return [...bySet.values()]
		.map(({ set, items: setItems }) => {
			// A card counts once whatever its lots (variants, conditions, languages).
			const distinct = new Map(setItems.map((item) => [item.card.id, item.card.localId]));
			const official = [...distinct.values()].filter((localId) => isOfficialNumber(localId, set.officialCount)).length;
			const { value } = valueOf(setItems.map((item) => ({ quantity: item.quantity, unitPrice: item.currentMarketPrice })));
			return {
				id: set.id,
				name: set.name,
				logoUrl: set.logoUrl,
				officialCount: set.officialCount,
				ownedOfficial: official,
				ownedSecret: distinct.size - official,
				secretCount: Math.max(0, set.totalCount - set.officialCount),
				percent: set.officialCount > 0 ? Math.round((official / set.officialCount) * 100) : 0,
				cardCount: setItems.reduce((sum, item) => sum + item.quantity, 0),
				value,
				completeValue: completeValues.get(set.id) ?? null
			};
		})
		.sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, 'fr'));
}

export async function getProfile(id: string, ownerSub: string): Promise<ProfileDetailVM | null> {
	const profile = await profileRepository.findOwned(id, ownerSub);
	if (!profile) return null;
	const items = profile.items.map(toCollectionItemVM);
	const completeValues = await completeSetValues([...new Set(items.map((item) => item.card.setId))]);
	return {
		id: profile.id,
		name: profile.name,
		lotCount: items.length,
		cardCount: items.reduce((sum, item) => sum + item.quantity, 0),
		...valueOf(items.map((item) => ({ quantity: item.quantity, unitPrice: item.currentMarketPrice }))),
		sets: setsOf(items, profile.items, completeValues),
		items
	};
}

export const createProfile = (ownerSub: string, rawName: string) =>
	profileRepository.create(ownerSub, profileName(rawName));

export const renameProfile = async (id: string, ownerSub: string, rawName: string) =>
	(await profileRepository.rename(id, ownerSub, profileName(rawName))) > 0;

export const deleteProfile = async (id: string, ownerSub: string) => (await profileRepository.remove(id, ownerSub)) > 0;

// --- Lots ---

/** The cards among `cardIds` the account already owns (D39), keyed by card id; others are absent. */
export async function getOwnedCards(cardIds: string[], ownerSub: string): Promise<Record<string, OwnedCardVM>> {
	if (cardIds.length === 0) return {};
	const rows = await itemRepository.findOwnedQuantities(cardIds, ownerSub);
	// Profiles in creation order, like on the home page.
	rows.sort((a, b) => a.profile.createdAt.getTime() - b.profile.createdAt.getTime());

	// Per card, per profile id (two profiles may share a name): the lots of a card add up.
	const byCard = new Map<string, Map<string, { name: string; quantity: number }>>();
	for (const row of rows) {
		const profiles = byCard.get(row.cardId) ?? new Map<string, { name: string; quantity: number }>();
		const entry = profiles.get(row.profile.id) ?? { name: row.profile.name, quantity: 0 };
		entry.quantity += row.quantity;
		profiles.set(row.profile.id, entry);
		byCard.set(row.cardId, profiles);
	}

	const owned: Record<string, OwnedCardVM> = {};
	for (const [cardId, profiles] of byCard) {
		const byProfile = [...profiles.values()];
		owned[cardId] = { total: byProfile.reduce((sum, entry) => sum + entry.quantity, 0), byProfile };
	}
	return owned;
}

export async function getLot(id: string, ownerSub: string): Promise<CollectionItemVM | null> {
	const item = await itemRepository.findOwned(id, ownerSub);
	return item && toCollectionItemVM(item);
}
export type AddToProfileInput = {
	profileId: string;
	cardId: string;
	variant: string;
	condition: string;
	language: string;
	quantity: string;
	purchaseUnitPrice: string;
};

/**
 * Add copies of a card to a profile. Null: profile or card not found. `merged`: the copies joined
 * an identical lot (same profile, card, variant, condition, language).
 */
export async function addToProfile(
	ownerSub: string,
	input: AddToProfileInput
): Promise<{ itemId: string; merged: boolean } | null> {
	if (!(await profileRepository.existsOwned(input.profileId, ownerSub))) return null;
	// Refreshes the card if needed: the frozen price is today's market price.
	const card = await getCardDetail(input.cardId);
	if (!card) return null;

	// Any variant is accepted (D35): TCGdex's variant list is incomplete, so it cannot be a constraint.
	const variant = oneOf<CardVariant>(CARD_VARIANTS, input.variant, 'Choisis une variante.');
	const key: itemRepository.LotKey = {
		profileId: input.profileId,
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
				// A new lot may be the first card of a set: fetch that set's catalog now (D41).
				kickSetCatalogs();
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
