# Launch workshop action

This action launches an ephemeral development environment using
[Workshop](https://github.com/canonical/workshop).

[![Tests](https://github.com/canonical/launch-workshop/actions/workflows/tests.yaml/badge.svg)](https://github.com/canonical/launch-workshop/actions/workflows/tests.yaml)
[![Check dist](https://github.com/canonical/launch-workshop/actions/workflows/check-dist.yaml/badge.svg)](https://github.com/canonical/launch-workshop/actions/workflows/check-dist.yaml)
![Coverage](./badges/coverage.svg)

## Usage

```yaml
- uses: canonical/launch-workshop@v1
  with:
    # Channel used to install Workshop snap.
    # Optional.
    channel: latest/stable

    # Specific revision of Workshop snap to install.
    # Optional.
    revision: ''

    # Directory containing a workshop to launch.
    # Optional.
    project: .

    # Name of workshop to launch.
    # Required if the project has multiple workshops.
    workshop: dev

    # Primary key for cached mount plugs.
    # Optional.
    cache-key: ''

    # Ordered fallback key prefixes for cached mount plugs.
    # Optional.
    restore-keys: ''

    # Mount plugs to restore before and save after the workflow.
    # Each line has the format <SDK>:<PLUG>.
    # Optional.
    cache: ''

    # Mount plugs to restore before the workflow without saving after.
    # Each line has the format <SDK>:<PLUG>.
    # Optional.
    restore: ''
```

## Example jobs

**Single workshop**

```yaml
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v4

  - uses: canonical/launch-workshop@v1

  - run: workshop exec -- pytest
```

**Multiple workshops**

```yaml
runs-on: ubuntu-latest
strategy:
  matrix:
    workshop: [dev-jammy, dev-noble]
steps:
  - uses: actions/checkout@v4

  - uses: canonical/launch-workshop@v1
    with:
      workshop: ${{ matrix.workshop }}

  - run: workshop run "$WS" unit-tests
    env:
      WS: ${{ matrix.workshop }}
```

## Caching

Workshop SDKs can define mount plugs to persist data outside the workshop
container. For example, the `go` SDK defines a `mod-cache` plug:

```console
$ workshop connections --all
Interface  Plug              Slot              Notes
mount      dev/go:mod-cache  dev/system:mount  -
```

Use the `cache` input to restore such data before the job and save it after a
successful job. Use `restore` for additional plugs that should be restored but
never saved:

```yaml
- uses: canonical/launch-workshop@v1
  with:
    cache-key: ${{ github.ref_name }}
    restore-keys: |
      ${{ github.event.repository.default_branch }}-
    cache: |
      go:mod-cache
      rust:cargo-registry
    restore: |
      uv:cache
```

`cache-key` selects the exact primary key saved after a successful job.
`restore-keys` is an ordered list of fallback prefixes used when the primary key
is absent. An exact primary-key hit is not saved again; a fallback hit is saved
under the primary key. A plug cannot appear in both `cache` and `restore`.
