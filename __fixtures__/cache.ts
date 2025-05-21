import type * as cache from '@actions/cache'
import * as fs from 'node:fs/promises'
import assert from 'node:assert'
import { jest } from '@jest/globals'
import path from 'node:path'

export const saveCache = jest.fn<typeof cache.saveCache>(async (paths, key) => {
  assert(paths.length === 1, 'cache only mocked for single paths')

  const content = await fs.readFile(path.join(paths[0], 'content'), {
    encoding: 'utf8'
  })
  contents.set(key, content)

  return contents.size
})

export const restoreCache = jest.fn<typeof cache.restoreCache>(
  async (paths, key, prefixes) => {
    assert(paths.length === 1, 'cache only mocked for single paths')

    const saved = lookup(key, prefixes)
    if (saved === undefined) {
      return undefined
    }
    const [hit, content] = saved

    await fs.mkdir(paths[0], { recursive: true })
    await fs.writeFile(path.join(paths[0], 'content'), content)
    return hit
  }
)

function lookup(
  key: string,
  prefixes?: string[]
): [string, string] | undefined {
  let result = contents.get(key)
  if (result !== undefined) {
    return [key, result]
  }

  if (prefixes === undefined) {
    return undefined
  }

  for (const prefix of prefixes) {
    for (const [k, v] of contents) {
      if (k.startsWith(prefix)) {
        key = k
        result = v
      }
    }
    if (result !== undefined) {
      return [key, result]
    }
  }

  return undefined
}

export function clearCache() {
  contents.clear()
}

const contents = new Map<string, string>()
