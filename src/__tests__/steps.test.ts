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