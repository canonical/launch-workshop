import type * as snap from '../src/snap.js'
import { jest } from '@jest/globals'

export const snapArch = jest
  .fn<typeof snap.snapArch>()
  .mockReturnValue('testarch')
