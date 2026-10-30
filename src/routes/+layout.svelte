<script lang="ts">
	import { theme, Toaster } from '@guillaumeg/ui';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	onMount(() => theme.init());
</script>

{@render children()}

<Toaster />
