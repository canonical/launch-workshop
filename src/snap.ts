import assert from 'node:assert'
import os from 'node:os'

/**
 * Detects the current CPU architecture.
 *
 * @returns Architecture name (according to Debian).
 */
export function snapArch(): string {
  const machine = os.machine()
  const arch = KERNEL_ARCH_MAPPING.get(machine)
  assert(arch, `unknown architecture ${JSON.stringify(machine)}`)
  return arch
}

// Based on snapd/arch/arch.go.
const KERNEL_ARCH_MAPPING = new Map<string, string>([
  ['aarch64', 'arm64'],
  ['armv7l', 'armhf'],
  ['armv8l', 'arm64'],
  ['i686', 'i386'],
  ['ppc', 'powerpc'],
  ['ppc64', 'ppc64'],
  ['ppc64le', 'ppc64el'],
  ['riscv64', 'riscv64'],
  ['s390x', 's390x'],
  ['x86_64', 'amd64']
])
