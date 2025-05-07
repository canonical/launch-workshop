import type * as inputs from '../src/inputs.js'
import { jest } from '@jest/globals'

export const getInputs = jest.fn<typeof inputs.getInputs>().mockReturnValue({
  token: 'abcxyz',
  version: '1.2.3',
  project: '/project',
  workshop: 'dev'
})
