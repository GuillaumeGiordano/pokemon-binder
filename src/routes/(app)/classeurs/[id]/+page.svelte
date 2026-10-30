<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Badge, Button, EmptyState, Input, Modal, toast } from '@guillaumeg/ui';
	import { Pencil, Search, Trash2 } from '@lucide/svelte';
	import CardImage from '$lib/components/card/CardImage.svelte';
	import { CARD_VARIANT_LABELS } from '$lib/records/card';
	import { formatEur } from '$lib/utils/format';

	let { data, form } = $props();

	const binder = $derived(data.binder);
	let editing = $state(false);

	const DELETE_MODAL_ID = 'binder-delete';
	const deleteModal = () => document.getElementById(DELETE_MODAL_ID) as HTMLDialogElement | null;
	let deleting = $state(false);
	const cardCount = $derived(binder.items.reduce((sum, item) => sum + item.quantity, 0));
</script>

<svelte:head>
	<title>{binder.name} · Pokémon Binder</title>
</svelte:head>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	{#if editing}
		<form
			method="POST"
			action="?/rename"
			class="flex flex-1 items-end gap-2"
			use:enhance={() =>
				async ({ result, update }) => {
					if (result.type === 'success') {
						toast.success('Classeur renommé.');
						editing = false;
					}
					await update();
				}}
		>
			<div class="flex-1">
				<Input name="name" label="Nom du classeur" value={binder.name} maxlength={60} required />
			</div>
			<Button type="submit">Enregistrer</Button>
			<Button variant="ghost" onclick={() => (editing = false)}>Annuler</Button>
		</form>
	{:else}
		<div>
			<h1 class="text-2xl font-bold">{binder.name}</h1>
			<p class="opacity-70">
				Valeur : <strong>{formatEur(binder.value)}</strong>
				{#if binder.unpricedCount > 0}· {binder.unpricedCount} sans cote{/if}
			</p>
		</div>
		<div class="flex gap-2">
			<Button href="/recherche" icon={Search}>Ajouter une carte</Button>
			<Button variant="ghost" icon={Pencil} aria-label="Renommer" onclick={() => (editing = true)} />
			<Button variant="ghost" icon={Trash2} aria-label="Supprimer" onclick={() => deleteModal()?.showModal()} />
		</div>
	{/if}
</div>

{#if form?.message}
	<div class="mb-4"><Alert variant="error" dismissible={false}>{form.message}</Alert></div>
{/if}

<Modal id={DELETE_MODAL_ID} title="Supprimer ce classeur ?" size="sm">
	<p class="mb-4">
		Le classeur <strong>« {binder.name} »</strong>
		{#if cardCount > 0}
			et ses <strong>{cardCount} carte{cardCount > 1 ? 's' : ''}</strong> seront supprimés.
		{:else}
			sera supprimé.
		{/if}
		Cette action est <strong>irréversible</strong>.
	</p>
	<form
		method="POST"
		action="?/delete"
		class="flex justify-end gap-2"
		use:enhance={() => {
			deleting = true;
			return async ({ result, update }) => {
				deleting = false;
				if (result.type === 'redirect') toast.success('Classeur supprimé.');
				deleteModal()?.close();
				await update();
			};
		}}
	>
		<Button variant="ghost" onclick={() => deleteModal()?.close()}>Annuler</Button>
		<Button type="submit" variant="danger" icon={Trash2} loading={deleting}>Supprimer définitivement</Button>
	</form>
</Modal>

{#if binder.items.length === 0}
	<EmptyState
		icon={Search}
		title="Classeur vide"
		description="Recherche une carte puis ajoute-la à ce classeur."
		cta={{ label: 'Rechercher une carte', href: '/recherche' }}
	/>
{:else}
	<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
		{#each binder.items as item (item.id)}
			<li>
				<a href="/lots/{item.id}" class="flex flex-col gap-1 rounded-lg p-1 hover:opacity-80">
					<div class="relative">
						<CardImage
							imageUrl={item.card.imageUrl}
							name={item.card.name}
							number="{item.card.localId}/{item.card.officialCount}"
							setName={item.card.setName}
							setLogoUrl={item.card.setLogoUrl}
							lazy
							class="rounded-md"
						/>
						{#if item.quantity > 1}
							<span class="absolute top-1 right-1"><Badge label="×{item.quantity}" variant="primary" /></span>
						{/if}
					</div>
					<span class="truncate text-sm font-semibold">{item.card.name}</span>
					<span class="truncate text-xs opacity-70">
						{item.card.localId}/{item.card.officialCount} · {item.condition} · {item.language}
						{#if item.variant !== 'NORMAL'}· {CARD_VARIANT_LABELS[item.variant]}{/if}
					</span>
					<span class="text-sm font-semibold">{formatEur(item.currentMarketPrice)}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
