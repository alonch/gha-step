interface MatrixCombination {
  [key: string]: any;
}

interface MatrixInclude {
  [key: string]: any;
}

type MatrixInput = {
  [key: string]: any[] | MatrixInclude[] | MatrixInclude | string;
};

function expandMatrix(matrix: Record<string, any[]>): MatrixCombination[] {
  const keys = Object.keys(matrix);
  if (keys.length === 0) return [];

  return keys.reduce<MatrixCombination[]>((acc, key) => {
    const values = matrix[key];
    if (acc.length === 0) {
      return values.map(value => ({ [key]: value }));
    }
    return acc.flatMap(combo => 
      values.map(value => ({ ...combo, [key]: value }))
    );
  }, []);
}

function expandInclude(include: MatrixInclude): MatrixCombination[] {
  const entries = Object.entries(include);
  const arrayEntries = entries.filter(([_, value]) => Array.isArray(value) || (typeof value === 'string' && value.includes(',')));
  const scalarEntries = entries.filter(([_, value]) => !Array.isArray(value) && !(typeof value === 'string' && value.includes(',')));

  // Convert any comma-separated strings to arrays
  const processedArrayEntries = arrayEntries.map(([key, value]) => {
    if (typeof value === 'string') {
      return [key, value.split(',').map(v => v.trim()).filter(Boolean)];
    }
    return [key, value];
  });

  // Start with scalar values
  let result: MatrixCombination = {};
  for (const [key, value] of scalarEntries) {
    result[key] = value;
  }

  // If no array values, return single combination
  if (processedArrayEntries.length === 0) {
    return [result];
  }

  // Expand array values using cartesian product
  const arrayKeys = processedArrayEntries.map(([key]) => key);
  const arrayValues = processedArrayEntries.map(([_, values]) => values as any[]);

  const cartesian = (...arrays: any[][]): any[][] => {
    return arrays.reduce((acc: any[][], curr: any[]) =>
      acc.flatMap((combo: any[]) => curr.map((item: any) => [...combo, item])),
      [[]]
    );
  };

  const combinations = cartesian(...arrayValues);
  return combinations.map(combo => {
    const expanded = { ...result };
    arrayKeys.forEach((key, index) => {
      expanded[key] = combo[index];
    });
    return expanded;
  });
}

function matchesInclude(base: MatrixCombination, include: MatrixInclude): { matches: boolean; score: number } {
  let matchCount = 0;
  let totalMatchableKeys = 0;

  for (const [key, value] of Object.entries(include)) {
    if (key === 'if') continue;
    if (base[key] !== undefined) {
      totalMatchableKeys++;
      if (Array.isArray(value) || (typeof value === 'string' && value.includes(','))) {
        // For array values, check if base value is in the array
        const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim()).filter(Boolean);
        if (values.includes(base[key])) {
          matchCount++;
        }
      } else if (base[key] === value) {
        matchCount++;
      }
    }
  }

  return {
    matches: matchCount > 0,
    score: totalMatchableKeys > 0 ? matchCount / totalMatchableKeys : 0
  };
}

function isStandaloneInclude(include: MatrixInclude, baseCombinations: MatrixCombination[], matrixKeys: string[]): boolean {
  const includeKeys = Object.keys(include).filter(key => key !== 'if');
  
  // If the include has a key that's in the base matrix but with a different value,
  // and no other keys from the base matrix, it's standalone
  const matrixKeysInInclude = includeKeys.filter(key => matrixKeys.includes(key));
  if (matrixKeysInInclude.length === 1) {
    const key = matrixKeysInInclude[0];
    const value = include[key];
    if (Array.isArray(value) || (typeof value === 'string' && value.includes(','))) {
      // For array values, check if any value is not in the base matrix
      const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim()).filter(Boolean);
      const baseValues = new Set(baseCombinations.map(combo => combo[key]));
      if (values.some(v => !baseValues.has(v))) {
        return true;
      }
    } else {
      const baseValues = new Set(baseCombinations.map(combo => combo[key]));
      if (!baseValues.has(value)) {
        return true;
      }
    }
  }

  // If the include has no keys that overlap with any base combination,
  // and it's not a simple default value (single key), then it's standalone
  if (includeKeys.length === 1 && !matrixKeys.includes(includeKeys[0])) {
    return false; // Single non-matrix key includes are treated as defaults
  }

  for (const base of baseCombinations) {
    let hasMatchingKey = false;
    let hasConflict = false;

    for (const [key, value] of Object.entries(include)) {
      if (key === 'if') continue;
      if (base[key] !== undefined) {
        hasMatchingKey = true;
        if (Array.isArray(value) || (typeof value === 'string' && value.includes(','))) {
          // For array values, check if any value matches
          const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim()).filter(Boolean);
          if (!values.includes(base[key])) {
            hasConflict = true;
            break;
          }
        } else if (base[key] !== value) {
          hasConflict = true;
          break;
        }
      }
    }

    // If we have matching keys and no conflicts, this is not a standalone include
    if (hasMatchingKey && !hasConflict) {
      return false;
    }
  }

  return true;
}

