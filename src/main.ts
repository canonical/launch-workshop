import * as core from '@actions/core'
import { Project, workshopClient, workshopDispatcher } from './client.js'
import {
  errorMessage,
  launchWorkshop,
  restoreCache,
  saveCache,
  setupWorkshop
} from './workshop.js'
import assert from 'node:assert'
import { getInputs } from './inputs.js'

type Workshop = {
  project: Project
  workshop: string
}

/**
 * Launches a workshop, installing Workshop first if necessary.
 * Restores mount plug contents from cache (if possible).
 *
 * @returns Resolves when complete.
 */
export async function run(): Promise<void> {
  try {
    const { token, version, project: path, workshop: name, cache } = getInputs()

    await setupWorkshop(token, version)

    const { project, workshop } = await resolveWorkshop(path, name)
    saveWorkshop({ project, workshop })

    await restoreCache(project, workshop, cache)

    await launchWorkshop(project.path, workshop)
  } catch (error) {
    core.setFailed(errorMessage(error))
  }
}

async function resolveWorkshop(
  path: string,
  workshop: string
): Promise<Workshop> {
  const dispatcher = await workshopDispatcher()
  try {
    const client = workshopClient(dispatcher)

    const project = await client.project(path)
    if (!workshop) {
      workshop = await client.singleWorkshopName(project)
    }

    return { project, workshop }
  } finally {
    await dispatcher.close()
  }
}

function saveWorkshop({ project, workshop }: Workshop) {
  core.saveState('PROJECT_ID', project.id)
  core.saveState('PROJECT_PATH', project.path)
  core.saveState('WORKSHOP_NAME', workshop)
}

function restoreWorkshop(): Workshop {
  return {
    project: {
      id: restoreState('PROJECT_ID'),
      path: restoreState('PROJECT_PATH')
    },
    workshop: restoreState('WORKSHOP_NAME')
  }
}

function restoreState(name: string): string {
  const result = core.getState(name)
  assert(result, `${JSON.stringify(name)} state not found`)
  return result
}

/**
 * Caches mount plug contents after a successful workflow run.
 *
 * @returns Resolves when complete.
 */
export async function postRun(): Promise<void> {
  try {
    const { cache } = getInputs()

    const { project, workshop } = restoreWorkshop()
    core.debug(`Project ID: ${project.id}`)
    core.debug(`Project directory: ${project.path}`)
    core.debug(`Workshop: ${workshop}`)

    await saveCache(project, workshop, cache)
  } catch (error) {
    core.setFailed(errorMessage(error))
  }
}
