import * as core from '@actions/core'
import { Dispatcher, Client as UndiciClient } from 'undici'
import assert from 'node:assert'
import { socketPath } from './paths.js'

/**
 * Client for the Workshop API.
 */
export type Client = {
  /**
   * Create or load a project from the given path.
   *
   * @param path Project directory (or subdirectory).
   * @returns Project ID and directory.
   */
  project(path: string): Promise<Project>
  /**
   * Infers the name of the single workshop in the given project.
   * Throws an error if the project has multiple workshops, or none.
   *
   * @param project Project to search.
   * @returns Workshop name.
   */
  singleWorkshopName(project: Project): Promise<string>
}

/**
 * Project ID and directory.
 */
export type Project = {
  /**
   * Project ID, used internally by Workshop.
   */
  id: string
  /**
   * Project directory.
   */
  path: string
}

/**
 * Creates a Workshop client from a generic HTTP client.
 *
 * @param dispatcher An HTTP client.
 * @returns A Workshop client.
 */
export function workshopClient(dispatcher: Dispatcher): Client {
  return new HttpClient(dispatcher)
}

/**
 * Creates a generic HTTP client which connects to the Workshop API socket.
 *
 * @returns An HTTP client.
 */
export async function workshopDispatcher(): Promise<Dispatcher> {
  return new UndiciClient('http://localhost', {
    socketPath: await socketPath()
  })
}

class HttpClient implements Client {
  constructor(protected readonly dispatcher: Dispatcher) {}

  async project(path: string): Promise<Project> {
    core.debug('POST /v1/projects')
    const response = await this.dispatcher.request({
      method: 'POST',
      path: '/v1/projects',
      body: JSON.stringify({ path })
    })

    const result = syncResult(await response.body.json())
    assert(result !== undefined, 'expected project response')
    return result as Project
  }

  async singleWorkshopName(project: Project): Promise<string> {
    core.debug('GET /v1/projects/:id/workshops')
    const response = await this.dispatcher.request({
      method: 'GET',
      path: `/v1/projects/${encodeURIComponent(project.id)}/workshops`
    })

    const result = syncResult(await response.body.json())
    assert(result !== undefined, 'expected workshops response')

    const { workshops, files } = result as Workshops
    const names = workshops.map((w) => w.name)
    for (const file of files) {
      if (!names.includes(file.name)) {
        names.push(file.name)
      }
    }

    if (names.length < 1) {
      throw new Error(`no workshops found in ${JSON.stringify(project.path)}`)
    }
    if (names.length > 1) {
      const joined = names.map((n) => JSON.stringify(n)).join(', ')
      throw new Error(`multiple workshops found: ${joined}`)
    }
    return names[0]
  }
}

type Workshops = {
  workshops: WorkshopInfo[]
  files: WorkshopFile[]
}

type WorkshopInfo = {
  name: string
}

type WorkshopFile = {
  name: string
}

function syncResult(body: unknown): unknown {
  core.debug(`Response from workshopd: ${JSON.stringify(body, null, 2)}`)
  handleError(body)

  const { type, result = undefined } = body as ResponseBody
  assert(type === 'sync', `expected sync response, got ${JSON.stringify(type)}`)
  return result
}

function handleError(body: unknown) {
  const { type, result = undefined, status } = body as ResponseBody

  if (type !== 'error') {
    return
  }

  if (result !== undefined) {
    const { message } = result as ErrorResult
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
}