export function generateMatrixCombinations(input: MatrixInput): MatrixCombination[] {
  // Extract matrix and include from input
  const { include, ...matrixInput } = input;
  const matrixKeys = Object.keys(matrixInput);
  const hasMatrix = matrixKeys.length > 0;

  // Parse includes
  const includes = include ? (
    typeof include === 'string' ? JSON.parse(include) as MatrixInclude[] :
    Array.isArray(include) ? include : [include]
  ) : [];

  // Handle includes without matrix
  if (!hasMatrix) {
    return includes.flatMap(inc => expandInclude(inc));
  }

  // Generate base combinations from matrix
  const matrix = Object.fromEntries(
    Object.entries(matrixInput).map(([key, value]) => [key, Array.isArray(value) ? value : [value]])
  ) as Record<string, any[]>;
  
  const baseCombinations = expandMatrix(matrix);
  const result: MatrixCombination[] = [];
  const processedCombinations = new Set<string>();

  // First, identify standalone includes and default values
  const standaloneIncludes = includes.filter(inc => isStandaloneInclude(inc, baseCombinations, matrixKeys));
  const defaultIncludes = includes.filter(inc => {
    const keys = Object.keys(inc).filter(key => key !== 'if');
    return keys.length === 1 && !matrixKeys.includes(keys[0]) && !isStandaloneInclude(inc, baseCombinations, matrixKeys);
  });
  const matchingIncludes = includes.filter(inc => 
    !isStandaloneInclude(inc, baseCombinations, matrixKeys) && 
    !(Object.keys(inc).filter(key => key !== 'if').length === 1 && !matrixKeys.includes(Object.keys(inc).filter(key => key !== 'if')[0]))
  );

  // Process base combinations
  for (const base of baseCombinations) {
    let current = { ...base };
    
    // First apply default includes
    for (const inc of defaultIncludes) {
      const expanded = expandInclude(inc);
      for (const exp of expanded) {
        for (const [key, value] of Object.entries(exp)) {
          if (current[key] === undefined) {
            current[key] = value;
          }
        }
      }
    }

    // Then find all includes that match this combination
    const matchingIncludesForBase = matchingIncludes
      .map(inc => {
        const { matches, score } = matchesInclude(base, inc);
        return { include: inc, matches, score };
      })
      .filter(({ matches }) => matches)
      .sort((a, b) => b.score - a.score); // Sort by match score descending

    if (matchingIncludesForBase.length > 0) {
      // Start with current (base + defaults)
      let combinations: MatrixCombination[] = [current];
      
      // Apply each matching include in order of specificity
      for (const { include } of matchingIncludesForBase) {
        const expanded = expandInclude(include);
        const newCombinations: MatrixCombination[] = [];

        // For each existing combination
        for (const combination of combinations) {
          // Find all expanded values that match our base combination
          const matchingExpanded = expanded.filter(exp => {
            for (const [key, value] of Object.entries(exp)) {
              // Skip checking keys that aren't in the base combination
              if (base[key] === undefined) continue;
              // For matching keys, values must match exactly
              if (base[key] !== value) {
                return false;
              }
            }
            return true;
          });

          if (matchingExpanded.length > 0) {
            // Create a new combination for each matching expanded value
            for (const exp of matchingExpanded) {
              newCombinations.push({ ...combination, ...exp });
            }
          } else {
            // Keep the original combination if no matches
            newCombinations.push(combination);
          }
        }

        combinations = newCombinations;
      }

      // Add each unique combination
      for (const combination of combinations) {
        const combinationStr = JSON.stringify(combination);
        if (!processedCombinations.has(combinationStr)) {
          result.push(combination);
          processedCombinations.add(combinationStr);
        }
      }
    } else {
      // No matching includes, add the current combination with default includes
      const combinationStr = JSON.stringify(current);
      if (!processedCombinations.has(combinationStr)) {
        result.push(current);
        processedCombinations.add(combinationStr);
      }
    }
  }

  // Add standalone includes
  for (const inc of standaloneIncludes) {
    const expanded = expandInclude(inc);
    for (const combination of expanded) {
      const combinationStr = JSON.stringify(combination);
      if (!processedCombinations.has(combinationStr)) {
        result.push(combination);
        processedCombinations.add(combinationStr);
      }
    }
  }

  return result;
} 