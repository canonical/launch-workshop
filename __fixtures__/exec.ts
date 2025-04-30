import type * as _exec from '@actions/exec'
import { jest } from '@jest/globals'

export const exec = jest.fn<typeof _exec.exec>().mockResolvedValue(0)

export const getExecOutput = jest
  .fn<typeof _exec.getExecOutput>()
  .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
