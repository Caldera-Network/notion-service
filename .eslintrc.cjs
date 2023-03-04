module.exports = {
	rules: {},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:@typescript-eslint/strict',
		'plugin:unicorn/recommended',
		'plugin:import/recommended',
		'plugin:import/typescript',
		'prettier',
	],
	settings: {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts', '.tsx'],
		},
		'import/resolver': {
			typescript: {
				alwaysTryTypes: true,
			},
			node: true,
		},
	},
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'import'],
	root: true,
	parserOptions: {
		tsconfigRootDir: './',
		project: ['./tsconfig.json'],
		sourceType: 'module',
		ecmaVersion: 'ESNext',
	},
};
