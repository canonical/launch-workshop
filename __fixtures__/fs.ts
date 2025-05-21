import type * as fs from 'node:fs/promises'
export { constants } from 'node:fs/promises'
import { jest } from '@jest/globals'

export const access = jest.fn<typeof fs.access>().mockResolvedValue(undefined)
