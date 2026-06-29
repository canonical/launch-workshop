import * as core from '../__fixtures__/core.js'
import * as exec from '../__fixtures__/exec.js'
import * as os from '../__fixtures__/os.js'
import * as snapd from '../__fixtures__/snapd.js'
import { closeAgent, newAgent } from '../__fixtures__/agent.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('node:os', () => ({ default: os }))
jest.unstable_mockModule('../src/snapd.js', () => snapd)

const { SnapState, checkSnapState, maybeInstallSnap, snapArch } =
  await import('../src/snap.js')

test('translates known architecture', () => {
  os.machine.mockReturnValueOnce('x86_64')

  expect(snapArch()).toBe('amd64')
})

test('rejects unknown architectures', () => {
  expect(snapArch).toThrow('unknown architecture "testarch"')
})

describe('checkSnapState', () => {
  beforeAll(newAgent)
  afterAll(closeAgent)

  test('checks channel', async () => {
    snapd.info.mockResolvedValueOnce({
      revision: '42',
      'tracking-channel': '6/edge'
    })

    const state = await checkSnapState('lxd', '6/edge', '')
    expect(state).toBe(SnapState.SameChannel)
  })

  test('checks revision', async () => {
    snapd.info.mockResolvedValueOnce({ revision: '42' })

    const state = await checkSnapState('lxd', '', '42')
    expect(state).toBe(SnapState.SameRevision)
  })

  test('checks installed', async () => {
    snapd.info.mockResolvedValueOnce({ revision: '42' })

    const state = await checkSnapState('lxd', 'latest/edge', '')
    expect(state).toBe(SnapState.Installed)
  })

  test('checks snap-not-found error', async () => {
    snapd.info.mockRejectedValueOnce(
      new snapd.SnapNotFoundError('lxd', 'snap not installed')
    )

    const state = await checkSnapState('lxd', '', '')
    expect(state).toBe(SnapState.NotFound)
  })

  test('ignores other errors', async () => {
    snapd.info.mockRejectedValueOnce(new Error('cannot read snap'))

    await expect(checkSnapState('lxd', '', '')).rejects.toThrow(
      'cannot read snap'
    )
  })
})

describe('maybeInstallSnap', () => {
  test('avoids refreshing from current channel', async () => {
    await maybeInstallSnap('lxd', '6/stable', '', false, SnapState.SameChannel)

    expect(exec.exec).toHaveBeenCalledTimes(0)
  })

  test('avoids refreshing current revision', async () => {
    await maybeInstallSnap('lxd', '', '42', false, SnapState.SameRevision)

    expect(exec.exec).toHaveBeenCalledTimes(0)
  })

  test('avoids refreshing without channel or revision', async () => {
    await maybeInstallSnap('lxd', '', '', false, SnapState.Installed)

    expect(exec.exec).toHaveBeenCalledTimes(0)
  })

  test('installs from scratch', async () => {
    await maybeInstallSnap('lxd', '', '', false, SnapState.NotFound)

    expect(exec.exec).toHaveBeenCalledWith('sudo', ['snap', 'install', 'lxd'])
    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'refresh',
      '--hold=24h',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledTimes(2)
  })

  test('installs from channel', async () => {
    await maybeInstallSnap('lxd', '6/edge', '', true, SnapState.NotFound)

    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'install',
      '--classic',
      '--channel=6/edge',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'refresh',
      '--hold=24h',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledTimes(2)
  })

  test('installs specific revision', async () => {
    await maybeInstallSnap('lxd', '', '42', false, SnapState.NotFound)

    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'install',
      '--revision=42',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'refresh',
      '--hold=24h',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledTimes(2)
  })

  test('refreshes from channel', async () => {
    await maybeInstallSnap('lxd', '6/edge', '', false, SnapState.Installed)

    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'refresh',
      '--channel=6/edge',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'refresh',
      '--hold=24h',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledTimes(2)
  })

  test('refreshes to revision', async () => {
    await maybeInstallSnap('lxd', '', '42', false, SnapState.Installed)

    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'refresh',
      '--revision=42',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledWith('sudo', [
      'snap',
      'refresh',
      '--hold=24h',
      'lxd'
    ])
    expect(exec.exec).toHaveBeenCalledTimes(2)
  })
})
