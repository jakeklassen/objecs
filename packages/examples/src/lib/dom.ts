export const obtainCanvasAndContext2d = (id?: string) => {
	const canvas = document.querySelector<HTMLCanvasElement>(id ?? "canvas");

	if (canvas == null) {
		throw new Error("failed to obtain canvas element");
	}

	const context = canvas.getContext("2d");

	if (context == null) {
		throw new Error("failed to obtain canvas 2d context");
	}

	return {
		canvas,
		context,
	};
};

/**
 * Helper to safely return a canvas rendering 2d context.
 * @param canvas canvas element
 * @returns
 */
export function obtainCanvas2dContext(
	canvas: HTMLCanvasElement,
	options?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D;
export function obtainCanvas2dContext(
	canvas: OffscreenCanvas,
	options?: CanvasRenderingContext2DSettings,
): OffscreenCanvasRenderingContext2D;
export function obtainCanvas2dContext(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	options?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
	const context = canvas.getContext("2d", options);

	if (context === null) {
		throw new Error("Could not obtain 2d context");
	}

	return context;
}
