import type * as workshopd from '../src/workshopd.js'
export type { Project, WorkshopClient } from '../src/workshopd.js'
import { jest } from '@jest/globals'
import { mockAgent } from './agent.js'
import path from 'node:path'

export const workshopClient = jest
  .fn<typeof workshopd.workshopClient>()
  .mockReturnValue({
    project: jest.fn<workshopd.WorkshopClient['project']>(async (path) => ({
      id: '42424242',
      path
    })),
    singleWorkshopName: jest.fn<workshopd.WorkshopClient['singleWorkshopName']>(
      async (project) => path.basename(project.path)
    )
  })

export const workshopDispatcher = jest.fn<typeof workshopd.workshopDispatcher>(
  async () => mockAgent().get('http://localhost')
)
