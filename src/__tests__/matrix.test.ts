import { generateMatrixCombinations } from '../matrix';

interface TestMatrixItem {
  fruit?: string;
  animal?: string;
  color?: string;
  shape?: string;
  combo?: string;
  [key: string]: string | undefined;
}

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

  it('matches GitHub Actions matrix behavior', () => {
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
    
    // Add combo field for testing
    const resultWithCombos = result.map(item => ({
      ...item,
      combo: [item.fruit, item.animal, item.color, item.shape]
        .filter(Boolean)
        .join('-')
    }));

    expect(resultWithCombos).toEqual([
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle', combo: 'apple-cat-pink-circle' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle', combo: 'apple-dog-green-circle' },
      { fruit: 'pear', animal: 'cat', color: 'pink', combo: 'pear-cat-pink' },
      { fruit: 'pear', animal: 'dog', color: 'green', combo: 'pear-dog-green' },
      { fruit: 'banana', combo: 'banana' },
      { fruit: 'banana', animal: 'cat', combo: 'banana-cat' }
    ]);
  });

  it('exactly matches GitHub Actions JSON comparison', () => {
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
    
    // Add combo field for testing
    const resultWithCombos: TestMatrixItem[] = result.map(item => ({
      ...item,
      combo: [item.fruit, item.animal, item.color, item.shape]
        .filter(Boolean)
        .join('-')
    }));

    // Sort by all fields to match GitHub Actions behavior
    const sortedResult = resultWithCombos.sort((a, b) => {
      // First by fruit value
      if (a.fruit !== b.fruit) {
        return String(a.fruit || '').localeCompare(String(b.fruit || ''));
      }

      // Then by number of properties for standalone includes
      if (a.fruit === 'banana' && b.fruit === 'banana') {
        const aKeys = Object.keys(a).length;
        const bKeys = Object.keys(b).length;
        if (aKeys !== bKeys) return aKeys - bKeys;
      }

      // Then by other fields
      const fields = ['animal', 'color', 'shape'] as const;
      for (const field of fields) {
        if (a[field] !== b[field]) {
          if (!a[field]) return 1;
          if (!b[field]) return -1;
          return String(a[field]).localeCompare(String(b[field]));
        }
      }
      return 0;
    });

    expect(sortedResult).toEqual([
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle', combo: 'apple-cat-pink-circle' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle', combo: 'apple-dog-green-circle' },
      { fruit: 'banana', combo: 'banana' },
      { fruit: 'banana', animal: 'cat', combo: 'banana-cat' },
      { fruit: 'pear', animal: 'cat', color: 'pink', combo: 'pear-cat-pink' },
      { fruit: 'pear', animal: 'dog', color: 'green', combo: 'pear-dog-green' }
    ]);
  });
}); 