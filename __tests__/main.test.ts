import * as client from '../__fixtures__/client.js'
import * as core from '../__fixtures__/core.js'
import * as inputs from '../__fixtures__/inputs.js'
import * as workshop from '../__fixtures__/workshop.js'
import { closeAgent, newAgent } from '../__fixtures__/agent.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('../src/client.js', () => client)
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/inputs.js', () => inputs)
jest.unstable_mockModule('../src/workshop.js', () => workshop)

const { postRun, run } = await import('../src/main.js')

beforeAll(newAgent)
afterAll(closeAgent)

afterEach(core.clearState)

test('launches workshop', async () => {
  await run()

  expect(core.setFailed.mock.calls).toEqual([])
  expect(workshop.setupWorkshop).toHaveBeenCalledWith('abcxyz', '1.2.3')
  expect(workshop.restoreCache).toHaveBeenCalledWith(
    { id: '42424242', path: '/project' },
    'dev',
    [{ sdk: 'go', name: 'mod-cache' }]
  )
  expect(workshop.launchWorkshop).toHaveBeenCalledWith('/project', 'dev')

  await postRun()

  expect(workshop.saveCache).toHaveBeenCalledWith(
    { id: '42424242', path: '/project' },
    'dev',
    [{ sdk: 'go', name: 'mod-cache' }]
  )
})

test('infers workshop name', async () => {
  await inputs.getInputs.withImplementation(
    () => ({
      token: 'abcxyz',
      version: '1.2.3',
      project: '/project/ws',
      workshop: '',
      cache: []
    }),
    async () => {
      await run()

      expect(core.setFailed.mock.calls).toEqual([])
      expect(workshop.setupWorkshop).toHaveBeenCalledWith('abcxyz', '1.2.3')
      expect(workshop.restoreCache).toHaveBeenCalledWith(
        { id: '42424242', path: '/project/ws' },
        'ws',
        []
      )
      expect(workshop.launchWorkshop).toHaveBeenCalledWith('/project/ws', 'ws')

      await postRun()

      expect(workshop.saveCache).toHaveBeenCalledWith(
        { id: '42424242', path: '/project/ws' },
        'ws',
        []
      )
    }
  )
})

test('reports invalid inputs', async () => {
  inputs.getInputs.mockImplementationOnce(() => {
    throw 'bad inputs'
  })

  await run()

  expect(core.setFailed).toHaveBeenCalledWith('bad inputs')
})

test('reports setup failure', async () => {
  workshop.setupWorkshop.mockRejectedValueOnce(new Error('cannot setup'))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith('cannot setup')
})

test('reports restore cache failure', async () => {
  workshop.restoreCache.mockRejectedValueOnce(new Error('cannot restore cache'))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith('cannot restore cache')
})

test('reports launch failure', async () => {
  workshop.launchWorkshop.mockRejectedValueOnce(new Error('cannot launch'))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith('cannot launch')
})

test('reports save cache failure', async () => {
  await run()

  workshop.saveCache.mockRejectedValueOnce(new Error('cannot save cache'))

  await postRun()

  expect(core.setFailed).toHaveBeenCalledWith('cannot save cache')
})

test('reports restore state failure', async () => {
  await postRun()

  expect(core.setFailed).toHaveBeenCalledWith('"PROJECT_ID" state not found')
})
