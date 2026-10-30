import * as core from '@actions/core'
import { Project, workshopClient, workshopDispatcher } from './workshopd.js'
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

type PlugRef = ReturnType<typeof getInputs>['cache'][number]

/**
 * Launches a workshop, installing Workshop first if necessary.
 * Restores mount plug contents from cache (if possible).
 *
 * @returns Resolves when complete.
 */
export async function run(): Promise<void> {
  try {
    const {
      channel,
      revision,
      project: path,
      workshop: name,
      cacheKey,
      restoreKeys,
      cache,
      restore
    } = getInputs()

    await setupWorkshop(channel, revision)

    const { project, workshop } = await resolveWorkshop(path, name)
    saveWorkshop({ project, workshop })

    const cacheHits = await restoreCache(
      project,
      workshop,
      cacheKey,
      restoreKeys,
      [...cache, ...restore]
    )
    saveCacheMisses(cache, cacheHits)

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

function saveCacheMisses(cache: PlugRef[], cacheHits: PlugRef[]) {
  const hits = new Set(cacheHits.map(plugToString))
  const misses = cache.filter((plug) => !hits.has(plugToString(plug)))
  core.saveState('CACHE_MISSES', JSON.stringify(misses))
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

function restoreCacheMisses(): PlugRef[] {
  return JSON.parse(restoreState('CACHE_MISSES'))
}

function plugToString(plug: PlugRef): string {
  return `${plug.sdk}:${plug.name}`
}

/**
 * Caches mount plug contents after a successful workflow run.
 *
 * @returns Resolves when complete.
 */
export async function postRun(): Promise<void> {
  try {
    const { cacheKey, cache } = getInputs()

    const { project, workshop } = restoreWorkshop()
    const cacheMisses = restoreCacheMisses()
    core.debug(`Project ID: ${project.id}`)
    core.debug(`Project directory: ${project.path}`)
    core.debug(`Workshop: ${workshop}`)

    const cacheToSave = cache.filter((plug) =>
      cacheMisses.some(
        (missing) => plugToString(missing) === plugToString(plug)
      )
    )
    await saveCache(project, workshop, cacheKey, cacheToSave)
  } catch (error) {
    core.setFailed(errorMessage(error))
  }
}
