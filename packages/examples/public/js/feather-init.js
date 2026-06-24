(() => {
	/** @typedef {{ replace: () => void }} Feather */

	const timer = setInterval(() => {
		const feather = /** @type {Feather | undefined} */ (
			/** @type {Record<string, unknown>} */ (globalThis).feather
		);

		if (feather == null) {
			return;
		}

		feather.replace();

		clearInterval(timer);
	}, 50);
})();
