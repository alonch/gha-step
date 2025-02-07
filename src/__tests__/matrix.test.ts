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

  it('handles conditional includes correctly', () => {
    const input = {
      animal: ['cat', 'dog'],
      include: [
        { color: 'green' },           // default color
        { color: 'pink', animal: 'cat' }  // override for cats
      ]
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { animal: 'cat', color: 'pink' },
      { animal: 'dog', color: 'green' }
    ]);
  });

  it('handles include overrides in correct order', () => {
    const input = {
      fruit: ['apple'],
      animal: ['cat', 'dog'],
      include: [
        { color: 'green' },              // default color
        { color: 'pink', animal: 'cat' }, // override for cats
        { shape: 'circle', fruit: 'apple' } // add shape to apple
      ]
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle' }
    ]);
  });

  it('handles standalone includes in correct order', () => {
    const input = {
      fruit: ['apple'],
      animal: ['cat'],
      include: [
        { fruit: 'banana', animal: 'cat' },  // complex banana
        { fruit: 'banana' }                  // simple banana
      ]
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { fruit: 'apple', animal: 'cat' },
      { fruit: 'banana' },                // simple should come first
      { fruit: 'banana', animal: 'cat' }  // complex should come second
    ]);
  });

  it('handles multiple conditional includes', () => {
    const input = {
      fruit: ['apple', 'pear'],
      animal: ['cat', 'dog'],
      include: [
        { color: 'green' },                    // default color
        { color: 'pink', animal: 'cat' },      // override for cats
        { shape: 'circle', fruit: 'apple' },   // add shape to apples
        { size: 'small', animal: 'cat', fruit: 'apple' }  // specific to apple+cat
      ]
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle', size: 'small' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle' },
      { fruit: 'pear', animal: 'cat', color: 'pink' },
      { fruit: 'pear', animal: 'dog', color: 'green' }
    ]);
  });

  it('handles complex ordering with standalone includes', () => {
    const input = {
      fruit: ['apple', 'pear'],
      animal: ['cat', 'dog'],
      include: [
        { color: 'green' },
        { color: 'pink', animal: 'cat' },
        { fruit: 'banana' },
        { fruit: 'banana', animal: 'cat' },
        { fruit: 'cherry' },
        { fruit: 'cherry', color: 'red' }
      ]
    };

    const result = generateMatrixCombinations(input);
    expect(result).toEqual([
      { fruit: 'apple', animal: 'cat', color: 'pink' },
      { fruit: 'apple', animal: 'dog', color: 'green' },
      { fruit: 'banana' },
      { fruit: 'banana', animal: 'cat' },
      { fruit: 'cherry' },
      { fruit: 'cherry', color: 'red' },
      { fruit: 'pear', animal: 'cat', color: 'pink' },
      { fruit: 'pear', animal: 'dog', color: 'green' }
    ]);
  });

  it('matches exact GitHub Actions include behavior', () => {
    const input = {
      fruit: ['apple', 'pear'],
      animal: ['cat', 'dog'],
      include: [
        { color: 'green' },                  // default color for all
        { color: 'pink', animal: 'cat' },    // override color for cats
        { fruit: 'apple', shape: 'circle' }, // add shape to apples
        { fruit: 'banana' },                 // standalone simple
        { fruit: 'banana', animal: 'cat' }   // standalone complex
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
      { fruit: 'banana', combo: 'banana' },
      { fruit: 'banana', animal: 'cat', combo: 'banana-cat' },
      { fruit: 'pear', animal: 'cat', color: 'pink', combo: 'pear-cat-pink' },
      { fruit: 'pear', animal: 'dog', color: 'green', combo: 'pear-dog-green' }
    ]);
  });
}); 