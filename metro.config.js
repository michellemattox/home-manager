const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Zustand v5 ships an ESM build (esm/middleware.mjs) that contains
// `import.meta.env`, which is a SyntaxError in Metro's CommonJS web bundle.
// Disabling package-exports resolution makes Metro fall back to each
// package's `main` field (the CJS build), which has no `import.meta`.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
