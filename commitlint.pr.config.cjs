module.exports = {
  ...require('./commitlint.config.cjs'),
  // PR titles must not bypass validation through commitlint's merge/revert ignores.
  defaultIgnores: false,
};
