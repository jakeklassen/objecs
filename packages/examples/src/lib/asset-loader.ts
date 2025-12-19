/**
 * Loads an image
 * @param path image URL
 * @returns
 */
export const loadImage = (path: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			resolve(image);
		};
		image.onerror = (err) => {
			let error: Error;

			if (typeof err === "string") {
				error = new Error(err);
			} else {
				error = new Error("Failed to load image");
			}

			reject(error);
		};

		image.src = path;
	});
