import * as fs from 'node:fs/promises'
import type * as release from '../src/release.js'
export type { Release } from '../src/release.js'
import { TemporaryDirectory } from './tmpdir.js'
import { jest } from '@jest/globals'
import path from 'node:path'

export const downloadRelease = jest.fn<typeof release.downloadRelease>(
  async (token, release, filter) => {
    const assets = [
      'workshop_0.1.0_testarch.snap',
      'workshop_0.1.0_fakearch.snap'
    ]

    for (const asset of assets.filter(filter)) {
      await fs.writeFile(path.join(tmpdir.path(), asset), token)
    }

    return tmpdir.path()
  }
)

export const tmpdir = new TemporaryDirectory()
