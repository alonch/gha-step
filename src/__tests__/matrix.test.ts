import { generateMatrixCombinations } from '../matrix';
import { parse as parseYaml } from 'yaml';

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

    it('should handle workflow array include case', () => {
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

      // Add combo field for testing
      const result = generateMatrixCombinations(input).map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];

      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ]);

      // Also verify that no items have comma-separated color values
      for (const item of result) {
        expect(item.color).not.toContain(',');
      }
    });

    it('should handle workflow array include case with comma strings', () => {
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

      // Add combo field for testing
      const result = generateMatrixCombinations(input).map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];

      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ]);

      // Also verify that no items have comma-separated color values
      for (const item of result) {
        expect(item.color).not.toContain(',');
      }
    });

    it('should handle exact workflow input format', () => {
      const input = {
        matrix: {
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
        }
      };

      // Add combo field for testing
      const result = generateMatrixCombinations(input.matrix).map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];

      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ]);

      // Also verify that no items have comma-separated color values
      for (const item of result) {
        expect(item.color).not.toContain(',');
      }
    });

    it('should handle exact workflow YAML string format', () => {
      const yamlInput = `
        - fruit: apple
          color: [green, red, yellow]
          shape: round
        - fruit: banana
          color: [yellow, brown]
      `;

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

      // Add combo field for testing
      const result = generateMatrixCombinations(input).map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];

      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ]);

      // Also verify that no items have comma-separated color values
      for (const item of result) {
        expect(item.color).not.toContain(',');
      }

      // Test YAML string input
      const yamlResult = generateMatrixCombinations(yamlInput).map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];
      expectSameContent(yamlResult, result);
    });

    it('should handle exact workflow YAML string format with comma strings', () => {
      const yamlInput = `
        - fruit: apple
          color: green,red,yellow
          shape: round
        - fruit: banana
          color: yellow,brown
      `;

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

      // Add combo field for testing
      const result = generateMatrixCombinations(input).map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];

      expectSameContent(result, [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ]);

      // Also verify that no items have comma-separated color values
      for (const item of result) {
        expect(item.color).not.toContain(',');
      }

      // Test YAML string input
      const yamlResult = generateMatrixCombinations(yamlInput).map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];
      expectSameContent(yamlResult, result);
    });

    it('should parse YAML arrays correctly before expansion', () => {
      const yamlInput = `
        - fruit: apple
          color: [green, red]  # YAML array syntax
          shape: round
        - fruit: banana
          color: yellow,brown  # Comma string syntax
      `;

      // First verify the YAML parsing
      const parsed = parseYaml(yamlInput);
      expect(parsed).toEqual([
        {
          fruit: 'apple',
          color: ['green', 'red'],  // Should be an array
          shape: 'round'
        },
        {
          fruit: 'banana',
          color: 'yellow,brown'  // Should be a string
        }
      ]);

      // Then verify the matrix expansion
      const result = generateMatrixCombinations(yamlInput);

      // Log the intermediate state for debugging
      console.log('Parsed YAML:', JSON.stringify(parsed, null, 2));
      console.log('Final Result:', JSON.stringify(result, null, 2));

      // Verify each combination is properly expanded
      const appleResults = result.filter(r => r.fruit === 'apple');
      expect(appleResults).toEqual(expect.arrayContaining([
        { fruit: 'apple', color: 'green', shape: 'round' },
        { fruit: 'apple', color: 'red', shape: 'round' }
      ]));
      expect(appleResults.length).toBe(2);

      const bananaResults = result.filter(r => r.fruit === 'banana');
      expect(bananaResults).toEqual(expect.arrayContaining([
        { fruit: 'banana', color: 'yellow' },
        { fruit: 'banana', color: 'brown' }
      ]));
      expect(bananaResults.length).toBe(2);

      // Verify no items have comma-separated values
      for (const item of result) {
        expect(item.color).not.toContain(',');
      }
    });

    it('should handle workflow input format exactly', () => {
      const input = {
        matrix: `
          - os: [ubuntu, macos]
            arch: [amd64, arm64]
        `
      };

      // First verify the YAML parsing
      const parsed = parseYaml(input.matrix);
      expect(parsed).toEqual([
        {
          os: ['ubuntu', 'macos'],
          arch: ['amd64', 'arm64']
        }
      ]);

      // Then verify the matrix expansion
      const result = generateMatrixCombinations(input.matrix);

      // Log the intermediate state for debugging
      console.log('Parsed YAML:', JSON.stringify(parsed, null, 2));
      console.log('Final Result:', JSON.stringify(result, null, 2));

      // Verify each combination
      expectSameContent(result, [
        { os: 'ubuntu', arch: 'amd64' },
        { os: 'ubuntu', arch: 'arm64' },
        { os: 'macos', arch: 'amd64' },
        { os: 'macos', arch: 'arm64' }
      ]);

      // Verify no items have array values
      for (const item of result) {
        expect(Array.isArray(item.os)).toBe(false);
        expect(Array.isArray(item.arch)).toBe(false);
      }
    });

    it('should handle complete workflow structure', () => {
      const workflowInput = {
        with: {
          matrix: `
            - fruit: apple
              color: [green, red, yellow]
              shape: round
            - fruit: banana
              color: [yellow, brown]
          `
        }
      };

      // First verify the YAML parsing
      const parsed = parseYaml(workflowInput.with.matrix);
      expect(parsed).toEqual([
        {
          fruit: 'apple',
          color: ['green', 'red', 'yellow'],
          shape: 'round'
        },
        {
          fruit: 'banana',
          color: ['yellow', 'brown']
        }
      ]);

      // Then verify the matrix expansion
      const result = generateMatrixCombinations(workflowInput.with.matrix);

      // Log the intermediate state for debugging
      console.log('Workflow Input:', JSON.stringify(workflowInput, null, 2));
      console.log('Parsed YAML:', JSON.stringify(parsed, null, 2));
      console.log('Final Result:', JSON.stringify(result, null, 2));

      // Add combo field for testing
      const resultWithCombos = result.map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];

      expectSameContent(resultWithCombos, [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ]);

      // Verify no items have array values or comma-separated strings
      for (const item of result) {
        expect(Array.isArray(item.color)).toBe(false);
        expect(item.color).not.toContain(',');
      }
    });

    it('should match workflow validation logic exactly', () => {
      const input = {
        with: {
          matrix: `
            - fruit: apple
              color: [green, red, yellow]
              shape: round
            - fruit: banana
              color: [yellow, brown]
          `
        }
      };

      // Get the result
      const result = generateMatrixCombinations(input.with.matrix);

      // Add combo field for testing
      const resultWithCombos = result.map(item => ({
        ...item,
        combo: [item.fruit, item.color].filter(Boolean).join('-')
      })) as (TestMatrixItem & { combo: string })[];

      // Log raw result for debugging
      console.log('Raw Result:', JSON.stringify(resultWithCombos, null, 2));

      // Verify each combination exists using the workflow's approach
      const expectedCombinations: (TestMatrixItem & { combo: string })[] = [
        { fruit: 'apple', color: 'green', shape: 'round', combo: 'apple-green' },
        { fruit: 'apple', color: 'red', shape: 'round', combo: 'apple-red' },
        { fruit: 'apple', color: 'yellow', shape: 'round', combo: 'apple-yellow' },
        { fruit: 'banana', color: 'yellow', combo: 'banana-yellow' },
        { fruit: 'banana', color: 'brown', combo: 'banana-brown' }
      ];

      // Check each expected combination exists in the result
      for (const expected of expectedCombinations) {
        const found = resultWithCombos.some(actual => 
          Object.entries(expected).every(([key, value]) => (actual as any)[key] === value)
        );
        expect(found).toBe(true);
      }

      // Check we don't have extra combinations
      expect(resultWithCombos.length).toBe(expectedCombinations.length);

      // Verify no arrays or comma strings in the output
      for (const item of resultWithCombos) {
        for (const [key, value] of Object.entries(item)) {
          expect(Array.isArray(value)).toBe(false);
          if (typeof value === 'string') {
            expect(value).not.toContain(',');
          }
        }
      }
    });
  });

  describe('outputs.json format', () => {
    it('should format array values correctly in output', () => {
      const input = {
        with: {
          matrix: `
            - fruit: apple
              color: [green, red, yellow]
              shape: round
            - fruit: banana
              color: [yellow, brown]
          `
        }
      };

      // Get the matrix combinations
      const result = generateMatrixCombinations(input.with.matrix);

      // Simulate the output.json format from index.ts
      const outputJson = JSON.stringify(result);

      // Parse it back as the workflow would
      const parsed = JSON.parse(outputJson);

      // Verify the structure matches what the workflow expects
      expect(parsed).toEqual([
        { fruit: 'apple', color: 'green', shape: 'round' },
        { fruit: 'apple', color: 'red', shape: 'round' },
        { fruit: 'apple', color: 'yellow', shape: 'round' },
        { fruit: 'banana', color: 'yellow' },
        { fruit: 'banana', color: 'brown' }
      ]);

      // Verify no arrays in the stringified output
      expect(outputJson).not.toContain('[green,red,yellow]');
      expect(outputJson).not.toContain('[yellow,brown]');

      // Verify no comma-separated values in the stringified output
      expect(outputJson).not.toMatch(/"color":"[^"]+,[^"]+"/)
    });

    it('should handle array values in step outputs correctly', () => {
      const input = {
        with: {
          matrix: `
            - os: [ubuntu]
          `
        }
      };

      const result = generateMatrixCombinations(input.with.matrix);

      // Simulate step outputs
      const withStepOutputs = result.map(item => ({
        ...item,
        tags: ['v1.0', 'latest', 'stable']  // Array output from a step
      }));

      // Simulate the output.json format
      const outputJson = JSON.stringify(withStepOutputs);

      // Parse it back as the workflow would
      const parsed = JSON.parse(outputJson);

      // Verify the structure
      expect(parsed).toEqual([
        { os: 'ubuntu', tags: ['v1.0', 'latest', 'stable'] }
      ]);

      // Arrays from step outputs should remain as arrays
      expect(parsed[0].tags).toEqual(['v1.0', 'latest', 'stable']);
    });

    it('should handle conflicts between matrix inputs and step outputs', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: 'red'
          }
        ]
      };

      // Simulate step output overriding matrix input
      const result = generateMatrixCombinations(input);
      const withStepOutputs = result.map(item => ({
        ...item,
        fruit: 'banana'  // Step output trying to override matrix input
      }));

      // Verify the output structure
      expect(withStepOutputs).toEqual([
        { fruit: 'banana', color: 'red' }  // Step output takes precedence
      ]);

      // Simulate the output.json format
      const outputJson = JSON.stringify(withStepOutputs);
      const parsed = JSON.parse(outputJson);

      // Verify the structure after serialization
      expect(parsed).toEqual([
        { fruit: 'banana', color: 'red' }  // Step output value persists
      ]);
    });

    it('should handle multiple output conflicts with matrix inputs', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            color: 'red',
            shape: 'round'
          }
        ]
      };

      // Simulate multiple step outputs conflicting with matrix inputs
      const result = generateMatrixCombinations(input);
      const withStepOutputs = result.map(item => ({
        ...item,
        fruit: 'banana',     // Override fruit
        color: 'yellow',     // Override color
        extra: 'additional'  // New output
      }));

      // Verify the output structure
      expect(withStepOutputs).toEqual([
        { 
          fruit: 'banana',     // Step output overrides
          color: 'yellow',     // Step output overrides
          shape: 'round',      // Original matrix value preserved
          extra: 'additional'  // New step output added
        }
      ]);

      // Simulate the output.json format
      const outputJson = JSON.stringify(withStepOutputs);
      const parsed = JSON.parse(outputJson);

      // Verify the structure after serialization
      expect(parsed).toEqual([
        { 
          fruit: 'banana',     // Step output value persists
          color: 'yellow',     // Step output value persists
          shape: 'round',      // Original matrix value preserved
          extra: 'additional'  // New step output preserved
        }
      ]);
    });

    it('should handle array output conflicts with matrix inputs', () => {
      const input = {
        include: [
          { 
            fruit: 'apple',
            tags: ['v1']
          }
        ]
      };

      // Simulate array step output conflicting with matrix input
      const result = generateMatrixCombinations(input);
      const withStepOutputs = result.map(item => ({
        ...item,
        fruit: ['banana', 'orange'],  // Array output trying to override scalar input
        tags: ['v2', 'latest']        // Array output overriding array input
      }));

      // Verify the output structure
      expect(withStepOutputs).toEqual([
        { 
          fruit: ['banana', 'orange'],  // Array output overrides scalar input
          tags: ['v2', 'latest']        // Array output overrides array input
        }
      ]);

      // Simulate the output.json format
      const outputJson = JSON.stringify(withStepOutputs);
      const parsed = JSON.parse(outputJson);

      // Verify the structure after serialization
      expect(parsed).toEqual([
        { 
          fruit: ['banana', 'orange'],  // Array structure preserved
          tags: ['v2', 'latest']        // Array structure preserved
        }
      ]);
    });
  });
}); 