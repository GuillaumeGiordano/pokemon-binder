<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Badge, Button, Input, Modal, NumberInput, toast } from '@guillaumeg/ui';
	import { ArrowLeft, Save, Trash2 } from '@lucide/svelte';
	import CardImage from '$lib/components/card/CardImage.svelte';
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

	const DELETE_MODAL_ID = 'lot-delete';
	const deleteModal = () => document.getElementById(DELETE_MODAL_ID) as HTMLDialogElement | null;
	let deleting = $state(false);

	const tone = (amount: number) => (amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : '');
</script>

<svelte:head>
	<title>{lot.card.name} · Pokémon Binder</title>
</svelte:head>

<Button href="/profils/{lot.profile.id}/extensions/{lot.card.setId}" variant="ghost" icon={ArrowLeft}>
	{lot.profile.name} · {lot.card.setName}
</Button>

<div class="mt-4 flex flex-col gap-6 md:flex-row">
	<div class="mx-auto w-full max-w-xs md:mx-0">
		<CardImage
			imageUrl={lot.card.imageUrl}
			name={lot.card.name}
			number="{lot.card.localId}/{lot.card.officialCount}"
			setName={lot.card.setName}
			setLogoUrl={lot.card.setLogoUrl}
			class="rounded-xl"
		/>
	</div>

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
				<Button variant="ghost" icon={Trash2} onclick={() => deleteModal()?.showModal()}>Supprimer</Button>
			</div>
		</form>

		{#if form?.message}
			<Alert variant="error" dismissible={false}>{form.message}</Alert>
		{/if}
	</div>
</div>

<Modal id={DELETE_MODAL_ID} title="Supprimer ce lot ?" size="sm">
	<p class="mb-4">
		<strong>{lot.quantity} × {lot.card.name}</strong> ({lot.card.localId}/{lot.card.officialCount}) sera retiré du profil
		« {lot.profile.name} ». Cette action est <strong>irréversible</strong>.
	</p>
	<form
		method="POST"
		action="?/delete"
		class="flex justify-end gap-2"
		use:enhance={() => {
			deleting = true;
			return async ({ result, update }) => {
				deleting = false;
				if (result.type === 'redirect') toast.success('Lot supprimé.');
				deleteModal()?.close();
				await update();
			};
		}}
	>
		<Button variant="ghost" onclick={() => deleteModal()?.close()}>Annuler</Button>
		<Button type="submit" variant="danger" icon={Trash2} loading={deleting}>Supprimer définitivement</Button>
	</form>
</Modal>
