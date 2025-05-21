import * as core from '@actions/core'
import assert from 'node:assert'
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
  /**
   * Mount plugs to cache across workflow runs.
   */
  cache: PlugRef[]
}

/**
 * Reference to a mount plug.
 */
export type PlugRef = {
  /**
   * Plug SDK.
   */
  sdk: string
  /**
   * Plug name.
   */
  name: string
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

  const cache = core
    .getInput('cache')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parsePlugRef)

  return { token, version, project, workshop, cache }
}

function parsePlugRef(ref: string): PlugRef {
  const parts = ref.split(':')
  if (parts.length != 2) {
    throw new Error(
      `${JSON.stringify(ref)} is not a valid plug reference (use <sdk>:<plug>)`
    )
  }

  if (parts[0] === '') {
    parts[0] = 'system'
  }

  const [sdk, name] = parts
  assert(
    SDK_NAME.test(sdk),
    `${JSON.stringify(ref)} is not a valid plug reference: invalid SDK name ${JSON.stringify(sdk)}`
  )
  assert(
    PLUG_NAME.test(name),
    `${JSON.stringify(ref)} is not a valid plug reference: invalid plug name ${JSON.stringify(name)}`
  )

  return { sdk, name }
}

const SDK_NAME = /^(?:[a-z0-9]-?)*[a-z](?:-?[a-z0-9])*$/
const PLUG_NAME = /^[a-z](?:-?[a-z0-9])*$/
