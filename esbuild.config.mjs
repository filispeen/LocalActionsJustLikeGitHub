import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const hostContext = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  target: 'node18'
});

const webviewContext = await esbuild.context({
  entryPoints: ['src/webview/app/index.tsx'],
  bundle: true,
  outfile: 'dist/webview/index.js',
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  target: 'chrome120',
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"'
  }
});

if (isWatch) {
  await Promise.all([hostContext.watch(), webviewContext.watch()]);
} else {
  await Promise.all([hostContext.rebuild(), webviewContext.rebuild()]);
  await Promise.all([hostContext.dispose(), webviewContext.dispose()]);
}
