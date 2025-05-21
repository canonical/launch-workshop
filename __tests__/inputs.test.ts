import * as env from '../__fixtures__/env.js'
import { getInputs } from '../src/inputs.js'

beforeEach(() => {
  env.replaceEnv({
    INPUT_TOKEN: 'abcxyz',
    INPUT_VERSION: '1.2.3',
    INPUT_PROJECT: '/project',
    INPUT_WORKSHOP: 'dev',
    INPUT_CACHE: 'sdk:plug \n \n  :system-plug\n\n'
  })
})
afterEach(env.restoreEnv)

test('uses environment', () => {
  expect(getInputs()).toEqual({
    token: 'abcxyz',
    version: '1.2.3',
    project: '/project',
    workshop: 'dev',
    cache: [
      { sdk: 'sdk', name: 'plug' },
      { sdk: 'system', name: 'system-plug' }
    ]
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

test('allows no cache', () => {
  delete process.env.INPUT_CACHE

  expect(getInputs().cache).toEqual([])
})

test.each([
  [
    'workshop:sdk:plug',
    '"workshop:sdk:plug" is not a valid plug reference (use <sdk>:<plug>)'
  ],
  [
    '!@#:plug',
    '"!@#:plug" is not a valid plug reference: invalid SDK name "!@#"'
  ],
  [
    'sdk:!@#',
    '"sdk:!@#" is not a valid plug reference: invalid plug name "!@#"'
  ]
])('rejects invalid cache', (cache, message) => {
  process.env.INPUT_CACHE = cache

  expect(getInputs).toThrow(message)
})
