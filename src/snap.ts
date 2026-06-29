import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { SnapNotFoundError, snapdClient, snapdDispatcher } from './snapd.js'
import assert from 'node:assert'
import os from 'node:os'

/**
 * Detects the current CPU architecture.
 *
 * @returns Architecture name (according to Debian).
 */
export function snapArch(): string {
  const machine = os.machine()
  const arch = KERNEL_ARCH_MAPPING.get(machine)
  assert(arch, `unknown architecture ${JSON.stringify(machine)}`)
  return arch
}

// Based on snapd/arch/arch.go.
const KERNEL_ARCH_MAPPING = new Map<string, string>([
  ['aarch64', 'arm64'],
  ['armv7l', 'armhf'],
  ['armv8l', 'arm64'],
  ['i686', 'i386'],
  ['ppc', 'powerpc'],
  ['ppc64', 'ppc64'],
  ['ppc64le', 'ppc64el'],
  ['riscv64', 'riscv64'],
  ['s390x', 's390x'],
  ['x86_64', 'amd64']
])

/**
 * Installation state of a snap.
 */
export const enum SnapState {
  /**
   * Snap is not installed.
   */
  NotFound,
  /**
   * Snap is installed, but not on the expected channel or revision (if any).
   */
  Installed,
  /**
   * Snap is already tracking the expected channel.
   */
  SameChannel,
  /**
   * Snap is already at the expected revision.
   */
  SameRevision
}

/**
 * Queries the installation state of a snap.
 *
 * @param name Snap name.
 * @param channel Expected channel.
 * @param revision Expected revision.
 * @returns The current installation state.
 */
export async function checkSnapState(
  name: string,
  channel: string,
  revision: string
): Promise<SnapState> {
  const dispatcher = snapdDispatcher()
  try {
    const client = snapdClient(dispatcher)
    try {
      const snap = await client.info(name)
      if (channel && snap['tracking-channel'] === channel) {
        return SnapState.SameChannel
      }
      if (revision && snap.revision === revision) {
        return SnapState.SameRevision
      }
      return SnapState.Installed
    } catch (error) {
      if (error instanceof SnapNotFoundError) {
        return SnapState.NotFound
      }
      throw error
    }
  } finally {
    await dispatcher.close()
  }
}

/**
 * Installs or refreshes a snap to match the expected channel or revision.
 *
 * @param name Snap name.
 * @param channel Channel used to install the snap.
 * @param revision Specific revision to install.
 * @param classic Whether to use classic confinement.
 * @param state Current installation state.
 * @returns Resolves when complete.
 */
export async function maybeInstallSnap(
  name: string,
  channel: string,
  revision: string,
  classic: boolean,
  state: SnapState
): Promise<void> {
  if (
    state === SnapState.SameChannel ||
    state === SnapState.SameRevision ||
    (state === SnapState.Installed && !channel && !revision)
  ) {
    core.debug(`Snap ${JSON.stringify(name)} already installed`)
    return
  }

  const args = ['snap']
  if (state === SnapState.NotFound) {
    args.push('install')
    if (classic) {
      args.push('--classic')
    }
  } else {
    args.push('refresh')
  }

  if (channel) {
    args.push(`--channel=${channel}`)
  }
  if (revision) {
    args.push(`--revision=${revision}`)
  }

  args.push(name)

  await exec.exec('sudo', args)
  await exec.exec('sudo', ['snap', 'refresh', '--hold=24h', name])
}
