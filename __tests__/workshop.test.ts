import * as cache from '../__fixtures__/cache.js'
import * as core from '../__fixtures__/core.js'
import * as exec from '../__fixtures__/exec.js'
import * as fs from 'node:fs/promises'
import * as lxd from '../__fixtures__/lxd.js'
import * as paths from '../__fixtures__/paths.js'
import * as snap from '../__fixtures__/snap.js'
import { jest } from '@jest/globals'
import path from 'node:path'

jest.unstable_mockModule('@actions/cache', () => cache)
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('../src/lxd.js', () => lxd)
jest.unstable_mockModule('../src/paths.js', () => paths)
jest.unstable_mockModule('../src/snap.js', () => snap)

const { launchWorkshop, restoreCache, saveCache, setupWorkshop } =
  await import('../src/workshop.js')

describe('setupWorkshop', () => {
  beforeAll(async () => {
    await paths.tmpdir.create()
  })
  afterAll(async () => {
    await paths.tmpdir.remove()
  })

  test('installs from channel', async () => {
    await setupWorkshop('latest/edge', '')

    expect(lxd.setupLxd).toHaveBeenCalled()
    expect(snap.checkSnapState).toHaveBeenCalledWith(
      'workshop',
      'latest/edge',
      ''
    )
    expect(snap.maybeInstallSnap).toHaveBeenCalledWith(
      'workshop',
      'latest/edge',
      '',
      true,
      snap.SnapState.NotFound
    )
    expect(lxd.pierceFirewall).toHaveBeenCalledWith('workshopbr0')
  })

  test('refreshes to revision', async () => {
    snap.checkSnapState.mockResolvedValueOnce(snap.SnapState.Installed)

    await setupWorkshop('', '42')

    expect(lxd.setupLxd).toHaveBeenCalled()
    expect(snap.checkSnapState).toHaveBeenCalledWith('workshop', '', '42')
    expect(snap.maybeInstallSnap).toHaveBeenCalledWith(
      'workshop',
      '',
      '42',
      true,
      snap.SnapState.Installed
    )
    expect(lxd.pierceFirewall).toHaveBeenCalledTimes(0)
  })

  test('requires snap', async () => {
    paths.isSocket.mockResolvedValueOnce(false)

    const promise = setupWorkshop('', '0.1.0')
    await expect(promise).rejects.toThrow(
      'Workshop only supports Ubuntu-based runners at this time'
    )

    expect(lxd.setupLxd).toHaveBeenCalledTimes(0)
    expect(snap.checkSnapState).toHaveBeenCalledTimes(0)
    expect(snap.maybeInstallSnap).toHaveBeenCalledTimes(0)
    expect(lxd.pierceFirewall).toHaveBeenCalledTimes(0)
  })
})

describe('cache', () => {
  beforeEach(async () => {
    await paths.tmpdir.create()
  })
  afterEach(async () => {
    cache.clearCache()
    await paths.tmpdir.remove()
  })

  test('allows no source', async () => {
    await saveCache({ id: '42', path: '' }, 'dev', [
      { sdk: 'go', name: 'mod-cache' }
    ])

    await expect(fs.access(paths.userDataPath())).rejects.toThrow(
      'no such file or directory'
    )
  })

  test('allows no cache', async () => {
    await restoreCache({ id: '42', path: '' }, 'dev', [
      { sdk: 'go', name: 'mod-cache' }
    ])

    await expect(fs.access(paths.userDataPath())).rejects.toThrow(
      'no such file or directory'
    )
  })

  test('preserves single mount', async () => {
    const source = paths.mountHostSource('42', 'dev', 'go', 'mod-cache')
    await fs.mkdir(source, { recursive: true })
    await fs.writeFile(path.join(source, 'content'), 'go modules')

    await saveCache({ id: '42', path: '' }, 'dev', [
      { sdk: 'go', name: 'mod-cache' }
    ])

    await fs.rm(paths.userDataPath(), { recursive: true })

    await restoreCache({ id: '42', path: '' }, 'dev', [
      { sdk: 'go', name: 'mod-cache' }
    ])

    const content = await fs.readFile(path.join(source, 'content'), {
      encoding: 'utf8'
    })

    expect(content).toEqual('go modules')
  })

  test('preserves multiple mounts', async () => {
    const sources = [
      paths.mountHostSource('42', 'dev', 'go', 'mod-cache'),
      paths.mountHostSource('42', 'dev', 'python', 'pip-cache')
    ]

    for (const source of sources) {
      await fs.mkdir(source, { recursive: true })
      await fs.writeFile(path.join(source, 'content'), source)
    }

    await saveCache({ id: '42', path: '' }, 'dev', [
      { sdk: 'go', name: 'mod-cache' },
      { sdk: 'python', name: 'pip-cache' }
    ])

    await fs.rm(paths.userDataPath(), { recursive: true })

    await restoreCache({ id: '42', path: '' }, 'dev', [
      { sdk: 'go', name: 'mod-cache' },
      { sdk: 'python', name: 'pip-cache' }
    ])

    for (const source of sources) {
      const content = await fs.readFile(path.join(source, 'content'), {
        encoding: 'utf8'
      })

      expect(content).toEqual(source)
    }
  })

  test('avoids hash collisions', async () => {
    const promise = saveCache({ id: '42', path: '' }, 'dev', [
      { sdk: 'go', name: 'mod-cache' },
      { sdk: 'go', name: 'mod-cache' }
    ])

    await expect(promise).rejects.toThrow(
      'hash collision between go:mod-cache and go:mod-cache'
    )
  })
})

describe('launchWorkshop', () => {
  test('launch named workshop', async () => {
    await launchWorkshop('/project', 'dev')

    const args = exec.exec.mock.calls[0]?.[1]
    expect(args).toEqual(['--project', '/project', 'launch', '--', 'dev'])

    expect(exec.exec).toHaveBeenCalledTimes(1)
  })

  test('launch single workshop', async () => {
    await launchWorkshop('/project', '')

    const args = exec.exec.mock.calls[0]?.[1]
    expect(args).toEqual(['--project', '/project', 'launch'])

    expect(exec.exec).toHaveBeenCalledTimes(1)
  })

  test('shows tasks on failed launch', async () => {
    await exec.exec.withImplementation(
      async (command, args) => {
        if (args?.[0] === 'tasks') {
          return 0
        }
        throw new Error('cannot launch')
      },
      async () => {
        const promise = launchWorkshop('/project', 'dev')
        await expect(promise).rejects.toThrow('cannot launch')

        const launch = exec.exec.mock.calls[0]?.[1]
        expect(launch).toContain('launch')

        const tasks = exec.exec.mock.calls[1]?.[1]
        expect(tasks).toEqual(['tasks'])

        expect(exec.exec).toHaveBeenCalledTimes(2)
      }
    )
  })

  test('shows tasks error', async () => {
    await exec.exec.withImplementation(
      async (command, args) => {
        if (args?.[0] === 'tasks') {
          throw new Error('cannot list tasks')
        }
        throw new Error('cannot launch')
      },
      async () => {
        const promise = launchWorkshop('/project', 'dev')
        await expect(promise).rejects.toThrow('cannot launch')

        const launch = exec.exec.mock.calls[0]?.[1]
        expect(launch).toContain('launch')

        const tasks = exec.exec.mock.calls[1]?.[1]
        expect(tasks).toEqual(['tasks'])

        expect(core.error).toHaveBeenCalledWith('cannot list tasks')

        expect(exec.exec).toHaveBeenCalledTimes(2)
      }
    )
  })
})
