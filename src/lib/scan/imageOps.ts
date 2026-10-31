// Image preparation for the OCR of a card number (browser only, works on canvas pixels).

/** A canvas copy of `source`, scaled so its width is `width` (keeps the ratio). */
export function resized(source: CanvasImageSource & { width: number; height: number }, width: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(width);
	canvas.height = Math.round((source.height * width) / source.width);
	const context = canvas.getContext('2d')!;
	context.imageSmoothingQuality = 'high';
	context.drawImage(source, 0, 0, canvas.width, canvas.height);
	return canvas;
}

/** Luminance (0-255) of every pixel. */
function luminances(data: Uint8ClampedArray): Uint8Array {
	const values = new Uint8Array(data.length / 4);
	for (let i = 0; i < values.length; i++) {
		values[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
	}
	return values;
}

/**
 * Otsu's threshold: the grey level that best separates dark pixels (the printed digits) from light
 * ones (the card), found from the histogram — no fixed value to tune per card or lighting.
 */
function otsuThreshold(values: Uint8Array): number {
	const histogram = new Array<number>(256).fill(0);
	for (const value of values) histogram[value]++;
	const total = values.length;
	let sumAll = 0;
	for (let level = 0; level < 256; level++) sumAll += level * histogram[level];

	let sumBackground = 0;
	let weightBackground = 0;
	let best = { threshold: 127, variance: -1 };
	for (let level = 0; level < 256; level++) {
		weightBackground += histogram[level];
		if (weightBackground === 0) continue;
		const weightForeground = total - weightBackground;
		if (weightForeground === 0) break;
		sumBackground += level * histogram[level];
		const meanBackground = sumBackground / weightBackground;
		const meanForeground = (sumAll - sumBackground) / weightForeground;
		const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
		if (variance > best.variance) best = { threshold: level, variance };
	}
	return best.threshold;
}

/**
 * A pure black-and-white copy (binarization): the digits stand out sharply, which Tesseract reads
 * best. Light-on-dark numbers (full arts) need no inverted copy: Tesseract inverts them itself.
 */
export function binarized(source: HTMLCanvasElement): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = source.width;
	canvas.height = source.height;
	const context = canvas.getContext('2d')!;
	context.drawImage(source, 0, 0);
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	const values = luminances(image.data);
	const threshold = otsuThreshold(values);
	for (let i = 0; i < values.length; i++) {
		const level = values[i] <= threshold ? 0 : 255;
		image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = level;
		image.data[i * 4 + 3] = 255;
	}
	context.putImageData(image, 0, 0);
	return canvas;
}

/** A grayscale, contrasted copy. */
export function contrasted(source: HTMLCanvasElement): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = source.width;
	canvas.height = source.height;
	const context = canvas.getContext('2d')!;
	context.filter = 'grayscale(1) contrast(1.6)';
	context.drawImage(source, 0, 0);
	return canvas;
}
