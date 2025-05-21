import * as env from '../__fixtures__/env.js'
import * as fs from '../__fixtures__/fs.js'
import * as os from '../__fixtures__/os.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('node:fs/promises', () => fs)
jest.unstable_mockModule('node:os', () => ({ default: os }))

const { hostCachePath, mountHostSource, socketPath, userDataPath } =
  await import('../src/paths.js')

beforeEach(() => env.replaceEnv({}))
afterEach(env.restoreEnv)

describe('socketPath', () => {
  test('respects WORKSHOP_SOCKET', async () => {
    process.env.WORKSHOP_SOCKET = '/ws/sock'
    process.env.WORKSHOP = '/nowhere'

    expect(await socketPath()).toEqual('/ws/sock')
  })

  test('respects WORKSHOP', async () => {
    process.env.WORKSHOP = '/ws'

    expect(await socketPath()).toEqual('/ws/workshop.socket')
  })

  test('looks for snap', async () => {
    expect(await socketPath()).toEqual(
      '/var/snap/workshop/common/workshop/workshop.socket'
    )
  })

  test('provides default', async () => {
    fs.access.mockRejectedValueOnce(new Error('no such file or directory'))

    expect(await socketPath()).toEqual('/var/lib/workshop/workshop.socket')
  })
})

describe('mountHostSource', () => {
  test('respects XDG_DATA_HOME', () => {
    process.env.XDG_DATA_HOME = '/xdg'

    expect(mountHostSource('123', 'dev', 'go', 'mod-cache')).toEqual(
      '/xdg/workshop/id/123/dev/mount/go/mod-cache'
    )
  })
})

describe('hostCachePath', () => {
  test('respects XDG_DATA_HOME', () => {
    process.env.XDG_DATA_HOME = '/xdg'

    expect(hostCachePath('abc123')).toEqual(
      '/xdg/workshop/launch-workshop/abc123'
    )
  })
})

describe('userDataPath', () => {
  test('respects XDG_DATA_HOME', () => {
    process.env.XDG_DATA_HOME = '/x'

    expect(userDataPath()).toEqual('/x/workshop')
  })

  test('respects homedir', () => {
    expect(userDataPath()).toEqual('/homeless-shelter/.local/share/workshop')
  })
})
