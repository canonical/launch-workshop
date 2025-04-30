import * as core from '../__fixtures__/core.js'
import * as exec from '../__fixtures__/exec.js'
import * as lxd from '../__fixtures__/lxd.js'
import * as release from '../__fixtures__/release.js'
import * as snap from '../__fixtures__/snap.js'
import * as tc from '../__fixtures__/tool-cache.js'
import { jest } from '@jest/globals'

jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => exec)
jest.unstable_mockModule('../src/lxd.js', () => lxd)
jest.unstable_mockModule('../src/release.js', () => release)
jest.unstable_mockModule('../src/snap.js', () => snap)
jest.unstable_mockModule('@actions/tool-cache', () => tc)

const { setupWorkshop } = await import('../src/workshop.js')

beforeEach(async () => {
  await release.tmpdir.create()
})
afterEach(async () => {
  await release.tmpdir.remove()
})

test('installs Workshop', async () => {
  exec.getExecOutput.mockResolvedValueOnce({
    exitCode: 127,
    stdout: '',
    stderr: 'workshop: command not found'
  })

  await setupWorkshop('', '0.1.0')

  const workshopVersion = exec.getExecOutput.mock.calls[0]?.[1]
  expect(workshopVersion).toEqual(['workshop', '--version'])

  const snapVersion = exec.exec.mock.calls[0]?.[1]
  expect(snapVersion).toEqual(['snap', '--version'])

  expect(lxd.setupLxd).toHaveBeenCalled()

  const snapInstall = exec.exec.mock.calls[1]?.[1]
  expect(snapInstall?.at(-1)).toMatch(/workshop_0.1.0_testarch.snap$/)

  expect(lxd.pierceFirewall).toHaveBeenCalledWith('workshopbr0')

  expect(exec.getExecOutput).toHaveBeenCalledTimes(1)
  expect(exec.exec).toHaveBeenCalledTimes(2)
})

test.each(['latest', '>=0.1.0'])('avoids reinstalling', async (version) => {
  exec.getExecOutput.mockResolvedValueOnce({
    exitCode: 0,
    stdout: '0.1.2\n',
    stderr: ''
  })

  await setupWorkshop('', version)

  const workshopVersion = exec.getExecOutput.mock.calls[0]?.[1]
  expect(workshopVersion).toEqual(['workshop', '--version'])

  expect(lxd.setupLxd).toHaveBeenCalledTimes(0)
  expect(lxd.pierceFirewall).toHaveBeenCalledTimes(0)
  expect(exec.getExecOutput).toHaveBeenCalledTimes(1)
  expect(exec.exec).toHaveBeenCalledTimes(0)
})

test('requires snap', async () => {
  exec.getExecOutput.mockResolvedValueOnce({
    exitCode: 0,
    stdout: '0.0.1\n',
    stderr: ''
  })
  exec.exec.mockResolvedValueOnce(1)

  const promise = setupWorkshop('', '0.1.0')
  await expect(promise).rejects.toThrow(
    'Workshop only supports Ubuntu-based runners at this time'
  )

  const workshopVersion = exec.getExecOutput.mock.calls[0]?.[1]
  expect(workshopVersion).toEqual(['workshop', '--version'])

  const snapVersion = exec.exec.mock.calls[0]?.[1]
  expect(snapVersion).toEqual(['snap', '--version'])

  expect(lxd.setupLxd).toHaveBeenCalledTimes(0)
  expect(lxd.pierceFirewall).toHaveBeenCalledTimes(0)
  expect(exec.getExecOutput).toHaveBeenCalledTimes(1)
  expect(exec.exec).toHaveBeenCalledTimes(1)
})
