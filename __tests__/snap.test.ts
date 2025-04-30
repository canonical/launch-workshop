import * as os from '../__fixtures__/os.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('node:os', () => ({ default: os }))

const { snapArch } = await import('../src/snap.js')

test('translates known architecture', () => {
  os.machine.mockReturnValueOnce('x86_64')

  expect(snapArch()).toBe('amd64')
})

test('rejects unknown architectures', () => {
  expect(snapArch).toThrow('unknown architecture "testarch"')
})
