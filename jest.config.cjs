/** @type {import('jest').Config} */
const config = {
	testPathIgnorePatterns: ['/node_modules/', 'dist'],
	rootDir: process.cwd(),
	transformIgnorePatterns: ['node_modules'],
	transform: {
		'^.+\\.m?[tj]sx?$': [
			'ts-jest',
			{
				useESM: true,
			},
		],
	},
	testTimeout: 60000,
	extensionsToTreatAsEsm: ['.ts'],
	clearMocks: true,
	collectCoverage: true,
	coverageProvider: 'v8',
	coverageReporters: ['text', 'lcov'],
	collectCoverageFrom: ['src/**/*.ts'],
	coveragePathIgnorePatterns: [],
	verbose: false,
};

module.exports = config;
