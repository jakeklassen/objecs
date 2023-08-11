import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src", "!src/**/*.test.ts"],
	sourcemap: true,
	format: ["cjs", "esm"],
	dts: true,
	clean: true,
});
