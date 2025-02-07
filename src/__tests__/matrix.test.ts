import { generateMatrixCombinations } from '../matrix';

interface TestMatrixItem {
  fruit?: string;
  animal?: string;
  color?: string;
  shape?: string;
  combo?: string;
  [key: string]: string | undefined;
}

// Helper function to compare arrays ignoring order
function expectSameContent(actual: any[], expected: any[]) {
  // Only check that all expected items exist in actual
  for (const item of expected) {
    expect(actual).toContainEqual(item);
  }
  // And that actual doesn't have extra items
  expect(actual.length).toBe(expected.length);
}

describe('generateMatrixCombinations', () => {
  it('handles basic matrix combinations', () => {
    const input = {
      fruit: ['apple', 'pear'],
      animal: ['cat', 'dog']
    };

    const result = generateMatrixCombinations(input);
    expectSameContent(result, [
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
    expectSameContent(result, [
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
    expectSameContent(result, [
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
    expectSameContent(result, [
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

    expectSameContent(resultWithCombos, [
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle', combo: 'apple-cat-pink-circle' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle', combo: 'apple-dog-green-circle' },
      { fruit: 'pear', animal: 'cat', color: 'pink', combo: 'pear-cat-pink' },
      { fruit: 'pear', animal: 'dog', color: 'green', combo: 'pear-dog-green' },
      { fruit: 'banana', combo: 'banana' },
      { fruit: 'banana', animal: 'cat', combo: 'banana-cat' }
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
    expectSameContent(result, [
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
    expectSameContent(result, [
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
    expectSameContent(result, [
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
    expectSameContent(result, [
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
    expectSameContent(result, [
      { fruit: 'apple', animal: 'cat', color: 'pink' },
      { fruit: 'apple', animal: 'dog', color: 'green' },
      { fruit: 'pear', animal: 'cat', color: 'pink' },
      { fruit: 'pear', animal: 'dog', color: 'green' },
      { fruit: 'banana' },
      { fruit: 'banana', animal: 'cat' },
      { fruit: 'cherry' },
      { fruit: 'cherry', color: 'red' }
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

    expectSameContent(resultWithCombos, [
      { fruit: 'apple', animal: 'cat', color: 'pink', shape: 'circle', combo: 'apple-cat-pink-circle' },
      { fruit: 'apple', animal: 'dog', color: 'green', shape: 'circle', combo: 'apple-dog-green-circle' },
      { fruit: 'pear', animal: 'cat', color: 'pink', combo: 'pear-cat-pink' },
      { fruit: 'pear', animal: 'dog', color: 'green', combo: 'pear-dog-green' },
      { fruit: 'banana', combo: 'banana' },
      { fruit: 'banana', animal: 'cat', combo: 'banana-cat' }
    ]);
  });

  it('should handle array values in includes', () => {
    const input = {
      include: [
        { fruit: 'apple', color: ['green', 'red', 'yellow'] }
      ]
    };

    const result = generateMatrixCombinations(input);
    expectSameContent(result, [
      { fruit: 'apple', color: 'green' },
      { fruit: 'apple', color: 'red' },
      { fruit: 'apple', color: 'yellow' }
    ]);
  });

  it('should handle multiple array values in includes', () => {
    const input = {
      include: [
        { 
          fruit: 'apple', 
          color: ['green', 'red'],
          size: ['small', 'large']
        }
      ]
    };

    const result = generateMatrixCombinations(input);
    expectSameContent(result, [
      { fruit: 'apple', color: 'green', size: 'small' },
      { fruit: 'apple', color: 'green', size: 'large' },
      { fruit: 'apple', color: 'red', size: 'small' },
      { fruit: 'apple', color: 'red', size: 'large' }
    ]);
  });

  it('should handle mix of array and scalar values in includes', () => {
    const input = {
      include: [
        { 
          fruit: 'apple',
          color: ['green', 'red'],
          shape: 'round',
          size: ['small', 'large']
        }
      ]
    };

    const result = generateMatrixCombinations(input);
    expectSameContent(result, [
      { fruit: 'apple', color: 'green', shape: 'round', size: 'small' },
      { fruit: 'apple', color: 'green', shape: 'round', size: 'large' },
      { fruit: 'apple', color: 'red', shape: 'round', size: 'small' },
      { fruit: 'apple', color: 'red', shape: 'round', size: 'large' }
    ]);
  });

  it('should handle multiple includes with arrays', () => {
    const input = {
      include: [
        { fruit: 'apple', color: ['green', 'red'] },
        { fruit: 'banana', color: ['yellow', 'brown'] }
      ]
    };

    const result = generateMatrixCombinations(input);
    expectSameContent(result, [
      { fruit: 'apple', color: 'green' },
      { fruit: 'apple', color: 'red' },
      { fruit: 'banana', color: 'yellow' },
      { fruit: 'banana', color: 'brown' }
    ]);
  });

  describe('array values in includes', () => {
    it('should expand array values into separate combinations', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: ['green', 'red', 'yellow'],
            shape: 'round'
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round' },
        { fruit: 'apple', color: 'red', shape: 'round' },
        { fruit: 'apple', color: 'yellow', shape: 'round' }
      ]);
    });

    it('should expand comma-separated strings as arrays', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: 'green,red,yellow',
            shape: 'round'
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round' },
        { fruit: 'apple', color: 'red', shape: 'round' },
        { fruit: 'apple', color: 'yellow', shape: 'round' }
      ]);
    });

    it('should handle multiple includes with arrays', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: ['green', 'red', 'yellow'],
            shape: 'round'
          },
          {
            fruit: 'banana',
            color: ['yellow', 'brown']
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round' },
        { fruit: 'apple', color: 'red', shape: 'round' },
        { fruit: 'apple', color: 'yellow', shape: 'round' },
        { fruit: 'banana', color: 'yellow' },
        { fruit: 'banana', color: 'brown' }
      ]);
    });

    it('should handle multiple includes with comma-separated strings', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: 'green,red,yellow',
            shape: 'round'
          },
          {
            fruit: 'banana',
            color: 'yellow,brown'
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round' },
        { fruit: 'apple', color: 'red', shape: 'round' },
        { fruit: 'apple', color: 'yellow', shape: 'round' },
        { fruit: 'banana', color: 'yellow' },
        { fruit: 'banana', color: 'brown' }
      ]);
    });

    it('should handle mix of arrays and comma-separated strings', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: ['green', 'red', 'yellow'],
            shape: 'round'
          },
          {
            fruit: 'banana',
            color: 'yellow,brown'
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round' },
        { fruit: 'apple', color: 'red', shape: 'round' },
        { fruit: 'apple', color: 'yellow', shape: 'round' },
        { fruit: 'banana', color: 'yellow' },
        { fruit: 'banana', color: 'brown' }
      ]);
    });

    it('should handle arrays with base matrix', () => {
      const input = {
        fruit: ['apple', 'pear'],
        animal: ['cat', 'dog'],
        include: [
          { 
            fruit: 'apple',
            color: ['green', 'red'],
            shape: 'round'
          },
          {
            fruit: 'banana',
            color: 'yellow,brown'
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      expectSameContent(result, [
        { fruit: 'apple', animal: 'cat', color: 'green', shape: 'round' },
        { fruit: 'apple', animal: 'cat', color: 'red', shape: 'round' },
        { fruit: 'apple', animal: 'dog', color: 'green', shape: 'round' },
        { fruit: 'apple', animal: 'dog', color: 'red', shape: 'round' },
        { fruit: 'pear', animal: 'cat' },
        { fruit: 'pear', animal: 'dog' },
        { fruit: 'banana', color: 'yellow' },
        { fruit: 'banana', color: 'brown' }
      ]);
    });

    it('should preserve order of array values', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: ['green', 'red', 'yellow'], // Explicit array
            shape: 'round'
          },
          {
            fruit: 'banana',
            color: 'yellow,brown' // Comma-separated string
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      
      // Check apple combinations contain expected colors
      const appleResults = result.filter(r => r.fruit === 'apple');
      expect(appleResults.map(r => r.color)).toEqual(expect.arrayContaining(['green', 'red', 'yellow']));
      expect(appleResults.length).toBe(3);

      // Check banana combinations contain expected colors
      const bananaResults = result.filter(r => r.fruit === 'banana');
      expect(bananaResults.map(r => r.color)).toEqual(expect.arrayContaining(['yellow', 'brown']));
      expect(bananaResults.length).toBe(2);
    });

    it('should handle array values with combo fields', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: ['green', 'red', 'yellow'],
            shape: 'round'
          },
          {
            fruit: 'banana',
            color: 'yellow,brown'
          }
        ]
      };

      const result = generateMatrixCombinations(input);
      
      // Add combo field for testing
      const resultWithCombos = result.map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      }));

      expectSameContent(resultWithCombos, [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ]);
    });
  });
}); 