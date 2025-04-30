import { jest } from '@jest/globals'
import type os from 'node:os'

export const machine = jest.fn<typeof os.machine>().mockReturnValue('testarch')
