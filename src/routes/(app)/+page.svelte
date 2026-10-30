<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button, EmptyState, Input, toast } from '@guillaumeg/ui';
	import { BookOpen, Plus } from '@lucide/svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Mes classeurs · Pokémon Binder</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold">Mes classeurs</h1>

{#if data.binders.length === 0}
	<EmptyState icon={BookOpen} title="Aucun classeur" description="Crée ton premier classeur pour y ranger tes cartes." />
{:else}
	<ul class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.binders as binder (binder.id)}
			<li>
				<a href="/classeurs/{binder.id}" class="flex flex-col gap-1 rounded-lg border p-4 hover:opacity-80">
					<span class="font-semibold">{binder.name}</span>
					<span class="text-sm opacity-70">
						{binder.cardCount} carte{binder.cardCount > 1 ? 's' : ''} · {binder.lotCount} lot{binder.lotCount > 1 ? 's' : ''}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<form
	method="POST"
	action="?/createBinder"
	class="mt-6 flex items-end gap-2"
	use:enhance={({ formElement }) =>
		async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Classeur créé.');
				formElement.reset();
			}
			await update({ reset: false });
		}}
>
	<div class="flex-1">
		<Input name="name" label="Nouveau classeur" placeholder="Ex. Écarlate et Violet" maxlength={60} required />
	</div>
	<Button type="submit" icon={Plus}>Créer</Button>
</form>

{#if form?.message}
	<div class="mt-3">
		<Alert variant="error" dismissible={false}>{form.message}</Alert>
	</div>
{/if}
