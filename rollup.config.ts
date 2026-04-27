// See: https://rollupjs.org/introduction/

import type { RollupOptions } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

// See: https://github.com/rollup/plugins/issues/1541
const fix = <T>(f: { default: T }): T => f as unknown as T

const config: RollupOptions = {
  input: ['src/index.ts', 'src/post.ts'],
  output: {
    chunkFileNames: '[name].js',
    dir: 'dist',
    esModule: true,
    format: 'es',
    sourcemap: true
  },
  plugins: [
    fix(typescript)({ tsconfig: 'tsconfig.build.json' }),
    fix(nodeResolve)({ preferBuiltins: true }),
    fix(json)(),
    fix(commonjs)()
  ]
}

export default config
