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

function validateMatrixConfig(config: any): asserts config is { [key: string]: string[] }[] {
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
      if (!Array.isArray(value)) {
        throw new Error(`Matrix entry "${key}" must be an array`);
      }
      if (value.length === 0) {
        throw new Error(`Matrix entry "${key}" cannot be empty`);
      }
      value.forEach((item, itemIndex) => {
        if (typeof item !== 'string') {
          throw new Error(`Value at index ${itemIndex} in matrix entry "${key}" must be a string`);
        }
      });
    });
  });
}

async function run(): Promise<void> {
  try {
    // Parse inputs
    const matrixInput = core.getInput('matrix', { required: true });
    const stepsInput = core.getInput('steps', { required: true });
    const outputsInput = core.getInput('outputs', { required: true });

    // Parse YAML inputs
    const matrixConfig = yaml.parse(matrixInput);
    validateMatrixConfig(matrixConfig);
    const steps = yaml.parse(stepsInput) as StepDefinition[];
    const outputs = yaml.parse(outputsInput);

    if (!matrixConfig[0]) {
      throw new Error('Invalid matrix configuration');
    }

    // Generate matrix combinations
    const combinations: MatrixCombination[] = generateMatrixCombinations(matrixConfig[0]);
    const results: any[] = [];

    // Execute matrix combinations in parallel
    const promises = combinations.map(async (combination) => {
      try {
        const result = await executeSteps(steps, combination);
        results.push({ ...combination, ...result });
      } catch (error) {
        core.error(`Failed to execute combination ${JSON.stringify(combination)}: ${error}`);
        throw error;
      }
    });

    await Promise.all(promises);

    // Set the final output
    core.setOutput('json', JSON.stringify(results));
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

function generateMatrixCombinations(matrix: { [key: string]: string[] }): MatrixCombination[] {
  const keys = Object.keys(matrix);
  const values = keys.map(key => matrix[key]);

  const cartesian = (...arrays: any[][]): any[][] => {
    return arrays.reduce((acc: any[][], curr: any[]) =>
      acc.flatMap((combo: any[]) => curr.map((item: any) => [...combo, item])),
      [[]]
    );
  };

  const combinations = cartesian(...values);
  return combinations.map((combo: string[]) => {
    const result: MatrixCombination = {};
    keys.forEach((key, index) => {
      result[key] = combo[index];
    });
    return result;
  });
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