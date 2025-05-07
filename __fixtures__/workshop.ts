import type * as workshop from '../src/workshop.js'
export { errorMessage } from '../src/workshop.js'
import { jest } from '@jest/globals'

export const setupWorkshop = jest
  .fn<typeof workshop.setupWorkshop>()
  .mockResolvedValue(undefined)

export const launchWorkshop = jest
  .fn<typeof workshop.launchWorkshop>()
  .mockResolvedValue(undefined)
