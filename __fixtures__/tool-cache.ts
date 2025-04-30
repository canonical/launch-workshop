import * as fs from 'node:fs/promises'
import type * as tc from '@actions/tool-cache'
export { evaluateVersions, isExplicitVersion } from '@actions/tool-cache'
import { TemporaryDirectory } from './tmpdir.js'
import { jest } from '@jest/globals'
import path from 'node:path'
import { statSync } from 'node:fs'

export const cacheDir = jest.fn<typeof tc.cacheDir>(
  async (source, _, version) => {
    const result = path.join(tmpdir.path(), version)
    if (source) {
      await fs.cp(source, result, {
        errorOnExist: true,
        force: false,
        recursive: true
      })
    } else {
      await fs.mkdir(result)
    }
    return result
  }
)

export const find = jest.fn<typeof tc.find>((_, version) => {
  const result = path.join(tmpdir.path(), version)
  if (statSync(result, { throwIfNoEntry: false }) === undefined) {
    return ''
  }
  return result
})

export const tmpdir = new TemporaryDirectory()
