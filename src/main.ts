import * as core from '@actions/core'
import { getInputs } from './inputs.js'
import { isNativeError } from 'node:util/types'
import { setupWorkshop } from './workshop.js'

/**
 * Installs Workshop.
 *
 * @returns Resolves when complete.
 */
export async function run(): Promise<void> {
  try {
    const { token, version } = getInputs()
    await setupWorkshop(token, version)
  } catch (error) {
    core.setFailed(isNativeError(error) ? error.message : String(error))
  }
}
