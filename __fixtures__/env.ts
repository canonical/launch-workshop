import { jest } from '@jest/globals'

let replaced: jest.Replaced<typeof process.env> | undefined

export function restoreEnv() {
  replaced?.restore()
  replaced = undefined
}

export function replaceEnv(env: NodeJS.Dict<string>) {
  restoreEnv()
  replaced = jest.replaceProperty(process, 'env', env)
}
