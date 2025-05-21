import { MockAgent } from 'undici'
import assert from 'node:assert'

export function mockAgent() {
  assert(maybeAgent !== undefined, 'MockAgent not created')
  return maybeAgent
}

export function newAgent() {
  assert(maybeAgent === undefined, 'MockAgent already created')
  maybeAgent = new MockAgent({ connections: 1 })
}

export async function closeAgent(): Promise<void> {
  await mockAgent().close()
  maybeAgent = undefined
}

let maybeAgent: MockAgent | undefined
