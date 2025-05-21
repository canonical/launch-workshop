import * as paths from '../__fixtures__/paths.js'
import { closeAgent, mockAgent, newAgent } from '../__fixtures__/agent.js'
import { createServer } from 'node:http'
import { jest } from '@jest/globals'

jest.unstable_mockModule('../src/paths.js', () => paths)

const { workshopClient, workshopDispatcher } = await import('../src/client.js')

describe('default dispatcher', () => {
  beforeAll(async () => {
    await paths.tmpdir.create()
  })
  afterAll(async () => {
    await paths.tmpdir.remove()
  })

  test('connects to socket', async () => {
    const server = createServer((request, response) => {
      response.writeHead(200).end('response text')
    })
    try {
      const socket = await paths.socketPath()
      await new Promise((resolve, reject) => {
        server.on('error', (error) => reject(error))
        server.listen(socket, () => resolve(undefined))
      })

      const dispatcher = await workshopDispatcher()
      try {
        const response = await dispatcher.request({
          method: 'GET',
          path: '/'
        })

        expect(await response.body.text()).toEqual('response text')
      } finally {
        await dispatcher.close()
      }
    } finally {
      await new Promise((resolve) => server.close(() => resolve(undefined)))
    }
  })
})

describe('project', () => {
  beforeAll(newAgent)
  afterAll(closeAgent)

  test('loads project', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'POST',
          path: '/v1/projects',
          body: JSON.stringify({ path: '/project/directory' })
        })
        .reply(200, {
          type: 'sync',
          result: {
            id: '42424242',
            path: '/project'
          }
        })

      const client = workshopClient(dispatcher)
      const result = await client.project('/project/directory')
      expect(result).toEqual({ id: '42424242', path: '/project' })
    } finally {
      await dispatcher.close()
    }
  })

  test('handles error message', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'POST',
          path: '/v1/projects',
          body: JSON.stringify({ path: '/project' })
        })
        .reply(400, {
          type: 'error',
          result: { message: 'cannot create project' },
          status: 'Bad Request'
        })

      const client = workshopClient(dispatcher)
      const promise = client.project('/project')
      await expect(promise).rejects.toThrow('cannot create project')
    } finally {
      await dispatcher.close()
    }
  })

  test('handles empty message', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'POST',
          path: '/v1/projects',
          body: JSON.stringify({ path: '/project' })
        })
        .reply(400, {
          type: 'error',
          result: { message: '' },
          status: 'Bad Request'
        })

      const client = workshopClient(dispatcher)
      const promise = client.project('/project')
      await expect(promise).rejects.toThrow('server error: Bad Request')
    } finally {
      await dispatcher.close()
    }
  })

  test('handles missing message', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'POST',
          path: '/v1/projects',
          body: JSON.stringify({ path: '/project' })
        })
        .reply(400, {
          type: 'error',
          status: 'Bad Request'
        })

      const client = workshopClient(dispatcher)
      const promise = client.project('/project')
      await expect(promise).rejects.toThrow('server error: Bad Request')
    } finally {
      await dispatcher.close()
    }
  })

  test('handles empty status', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'POST',
          path: '/v1/projects',
          body: JSON.stringify({ path: '/project' })
        })
        .reply(400, {
          type: 'error',
          status: ''
        })

      const client = workshopClient(dispatcher)
      const promise = client.project('/project')
      await expect(promise).rejects.toThrow('unknown server error')
    } finally {
      await dispatcher.close()
    }
  })

  test('expects sync response', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'POST',
          path: '/v1/projects',
          body: JSON.stringify({ path: '/project' })
        })
        .reply(200, { type: 'async' })

      const client = workshopClient(dispatcher)
      const promise = client.project('/project')
      await expect(promise).rejects.toThrow(
        'expected sync response, got "async"'
      )
    } finally {
      await dispatcher.close()
    }
  })

  test('expects project response', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'POST',
          path: '/v1/projects',
          body: JSON.stringify({ path: '/project' })
        })
        .reply(200, { type: 'sync' })

      const client = workshopClient(dispatcher)
      const promise = client.project('/project')
      await expect(promise).rejects.toThrow('expected project response')
    } finally {
      await dispatcher.close()
    }
  })
})

describe('singleWorkshopName', () => {
  beforeAll(newAgent)
  afterAll(closeAgent)

  test('infers workshop name', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, {
          type: 'sync',
          result: {
            workshops: [{ name: 'name' }],
            files: [{ name: 'name' }]
          }
        })

      const client = workshopClient(dispatcher)
      const result = await client.singleWorkshopName({
        id: '42424242',
        path: ''
      })
      expect(result).toEqual('name')
    } finally {
      await dispatcher.close()
    }
  })

  test('infers workshop name without file', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, {
          type: 'sync',
          result: {
            workshops: [{ name: 'workshop-name' }],
            files: []
          }
        })

      const client = workshopClient(dispatcher)
      const result = await client.singleWorkshopName({
        id: '42424242',
        path: ''
      })
      expect(result).toEqual('workshop-name')
    } finally {
      await dispatcher.close()
    }
  })

  test('infers workshop name without workshop', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, {
          type: 'sync',
          result: {
            workshops: [],
            files: [{ name: 'file-name' }]
          }
        })

      const client = workshopClient(dispatcher)
      const result = await client.singleWorkshopName({
        id: '42424242',
        path: ''
      })
      expect(result).toEqual('file-name')
    } finally {
      await dispatcher.close()
    }
  })

  test('expects workshops response', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, { type: 'sync' })

      const client = workshopClient(dispatcher)
      const promise = client.singleWorkshopName({
        id: '42424242',
        path: ''
      })
      await expect(promise).rejects.toThrow('expected workshops response')
    } finally {
      await dispatcher.close()
    }
  })

  test('expects at least one workshop', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, {
          type: 'sync',
          result: { workshops: [], files: [] }
        })

      const client = workshopClient(dispatcher)
      const promise = client.singleWorkshopName({
        id: '42424242',
        path: '/path'
      })
      await expect(promise).rejects.toThrow('no workshops found in "/path"')
    } finally {
      await dispatcher.close()
    }
  })

  test('expects at most one workshop', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, {
          type: 'sync',
          result: {
            workshops: [{ name: 'one' }, { name: 'two' }],
            files: []
          }
        })

      const client = workshopClient(dispatcher)
      const promise = client.singleWorkshopName({
        id: '42424242',
        path: ''
      })
      await expect(promise).rejects.toThrow(
        'multiple workshops found: "one", "two"'
      )
    } finally {
      await dispatcher.close()
    }
  })

  test('expects at most one file', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, {
          type: 'sync',
          result: {
            workshops: [],
            files: [{ name: 'a' }, { name: 'b' }]
          }
        })

      const client = workshopClient(dispatcher)
      const promise = client.singleWorkshopName({
        id: '42424242',
        path: ''
      })
      await expect(promise).rejects.toThrow(
        'multiple workshops found: "a", "b"'
      )
    } finally {
      await dispatcher.close()
    }
  })

  test('expects workshop to match file', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({
          method: 'GET',
          path: '/v1/projects/42424242/workshops'
        })
        .reply(200, {
          type: 'sync',
          result: {
            workshops: [{ name: 'workshop' }],
            files: [{ name: 'file' }]
          }
        })

      const client = workshopClient(dispatcher)
      const promise = client.singleWorkshopName({
        id: '42424242',
        path: ''
      })
      await expect(promise).rejects.toThrow(
        'multiple workshops found: "workshop", "file"'
      )
    } finally {
      await dispatcher.close()
    }
  })
})
