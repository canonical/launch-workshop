import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'node:fs/promises'
import * as tc from '@actions/tool-cache'
import { pierceFirewall, setupLxd } from './lxd.js'
import assert from 'node:assert'
import { downloadRelease } from './release.js'
import path from 'node:path'
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
    (version == 'latest' || tc.evaluateVersions([installed], version) !== '')
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
