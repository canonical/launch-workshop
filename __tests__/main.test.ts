import * as core from '../__fixtures__/core.js'
import * as inputs from '../__fixtures__/inputs.js'
import * as workshop from '../__fixtures__/workshop.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/inputs.js', () => inputs)
jest.unstable_mockModule('../src/workshop.js', () => workshop)

const { run } = await import('../src/main.js')

test('launches workshop', async () => {
  await run()

  expect(core.setFailed.mock.calls).toEqual([])
  expect(workshop.setupWorkshop).toHaveBeenCalledWith('abcxyz', '1.2.3')
  expect(workshop.launchWorkshop).toHaveBeenCalledWith('/project', 'dev')
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

test('reports launch failure', async () => {
  workshop.launchWorkshop.mockRejectedValueOnce(new Error('cannot launch'))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith('cannot launch')
})
