<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Badge, Button, EmptyState, Input, toast } from '@guillaumeg/ui';
	import { Pencil, Search, Trash2 } from '@lucide/svelte';
	import { CARD_VARIANT_LABELS } from '$lib/records/card';
	import { formatEur } from '$lib/utils/format';

	let { data, form } = $props();

	const binder = $derived(data.binder);
	let editing = $state(false);
	let confirmDelete = $state(false);
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
		<h1 class="text-2xl font-bold">{binder.name}</h1>
		<div class="flex gap-2">
			<Button href="/recherche" icon={Search}>Ajouter une carte</Button>
			<Button variant="ghost" icon={Pencil} aria-label="Renommer" onclick={() => (editing = true)} />
			<Button variant="ghost" icon={Trash2} aria-label="Supprimer" onclick={() => (confirmDelete = true)} />
		</div>
	{/if}
</div>

{#if form?.message}
	<div class="mb-4"><Alert variant="error" dismissible={false}>{form.message}</Alert></div>
{/if}

{#if confirmDelete}
	<div class="mb-4">
		<Alert variant="warning" title="Supprimer ce classeur ?" dismissible={false}>
			<p class="mb-2">Ses {binder.items.length} lot(s) seront supprimés aussi. C'est définitif.</p>
			<form method="POST" action="?/delete" class="flex gap-2" use:enhance>
				<Button type="submit" variant="danger" icon={Trash2}>Supprimer</Button>
				<Button variant="ghost" onclick={() => (confirmDelete = false)}>Annuler</Button>
			</form>
		</Alert>
	</div>
{/if}

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
						{#if item.card.imageUrl}
							<img
								src={item.card.imageUrl}
								alt={item.card.name}
								loading="lazy"
								class="aspect-[5/7] w-full rounded-md object-cover"
							/>
						{:else}
							<div class="flex aspect-[5/7] w-full items-center justify-center rounded-md border text-sm opacity-60">
								Pas d'image
							</div>
						{/if}
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
