import * as paths from '../__fixtures__/paths.js'
import { closeAgent, mockAgent, newAgent } from '../__fixtures__/agent.js'
import { createServer } from 'node:http'
import { jest } from '@jest/globals'

jest.unstable_mockModule('../src/paths.js', () => paths)

const { snapdClient, snapdDispatcher, SnapNotFoundError } =
  await import('../src/snapd.js')

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
      const socket = paths.snapdSocketPath()
      await new Promise((resolve, reject) => {
        server.on('error', (error) => reject(error))
        server.listen(socket, () => resolve(undefined))
      })

      const dispatcher = snapdDispatcher()
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

describe('info', () => {
  beforeAll(newAgent)
  afterAll(closeAgent)

  test('finds snap', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(200, {
          type: 'sync',
          result: { revision: '42', 'tracking-channel': '6/stable' }
        })

      const client = snapdClient(dispatcher)
      const snap = await client.info('lxd')
      expect(snap).toEqual({
        revision: '42',
        'tracking-channel': '6/stable'
      })
    } finally {
      await dispatcher.close()
    }
  })

  test('handles snap-not-found error', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(404, {
          type: 'error',
          result: {
            message: 'snap not installed',
            kind: 'snap-not-found',
            value: 'lxd'
          }
        })

      const client = snapdClient(dispatcher)
      const promise = client.info('lxd')
      await expect(promise).rejects.toStrictEqual(
        new SnapNotFoundError('lxd', 'snap not installed')
      )
    } finally {
      await dispatcher.close()
    }
  })

  test('handles error message', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(400, {
          type: 'error',
          result: { message: 'cannot read snap' },
          status: 'Bad Request'
        })

      const client = snapdClient(dispatcher)
      const promise = client.info('lxd')
      await expect(promise).rejects.toThrow('cannot read snap')
    } finally {
      await dispatcher.close()
    }
  })

  test('handles empty message', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(500, {
          type: 'error',
          result: { message: '' },
          status: 'Internal Server Error'
        })

      const client = snapdClient(dispatcher)
      const promise = client.info('lxd')
      await expect(promise).rejects.toThrow(
        'server error: Internal Server Error'
      )
    } finally {
      await dispatcher.close()
    }
  })

  test('handles missing message', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(500, { type: 'error', status: 'Internal Server Error' })

      const client = snapdClient(dispatcher)
      const promise = client.info('lxd')
      await expect(promise).rejects.toThrow(
        'server error: Internal Server Error'
      )
    } finally {
      await dispatcher.close()
    }
  })

  test('handles empty status', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(500, { type: 'error', status: '' })

      const client = snapdClient(dispatcher)
      const promise = client.info('lxd')
      await expect(promise).rejects.toThrow('unknown server error')
    } finally {
      await dispatcher.close()
    }
  })

  test('expects sync response', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(200, { type: 'async' })

      const client = snapdClient(dispatcher)
      const promise = client.info('lxd')
      await expect(promise).rejects.toThrow(
        'expected sync response, got "async"'
      )
    } finally {
      await dispatcher.close()
    }
  })

  test('expects snap response', async () => {
    const dispatcher = mockAgent().get('http://localhost')
    try {
      dispatcher
        .intercept({ method: 'GET', path: '/v2/snaps/lxd' })
        .reply(200, { type: 'sync' })

      const client = snapdClient(dispatcher)
      const promise = client.info('lxd')
      await expect(promise).rejects.toThrow('expected snap response')
    } finally {
      await dispatcher.close()
    }
  })
})
