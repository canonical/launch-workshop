import type * as snapd from '../src/snapd.js'
export type { Snap, SnapdClient } from '../src/snapd.js'
import { SnapNotFoundError } from '../src/snapd.js'
import { jest } from '@jest/globals'
import { mockAgent } from './agent.js'

export { SnapNotFoundError }

export const info = jest.fn<snapd.SnapdClient['info']>(async (name) => {
  throw new SnapNotFoundError(name, 'snap not installed')
})

export const snapdClient = jest
  .fn<typeof snapd.snapdClient>()
  .mockReturnValue({ info })

export const snapdDispatcher = jest.fn<typeof snapd.snapdDispatcher>(() =>
  mockAgent().get('http://localhost')
)
