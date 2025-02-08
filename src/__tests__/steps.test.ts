import { collectStepOutputs } from '../steps';
import { executeSteps } from '../index';

// Mock @actions/core
jest.mock('@actions/core', () => ({
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  group: jest.fn((name, fn) => fn()),
  setFailed: jest.fn(),
}));

// Mock @actions/exec
jest.mock('@actions/exec', () => ({
  exec: jest.fn(),
  getExecOutput: jest.fn(),
}));

// Get the mocked modules
import * as core from '@actions/core';
import * as exec from '@actions/exec';

describe('collectStepOutputs', () => {
  it('should collect single value outputs', () => {
    const outputs = [
      'os=mac'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      os: 'mac'
    });
  });

  it('should collect multiple values for same key into an array', () => {
    const outputs = [
      'os=mac',
      'os=ubuntu'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      os: ['mac', 'ubuntu']
    });
  });

  it('should handle multiple different keys', () => {
    const outputs = [
      'os=mac',
      'version=12.0',
      'os=ubuntu',
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      os: ['mac', 'ubuntu'],
      version: '12.0',
      arch: 'x64'
    });
  });

  it('should handle empty outputs', () => {
    const outputs: string[] = [];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({});
  });

  it('should handle malformed outputs', () => {
    const outputs = [
      'os=mac',
      'invalid-line',
      'os=ubuntu',
      '=empty-key',
      'empty-value='
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      os: ['mac', 'ubuntu']
    });
  });

  it('should preserve order of multiple values', () => {
    const outputs = [
      'os=mac',
      'os=ubuntu',
      'os=windows'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      os: ['mac', 'ubuntu', 'windows']
    });
    // Verify the exact order
    expect(result.os).toEqual(['mac', 'ubuntu', 'windows']);
  });

  it('should handle duplicate values as a set', () => {
    const outputs = [
      'os=mac',
      'os=ubuntu',
      'os=mac',      // Duplicate
      'os=windows',
      'os=ubuntu',   // Duplicate
      'os=mac'       // Duplicate
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      os: ['mac', 'ubuntu', 'windows']
    });
  });

  it('should keep single value when duplicates exist', () => {
    const outputs = [
      'os=mac',
      'os=mac',
      'os=mac'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      os: 'mac'
    });
  });

  it('should collect sequential values in order', () => {
    const outputs = [
      'tags=v1.0',
      'tags=latest',
      'tags=stable',
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      tags: ['v1.0', 'latest', 'stable'],
      arch: 'x64'
    });
    // Verify exact order
    expect(result.tags).toEqual(['v1.0', 'latest', 'stable']);
  });

  it('should handle CSV format for array values', () => {
    const outputs = [
      'tags=v1.0,latest,stable',
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      tags: ['v1.0', 'latest', 'stable'],
      arch: 'x64'
    });
    // Verify exact order
    expect(result.tags).toEqual(['v1.0', 'latest', 'stable']);
  });

  it('should handle repeated values for arrays', () => {
    const outputs = [
      'tags=v1.0',
      'tags=latest',
      'tags=stable',
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      tags: ['v1.0', 'latest', 'stable'],
      arch: 'x64'
    });
    // Verify exact order
    expect(result.tags).toEqual(['v1.0', 'latest', 'stable']);
  });

  it('should handle mixed CSV and repeated values', () => {
    const outputs = [
      'tags=v1.0,latest',  // CSV format
      'tags=stable',       // Single value
      'tags=beta,alpha',   // Another CSV
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      tags: ['v1.0', 'latest', 'stable', 'beta', 'alpha'],
      arch: 'x64'
    });
  });

  it('should handle empty values in CSV', () => {
    const outputs = [
      'tags=v1.0,,latest,,stable',  // Empty values in CSV
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      tags: ['v1.0', 'latest', 'stable'],
      arch: 'x64'
    });
  });

  it('should handle whitespace in CSV values', () => {
    const outputs = [
      'tags= v1.0 , latest , stable ',  // Whitespace around values
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      tags: ['v1.0', 'latest', 'stable'],
      arch: 'x64'
    });
  });

  it('should deduplicate values from mixed formats', () => {
    const outputs = [
      'tags=v1.0,latest',     // CSV format
      'tags=stable,v1.0',     // Duplicate in CSV
      'tags=latest',          // Duplicate as single value
      'arch=x64'
    ];
    
    const result = collectStepOutputs(outputs);
    expect(result).toEqual({
      tags: ['v1.0', 'latest', 'stable'],
      arch: 'x64'
    });
  });
});

