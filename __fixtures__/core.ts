import type * as core from '@actions/core'
import assert from 'node:assert'
import { jest } from '@jest/globals'

export const saveState = jest.fn<typeof core.saveState>((name, value) => {
  assert(typeof value === 'string', 'state only mocked for strings')
  state.set(name, value)
})

export const getState = jest.fn<typeof core.getState>((name) => {
  return state.get(name) || ''
})

export function clearState() {
  state.clear()
}

const state = new Map<string, string>()

export const debug = jest.fn<typeof core.debug>()

export const error = jest.fn<typeof core.error>()

export const setFailed = jest.fn<typeof core.setFailed>()
