name: backend-test
on: [pull_request, push]

jobs:
  ci:
    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.6", "3.7", "3.8", "3.9", "3.10"]
        poetry-version: ["1.0", "1.1.15"]
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v3
        with:
          path: backend
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      - name: Run image
        uses: abatilo/actions-poetry@v2
        with:
          poetry-version: ${{ matrix.poetry-version }}
      - name: View poetry --help
        run: poetry run pytest
