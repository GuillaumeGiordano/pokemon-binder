<script lang="ts">
	import { Badge, Button, EmptyState, Modal, Progress } from '@guillaumeg/ui';
	import { ArrowLeft, ChevronRight, PartyPopper } from '@lucide/svelte';
	import SetCardGrid from '$lib/components/set/SetCardGrid.svelte';
	import { CARD_VARIANT_LABELS } from '$lib/records/card';
	import { CARD_LANGUAGE_LABELS } from '$lib/records/collection';
	import { formatEur } from '$lib/utils/format';
	import type { SetCardVM } from '$lib/viewmodels/completion';

	let { data } = $props();

	const set = $derived(data.set);

	type Filter = 'all' | 'owned' | 'missing';
	let filter = $state<Filter>('all');

	const ownedCount = $derived(set.cards.filter((card) => card.quantity > 0).length);
	const filters = $derived<{ value: Filter; label: string }[]>([
		{ value: 'all', label: `Toutes (${set.cards.length})` },
		{ value: 'owned', label: `Possédées (${ownedCount})` },
		{ value: 'missing', label: `Manquantes (${set.cards.length - ownedCount})` }
	]);

	const visible = (card: SetCardVM) =>
		filter === 'all' || (filter === 'owned' ? card.quantity > 0 : card.quantity === 0);
	const officialCards = $derived(set.cards.filter((card) => !card.secret && visible(card)));
	const secretCards = $derived(set.cards.filter((card) => card.secret && visible(card)));

	// D36: an owned card opens its lot page directly; with several lots (e.g. Normale + Reverse),
	// this modal only asks which one (D32).
	const LOTS_MODAL_ID = 'card-lots';
	let selected = $state<SetCardVM | null>(null);
	function openLots(card: SetCardVM) {
		selected = card;
		(document.getElementById(LOTS_MODAL_ID) as HTMLDialogElement | null)?.showModal();
	}
</script>

<svelte:head>
	<title>{set.name} · {set.profile.name} · Pokémon Binder</title>
</svelte:head>

<Button href="/profils/{set.profile.id}" variant="ghost" icon={ArrowLeft}>{set.profile.name}</Button>

<header class="mt-4 mb-4 flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">{set.name}</h1>
		<span class="font-bold">{set.percent} %</span>
	</div>
	<Progress
		value={set.ownedOfficial}
		max={Math.max(1, set.officialCount)}
		color={set.percent === 100 ? 'success' : 'primary'}
	/>
	<p class="text-sm opacity-70">
		{set.ownedOfficial}/{set.officialCount}
		{#if set.secretCount > 0}(+{set.ownedSecret} secrète{set.ownedSecret > 1 ? 's' : ''} sur {set.secretCount}){/if}
	</p>
</header>

<div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer les cartes">
	{#each filters as option (option.value)}
		<Button
			size="sm"
			variant={filter === option.value ? 'primary' : 'secondary'}
			aria-pressed={filter === option.value}
			onclick={() => (filter = option.value)}
		>
			{option.label}
		</Button>
	{/each}
</div>

{#if officialCards.length === 0 && secretCards.length === 0}
	{#if filter === 'missing'}
		<EmptyState icon={PartyPopper} title="Extension complète !" description="Il ne manque aucune carte." />
	{:else}
		<EmptyState title="Aucune carte" description="Aucune carte de cette extension ne correspond au filtre." />
	{/if}
{:else}
	<SetCardGrid cards={officialCards} officialCount={set.officialCount} onChooseLot={openLots} />
	{#if secretCards.length > 0}
		<h2 class="mt-6 mb-2 font-semibold">Cartes secrètes et spéciales</h2>
		<SetCardGrid cards={secretCards} officialCount={set.officialCount} onChooseLot={openLots} />
	{/if}
{/if}

<Modal id={LOTS_MODAL_ID} title={selected ? `${selected.name} · n° ${selected.localId}` : ''} size="sm">
	{#if selected}
		<p class="mb-3 text-sm opacity-70">Tu as plusieurs versions de cette carte : laquelle ouvrir ?</p>
		<ul class="flex flex-col gap-2">
			{#each selected.lots as lot (lot.id)}
				<li>
					<a href="/lots/{lot.id}" class="flex items-center justify-between gap-2 rounded-lg border p-3 hover:opacity-80">
						<span class="flex flex-wrap items-center gap-1">
							<Badge label="×{lot.quantity}" variant="primary" size="sm" />
							<Badge label={CARD_VARIANT_LABELS[lot.variant]} size="sm" />
							<Badge label={lot.condition} size="sm" />
							<Badge label={CARD_LANGUAGE_LABELS[lot.language]} size="sm" />
						</span>
						<span class="flex shrink-0 items-center gap-1 text-sm">
							<strong>{formatEur(lot.currentMarketPrice)}</strong>
							<ChevronRight size={16} />
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
