import type * as paths from '../src/paths.js'
import { TemporaryDirectory } from './tmpdir.js'
import { jest } from '@jest/globals'
import path from 'node:path'

export const socketPath = jest.fn<typeof paths.socketPath>(async () => {
  return path.join(tmpdir.path(), 'workshop.socket')
})

export const mountHostSource = jest.fn<typeof paths.mountHostSource>(
  (...args) => path.join(userDataPath(), 'id', ...args)
)

export const hostCachePath = jest.fn<typeof paths.hostCachePath>((hash) =>
  path.join(userDataPath(), hash)
)

export const userDataPath = jest.fn<typeof paths.userDataPath>(() =>
  path.join(tmpdir.path(), 'xdg')
)

export const tmpdir = new TemporaryDirectory()
