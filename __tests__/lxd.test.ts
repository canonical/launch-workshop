import * as exec from '../__fixtures__/exec.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/exec', () => exec)

const { pierceFirewall, setupLxd } = await import('../src/lxd.js')

describe('setupLxd', () => {
  test('installs', async () => {
    await exec.exec.withImplementation(
      async (command, args) => {
        if (command === 'env' && args?.[0] === 'snap') {
          return 1
        }
        return 0
      },
      async () => {
        await setupLxd()

        const snapList = exec.exec.mock.calls[0]?.[1]
        expect(snapList).toEqual(['snap', 'list', 'lxd'])

        const snapInstall = exec.exec.mock.calls[1]?.[1]
        expect(snapInstall?.slice(0, 2)).toEqual(['snap', 'install'])

        const lxdWaitready = exec.exec.mock.calls[2]?.[1]
        expect(lxdWaitready).toEqual(['lxd', 'waitready'])

        expect(exec.exec).toHaveBeenCalledTimes(3)
      }
    )
  })

  test('avoids reinstalling', async () => {
    await setupLxd()

    const snapList = exec.exec.mock.calls[0]?.[1]
    expect(snapList).toEqual(['snap', 'list', 'lxd'])

    expect(exec.exec).toHaveBeenCalledTimes(1)
  })
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
