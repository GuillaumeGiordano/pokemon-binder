<script lang="ts">
	import { ThemeToggle } from '@guillaumeg/ui';
</script>

<svelte:head>
	<title>Pokémon Binder</title>
</svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-4 p-4">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Pokémon Binder</h1>
		<ThemeToggle />
	</header>
	<p>Ton classeur numérique de cartes Pokémon.</p>
</main>
