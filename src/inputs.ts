import * as core from '@actions/core'

/**
 * Inputs required by the action.
 */
export type Inputs = {
  /**
   * Access token for canonical/workshop.
   */
  token: string
  /**
   * A version, range of versions or "latest."
   * Determines which release of Workshop to install.
   */
  version: string
}

/**
 * Parses action inputs from the environment.
 *
 * @returns The inputs.
 */
export function getInputs(): Inputs {
  return {
    token: core.getInput('token', { required: true }),
    version: core.getInput('version', { required: true })
  }
}
