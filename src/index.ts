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

async function run(): Promise<void> {
  try {
    // Parse inputs
    const matrixInput = core.getInput('matrix', { required: true });
    const stepsInput = core.getInput('steps', { required: true });
    const outputsInput = core.getInput('outputs', { required: true });

    // Parse YAML inputs
    const matrixConfig = yaml.parse(matrixInput) as { [key: string]: string[] }[];
    const steps = yaml.parse(stepsInput) as StepDefinition[];
    const outputs = yaml.parse(outputsInput);

    if (!matrixConfig || !matrixConfig[0]) {
      throw new Error('Invalid matrix configuration');
    }

    // Generate matrix combinations
    const combinations: MatrixCombination[] = generateMatrixCombinations(matrixConfig[0]);
    const results: any[] = [];

    // Execute matrix combinations in parallel
    const promises = combinations.map(async (combination) => {
      const result = await executeSteps(steps, combination);
      results.push({ ...combination, ...result });
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
  const env: ProcessEnv = {
    ...process.env as ProcessEnv,
    STEPS_OUTPUTS: 'steps-outputs.env',
  };

  // Add matrix values as environment variables
  Object.entries(matrix).forEach(([key, value]) => {
    const envKey = `MATRIX_${key.toUpperCase()}`;
    env[envKey] = value;
  });

  for (const step of steps) {
    // Add previous step outputs as environment variables
    Object.entries(outputs).forEach(([key, value]) => {
      const envKey = `STEPS_${step.id.toUpperCase()}_${key.toUpperCase()}`;
      env[envKey] = value;
    });

    // Execute step
    await exec.exec('bash', ['-c', step.run], { env });

    // Read step outputs
    try {
      const outputContent = await core.group(`Reading outputs for step ${step.id}`, async () => {
        const { stdout } = await exec.getExecOutput('cat', [env.STEPS_OUTPUTS], { silent: true });
        return stdout;
      });

      // Parse outputs
      const stepOutputs = outputContent.split('\n')
        .filter(line => line.includes('='))
        .reduce((acc: StepOutputs, line) => {
          const [key, value] = line.split('=');
          acc[key.trim()] = value.trim();
          return acc;
        }, {});

      Object.assign(outputs, stepOutputs);

      // Clear outputs file
      await exec.exec('rm', [env.STEPS_OUTPUTS]);
    } catch (error) {
      core.warning(`No outputs found for step ${step.id}`);
    }
  }

  return outputs;
}

run(); 