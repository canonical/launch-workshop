import * as env from '../__fixtures__/env.js'
import { getInputs } from '../src/inputs.js'

beforeEach(() => {
  env.replaceEnv({
    INPUT_TOKEN: 'abcxyz',
    INPUT_VERSION: '1.2.3',
    INPUT_PROJECT: '/project',
    INPUT_WORKSHOP: 'dev'
  })
})
afterEach(env.restoreEnv)

test('uses environment', () => {
  expect(getInputs()).toEqual({
    token: 'abcxyz',
    version: '1.2.3',
    project: '/project',
    workshop: 'dev'
  })
})

test('requires token', () => {
  delete process.env.INPUT_TOKEN

  expect(getInputs).toThrow('Input required and not supplied: token')
})

test('requires version', () => {
  delete process.env.INPUT_VERSION

  expect(getInputs).toThrow('Input required and not supplied: version')
})

test('allows no project', () => {
  delete process.env.INPUT_PROJECT

  expect(getInputs().project).toBe(process.cwd())
})

test('allows no workshop', () => {
  delete process.env.INPUT_WORKSHOP

  expect(getInputs().workshop).toBe('')
})
