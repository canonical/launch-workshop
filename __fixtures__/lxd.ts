import type * as lxd from '../src/lxd.js'
import { jest } from '@jest/globals'

export const pierceFirewall = jest
  .fn<typeof lxd.pierceFirewall>()
  .mockResolvedValue(undefined)

export const setupLxd = jest
  .fn<typeof lxd.setupLxd>()
  .mockResolvedValue(undefined)
