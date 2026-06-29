import * as exec from '../__fixtures__/exec.js'
import * as snap from '../__fixtures__/snap.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('../src/snap.js', () => snap)

const { pierceFirewall, setupLxd } = await import('../src/lxd.js')

describe('setupLxd', () => {
  test.each([[snap.SnapState.NotFound], [snap.SnapState.Installed]])(
    'installs',
    async (state) => {
      snap.checkSnapState.mockResolvedValueOnce(state)

      await setupLxd()

      expect(snap.checkSnapState).toHaveBeenCalledWith('lxd', '6/stable', '')
      expect(snap.maybeInstallSnap).toHaveBeenCalledWith(
        'lxd',
        '6/stable',
        '',
        false,
        state
      )
      expect(exec.exec).toHaveBeenCalledWith('sudo', ['lxd', 'waitready'])
      expect(exec.exec).toHaveBeenCalledTimes(1)
    }
  )

  test.each([[snap.SnapState.SameChannel], [snap.SnapState.SameRevision]])(
    'avoids reinstalling',
    async (state) => {
      snap.checkSnapState.mockResolvedValueOnce(state)

      await setupLxd()

      expect(snap.checkSnapState).toHaveBeenCalledWith('lxd', '6/stable', '')
      expect(snap.maybeInstallSnap).toHaveBeenCalledWith(
        'lxd',
        '6/stable',
        '',
        false,
        state
      )
      expect(exec.exec).toHaveBeenCalledTimes(0)
    }
  )
})

describe('pierceFirewall', () => {
  test('configures rules', async () => {
    await pierceFirewall('lxdbr0')

    for (const i of Array(6).keys()) {
      const args = exec.exec.mock.calls[i]?.[1]
      const tool = i < 3 ? 'iptables' : 'ip6tables'
      expect(args?.[0]).toEqual(tool)
    }

    expect(exec.exec).toHaveBeenCalledTimes(6)
  })

  test('ignores missing rules', async () => {
    await exec.exec.withImplementation(
      async () => 1,
      async () => {
        await pierceFirewall('lxdbr0')

        const args = exec.exec.mock.calls[0]?.[1]
        expect(args?.[0]).toEqual('iptables')

        const args6 = exec.exec.mock.calls[1]?.[1]
        expect(args6?.[0]).toEqual('ip6tables')

        expect(exec.exec).toHaveBeenCalledTimes(2)
      }
    )
  })
})
