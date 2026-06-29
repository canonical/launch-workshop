import type * as inputs from '../src/inputs.js'
import { jest } from '@jest/globals'

export const getInputs = jest.fn<typeof inputs.getInputs>().mockReturnValue({
  channel: 'latest/stable',
  revision: '',
  project: '/project',
  workshop: 'dev',
  cache: [{ sdk: 'go', name: 'mod-cache' }]
})
