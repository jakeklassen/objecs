import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/**/*.ts", "!src/**/*.test.ts"],
	format: ["esm", "cjs"],
	dts: true,
	sourcemap: true,
	clean: true,
	target: "chrome101",
});
