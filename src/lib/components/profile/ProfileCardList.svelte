<script lang="ts">
	import { Badge, Card, EmptyState, Input, SearchFilters, Select } from '@guillaumeg/ui';
	import { ChevronRight, Search, SearchX } from '@lucide/svelte';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import { CARD_VARIANTS, CARD_VARIANT_LABELS } from '$lib/records/card';
	import {
		CARD_CONDITIONS,
		CARD_CONDITION_LABELS,
		CARD_LANGUAGES,
		CARD_LANGUAGE_LABELS
	} from '$lib/records/collection';
	import { formatEur } from '$lib/utils/format';
	import { filterAndSortLots, NO_FILTERS, type LotFilters, type LotSort } from '$lib/utils/lotFilters';
	import { roundCents } from '$lib/utils/price';
	import type { CollectionItemVM } from '$lib/viewmodels/collection';

	// « Mes cartes » tab of a profile (D40): every lot as a simple list, filtered (SearchFilters, on
	// « Rechercher ») and sorted in the browser. A row opens its lot page, which leads back here.
	let { items }: { items: CollectionItemVM[] } = $props();

	let filters = $state<LotFilters>({ ...NO_FILTERS });

	const SORT_OPTIONS: { value: LotSort; label: string }[] = [
		{ value: 'value-desc', label: 'Cote : la plus chère d’abord' },
		{ value: 'value-asc', label: 'Cote : la moins chère d’abord' },
		{ value: 'name', label: 'Nom (A → Z)' },
		{ value: 'number', label: 'Extension et numéro' },
		{ value: 'recent', label: 'Ajoutées récemment' }
	];
	const ALL = { value: '', label: 'Toutes' };
	const variantOptions = [ALL, ...CARD_VARIANTS.map((v) => ({ value: v, label: CARD_VARIANT_LABELS[v] }))];
	const conditionOptions = [ALL, ...CARD_CONDITIONS.map((c) => ({ value: c, label: `${c} — ${CARD_CONDITION_LABELS[c]}` }))];
	const languageOptions = [ALL, ...CARD_LANGUAGES.map((l) => ({ value: l, label: CARD_LANGUAGE_LABELS[l] }))];
	/** Only the sets this profile has cards of. */
	const setOptions = $derived([
		ALL,
		...[...new Map(items.map((item) => [item.card.setId, item.card.setName])).entries()]
			.sort((a, b) => a[1].localeCompare(b[1], 'fr'))
			.map(([value, label]) => ({ value, label }))
	]);

	const shown = $derived(filterAndSortLots(items, filters));
	const shownCount = $derived(shown.reduce((sum, item) => sum + item.quantity, 0));
	const shownValue = $derived(
		roundCents(shown.reduce((sum, item) => sum + item.quantity * (item.currentMarketPrice ?? 0), 0))
	);

	/** SearchFilters hands over the form's values on « Rechercher »; the sort stays as chosen. */
	function applyFilters(values: Record<string, string | string[]>) {
		const value = (name: string) => String(values[name] ?? '');
		filters = {
			...filters,
			text: value('text'),
			variant: value('variant') as LotFilters['variant'],
			setId: value('setId'),
			condition: value('condition') as LotFilters['condition'],
			language: value('language') as LotFilters['language']
		};
	}
</script>

<div class="mb-4 flex flex-col gap-3">
	<SearchFilters
		title="Rechercher et filtrer"
		collapsible
		columns={2}
		onSearch={applyFilters}
		onReset={() => (filters = { ...NO_FILTERS, sort: filters.sort })}
	>
		<Input name="text" type="search" icon={Search} placeholder="Nom ou référence (pikachu, 025, 025/198…)" />
		<!-- placeholder="": the « Toutes » options use the empty value the default placeholder would take. -->
		<Select name="variant" label="Variante" options={variantOptions} placeholder="" />
		<Select name="setId" label="Extension" options={setOptions} placeholder="" />
		<Select name="condition" label="État" options={conditionOptions} placeholder="" />
		<Select name="language" label="Langue" options={languageOptions} placeholder="" />
	</SearchFilters>
	<div class="flex items-end justify-between gap-2">
		<span class="pb-2 text-sm opacity-70">
			{shownCount} carte{shownCount > 1 ? 's' : ''} · <strong>{formatEur(shownValue)}</strong>
		</span>
		<Select label="Trier" bind:value={filters.sort} options={SORT_OPTIONS} />
	</div>
</div>

{#if shown.length === 0}
	<EmptyState icon={SearchX} title="Aucune carte" description="Aucune carte de ce profil ne correspond aux filtres." />
{:else}
	<ul class="flex flex-col gap-2">
		{#each shown as item (item.id)}
			<li>
				<a href="/lots/{item.id}?retour=cartes" class="block">
					<Card hoverable padding="sm">
					<div class="flex items-center gap-3">
					<div class="w-12 shrink-0">
						<CardImage
							imageUrl={item.card.imageUrl}
							name={item.card.name}
							number="{item.card.localId}/{item.card.officialCount}"
							setName={null}
							lazy
							compact
							class="rounded"
						/>
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="truncate font-semibold">{item.card.name}</span>
						<span class="truncate text-xs opacity-70">
							{item.card.setName} · n° {item.card.localId}/{item.card.officialCount}
						</span>
						<span class="flex flex-wrap gap-1">
							{#if item.quantity > 1}<Badge label="×{item.quantity}" variant="primary" size="sm" />{/if}
							<Badge label={CARD_VARIANT_LABELS[item.variant]} size="sm" />
							<Badge label={item.condition} size="sm" />
							<Badge label={item.language} size="sm" />
						</span>
					</div>
					<div class="flex shrink-0 items-center gap-1 text-right">
						<span class="flex flex-col">
							<strong>{formatEur(item.currentMarketPrice)}</strong>
							{#if item.quantity > 1 && item.currentMarketPrice !== null}
								<span class="text-xs opacity-70">{formatEur(roundCents(item.quantity * item.currentMarketPrice))}</span>
							{/if}
						</span>
						<ChevronRight size={16} />
					</div>
					</div>
					</Card>
				</a>
			</li>
		{/each}
	</ul>
{/if}
