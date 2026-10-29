// The web workspace intentionally uses a TypeScript 7 preview while Expo 58's
// lint stack supports TypeScript 6. Pin only the mobile lint process so npm's
// workspace hoisting cannot make ts-api-utils load the web compiler.
const Module = require('node:module');
const path = require('node:path');

const originalResolveFilename = Module._resolveFilename;
const mobileRoot = path.resolve(__dirname, '..');
const mobileTypeScript = require.resolve('typescript-eslint-compat', { paths: [mobileRoot] });

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === 'typescript') return mobileTypeScript;
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
