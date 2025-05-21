import type * as client from '../src/client.js'
export type { Client, Project } from '../src/client.js'
import { jest } from '@jest/globals'
import { mockAgent } from './agent.js'
import path from 'node:path'

export const workshopClient = jest
  .fn<typeof client.workshopClient>()
  .mockReturnValue({
    project: jest.fn<client.Client['project']>(async (path) => ({
      id: '42424242',
      path
    })),
    singleWorkshopName: jest.fn<client.Client['singleWorkshopName']>(
      async (project) => path.basename(project.path)
    )
  })

export const workshopDispatcher = jest.fn<typeof client.workshopDispatcher>(
  async () => {
    return mockAgent().get('http://localhost')
  }
)
