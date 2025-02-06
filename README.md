# GitHub Action Steps with Matrix

This action allows you to run steps in parallel using a matrix strategy, similar to GitHub Actions matrix jobs but within a single job. It also supports passing outputs between steps and collecting results from all matrix combinations.

## Features

- Run steps in parallel using matrix combinations
- Pass outputs between steps
- Access matrix values as environment variables
- Collect and combine outputs from all matrix executions

## Usage

```yaml
- uses: alonch/gha-steps@main
  id: gha-steps
  with:
    matrix: |
      - os: [ubuntu, macos]
        version: [20.04, 22.04]
    outputs: |
      - results: ${ STEPS_TEST_RESULT }
    steps: |
      - name: build
        id: build
        run: |
          echo "artifact=${ MATRIX_OS }-${ MATRIX_VERSION }" >> $STEPS_OUTPUTS
      - name: test
        id: test
        run: |
          echo "testing ${ STEPS_BUILD_ARTIFACT }"
          echo "result=OK" >> $STEPS_OUTPUTS
```

## Inputs

| Input   | Description                                | Required |
|---------|-----------------------------------------------|----------|
| matrix  | Matrix configuration for parallel execution    | Yes      |
| steps   | Steps to execute in sequence                  | Yes      |
| outputs | Output variables to collect from steps        | Yes      |

## Environment Variables

- `MATRIX_*`: Matrix values are available as environment variables with the `MATRIX_` prefix (uppercase)
- `STEPS_*`: Step outputs are available as environment variables with the format `STEPS_<STEP_ID>_<OUTPUT_NAME>` (uppercase)
- `STEPS_OUTPUTS`: Special file path where steps can write their outputs

## Outputs

| Output | Description                                |
|--------|--------------------------------------------|
| json   | JSON array containing all matrix results    |

## Example Output

```json
[
  {"result":"OK","os":"ubuntu","version":"20.04"},
  {"result":"OK","os":"ubuntu","version":"22.04"},
  {"result":"OK","os":"macos","version":"20.04"},
  {"result":"OK","os":"macos","version":"22.04"}
]
```

## License

MIT 