module.exports = {
	'**/*': (filenames) => `prettier . --write --ignore-unknown`,
	// '**/*': (filenames) =>
	// `prettier ${filenames.join(' ')} --write --ignore-unknown`,
};
