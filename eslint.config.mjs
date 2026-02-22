import eslint from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import depend from "eslint-plugin-depend";

export default defineConfig(
	{
		ignores: [
			"**/node_modules",
			"**/build",
			"**/dist",
			"**/public",
			// This package mixes a lot of packages that I don't control, so ignore it.
			"packages/ecs-benchmark/**",
			// Benchmarks intentionally use varied loop styles, non-null assertions, etc.
			"packages/perf-proofs/**",
		],
	},
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
		languageOptions: { globals: globals.browser },
		plugins: { depend },
		extends: ["depend/flat/recommended"],
	},
	eslintConfigPrettier,
	eslint.configs.recommended,
	tseslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ["packages/objecs/src/**/*.ts"],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector:
						"CallExpression[callee.object.name='Object'][callee.property.name='hasOwn']",
					message:
						"Use `entity[prop] !== undefined` instead of Object.hasOwn() in core library. Object.hasOwn is ~10% slower due to static method call overhead. See CLAUDE.md Performance Conventions.",
				},
			],
		},
	},
	{
		rules: {
			"@typescript-eslint/array-type": "off",
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNumber: true,
				},
			],
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/interface-name-prefix": "off",
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/camelcase": "off",
			"@typescript-eslint/no-var-requires": "off",
			"no-unused-vars": "off",

			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},
);
