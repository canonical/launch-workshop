import * as exec from '@actions/exec'

/**
 * Installs and initializes the LXD snap.
 * Does nothing if already installed.
 *
 * @returns Resolves when complete.
 */
export async function setupLxd(): Promise<void> {
  if (await isLxdInstalled()) {
    return
  }

  await exec.exec('sudo', ['snap', 'install', '--channel=6/stable', 'lxd'])
  await exec.exec('sudo', ['lxd', 'waitready'])
}

async function isLxdInstalled(): Promise<boolean> {
  const code = await exec.exec('env', ['snap', 'list', 'lxd'], {
    silent: true,
    ignoreReturnCode: true
  })
  return code == 0
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
