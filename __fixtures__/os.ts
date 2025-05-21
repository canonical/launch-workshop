import { jest } from '@jest/globals'
import type os from 'node:os'

export const homedir = jest
  .fn<typeof os.homedir>()
  .mockReturnValue('/homeless-shelter')

export const machine = jest.fn<typeof os.machine>().mockReturnValue('testarch')
