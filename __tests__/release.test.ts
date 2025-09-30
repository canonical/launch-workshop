import * as env from '../__fixtures__/env.js'
import * as fs from 'node:fs/promises'
import * as github from '../__fixtures__/github.js'
import * as tc from '../__fixtures__/tool-cache.js'
import { jest } from '@jest/globals'
import os from 'node:os'
import path from 'node:path'

jest.unstable_mockModule('@actions/github', () => github)
jest.unstable_mockModule('@actions/tool-cache', () => tc)

const { downloadRelease } = await import('../src/release.js')

beforeEach(async () => {
  env.replaceEnv({})
  await tc.tmpdir.create()
})
afterEach(async () => {
  await tc.tmpdir.remove()
  env.restoreEnv()
})

test('downloads latest release', async () => {
  const assets = await downloadRelease(
    '',
    {
      owner: 'org',
      repo: 'prj',
      version: 'latest'
    },
    (filename) => filename == 'file1234'
  )

  const content = await fs.readFile(path.join(assets, 'file1234'), {
    encoding: 'utf8'
  })
  expect(content).toBe('content1234')
})

test('downloads specific release', async () => {
  const assets = await downloadRelease(
    '',
    {
      owner: 'org',
      repo: 'prj',
      version: '1.0.0'
    },
    () => true
  )

  let content = await fs.readFile(path.join(assets, 'file100'), {
    encoding: 'utf8'
  })
  expect(content).toBe('content100')

  content = await fs.readFile(path.join(assets, 'file101'), {
    encoding: 'utf8'
  })
  expect(content).toBe('content101')
})

test('downloads latest matching release', async () => {
  const assets = await downloadRelease(
    '',
    {
      owner: 'org',
      repo: 'prj',
      version: '<1.0.0'
    },
    () => true
  )

  const content = await fs.readFile(path.join(assets, 'file'), {
    encoding: 'utf8'
  })
  expect(content).toBe('content91')
})

test('retrieves cached release', async () => {
  const cached = await tc.cacheDir('', '', 'v1.2.3')

  const assets = await downloadRelease(
    '',
    {
      owner: 'org',
      repo: 'prj',
      version: 'latest'
    },
    () => true
  )
  expect(assets).toBe(cached)

  const children = await fs.readdir(assets)
  expect(children.length).toBe(0)
})

test('respects RUNNER_TEMP', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'runner-temp-'))
  try {
    await fs.chmod(temp, 0o555)
    process.env['RUNNER_TEMP'] = temp

    const promise = downloadRelease(
      '',
      {
        owner: 'org',
        repo: 'prj',
        version: 'latest'
      },
      (filename) => filename == 'file1234'
    )
    await expect(promise).rejects.toThrow('permission denied')
  } finally {
    await fs.rm(temp, { force: true, recursive: true })
  }
})
