import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'node:fs/promises'
import { hostCachePath, mountHostSource } from './paths.js'
import { pierceFirewall, setupLxd } from './lxd.js'
import type { PlugRef } from './inputs.js'
import type { Project } from './client.js'
import assert from 'node:assert'
import { context } from '@actions/github'
import { createHash } from 'node:crypto'
import { downloadRelease } from './release.js'
import { isNativeError } from 'node:util/types'
import path from 'node:path'
import { satisfies } from 'semver'
import { snapArch } from './snap.js'

/**
 * Downloads and installs the Workshop snap.
 * Does nothing if already installed.
 *
 * @param token Access token for canonical/workshop.
 * @param version A version, range of versions or "latest."
 * @returns Resolves when complete.
 */
export async function setupWorkshop(
  token: string,
  version: string
): Promise<void> {
  const installed = await workshopVersion()
  if (
    installed !== '' &&
    (version == 'latest' || satisfies(installed, version))
  ) {
    core.debug(`Workshop ${installed} already installed`)
    return
  }

  assert(
    await isSnapInstalled(),
    'Workshop only supports Ubuntu-based runners at this time'
  )

  const arch = snapArch()

  const download = downloadRelease(
    token,
    {
      owner: 'canonical',
      repo: 'workshop',
      version
    },
    (filename) => filename.endsWith(`_${arch}.snap`)
  )
  const [assets] = await Promise.all([download, setupLxd()])

  for await (const asset of await fs.opendir(assets)) {
    await exec.exec('sudo', [
      'snap',
      'install',
      '--classic',
      '--dangerous',
      path.join(assets, asset.name)
    ])
  }

  await pierceFirewall('workshopbr0')
}

async function isSnapInstalled(): Promise<boolean> {
  // Use env so exec doesn't throw if snap isn't installed.
  const code = await exec.exec('env', ['snap', '--version'], {
    silent: true,
    ignoreReturnCode: true
  })
  return code == 0
}

async function workshopVersion(): Promise<string> {
  // Use env so exec doesn't throw if workshop isn't installed.
  const { exitCode, stdout } = await exec.getExecOutput(
    'env',
    ['workshop', '--version'],
    {
      silent: true,
      ignoreReturnCode: true
    }
  )
  if (exitCode == 0) {
    return stdout.trim()
  }
  return ''
}

/**
 * Caches mount plug contents.
 *
 * @param project Project ID and directory.
 * @param workshop Workshop name.
 * @param plugs Mount plugs to cache.
 * @returns Resolves when complete.
 */
export async function saveCache(
  project: Project,
  workshop: string,
  plugs: PlugRef[]
): Promise<void> {
  const hashes = plugHashes(project, workshop, plugs)

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
    const key = `workshop-${hash}-${context.runId}-${context.runAttempt}`
    return cache.saveCache(paths, key)
  })
  await Promise.all(uploads)
}

/**
 * Restores mount plug contents from cache (if possible).
 *
 * @param project Project ID and directory.
 * @param workshop Workshop name.
 * @param plugs Mount plugs to restore.
 * @returns Resolves when complete.
 */
export async function restoreCache(
  project: Project,
  workshop: string,
  plugs: PlugRef[]
): Promise<void> {
  const hashes = plugHashes(project, workshop, plugs)

  const downloads = hashes.map((hash) => {
    const paths = [hostCachePath(hash)]
    const key = `workshop-${hash}-${context.runId}-${context.runAttempt}`
    const prefixes = [`workshop-${hash}-`]
    return cache.restoreCache(paths, key, prefixes)
  })
  await Promise.all(downloads)

  for (const [i, plug] of plugs.entries()) {
    const target = mountHostSource(project.id, workshop, plug.sdk, plug.name)
    const exists = await mv(hostCachePath(hashes[i]), target)
    if (exists) {
      core.debug(`Restored ${plugToString(plug)} (${target})`)
    }
  }
}

function plugHashes(
  project: Project,
  workshop: string,
  plugs: PlugRef[]
): string[] {
  const hashes = plugs.map((plug) => {
    const metadata = ['v1', project.path, workshop, plug.sdk, plug.name]
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
 * @param workshop Name of workshop to launch.
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
