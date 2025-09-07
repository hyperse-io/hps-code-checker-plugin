import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);
const bindingPath = require.resolve('@hyperse/hps-code-checker-rust');
process.env.RSPACK_BINDING = dirname(bindingPath);

// Set RSPACK_BINDING environment variable for native plugin loading
// Point to the directory containing the Rust binding .node file
// const bindingPath = dirname(require.resolve('@hyperse/hps-code-checker-rust'));
// process.env.RSPACK_BINDING = bindingPath;

export type RspackCodeCheckerPluginOptions = {
  excludeModules?: string[];
  riskyStringCheck?: string[];
  allowedDomainResources?: string[];
  domainRegex: string;
};

/**
 * Creates a wrapper for the plugin `RspackCodeCheckerPlugin` exported by `crates/binding/src/lib.rs`.
 *
 * Check out `crates/binding/src/lib.rs` for the original plugin definition.
 * This plugin is used in `examples/use-plugin/build.js`.
 *
 * @example
 * ```js
 * const RspackCodeCheckerPlugin = require('@hyperse/rspack-code-checker-plugin').RspackCodeCheckerPlugin;
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
 * new MyBannerPlugin('// Hello World')
 * ```
 *
 * The resolver function will be called with `'// Hello World'`.
 *
 */
export const createRspackCodeCheckerPlugin = async () => {
  const binding = await import('@hyperse/hps-code-checker-rust');

  // Register the plugin `RspackCodeCheckerPlugin` exported by `crates/binding/src/lib.rs` .
  binding.registerRspackCodeCheckerPlugin();
  const core = await import('@rspack/core');

  const RspackCodeCheckerPlugin = core.experiments.createNativePlugin(
    'RspackCodeCheckerPlugin',
    function (options: RspackCodeCheckerPluginOptions) {
      const filledOptions = {
        excludeModules: [],
        riskyStringCheck: [],
        allowedDomainResources: [],
        ...options,
      };
      // Automatically stringify the options object
      const stringifiedOptions = JSON.stringify(filledOptions);
      return stringifiedOptions;
    }
  );

  return RspackCodeCheckerPlugin;
};
