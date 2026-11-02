import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'node:fs/promises'
import { SnapState, checkSnapState, maybeInstallSnap } from './snap.js'
import {
  hostCachePath,
  isSocket,
  mountHostSource,
  snapdSocketPath
} from './paths.js'
import { pierceFirewall, setupLxd } from './lxd.js'
import type { PlugRef } from './inputs.js'
import type { Project } from './workshopd.js'
import assert from 'node:assert'
import { createHash } from 'node:crypto'
import { isNativeError } from 'node:util/types'
import path from 'node:path'

/**
 * Downloads and installs the Workshop snap.
 * Does nothing if already installed.
 *
 * @param channel Channel to install from. Mutually exclusive with revision.
 * @param revision Specific revision to install. Mutually exclusive with channel.
 * @returns Resolves when complete.
 */
export async function setupWorkshop(
  channel: string,
  revision: string
): Promise<void> {
  assert(
    await isSocket(snapdSocketPath()),
    'Workshop only supports Ubuntu-based runners at this time'
  )

  await setupLxd()

  const state = await checkSnapState('workshop', channel, revision)
  await maybeInstallSnap('workshop', channel, revision, true, state)
  if (state === SnapState.NotFound) {
    await pierceFirewall('workshopbr0')
  }
}

/**
 * Caches mount plug contents.
 *
 * @param project Project ID and directory.
 * @param workshop Workshop name.
 * @param cacheKey Primary cache key.
 * @param plugs Mount plugs to cache.
 * @returns Resolves when complete.
 */
export async function saveCache(
  project: Project,
  workshop: string,
  cacheKey: string,
  plugs: PlugRef[]
): Promise<void> {
  const hashes = cacheHashes(project, workshop, cacheKey, plugs)
  const keyHashes = plugHashes(project, workshop, cacheKey ? 'v2' : 'v1', plugs)

  const existing = []
  for (const [i, plug] of plugs.entries()) {
    const source = mountHostSource(project.id, workshop, plug.sdk, plug.name)
    const exists = await mv(source, hostCachePath(hashes[i]))
    if (exists) {
      core.debug(`Caching ${plugToString(plug)} (${source})`)
      existing.push(hashes[i])
    }
  }

  const uploads = existing.map((hash) => {
    const paths = [hostCachePath(hash)]
    const index = hashes.indexOf(hash)
    const key = cacheEntryKey(keyHashes[index], cacheKey)
    return cache.saveCache(paths, key)
  })
  await Promise.all(uploads)
}

/**
 * Restores mount plug contents from cache (if possible).
 *
 * @param project Project ID and directory.
 * @param workshop Workshop name.
 * @param cacheKey Primary cache key.
 * @param restoreKeys Ordered fallback cache key prefixes.
 * @param plugs Mount plugs to restore.
 * @returns Plugs restored with an exact primary-key match.
 */
export async function restoreCache(
  project: Project,
  workshop: string,
  cacheKey: string,
  restoreKeys: string[],
  plugs: PlugRef[]
): Promise<PlugRef[]> {
  const hashes = cacheHashes(project, workshop, cacheKey, plugs)
  const keyHashes = plugHashes(project, workshop, cacheKey ? 'v2' : 'v1', plugs)

  const downloads = hashes.map((hash, index) => {
    const paths = [hostCachePath(hash)]
    const keyHash = keyHashes[index]
    const key = cacheEntryKey(keyHash, cacheKey)
    const prefixes = restoreKeys.map((restoreKey) =>
      cachePrefix(keyHash, restoreKey)
    )
    return cache.restoreCache(paths, key, prefixes)
  })
  const restored = await Promise.all(downloads)

  for (const [i, plug] of plugs.entries()) {
    const target = mountHostSource(project.id, workshop, plug.sdk, plug.name)
    const exists = await mv(hostCachePath(hashes[i]), target)
    if (exists) {
      core.debug(`Restored ${plugToString(plug)} (${target})`)
    }
  }

  return plugs.filter(
    (plug, index) =>
      restored[index] === cacheEntryKey(keyHashes[index], cacheKey)
  )
}

function plugHashes(
  project: Project,
  workshop: string,
  version: 'v1' | 'v2',
  plugs: PlugRef[],
  cacheKey = ''
): string[] {
  const hashes = plugs.map((plug) => {
    const metadata = [
      version,
      project.path,
      workshop,
      cacheKey,
      plug.sdk,
      plug.name
    ].filter(Boolean)
    return createHash('sha256').update(JSON.stringify(metadata)).digest('hex')
  })

  for (const [i, hash] of hashes.entries()) {
    const j = hashes.indexOf(hash)
    if (j < i) {
      throw new Error(
        `hash collision between ${plugToString(plugs[j])} and ${plugToString(plugs[i])}`
      )
    }
  }

  return hashes
}

function cacheHashes(
  project: Project,
  workshop: string,
  cacheKey: string,
  plugs: PlugRef[]
): string[] {
  return plugHashes(project, workshop, cacheKey ? 'v2' : 'v1', plugs, cacheKey)
}

function cacheEntryKey(hash: string, cacheKey: string): string {
  return cachePrefix(hash, cacheKey)
}

function cachePrefix(hash: string, cacheKey: string): string {
  return `workshop-${hash}-${cacheKey}`
}

function plugToString(plug: PlugRef): string {
  return `${plug.sdk}:${plug.name}`
}

async function mv(source: string, target: string): Promise<boolean> {
  try {
    await fs.access(source)
  } catch {
    return false
  }

  await fs.mkdir(path.dirname(target), { mode: 0o755, recursive: true })
  await fs.rename(source, target)
  return true
}

/**
 * Launches a workshop.
 *
 * @param project Project directory.
 * @param workshop Workshop name.
 * @returns Resolves when complete.
 */
export async function launchWorkshop(
  project: string,
  workshop: string
): Promise<void> {
  const args = ['--project', project, 'launch']
  if (workshop) {
    args.push('--', workshop)
  }

  try {
    await exec.exec('workshop', args)
  } catch (error) {
    try {
      await exec.exec('workshop', ['tasks'])
    } catch (taskError) {
      core.error(errorMessage(taskError))
    }
    throw error
  }
}

/**
 * Converts an error to a string.
 *
 * @param error Arbitrary error object.
 * @returns A message describing the error.
 */
export function errorMessage(error: unknown): string {
  if (isNativeError(error)) {
    return error.message
  }
  return String(error)
}
