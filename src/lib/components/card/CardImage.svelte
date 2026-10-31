<script lang="ts">
	import { ImageOff } from '@lucide/svelte';

	// A card's picture, or — when TCGdex has none in any language — a placeholder that still tells
	// which card it is: name, number and set. `compact` (thumbnails): just an icon, the text around
	// the thumbnail already names the card.
	let {
		imageUrl,
		name,
		number,
		setName,
		setLogoUrl = null,
		lazy = false,
		compact = false,
		class: cls = ''
	}: {
		imageUrl: string | null;
		name: string;
		/** As printed, e.g. "025/198". */
		number: string;
		setName: string | null;
		setLogoUrl?: string | null;
		lazy?: boolean;
		compact?: boolean;
		class?: string;
	} = $props();
</script>

{#if imageUrl}
	<img src={imageUrl} alt={name} loading={lazy ? 'lazy' : undefined} class="aspect-[5/7] w-full object-cover {cls}" />
{:else if compact}
	<div
		class="flex aspect-[5/7] w-full items-center justify-center border opacity-60 {cls}"
		role="img"
		aria-label="{name}, image indisponible"
	>
		<ImageOff size={16} />
	</div>
{:else}
	<div
		class="flex aspect-[5/7] w-full flex-col items-center justify-center gap-2 border p-3 text-center {cls}"
		role="img"
		aria-label="{name}, image indisponible"
	>
		{#if setLogoUrl}
			<img src={setLogoUrl} alt="" class="max-h-10 max-w-[80%] object-contain opacity-80" />
		{/if}
		<span class="font-semibold">{name}</span>
		<span class="text-sm opacity-70">n° {number}</span>
		{#if setName}
			<span class="text-xs opacity-60">{setName}</span>
		{/if}
		<span class="text-xs opacity-50">Image indisponible</span>
	</div>
{/if}
