import * as core from '@actions/core'
import { errorMessage, launchWorkshop, setupWorkshop } from './workshop.js'
import { getInputs } from './inputs.js'

/**
 * Launches a workshop, installing Workshop first if necessary.
 *
 * @returns Resolves when complete.
 */
export async function run(): Promise<void> {
  try {
    const { token, version, project, workshop } = getInputs()
    await setupWorkshop(token, version)
    await launchWorkshop(project, workshop)
  } catch (error) {
    core.setFailed(errorMessage(error))
  }
}
