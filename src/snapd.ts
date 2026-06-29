import * as core from '@actions/core'
import { Client, Dispatcher } from 'undici'
import assert from 'node:assert'
import { snapdSocketPath } from './paths.js'

/**
 * Client for the snapd API.
 */
export type SnapdClient = {
  /**
   * Retrieves details for a specific snap installed on the system.
   *
   * @param name Snap name.
   * @returns Snap details.
   */
  info(name: string): Promise<Snap>
}

/**
 * Details of an installed snap.
 */
export type Snap = {
  /**
   * Channel used to install the snap.
   */
  'tracking-channel'?: string
  /**
   * Current revision.
   */
  revision: string
}

/**
 * Error thrown when a snap is not installed.
 */
export class SnapNotFoundError extends Error {
  constructor(
    readonly snap: string,
    message: string
  ) {
    super(message)
  }
}

/**
 * Creates a snapd client from a generic HTTP client.
 *
 * @param dispatcher An HTTP client.
 * @returns A snapd client.
 */
export function snapdClient(dispatcher: Dispatcher): SnapdClient {
  return new HttpClient(dispatcher)
}

/**
 * Creates a generic HTTP client which connects to the snapd API socket.
 *
 * @returns An HTTP client.
 */
export function snapdDispatcher(): Dispatcher {
  return new Client('http://localhost', {
    socketPath: snapdSocketPath()
  })
}

class HttpClient implements SnapdClient {
  constructor(protected readonly dispatcher: Dispatcher) {}

  async info(name: string): Promise<Snap> {
    core.debug('GET /v2/snaps/:name')
    const response = await this.dispatcher.request({
      method: 'GET',
      path: `/v2/snaps/${encodeURIComponent(name)}`
    })

    const result = syncResult(await response.body.json())
    assert(result !== undefined, 'expected snap response')
    return result as Snap
  }
}

function syncResult(body: unknown): unknown {
  core.debug(`Response from snapd: ${JSON.stringify(body, null, 2)}`)
  const { type, result = undefined, status } = body as ResponseBody
  if (type === 'error') {
    handleError(result, status)
  }
  assert(type === 'sync', `expected sync response, got ${JSON.stringify(type)}`)
  return result
}

function handleError(result: unknown, status: string) {
  if (result !== undefined) {
    const {
      message,
      kind = undefined,
      value = undefined
    } = result as ErrorResult

    if (kind === 'snap-not-found' && typeof value === 'string') {
      throw new SnapNotFoundError(value, message)
    }
    if (message) {
      throw new Error(message)
    }
  }

  if (status) {
    throw new Error(`server error: ${status}`)
  }

  throw new Error('unknown server error')
}

type ResponseBody = {
  type: string
  result?: unknown
  status: string
}

type ErrorResult = {
  message: string
  kind?: string
  value: unknown
}
