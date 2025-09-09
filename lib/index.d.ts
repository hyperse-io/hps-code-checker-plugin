import type * as RspackCore from '@rspack/core';

export type RspackCodeCheckerPluginOptions = {
  excludeModules?: string[];
  riskyStringCheck?: string[];
  allowedDomainResources?: string[];
  domainRegex: string;
};

/**
 * RspackCodeCheckerPlugin class that checks code for illegal patterns.
 */
declare class RspackCodeCheckerPlugin {
  /**
   * The options for the RspackCodeCheckerPlugin.
   */
  constructor(options: RspackCodeCheckerPluginOptions);
}

declare const core: typeof RspackCore & {
  RspackCodeCheckerPlugin: typeof RspackCodeCheckerPlugin;
};

export = core;
