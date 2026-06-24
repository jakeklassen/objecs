import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		// https://github.com/vitejs/vite/issues/88#issuecomment-784441588
		alias: {
			"#": path.resolve(__dirname, "src"),
		},
	},
});
