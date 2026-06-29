import type * as fs from 'node:fs/promises'
import { Stats } from 'node:fs'
export { constants } from 'node:fs/promises'
import { jest } from '@jest/globals'

export const access = jest.fn<typeof fs.access>().mockResolvedValue(undefined)

export const isSocket = jest.fn<Stats['isSocket']>().mockReturnValue(false)

export const stat = jest
  .fn<typeof fs.stat>()
  .mockResolvedValue(
    Object.assign(Object.create(Stats.prototype), { isSocket })
  )
