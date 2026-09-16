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

    # Caller-supplied identity appended to every mount-plug cache key.
    # Optional.
    cache-key: ''

    # Mount plugs to cache across workflow runs.
    # Each line has the format <SDK>:<PLUG>.
    # Optional.
    cache: ''
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

Use the `cache` input to cache such data across workflow runs:

```yaml
- uses: canonical/launch-workshop@v1
  with:
    cache-key: ${{ hashFiles('workshop.yaml', '.workshop/**') }}
    cache: |
      go:mod-cache
      rust:cargo-registry
      uv:cache
```

When configuration can affect mounted data, set `cache-key` to a stable
configuration identity. Changing this value selects a separate cache for every
plug; leaving it empty preserves the default cache identity.
