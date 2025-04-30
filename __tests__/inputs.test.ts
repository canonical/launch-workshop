import * as env from '../__fixtures__/env.js'
import { getInputs } from '../src/inputs.js'

beforeEach(() => {
  env.replaceEnv({
    INPUT_TOKEN: 'abcxyz',
    INPUT_VERSION: '1.2.3'
  })
})
afterEach(env.restoreEnv)

test('uses environment', () => {
  expect(getInputs()).toEqual({ token: 'abcxyz', version: '1.2.3' })
})

test('requires token', () => {
  delete process.env.INPUT_TOKEN

  expect(getInputs).toThrow('Input required and not supplied: token')
})

test('requires version', () => {
  delete process.env.INPUT_VERSION

  expect(getInputs).toThrow('Input required and not supplied: version')
})
