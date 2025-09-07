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
    experiments: {
      css: true,
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
          use: ['postcss-loader'],
          type: 'css',
        },
        {
          test: /\.less$/,
          use: [
            {
              loader: 'less-loader',
              options: {
                // ...
              },
            },
          ],
          // 如果你需要将 '*.module.less' 视为 CSS Modules 那么将 'type' 设置为 'css/auto' 否则设置为 'css'
          type: 'css/auto',
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
      new RspackCodeCheckerPlugin({
        excludeModules: [],
        riskyStringCheck: [],
        allowedDomainResources: [
          'http://test.example.com',
          'http://test2.example.com',
          'https://config.test.com',
        ],
        domainRegex: 'https?:\\/\\/',
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

await createRspack();
