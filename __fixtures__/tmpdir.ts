import * as fs from 'node:fs/promises'
import assert from 'node:assert'
import os from 'node:os'
import path from 'node:path'

export class TemporaryDirectory {
  maybePath: string = ''

  path(): string {
    assert(this.maybePath, 'temporary directory not created')
    return this.maybePath
  }

  async create(): Promise<void> {
    assert(!this.maybePath, 'temporary directory already created')
    this.maybePath = await fs.mkdtemp(path.join(os.tmpdir(), 'jest-'))
  }

  async remove(): Promise<void> {
    await fs.rm(this.path(), { force: true, recursive: true })
    this.maybePath = ''
  }
}
