import { collectStepOutputs } from '../steps';

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
}); 