import * as core from '@actions/core'
import assert from 'node:assert'
import path from 'node:path'

/**
 * Inputs required by the action.
 */
export type Inputs = {
  /**
   * Channel used to install Workshop snap.
   */
  channel: string
  /**
   * Specific revision of Workshop snap to install.
   */
  revision: string
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
  const channel = fullChannel(core.getInput('channel'))
  const revision = core.getInput('revision')
  if (channel && revision) {
    throw new Error('cannot specify both channel and revision')
  }

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

  return { channel, revision, project, workshop, cache }
}

function fullChannel(channel: string): string {
  if (!channel) {
    return ''
  }

  const parts = channel.split('/')
  if (parts.length > 3) {
    throw new Error(
      `channel ${JSON.stringify(channel)} has too many components`
    )
  }

  if (['stable', 'candidate', 'beta', 'edge'].includes(parts[0])) {
    parts.unshift('latest')
  } else if (parts.length <= 1) {
    parts.push('stable')
  }

  return parts.join('/')
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
