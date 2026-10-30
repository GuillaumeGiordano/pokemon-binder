<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Badge, Button, Input, NumberInput, toast } from '@guillaumeg/ui';
	import { ArrowLeft, Save, Trash2 } from '@lucide/svelte';
	import { CARD_VARIANT_LABELS } from '$lib/records/card';
	import { CARD_CONDITION_LABELS, CARD_LANGUAGE_LABELS } from '$lib/records/collection';
	import { formatDay, formatEur, formatSignedEur, formatSignedPercent } from '$lib/utils/format';
	import { priceChange } from '$lib/utils/price';

	let { data, form } = $props();

	const lot = $derived(data.lot);
	/** Market price since acquisition (D17) and real gain against the price paid. */
	const marketChange = $derived(priceChange(lot.currentMarketPrice, lot.acquisitionMarketPrice));
	const gain = $derived(priceChange(lot.currentMarketPrice, lot.purchaseUnitPrice));

	// Editable, and reset to the saved value whenever the lot is reloaded.
	let quantity = $derived(lot.quantity);
	let confirmDelete = $state(false);

	const tone = (amount: number) => (amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : '');
</script>

<svelte:head>
	<title>{lot.card.name} · Pokémon Binder</title>
</svelte:head>

<Button href="/classeurs/{lot.binder.id}" variant="ghost" icon={ArrowLeft}>{lot.binder.name}</Button>

<div class="mt-4 flex flex-col gap-6 md:flex-row">
	<a href="/cartes/{lot.card.id}" class="mx-auto w-full max-w-xs md:mx-0">
		{#if lot.card.imageUrl}
			<img src={lot.card.imageUrl} alt={lot.card.name} class="aspect-[5/7] w-full rounded-xl object-cover" />
		{:else}
			<div class="flex aspect-[5/7] w-full items-center justify-center rounded-xl border opacity-60">Pas d'image</div>
		{/if}
	</a>

	<div class="flex flex-1 flex-col gap-4">
		<div>
			<h1 class="text-2xl font-bold">{lot.card.name}</h1>
			<p class="opacity-70">{lot.card.setName} · n° {lot.card.localId}/{lot.card.officialCount}</p>
			<div class="mt-2 flex flex-wrap gap-2">
				<Badge label="×{lot.quantity}" variant="primary" />
				<Badge label={CARD_VARIANT_LABELS[lot.variant]} />
				<Badge label="{lot.condition} — {CARD_CONDITION_LABELS[lot.condition]}" />
				<Badge label={CARD_LANGUAGE_LABELS[lot.language]} />
			</div>
			<p class="mt-2 text-sm opacity-70">Obtenu le {formatDay(lot.acquiredAt)}</p>
		</div>

		<section class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<div class="rounded-lg border p-3">
				<p class="text-sm opacity-70">💶 Prix payé</p>
				<p class="text-xl font-bold">{formatEur(lot.purchaseUnitPrice)}</p>
			</div>
			<div class="rounded-lg border p-3">
				<p class="text-sm opacity-70">📌 Cote à l'obtention</p>
				<p class="text-xl font-bold">{formatEur(lot.acquisitionMarketPrice)}</p>
			</div>
			<div class="rounded-lg border p-3">
				<p class="text-sm opacity-70">📈 Cote actuelle</p>
				<p class="text-xl font-bold">{formatEur(lot.currentMarketPrice)}</p>
			</div>
		</section>

		<section class="flex flex-col gap-1 text-sm">
			<p>
				Évolution de la cote :
				{#if marketChange}
					<strong class={tone(marketChange.amount)}>
						{formatSignedEur(marketChange.amount)}{marketChange.percent !== null
							? ` (${formatSignedPercent(marketChange.percent)})`
							: ''}
					</strong>
				{:else}
					—
				{/if}
			</p>
			<p>
				Plus-value par carte :
				{#if gain}
					<strong class={tone(gain.amount)}>{formatSignedEur(gain.amount)}</strong>
					{#if lot.quantity > 1}
						(soit <strong class={tone(gain.amount)}>{formatSignedEur(gain.amount * lot.quantity)}</strong> pour le lot)
					{/if}
				{:else}
					—
				{/if}
			</p>
			<p class="opacity-70">Prix par carte, cote Cardmarket toutes langues et tous états confondus.</p>
		</section>

		<form
			method="POST"
			action="?/update"
			class="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success') toast.success('Lot mis à jour.');
					await update({ reset: false });
				}}
		>
			<div>
				<NumberInput label="Quantité" bind:value={quantity} min={1} max={999} />
				<input type="hidden" name="quantity" value={quantity} />
			</div>
			<Input
				name="purchaseUnitPrice"
				label="Prix payé moyen par carte (€)"
				value={lot.purchaseUnitPrice === null ? '' : lot.purchaseUnitPrice.toFixed(2).replace('.', ',')}
				placeholder="Ex. 4,50"
				hint="Facultatif"
			/>
			<div class="flex gap-2 sm:col-span-2">
				<Button type="submit" icon={Save}>Enregistrer</Button>
				<Button variant="ghost" icon={Trash2} onclick={() => (confirmDelete = true)}>Supprimer</Button>
			</div>
		</form>

		{#if form?.message}
			<Alert variant="error" dismissible={false}>{form.message}</Alert>
		{/if}

		{#if confirmDelete}
			<Alert variant="warning" title="Supprimer ce lot ?" dismissible={false}>
				<form method="POST" action="?/delete" class="mt-2 flex gap-2" use:enhance>
					<Button type="submit" variant="danger" icon={Trash2}>Supprimer</Button>
					<Button variant="ghost" onclick={() => (confirmDelete = false)}>Annuler</Button>
				</form>
			</Alert>
		{/if}
	</div>
</div>