describe('executeSteps', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset mock implementations
    (exec.getExecOutput as jest.Mock).mockReset();
    (exec.exec as jest.Mock).mockReset();
    (core.info as jest.Mock).mockReset();
    (core.warning as jest.Mock).mockReset();
    (core.error as jest.Mock).mockReset();
    (core.group as jest.Mock).mockReset().mockImplementation((name, fn) => fn());
  });

  it('should handle successful step execution', async () => {
    // Mock successful execution
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ stdout: 'Step output', stderr: '', exitCode: 0 }) // Step execution
      .mockResolvedValueOnce({ stdout: 'key=value', stderr: '', exitCode: 0 }); // Reading outputs
    
    (exec.exec as jest.Mock).mockResolvedValue(0); // For rm command

    const steps = [{
      name: 'Test Step',
      id: 'test',
      run: 'echo "test"'
    }];

    const matrix = { test: '1' };
    
    const result = await executeSteps(steps, matrix);
    
    // Verify outputs were collected
    expect(result).toEqual({ key: 'value' });
    
    // Verify proper formatting
    expect(core.info).toHaveBeenCalledWith('\nStandard Output:');
    expect(core.info).toHaveBeenCalledWith('---------------');
    expect(core.info).toHaveBeenCalledWith('Step output');
    expect(core.info).toHaveBeenCalledWith('');
  });

  it('should handle step failure but still collect outputs', async () => {
    // Mock failed execution but with outputs
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ stdout: 'Step output', stderr: 'Error output', exitCode: 1 }) // Step execution
      .mockResolvedValueOnce({ stdout: 'key=value', stderr: '', exitCode: 0 }); // Reading outputs
    
    (exec.exec as jest.Mock).mockResolvedValue(0); // For rm command

    const steps = [{
      name: 'Test Step',
      id: 'test',
      run: 'exit 1'
    }];

    const matrix = { test: '2' };
    
    // Expect the step to throw
    await expect(executeSteps(steps, matrix)).rejects.toThrow('Step failed with exit code 1');
    
    // Verify error was logged
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Step test failed'));
    
    // Verify outputs were still collected before throwing
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('key=value'));
  });

  it('should handle step failure with no outputs', async () => {
    // Mock failed execution with no outputs
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ stdout: '', stderr: 'Error output', exitCode: 1 }) // Step execution
      .mockRejectedValueOnce(new Error('No such file')); // Reading outputs fails

    const steps = [{
      name: 'Test Step',
      id: 'test',
      run: 'exit 1'
    }];

    const matrix = { test: '2' };
    
    // Expect the step to throw
    await expect(executeSteps(steps, matrix)).rejects.toThrow('Step failed with exit code 1');
    
    // Verify error was logged
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Step test failed'));
    
    // Verify no "No outputs found" warning when step failed
    expect(core.warning).not.toHaveBeenCalled();
  });

  it('should handle successful step with no outputs', async () => {
    // Mock successful execution but no outputs
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ stdout: 'Step output', stderr: '', exitCode: 0 }) // Step execution
      .mockRejectedValueOnce(new Error('No such file')); // Reading outputs fails

    const steps = [{
      name: 'Test Step',
      id: 'test',
      run: 'echo "test"'
    }];

    const matrix = { test: '1' };
    
    const result = await executeSteps(steps, matrix);
    
    // Verify empty outputs
    expect(result).toEqual({});
    
    // Verify warning was shown for missing outputs
    expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('No outputs found'));
  });

  it('should format output groups correctly', async () => {
    // Mock successful execution with various outputs
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ 
        stdout: 'Normal output\nMore output', 
        stderr: 'Warning message', 
        exitCode: 0 
      }) // Step execution
      .mockResolvedValueOnce({ 
        stdout: 'key1=value1\nkey2=value2', 
        stderr: '', 
        exitCode: 0 
      }); // Reading outputs
    
    (exec.exec as jest.Mock).mockResolvedValue(0); // For rm command

    const steps = [{
      name: 'Test Step',
      id: 'test',
      run: 'echo "test"'
    }];

    const matrix = { test: '1' };
    
    await executeSteps(steps, matrix);
    
    // Verify group formatting
    const infoCallArgs = (core.info as jest.Mock).mock.calls.map(call => call[0]);
    
    // Verify stdout formatting
    expect(infoCallArgs).toContain('\nStandard Output:');
    expect(infoCallArgs).toContain('---------------');
    expect(infoCallArgs).toContain('Normal output\nMore output');
    expect(infoCallArgs).toContain('');
    
    // Verify stderr formatting
    expect(infoCallArgs).toContain('\nStandard Error:');
    expect(infoCallArgs).toContain('--------------');
    expect(infoCallArgs).toContain('Warning message');
    expect(infoCallArgs).toContain('');
    
    // Verify outputs formatting
    expect(infoCallArgs).toContain('\nStep Outputs:');
    expect(infoCallArgs).toContain('-------------');
    expect(infoCallArgs).toContain('key1=value1\nkey2=value2');
    expect(infoCallArgs).toContain('');
  });

  it('should format error messages correctly for step failures', async () => {
    // Mock failed execution
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ stdout: '', stderr: 'Command failed', exitCode: 1 }) // Step execution
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }); // Reading outputs (empty)
    
    (exec.exec as jest.Mock).mockResolvedValue(0); // For rm command

    const steps = [{
      name: 'Fail Step',
      id: 'fail',
      run: 'exit 1'
    }];

    const matrix = { test: '1' };
    
    // Expect the step to throw with correct error message
    await expect(executeSteps(steps, matrix)).rejects.toThrow('Step failed with exit code 1');
    
    // Verify error was logged with correct format
    expect(core.error).toHaveBeenCalledWith('Step fail failed: Error: Step failed with exit code 1');
  });

  it('should handle multiple step failures in sequence', async () => {
    // Mock failed executions
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ stdout: '', stderr: 'First failure', exitCode: 1 }) // First step
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }) // Reading outputs (empty)
      .mockResolvedValueOnce({ stdout: '', stderr: 'Second failure', exitCode: 1 }) // Second step
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }); // Reading outputs (empty)
    
    (exec.exec as jest.Mock).mockResolvedValue(0); // For rm commands

    const steps = [
      {
        name: 'Fail Step 1',
        id: 'fail1',
        run: 'exit 1'
      },
      {
        name: 'Fail Step 2',
        id: 'fail2',
        run: 'exit 1'
      }
    ];

    const matrix = { test: '1' };
    
    // Expect the first step to throw
    await expect(executeSteps(steps, matrix)).rejects.toThrow('Step failed with exit code 1');
    
    // Verify error was logged for the first step only (second step shouldn't execute)
    expect(core.error).toHaveBeenCalledTimes(1);
    expect(core.error).toHaveBeenCalledWith('Step fail1 failed: Error: Step failed with exit code 1');
  });

  it('should include stderr in error output group', async () => {
    // Mock failed execution with stderr
    (exec.getExecOutput as jest.Mock)
      .mockResolvedValueOnce({ 
        stdout: 'Some output', 
        stderr: 'Error: something went wrong\nMore error details', 
        exitCode: 1 
      }) // Step execution
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }); // Reading outputs (empty)
    
    (exec.exec as jest.Mock).mockResolvedValue(0); // For rm command

    const steps = [{
      name: 'Fail Step',
      id: 'fail',
      run: 'exit 1'
    }];

    const matrix = { test: '1' };
    
    // Execute and expect failure
    await expect(executeSteps(steps, matrix)).rejects.toThrow('Step failed with exit code 1');
    
    // Verify both stdout and stderr were logged in the group
    const infoCallArgs = (core.info as jest.Mock).mock.calls.map(call => call[0]);
    
    // Check stdout section
    expect(infoCallArgs).toContain('\nStandard Output:');
    expect(infoCallArgs).toContain('---------------');
    expect(infoCallArgs).toContain('Some output');
    
    // Check stderr section
    expect(infoCallArgs).toContain('\nStandard Error:');
    expect(infoCallArgs).toContain('--------------');
    expect(infoCallArgs).toContain('Error: something went wrong\nMore error details');
  });
}); 