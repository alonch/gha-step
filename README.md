# GitHub Action Steps with Matrix

This action allows you to run steps in parallel using a matrix strategy, similar to GitHub Actions matrix jobs but within a single job. It also supports passing outputs between steps and collecting results from all matrix combinations.

## Features

- Run steps in parallel using matrix combinations
- Flexible matrix configuration:
  - Basic matrix combinations with multiple dimensions
  - Powerful include system for extending and customizing combinations
  - Support for include-only matrices
  - JSON string includes for dynamic matrix generation
  - Conditional value additions based on matrix values
  - Standalone combinations for special cases
- Execution control:
  - Parallel execution by default
  - Optional sequential execution with max-parallel: 1
  - Configurable parallel execution with max-parallel > 1
- Step management:
  - Sequential step execution within each combination
  - Pass outputs between steps using environment variables
  - Automatic cleanup of step outputs
- Rich output handling:
  - Access matrix values as environment variables
  - Collect and combine outputs from all matrix combinations
  - Detailed execution status and error reporting

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
**Output**

```json
[
  {"result":"OK","os":"ubuntu","version":"20.04"},
  {"result":"OK","os":"ubuntu","version":"22.04"},
  {"result":"OK","os":"macos","version":"20.04"},
  {"result":"OK","os":"macos","version":"22.04"}
]
```

## Inputs

| Input        | Description                                                                | Required | Default |
|--------------|----------------------------------------------------------------------------|----------|----------|
| matrix       | Matrix configuration in YAML format defining parallel execution combinations | Yes      | -        |
| steps        | List of steps to execute sequentially for each matrix combination          | Yes      | -        |
| outputs      | List of outputs to collect from steps                                      | No      | -        |
| max-parallel | Maximum number of matrix combinations to run in parallel                    | No       | ∞        |

### matrix
Matrix configuration in YAML format. Each key-value pair becomes an environment variable with the `MATRIX_` prefix.

Example:
```yaml
- os: [ubuntu, macos]
  version: [20.04, 22.04]
```

#### Matrix Include
Use `include` to expand existing matrix configurations or add new combinations. The value of `include` is a list of objects that follows these rules:

1. For each object in the include list:
   - Key-value pairs are added to each matrix combination if they don't overwrite existing values
   - If an object can't be added to any existing combination without overwriting values, it creates a new combination
   - Original matrix values are preserved, but added values can be overwritten by subsequent includes
   - Includes are processed in order, allowing later includes to override earlier ones

The include field supports two formats:
1. Array of objects in YAML
2. JSON string containing an array of objects

Examples:

1. Basic include with conditions:
```yaml
matrix: |
  - os: [windows-latest, ubuntu-latest]
    node: [14, 16]
    include:
      - color: green          # Added to all combinations
      - os: windows-latest    # Adds npm only to windows + node 16
        node: 16
        npm: 6
      - os: macos            # Creates new standalone combination
        node: 18
```

2. Include-only matrix (no base combinations):
```yaml
matrix: |
  - include:
      - os: ubuntu-latest
        node: 14
      - os: windows-latest
        node: 16
        npm: 6
```

3. JSON string include:
```yaml
matrix: |
  - include: ${{ steps.previous.outputs.json }}
```

4. Array values in includes:
```yaml
matrix: |
  - include:
      - os: ubuntu-latest
        arch: [amd64, arm64]  # Will create separate combinations for each value
      - os: windows-latest
        arch: amd64,arm64     # Comma-separated strings also work as arrays
```

5. Array expansion works in both standalone includes and when combining with base matrix

Complex array example:
```yaml
matrix: |
  - include:
      - fruit: apple
        color: [green, red, yellow]  # Creates 3 combinations
        shape: round
      - fruit: banana
        color: yellow,brown          # Creates 2 combinations
```

This will generate:
```json
[
  {"fruit": "apple", "color": "green", "shape": "round"},
  {"fruit": "apple", "color": "red", "shape": "round"},
  {"fruit": "apple", "color": "yellow", "shape": "round"},
  {"fruit": "banana", "color": "yellow"},
  {"fruit": "banana", "color": "brown"}
]
```

Example with base matrix:
```yaml
matrix: |
  - os: [ubuntu, macos]
    arch: amd64
    include:
      - os: ubuntu
        version: [18.04, 20.04]  # Only for ubuntu
      - os: macos
        version: 12             # Single version for macos
```

This will generate:
```json
[
  {"os": "ubuntu", "arch": "amd64", "version": "18.04"},
  {"os": "ubuntu", "arch": "amd64", "version": "20.04"},
  {"os": "macos", "arch": "amd64", "version": "12"}
]
```

### steps
List of steps to execute. Each step must have:
- `name`: Step display name
- `id`: Unique identifier for the step
- `run`: Shell commands to execute

Example:
```yaml
- name: Build
  id: build
  run: echo "artifact=example" >> $STEPS_OUTPUTS
```

### outputs
List of outputs to collect from all matrix executions.

Example:
```yaml
- result: ${ STEPS_TEST_RESULT }
  artifact: ${ STEPS_BUILD_ARTIFACT }
```

## Environment Variables

- `MATRIX_*`: Matrix values are available as environment variables with the `MATRIX_` prefix (uppercase)
- `STEPS_*`: Step outputs are available as environment variables with the format `STEPS_<STEP_ID>_<OUTPUT_NAME>` (uppercase)
- `STEPS_OUTPUTS`: Special file path where steps can write their outputs

## Outputs

| Output    | Description                                                              |
|-----------|--------------------------------------------------------------------------|
| json      | JSON array containing results from all matrix combinations                |
| outcome   | Overall execution status: 'success', 'failure', or 'cancelled'           |

### json
Contains an array of objects, each representing a matrix combination execution with:
- All matrix values used (e.g., os, version)
- All collected outputs specified in the `outputs` input
- Execution status and details

Example:
```json
[
  {
    "os": "ubuntu",
    "version": "20.04",
    "result": "OK",
    "artifact": "ubuntu-20.04"
  }
]
```

### outcome
Indicates the overall execution status:
- `success`: All matrix combinations completed successfully
- `failure`: One or more combinations failed
- `cancelled`: The workflow was cancelled during execution

## License

MIT