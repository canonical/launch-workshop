import type * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import { ReadableStream } from 'node:stream/web'
import fetchMock from '@fetch-mock/jest'
import { jest } from '@jest/globals'

export const getOctokit = jest.fn<typeof github.getOctokit>(
  () => new GitHub({ request: { fetch: fetchMock.fetchHandler } })
)

fetchMock.get('path:/repos/org/prj/releases/latest', {
  assets: [
    {
      name: 'file1234',
      id: 1234
    },
    {
      name: 'file2345',
      id: 2345
    }
  ],
  tag_name: 'v1.2.3'
})

fetchMock.get('path:/repos/org/prj/releases/tags/v1.0.0', {
  assets: [
    {
      name: 'file100',
      id: 100
    },
    {
      name: 'file101',
      id: 101
    }
  ],
  tag_name: 'v1.0.0'
})

fetchMock.get('path:/repos/org/prj/releases/tags/v0.1.0', {
  assets: [
    {
      name: 'workshop_0.1.0_testarch.snap',
      id: 10
    }
  ],
  tag_name: 'v0.1.0'
})

fetchMock.get('path:/repos/org/prj/releases', ({ url, queryParams }) => {
  if (!queryParams?.has('page')) {
    return {
      body: [
        { tag_name: 'v0.9.1' },
        { tag_name: 'v1.0.0' },
        { tag_name: 'v0.8.7' }
      ],
      headers: { link: `<${url}?page=2>; rel="next"` }
    }
  }

  if (queryParams?.get('page') === '2') {
    return {
      body: [
        {
          assets: [
            {
              name: 'file',
              id: 87
            }
          ],
          tag_name: 'v0.9.2'
        },
        { tag_name: 'v1.2.3' },
        { tag_name: 'v0.9.0' }
      ]
    }
  }

  return { throws: new Error('unknown query parameters') }
})

for (const id of [10, 87, 100, 101, 1234]) {
  fetchMock.get(
    `path:/repos/org/prj/releases/assets/${id}`,
    ReadableStream.from([`content${id}`])
  )
}
