import type * as snap from '../src/snap.js'
import { SnapState } from '../src/snap.js'
import { jest } from '@jest/globals'

export { SnapState }

export const checkSnapState = jest
  .fn<typeof snap.checkSnapState>()
  .mockResolvedValue(SnapState.NotFound)

export const maybeInstallSnap = jest
  .fn<typeof snap.maybeInstallSnap>()
  .mockResolvedValue(undefined)
