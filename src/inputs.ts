import * as core from '@actions/core'
import path from 'node:path'

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
  /**
   * Project directory.
   */
  project: string
  /**
   * Workshop name.
   */
  workshop: string
}

/**
 * Parses action inputs from the environment.
 *
 * @returns The inputs.
 */
export function getInputs(): Inputs {
  const token = core.getInput('token', { required: true })
  const version = core.getInput('version', { required: true })

  let project = core.getInput('project')
  if (project) {
    project = path.resolve(project)
  } else {
    project = path.resolve()
  }
  core.debug(`Project directory: ${project}`)

  const workshop = core.getInput('workshop')

  return { token, version, project, workshop }
}
