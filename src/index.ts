import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as yaml from 'yaml';

interface StepDefinition {
  name: string;
  id: string;
  run: string;
}

interface MatrixCombination {
  [key: string]: string;
}

interface MatrixInput {
  [key: string]: string[];
}

interface StepOutputs {
  [key: string]: string;
}

interface ProcessEnv {
  [key: string]: string;
}

interface MatrixInclude {
  [key: string]: string | number;
}

function validateMatrixConfig(config: any): asserts config is { [key: string]: string[] | any[] }[] {
  if (!Array.isArray(config)) {
    throw new Error('Matrix configuration must be an array');
  }

  if (config.length === 0) {
    throw new Error('Matrix configuration cannot be empty');
  }

  config.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Matrix entry at index ${index} must be an object`);
    }

    Object.entries(entry).forEach(([key, value]) => {
      if (key === 'include') {
        if (!Array.isArray(value) && typeof value !== 'string') {
          throw new Error('Matrix include must be an array or a JSON string');
        }
        if (Array.isArray(value)) {
          value.forEach((item, itemIndex) => {
            if (typeof item !== 'object' || item === null) {
              throw new Error(`Include item at index ${itemIndex} must be an object`);
            }
          });
        }
      } else {
        if (!Array.isArray(value)) {
          throw new Error(`Matrix entry "${key}" must be an array`);
        }
        if (value.length === 0) {
          throw new Error(`Matrix entry "${key}" cannot be empty`);
        }
        value.forEach((item, itemIndex) => {
          if (typeof item !== 'string' && typeof item !== 'number') {
            throw new Error(`Value at index ${itemIndex} in matrix entry "${key}" must be a string or number`);
          }
        });
      }
    });
  });
}

async function run(): Promise<void> {
  try {
    // Parse inputs
    const matrixInput = core.getInput('matrix', { required: true });
    const stepsInput = core.getInput('steps', { required: true });
    const outputsInput = core.getInput('outputs', { required: false });
    const maxParallel = parseInt(core.getInput('max-parallel', { required: false }) || '0');

    // Parse YAML inputs
    const matrixConfig = yaml.parse(matrixInput);
    validateMatrixConfig(matrixConfig);
    const steps = yaml.parse(stepsInput) as StepDefinition[];
    const outputs = outputsInput ? yaml.parse(outputsInput) : [];

    if (!matrixConfig[0]) {
      throw new Error('Invalid matrix configuration');
    }

    // Generate matrix combinations
    const combinations: MatrixCombination[] = generateMatrixCombinations(matrixConfig[0]);
    const results: any[] = [];

    if (maxParallel === 1) {
      // Execute sequentially
      for (const combination of combinations) {
        try {
          const result = await executeSteps(steps, combination);
          results.push({ ...combination, ...result });
        } catch (error) {
          core.error(`Failed to execute combination ${JSON.stringify(combination)}: ${error}`);
          throw error;
        }
      }
    } else {
      // Execute in parallel with optional max concurrency
      const batchSize = maxParallel > 1 ? maxParallel : combinations.length;
      for (let i = 0; i < combinations.length; i += batchSize) {
        const batch = combinations.slice(i, i + batchSize);
        const promises = batch.map(async (combination) => {
          try {
            const result = await executeSteps(steps, combination);
            results.push({ ...combination, ...result });
          } catch (error) {
            core.error(`Failed to execute combination ${JSON.stringify(combination)}: ${error}`);
            throw error;
          }
        });
        await Promise.all(promises);
      }
    }

    // Set the final output
    core.setOutput('json', JSON.stringify(results));
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

function generateMatrixCombinations(matrixConfig: { [key: string]: any }): MatrixCombination[] {
  const combinations: MatrixCombination[] = [];
  
  // Handle regular matrix combinations
  const regularEntries = Object.entries(matrixConfig).filter(([key]) => key !== 'include');
  if (regularEntries.length > 0) {
    const keys = regularEntries.map(([key]) => key);
    const values = regularEntries.map(([_, value]) => value);

    const cartesian = (...arrays: any[][]): any[][] => {
      return arrays.reduce((acc: any[][], curr: any[]) =>
        acc.flatMap((combo: any[]) => curr.map((item: any) => [...combo, item])),
        [[]]
      );
    };

    const baseCombinations = cartesian(...values);
    combinations.push(...baseCombinations.map((combo: (string | number)[]) => {
      const result: MatrixCombination = {};
      keys.forEach((key, index) => {
        result[key] = String(combo[index]);
      });
      return result;
    }));
  }

  // Handle includes
  if (matrixConfig.include) {
    let includes: MatrixInclude[] = [];
    
    if (typeof matrixConfig.include === 'string') {
      // Parse JSON string include
      try {
        includes = JSON.parse(matrixConfig.include);
      } catch (error) {
        throw new Error(`Failed to parse include JSON string: ${error}`);
      }
    } else if (Array.isArray(matrixConfig.include)) {
      includes = matrixConfig.include;
    }

    // Process each include entry
    for (const include of includes) {
      if (combinations.length === 0) {
        // If no base combinations, add include as a new combination
        combinations.push(Object.entries(include).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as MatrixCombination));
      } else {
        // Add include properties to matching combinations or create new ones
        let added = false;
        const includeEntries = Object.entries(include);
        
        // Try to add to existing combinations
        combinations.forEach(combination => {
          let canAdd = true;
          for (const [key, value] of includeEntries) {
            if (key in combination && combination[key] !== String(value)) {
              canAdd = false;
              break;
            }
          }
          if (canAdd) {
            added = true;
            for (const [key, value] of includeEntries) {
              combination[key] = String(value);
            }
          }
        });

        // If couldn't add to any existing combination, create a new one
        if (!added) {
          combinations.push(Object.entries(include).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as MatrixCombination));
        }
      }
    }
  }

  return combinations;
}

async function executeSteps(steps: StepDefinition[], matrix: MatrixCombination): Promise<StepOutputs> {
  const outputs: StepOutputs = {};
  const stepOutputs: { [stepId: string]: StepOutputs } = {};
  const env: ProcessEnv = {
    ...process.env as ProcessEnv,
    STEPS_OUTPUTS: `steps-outputs-${Object.values(matrix).join('-')}.env`,
  };

  // Add matrix values as environment variables
  Object.entries(matrix).forEach(([key, value]) => {
    const envKey = `MATRIX_${key.toUpperCase()}`;
    env[envKey] = value;
  });

  for (const step of steps) {
    // Add previous step outputs as environment variables
    Object.entries(stepOutputs).forEach(([stepId, stepOutput]) => {
      Object.entries(stepOutput).forEach(([key, value]) => {
        const envKey = `STEPS_${stepId.toUpperCase()}_${key.toUpperCase()}`;
        env[envKey] = value;
      });
    });

    try {
      // Execute step
      await exec.exec('bash', ['-c', step.run], { env });

      // Read step outputs
      try {
        const outputContent = await core.group(`Reading outputs for step ${step.id}`, async () => {
          const { stdout } = await exec.getExecOutput('cat', [env.STEPS_OUTPUTS], { silent: false });
          return stdout;
        });

        // Parse outputs
        const currentStepOutputs = outputContent.split('\n')
          .filter(line => line.includes('='))
          .reduce((acc: StepOutputs, line) => {
            const [key, value] = line.split('=');
            acc[key.trim()] = value.trim();
            return acc;
          }, {});

        // Store outputs both globally and per step
        Object.assign(outputs, currentStepOutputs);
        stepOutputs[step.id] = currentStepOutputs;

        // Clear outputs file
        await exec.exec('rm', [env.STEPS_OUTPUTS]);
      } catch (error) {
        core.warning(`No outputs found for step ${step.id}`);
      }
    } catch (error) {
      core.error(`Step ${step.id} failed: ${error}`);
      throw error;
    }
  }

  return outputs;
}

run();