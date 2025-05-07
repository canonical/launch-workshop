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
    # Access token for canonical/workshop.
    # Required.
    token: ${{ secrets.WORKSHOP_TOKEN }}

    # Workshop version or range of versions.
    # Optional.
    version: latest

    # Directory containing a workshop to launch.
    # Optional.
    project: .

    # Name of workshop to launch.
    # Required if the project has multiple workshops.
    workshop: dev
```

## Example jobs

**Single workshop**

```yaml
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v4

  - uses: canonical/launch-workshop@v1
    with:
      token: ${{ secrets.WORKSHOP_TOKEN }}

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
      token: ${{ secrets.WORKSHOP_TOKEN }}
      workshop: ${{ matrix.workshop }}

  - run: workshop run "$WS" unit-tests
    env:
      WS: ${{ matrix.workshop }}
```
