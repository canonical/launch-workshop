import * as fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

/**
 * Determines the Workshop API socket.
 *
 * @returns A unix domain socket path.
 */
export async function socketPath(): Promise<string> {
  const socket = process.env.WORKSHOP_SOCKET
  if (socket) {
    return socket
  }

  const workshopdPath = process.env.WORKSHOP
  if (workshopdPath) {
    return path.join(workshopdPath, 'workshop.socket')
  }

  const snapPath = '/var/snap/workshop/common/workshop/workshop.socket'
  try {
    await fs.access(snapPath, fs.constants.W_OK)
    return snapPath
  } catch {
    return '/var/lib/workshop/workshop.socket'
  }
}

/**
 * Determines the host directory for the given mount plug.
 *
 * @param projectId Project ID.
 * @param workshop Workshop name.
 * @param sdk Plug SDK.
 * @param plug Plug name.
 * @returns A directory.
 */
export function mountHostSource(
  projectId: string,
  workshop: string,
  sdk: string,
  plug: string
): string {
  return path.join(
    userDataPath(),
    'id',
    projectId,
    workshop,
    'mount',
    sdk,
    plug
  )
}

/**
 * Determines a directory suitable for caching.
 * It should not depend on the project ID, which can change between runs.
 *
 * @param hash Cache identifier.
 * @returns A directory.
 */
export function hostCachePath(hash: string): string {
  return path.join(userDataPath(), 'launch-workshop', hash)
}

/**
 * Determines the workshop user data directory.
 *
 * @returns A directory.
 */
export function userDataPath(): string {
  return path.join(xdgDataHome(), 'workshop')
}

function xdgDataHome(): string {
  const dataHome = process.env.XDG_DATA_HOME
  if (dataHome) {
    return dataHome
  }

  return path.join(os.homedir(), '.local', 'share')
}
