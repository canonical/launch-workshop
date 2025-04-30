import type * as workshop from '../src/workshop.js'
import { jest } from '@jest/globals'

export const setupWorkshop = jest
  .fn<typeof workshop.setupWorkshop>()
  .mockResolvedValue(undefined)
