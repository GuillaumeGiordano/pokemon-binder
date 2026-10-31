<script lang="ts">
	import { Button } from '@guillaumeg/ui';
	import { ScanLine, X } from '@lucide/svelte';
	import type { Attachment } from 'svelte/attachments';

	// Full-screen live camera with an aiming frame (D38): the user puts the card number in the frame,
	// « Lire » hands over ONLY that part of the image, enlarged — a close-up, whatever the distance.
	// The camera is released as soon as the viewfinder closes.
	let {
		reading,
		onCapture,
		onClose,
		onUnavailable
	}: {
		/** OCR in progress: the « Lire » button waits. */
		reading: boolean;
		onCapture: (image: HTMLCanvasElement) => void;
		onClose: () => void;
		/** No camera, or access refused: the caller falls back to a photo. */
		onUnavailable: (error: unknown) => void;
	} = $props();

	let video: HTMLVideoElement | null = null;
	let aim = $state<HTMLDivElement | null>(null);
	let ready = $state(false);

	/** Attachment of the <video>: starts the rear camera, and stops it when the video leaves the page. */
	const camera: Attachment<HTMLVideoElement> = (element) => {
		video = element;
		let stream: MediaStream | null = null;
		let cancelled = false;
		navigator.mediaDevices
			.getUserMedia({
				audio: false,
				video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
			})
			.then(async (granted) => {
				if (cancelled) return granted.getTracks().forEach((track) => track.stop());
				stream = granted;
				element.srcObject = granted;
				await element.play();
				ready = true;
			})
			.catch((error) => onUnavailable(error));
		return () => {
			cancelled = true;
			stream?.getTracks().forEach((track) => track.stop());
			video = null;
		};
	};

	/**
	 * The part of the camera frame under the aiming rectangle. The video fills the screen with
	 * `object-fit: cover` (scaled, then cropped on two sides): screen coordinates are mapped back to
	 * the camera's own pixels.
	 */
	function capture() {
		if (!video || !aim || !video.videoWidth) return;
		const shown = video.getBoundingClientRect();
		const frame = aim.getBoundingClientRect();
		const scale = Math.max(shown.width / video.videoWidth, shown.height / video.videoHeight);
		const offsetX = (shown.width - video.videoWidth * scale) / 2;
		const offsetY = (shown.height - video.videoHeight * scale) / 2;
		const sourceX = (frame.left - shown.left - offsetX) / scale;
		const sourceY = (frame.top - shown.top - offsetY) / scale;
		const sourceWidth = frame.width / scale;
		const sourceHeight = frame.height / scale;

		const canvas = document.createElement('canvas');
		canvas.width = Math.round(sourceWidth);
		canvas.height = Math.round(sourceHeight);
		canvas.getContext('2d')!.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
		onCapture(canvas);
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onClose()} />

<div class="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Scanner le numéro de la carte">
	<div class="relative flex-1 overflow-hidden">
		<!-- The camera feed: no UI library component plays a video stream. -->
		<video {@attach camera} class="absolute inset-0 h-full w-full object-cover" playsinline muted></video>

		<div class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
			<p class="rounded-md bg-black/60 px-3 py-1 text-center text-sm">
				Place le <strong>numéro de la carte</strong> (ex. 025/198) dans le cadre, bien net et sans reflet.
			</p>
			<!-- The aiming frame; the huge shadow darkens everything around it. -->
			<div
				bind:this={aim}
				class="aspect-[4/1] w-4/5 max-w-md rounded-lg border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
			></div>
			{#if !ready}
				<p class="text-sm opacity-80">Ouverture de la caméra…</p>
			{/if}
		</div>
	</div>

	<div class="flex items-center justify-between gap-2 p-4">
		<Button variant="ghost" icon={X} onclick={onClose}>Annuler</Button>
		<Button icon={ScanLine} loading={reading} disabled={!ready} onclick={capture}>
			{reading ? 'Lecture…' : 'Lire le numéro'}
		</Button>
	</div>
</div>
