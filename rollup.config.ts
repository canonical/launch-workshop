// See: https://rollupjs.org/introduction/

import type { RollupOptions } from 'rollup'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

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
    typescript({ tsconfig: 'tsconfig.build.json' }),
    nodeResolve({ preferBuiltins: true }),
    json(),
    commonjs()
  ]
}

export default config
