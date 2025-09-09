process.env.RSPACK_BINDING = require('node:path').dirname(
  require.resolve('@hyperse/hps-code-checker-rust')
);

const binding = require('@hyperse/hps-code-checker-rust');

// Register the plugin `RspackCodeCheckerPlugin` exported by `crates/binding/src/lib.rs`.
binding.registerRspackCodeCheckerPlugin();

const core = require('@rspack/core');

/**
 * Creates a wrapper for the plugin `RspackCodeCheckerPlugin` exported by `crates/binding/src/lib.rs`.
 *
 * Check out `crates/binding/src/lib.rs` for the original plugin definition.
 * This plugin is used in `examples/use-plugin/build.js`.
 *
 * @example
 * ```js
 * const RspackCodeCheckerPlugin = require('@rspack-template/core').RspackCodeCheckerPlugin;
 * ```
 *
 * `createNativePlugin` is a function that creates a wrapper for the plugin.
 *
 * The first argument to `createNativePlugin` is the name of the plugin.
 * The second argument to `createNativePlugin` is a resolver function.
 *
 * Options used to call `new MyBannerPlugin` will be passed as the arguments to the resolver function.
 * The return value of the resolver function will be used to initialize the plugin in `MyBannerPlugin` on the Rust side.
 *
 * For the following code:
 *
 * ```js
 * new RspackCodeCheckerPlugin()
 * ```
 */
const RspackCodeCheckerPlugin = core.experiments.createNativePlugin(
  'RspackCodeCheckerPlugin',
  function (options) {
    const filledOptions = {
      riskyStringCheck: [],
      allowedDomainResources: [],
      ...options,
    };
    // Automatically stringify the options object
    const stringifiedOptions = JSON.stringify(filledOptions);
    return stringifiedOptions;
  }
);

Object.defineProperty(core, 'RspackCodeCheckerPlugin', {
  value: RspackCodeCheckerPlugin,
});

module.exports = core;
