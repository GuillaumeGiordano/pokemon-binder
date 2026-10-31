<script lang="ts">
	import { Badge, Button } from '@guillaumeg/ui';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import { cardHref } from '$lib/utils/searchUrl';
	import type { SetCardVM } from '$lib/viewmodels/completion';

	// The cards of a set for a profile: owned ones in colour open their lot page to edit them
	// (several lots: `onChooseLot` asks which one, D36); missing ones, greyed out, open the card's
	// add page for this profile, with a way back here (D37).
	let {
		cards,
		officialCount,
		profileId,
		setId,
		onChooseLot
	}: {
		cards: SetCardVM[];
		officialCount: number;
		profileId: string;
		setId: string;
		onChooseLot: (card: SetCardVM) => void;
	} = $props();
</script>

{#snippet tile(card: SetCardVM)}
	<div class="relative {card.quantity === 0 ? 'opacity-40 grayscale' : ''}">
		<CardImage
			imageUrl={card.imageUrl}
			name={card.name}
			number="{card.localId}/{officialCount}"
			setName={null}
			lazy
			class="rounded-md"
		/>
		{#if card.quantity > 0}
			<span class="absolute top-1 right-1"><Badge label="×{card.quantity}" variant="primary" size="sm" /></span>
		{/if}
	</div>
	<span class="truncate text-left text-xs {card.quantity === 0 ? 'opacity-60' : 'font-semibold'}">
		{card.localId} · {card.name}
	</span>
{/snippet}

<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
	{#each cards as card (card.id)}
		<li>
			{#if card.lots.length === 1}
				<a
					href="/lots/{card.lots[0].id}"
					class="flex flex-col gap-1 rounded-lg p-1 hover:opacity-80"
					aria-label="{card.name} n° {card.localId}, possédée ×{card.quantity} : modifier"
				>
					{@render tile(card)}
				</a>
			{:else if card.lots.length > 1}
				<!-- The library Button, reshaped into a card tile (column, no padding, full width). -->
				<Button
					variant="ghost"
					addClass="h-auto! w-full flex-col! items-stretch! gap-1! p-1! font-normal!"
					aria-label="{card.name} n° {card.localId}, possédée ×{card.quantity} en {card.lots.length} versions : choisir laquelle modifier"
					onclick={() => onChooseLot(card)}
				>
					{@render tile(card)}
				</Button>
			{:else}
				<a
					href={cardHref(card.id, { profileId, setId })}
					class="flex flex-col gap-1 rounded-lg p-1 hover:opacity-80"
					aria-label="{card.name} n° {card.localId}, manquante : l'ajouter"
				>
					{@render tile(card)}
				</a>
			{/if}
		</li>
	{/each}
</ul>
