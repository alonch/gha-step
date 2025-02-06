"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const yaml = __importStar(require("yaml"));
function validateMatrixConfig(config) {
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
async function run() {
    try {
        // Parse inputs
        const matrixInput = core.getInput('matrix', { required: true });
        const stepsInput = core.getInput('steps', { required: true });
        const outputsInput = core.getInput('outputs', { required: true });
        // Parse YAML inputs
        const matrixConfig = yaml.parse(matrixInput);
        validateMatrixConfig(matrixConfig);
        const steps = yaml.parse(stepsInput);
        const outputs = yaml.parse(outputsInput);
        if (!matrixConfig[0]) {
            throw new Error('Invalid matrix configuration');
        }
        // Generate matrix combinations
        const combinations = generateMatrixCombinations(matrixConfig[0]);
        const results = [];
        // Execute matrix combinations in parallel
        const promises = combinations.map(async (combination) => {
            try {
                const result = await executeSteps(steps, combination);
                results.push({ ...combination, ...result });
            }
            catch (error) {
                core.error(`Failed to execute combination ${JSON.stringify(combination)}: ${error}`);
                throw error;
            }
        });
        await Promise.all(promises);
        // Set the final output
        core.setOutput('json', JSON.stringify(results));
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}
function generateMatrixCombinations(matrix) {
    const keys = Object.keys(matrix);
    const values = keys.map(key => matrix[key]);
    const cartesian = (...arrays) => {
        return arrays.reduce((acc, curr) => acc.flatMap((combo) => curr.map((item) => [...combo, item])), [[]]);
    };
    const combinations = cartesian(...values);
    return combinations.map((combo) => {
        const result = {};
        keys.forEach((key, index) => {
            result[key] = combo[index];
        });
        return result;
    });
}
async function executeSteps(steps, matrix) {
    const outputs = {};
    const stepOutputs = {};
    const env = {
        ...process.env,
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
                    .reduce((acc, line) => {
                    const [key, value] = line.split('=');
                    acc[key.trim()] = value.trim();
                    return acc;
                }, {});
                // Store outputs both globally and per step
                Object.assign(outputs, currentStepOutputs);
                stepOutputs[step.id] = currentStepOutputs;
                // Clear outputs file
                await exec.exec('rm', [env.STEPS_OUTPUTS]);
            }
            catch (error) {
                core.warning(`No outputs found for step ${step.id}`);
            }
        }
        catch (error) {
            core.error(`Step ${step.id} failed: ${error}`);
            throw error;
        }
    }
    return outputs;
}
run();
