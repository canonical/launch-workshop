import type * as core from '@actions/core'
import { jest } from '@jest/globals'

export const debug = jest.fn<typeof core.debug>()

export const setFailed = jest.fn<typeof core.setFailed>()
