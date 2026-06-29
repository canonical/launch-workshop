import * as env from '../__fixtures__/env.js'
import { getInputs } from '../src/inputs.js'

beforeEach(() => {
  env.replaceEnv({
    INPUT_CHANNEL: 'latest/edge',
    INPUT_PROJECT: '/project',
    INPUT_WORKSHOP: 'dev',
    INPUT_CACHE: 'sdk:plug \n \n  :system-plug\n\n'
  })
})
afterEach(env.restoreEnv)

test('uses environment', () => {
  expect(getInputs()).toEqual({
    channel: 'latest/edge',
    revision: '',
    project: '/project',
    workshop: 'dev',
    cache: [
      { sdk: 'sdk', name: 'plug' },
      { sdk: 'system', name: 'system-plug' }
    ]
  })
})

test('rejects channel with revision', () => {
  process.env.INPUT_REVISION = '42'

  expect(getInputs).toThrow('cannot specify both channel and revision')
})

test('allows no channel', () => {
  delete process.env.INPUT_CHANNEL

  expect(getInputs().channel).toBe('')
})

test('rejects invalid channel', () => {
  process.env.INPUT_CHANNEL = 'latest/stable/foo/bar'

  expect(getInputs).toThrow('has too many components')
})

test.each([
  ['edge', 'latest/edge'],
  ['6', '6/stable'],
  ['edge/123', 'latest/edge/123'],
  ['6/edge/123', '6/edge/123']
])('fills out channel', (short, full) => {
  process.env.INPUT_CHANNEL = short

  expect(getInputs().channel).toBe(full)
})

test('allows revision', () => {
  delete process.env.INPUT_CHANNEL
  process.env.INPUT_REVISION = '42'

  expect(getInputs().revision).toBe('42')
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
