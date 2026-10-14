const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('node:path');

// Independent entrypoint: the production bundle never imports test bootstrap.
module.exports = {
  output: { path: join(__dirname, '../../dist/tools/e2e-api'), clean: true },
  plugins: [new NxAppWebpackPlugin({
    target: 'node', compiler: 'tsc', main: './e2e/main.ts',
    tsConfig: './tsconfig.e2e.json', optimization: false,
    outputHashing: 'none', generatePackageJson: false, sourceMap: false,
  })],
};
