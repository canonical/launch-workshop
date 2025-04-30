import * as core from '@actions/core'
import * as fs from 'node:fs/promises'
import * as tc from '@actions/tool-cache'
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import { Writable } from 'node:stream'
import assert from 'node:assert'
import { getOctokit } from '@actions/github'
import os from 'node:os'
import path from 'node:path'

/**
 * Repository and version describing a GitHub release.
 */
export type Release = {
  /**
   * Repository owner.
   */
  owner: string
  /**
   * Repository name.
   */
  repo: string
  /**
   * A version, range of versions or "latest."
   */
  version: string
}

/**
 * Downloads assets from a GitHub release.
 *
 * @param token Access token for the repository.
 * @param release Repository and version.
 * @param filter Predicate to filter assets by filename.
 * @returns Directory containing the downloaded assets.
 */
export async function downloadRelease(
  token: string,
  release: Release,
  filter: (filename: string) => boolean
): Promise<string> {
  const octokit = getOctokit(token)

  const { assets, tag_name } = await getRelease(octokit, release)
  const { owner, repo } = release

  const cache = tc.find(repo, tag_name)
  if (cache) {
    return cache
  }

  const temp = await mkdtemp(`${repo}-`)
  try {
    const downloads = assets
      .filter((a) => filter(a.name))
      .map((a) =>
        downloadReleaseAsset(
          octokit,
          { owner, repo, asset_id: a.id },
          path.join(temp, a.name)
        )
      )
    await Promise.all(downloads)

    return await tc.cacheDir(temp, repo, tag_name)
  } finally {
    await fs.rm(temp, { force: true, recursive: true })
  }
}

type Octokit = ReturnType<typeof getOctokit>

type ReleaseData =
  RestEndpointMethodTypes['repos']['getLatestRelease']['response']['data']

async function getRelease(
  octokit: Octokit,
  release: Release
): Promise<ReleaseData> {
  const { owner, repo, version } = release

  if (version == 'latest') {
    const { data } = await octokit.rest.repos.getLatestRelease({ owner, repo })
    core.debug(`Latest release: ${data.id} (${data.tag_name})`)
    return data
  }

  if (tc.isExplicitVersion(version)) {
    const { data } = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: `v${version}`
    })
    core.debug(`Exact release: ${data.id} (${data.tag_name})`)
    return data
  }

  const releases = octokit.paginate.iterator(octokit.rest.repos.listReleases, {
    owner,
    repo
  })

  let result
  for await (const { data } of releases) {
    const versions = data.map((r) => r.tag_name)
    if (result !== undefined) {
      versions.push(result.tag_name)
    }

    const latest = tc.evaluateVersions(versions, version)
    if (latest && (result === undefined || result.tag_name != latest)) {
      result = data.find((r) => r.tag_name == latest)
    }
  }

  assert(result !== undefined, `release matching ${version} not found`)
  core.debug(
    `Latest release matching ${version}: ${result.id} (${result.tag_name})`
  )
  return result
}

async function mkdtemp(prefix: string): Promise<string> {
  let temp = process.env['RUNNER_TEMP']
  if (!temp) {
    temp = os.tmpdir()
  }

  return await fs.mkdtemp(path.join(temp, prefix))
}

type ReleaseAsset = {
  owner: string
  repo: string
  asset_id: number
}

async function downloadReleaseAsset(
  octokit: Octokit,
  asset: ReleaseAsset,
  target: string
): Promise<void> {
  core.debug(`Downloading asset ${asset.asset_id} (${path.basename(target)})`)

  const response = await octokit.rest.repos.getReleaseAsset({
    ...asset,
    headers: {
      accept: 'application/octet-stream'
    },
    request: {
      parseSuccessResponseBody: false
    }
  })

  const file = await fs.open(target, 'w')
  try {
    // FIXME: https://github.com/octokit/types.ts/issues/606
    const stream = response.data as unknown as ReadableStream
    await stream.pipeTo(Writable.toWeb(file.createWriteStream()))
  } finally {
    await file.close()
  }
}
