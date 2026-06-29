import * as exec from '@actions/exec'
import { SnapState, checkSnapState, maybeInstallSnap } from './snap.js'

/**
 * Installs and initializes the LXD snap.
 * Does nothing if already installed.
 *
 * @returns Resolves when complete.
 */
export async function setupLxd(): Promise<void> {
  const state = await checkSnapState('lxd', '6/stable', '')
  await maybeInstallSnap('lxd', '6/stable', '', false, state)
  if (state === SnapState.NotFound || state === SnapState.Installed) {
    await exec.exec('sudo', ['lxd', 'waitready'])
  }
}

/**
 * Bypasses the default firewall rules on GitHub runners,
 * allowing workshops to access the internet.
 *
 * @param iface Bridge device name.
 * @returns Resolves when complete.
 */
export async function pierceFirewall(iface: string): Promise<void> {
  await pierce('iptables', iface)
  await pierce('ip6tables', iface)
}

async function pierce(tool: string, iface: string): Promise<void> {
  const code = await exec.exec('sudo', [tool, '-nL', 'DOCKER-USER'], {
    silent: true,
    ignoreReturnCode: true
  })
  if (code !== 0) {
    return
  }

  await exec.exec('sudo', [
    tool,
    '-I',
    'DOCKER-USER',
    '-i',
    iface,
    '-j',
    'ACCEPT'
  ])

  await exec.exec('sudo', [
    tool,
    '-I',
    'DOCKER-USER',
    '-o',
    iface,
    '-m',
    'conntrack',
    '--ctstate',
    'RELATED,ESTABLISHED',
    '-j',
    'ACCEPT'
  ])
}
