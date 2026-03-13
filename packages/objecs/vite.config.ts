import path from "node:path";
import { defineConfig } from "vite-plus";

// oxlint-disable-next-line typescript/no-unsafe-assignment
const config = defineConfig({
	resolve: {
		// https://github.com/vitejs/vite/issues/88#issuecomment-784441588
		alias: {
			"#": path.resolve(__dirname, "src"),
		},
	},
	build: {
		target: "chrome101",
	},
	pack: {
		entry: ["src/**/*.ts", "!src/**/*.test.ts"],
		format: ["esm", "cjs"],
		dts: true,
		sourcemap: true,
		clean: true,
	},
});

export default config;
