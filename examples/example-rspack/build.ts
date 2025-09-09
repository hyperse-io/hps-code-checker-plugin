import { join } from 'node:path';
import { createRspackCodeCheckerPlugin } from '@hyperse/hps-code-checker-rspack-plugin';
import { type RspackOptions } from '@rspack/core';
import { rspack } from '@rspack/core';

export const createRspack = async () => {
  const publicPath = join(process.cwd(), 'public');
  const RspackCodeCheckerPlugin = await createRspackCodeCheckerPlugin();
  const options: RspackOptions = {
    mode: 'development',
    entry: {
      main: join(process.cwd(), 'src/index.tsx'),
    },
    output: {
      path: publicPath,
    },
    resolve: {
      extensions: ['...', '.ts', '.tsx', '.css', '.less'],
    },
    externals: {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.svg$/,
          type: 'asset',
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: rspack.CssExtractRspackPlugin.loader,
              options: {
                // https://github.com/webpack-contrib/mini-css-extract-plugin/releases/tag/v1.0.0
                // https://github.com/webpack-contrib/css-loader/blob/master/README.md#modules
                esModule: true,
              },
            },
            {
              loader: 'css-loader',
              options: {
                modules: false,
              },
            },
            'postcss-loader',
          ],
        },
        {
          test: /\.less$/i,
          use: [
            {
              loader: 'less-loader',
              options: {
                sourceMap: false,
                lessOptions: {
                  sourceMap: false,
                  javascriptEnabled: true,
                },
              },
            },
          ],
        },
        {
          test: /\.tsx?$/,
          exclude: [/[\\/]node_modules[\\/]/],
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                decorators: true,
                jsx: true,
              },
              externalHelpers: true,
              transform: {
                decoratorMetadata: true,
                // useDefineForClassFields: true,
                react: {
                  runtime: 'automatic',
                  development: true,
                  // https://www.rspack.dev/blog/announcing-0-4#deprecating-builtinreactrefresh
                  refresh: true,
                },
              },
            },
          },
        },
      ],
    },
    plugins: [
      new rspack.CssExtractRspackPlugin({
        // Options similar to the same options in webpackOptions.output
        // both options are optional
        filename: `[name]`,
        // the chunkFilename option can be a function for webpack@5
        chunkFilename: '[id].[contenthash].css',
      }),
      new RspackCodeCheckerPlugin({
        riskyStringCheck: [],
        allowedDomainResources: [],
        domainRegex: 'https?://[a-zA-Z0-9\\.-]+',
      }),
    ],
  };
  return new Promise((resolve, reject) => {
    rspack(options, (err: any, stats: any) => {
      if (err) {
        reject(err);
      }
      resolve(stats);
    });
  });
};

try {
  await createRspack();
} catch (error) {
  console.log('error message\n');
  console.error(error);
}
