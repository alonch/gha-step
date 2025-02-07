import { generateMatrixCombinations } from '../matrix';

describe('generateMatrixCombinations', () => {
  it('handles basic matrix combinations', () => {
    const input = {
      fruit: ['apple', 'pear'],
      animal: ['cat', 'dog']
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { fruit: 'apple', animal: 'cat' },
      { fruit: 'apple', animal: 'dog' },
      { fruit: 'pear', animal: 'cat' },
      { fruit: 'pear', animal: 'dog' }
    ]);
  });

  it('handles matrix with includes', () => {
    const input = {
      fruit: ['apple', 'pear'],
      animal: ['cat', 'dog'],
      include: [
        { color: 'green' },
        { color: 'pink', animal: 'cat' },
        { fruit: 'apple', shape: 'circle' },
        { fruit: 'banana' },
        { fruit: 'banana', animal: 'cat' }
      ]
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle' },
      { fruit: 'pear', animal: 'cat', color: 'pink' },
      { fruit: 'pear', animal: 'dog', color: 'green' },
      { fruit: 'banana' },
      { fruit: 'banana', animal: 'cat' }
    ]);
  });

  it('handles includes without base matrix', () => {
    const input = {
      include: [
        { color: 'green' },
        { color: 'pink', animal: 'cat' },
        { fruit: 'apple', shape: 'circle' },
        { fruit: 'banana' },
        { fruit: 'banana', animal: 'cat' }
      ]
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { color: 'green' },
      { color: 'pink', animal: 'cat' },
      { fruit: 'apple', shape: 'circle' },
      { fruit: 'banana' },
      { fruit: 'banana', animal: 'cat' }
    ]);
  });

  it('handles JSON string includes', () => {
    const input = {
      include: JSON.stringify([
        { color: 'green' },
        { color: 'pink', animal: 'cat' }
      ])
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { color: 'green' },
      { color: 'pink', animal: 'cat' }
    ]);
  });
}); 