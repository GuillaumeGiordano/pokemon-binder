<script lang="ts">
	import { Badge, Button, EmptyState, Input, Select } from '@guillaumeg/ui';
	import { ChevronRight, RotateCcw, Search, SearchX, SlidersHorizontal } from '@lucide/svelte';
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

	// « Mes cartes » tab of a profile (D40): every lot as a simple list, filtered and sorted in the
	// browser (instant). A row opens its lot page, which leads back to this tab.
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
	const activeFilterCount = $derived(
		[filters.variant, filters.setId, filters.condition, filters.language].filter((value) => value !== '').length
	);
	const filtered = $derived(filters.text !== '' || activeFilterCount > 0);
	let showFilters = $state(false);
</script>

<div class="mb-4 flex flex-col gap-3">
	<Input bind:value={filters.text} type="search" icon={Search} placeholder="Nom ou référence (pikachu, 025, 025/198…)" />
	<div class="flex items-end gap-2">
		<div class="flex-1">
			<Select label="Trier" bind:value={filters.sort} options={SORT_OPTIONS} />
		</div>
		<!-- On a phone the four filters fold away; on a wider screen they are always shown. -->
		<Button
			variant={showFilters || activeFilterCount > 0 ? 'primary' : 'secondary'}
			icon={SlidersHorizontal}
			addClass="md:hidden"
			aria-expanded={showFilters}
			onclick={() => (showFilters = !showFilters)}
		>
			Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
		</Button>
	</div>
	<div class="grid-cols-2 gap-2 md:grid md:grid-cols-4 {showFilters ? 'grid' : 'hidden'}">
		<!-- placeholder="": the « Toutes » options use the empty value the default placeholder would take. -->
		<Select label="Variante" bind:value={filters.variant} options={variantOptions} placeholder="" />
		<Select label="Extension" bind:value={filters.setId} options={setOptions} placeholder="" />
		<Select label="État" bind:value={filters.condition} options={conditionOptions} placeholder="" />
		<Select label="Langue" bind:value={filters.language} options={languageOptions} placeholder="" />
	</div>
	<div class="flex items-center justify-between gap-2 text-sm">
		<span class="opacity-70">
			{shownCount} carte{shownCount > 1 ? 's' : ''} · <strong>{formatEur(shownValue)}</strong>
		</span>
		{#if filtered}
			<Button size="sm" variant="ghost" icon={RotateCcw} onclick={() => (filters = { ...NO_FILTERS, sort: filters.sort })}>
				Effacer les filtres
			</Button>
		{/if}
	</div>
</div>

{#if shown.length === 0}
	<EmptyState icon={SearchX} title="Aucune carte" description="Aucune carte de ce profil ne correspond aux filtres." />
{:else}
	<ul class="flex flex-col gap-2">
		{#each shown as item (item.id)}
			<li>
				<a href="/lots/{item.id}?retour=cartes" class="flex items-center gap-3 rounded-lg border p-2 hover:opacity-80">
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
				</a>
			</li>
		{/each}
	</ul>
{/if}
