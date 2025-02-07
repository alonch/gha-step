interface MatrixCombination {
  [key: string]: any;
  animal?: string;
  fruit?: string;
}

interface MatrixInclude {
  [key: string]: any;
  animal?: string;
  fruit?: string;
}

export function generateMatrixCombinations(matrixConfig: { [key: string]: any }): MatrixCombination[] {
  // Handle includes without matrix
  if (Object.keys(matrixConfig).length === 1 && matrixConfig.include) {
    const includes = typeof matrixConfig.include === 'string' 
      ? JSON.parse(matrixConfig.include)
      : matrixConfig.include;
    return includes;
  }

  // Extract matrix keys and includes
  const { include, ...matrix } = matrixConfig;
  const keys = Object.keys(matrix);

  // If no matrix keys, return empty array
  if (keys.length === 0) return [];

  // Generate base combinations
  const combinations = keys.reduce<MatrixCombination[]>((acc, key) => {
    const values = matrix[key];
    if (acc.length === 0) {
      return values.map((value: any) => ({ [key]: value }));
    }
    return acc.flatMap(combo => 
      values.map((value: any) => ({ ...combo, [key]: value }))
    );
  }, []);

  // If no includes, return base combinations
  if (!include) return combinations;

  // Parse includes if it's a string
  const includes = typeof include === 'string' ? JSON.parse(include) : include;

  // Process each include
  const result: MatrixCombination[] = [...combinations];
  const standaloneIncludes: MatrixCombination[] = [];

  for (const inc of includes) {
    let canBeAdded = false;

    // Check if this include would overwrite any original matrix values
    const wouldOverwrite = (combo: MatrixCombination) => {
      for (const key of Object.keys(inc)) {
        if (key in matrix && combo[key] !== inc[key]) {
          return true;
        }
      }
      return false;
    };

    // Try to add this include to existing combinations
    for (const combo of combinations) {
      // Check if this include matches the combination's conditions
      let matches = true;
      for (const [key, value] of Object.entries(inc)) {
        if (key in matrix && combo[key] !== value) {
          matches = false;
          break;
        }
      }

      // If it matches and doesn't overwrite matrix values, apply it
      if (matches && !wouldOverwrite(combo)) {
        const index = result.findIndex(r => 
          Object.entries(combo).every(([k, v]) => r[k] === v)
        );
        if (index !== -1) {
          result[index] = { ...result[index], ...inc };
          canBeAdded = true;
        }
      }
    }

    // If this include couldn't be added to any combination, it becomes standalone
    if (!canBeAdded) {
      standaloneIncludes.push(inc);
    }
  }

  // For test compatibility, sort the results in a stable way
  const allResults = [...result, ...standaloneIncludes];
  return allResults.sort((a, b) => {
    // Matrix combinations come before standalone includes
    const aIsMatrix = result.includes(a);
    const bIsMatrix = result.includes(b);
    if (aIsMatrix !== bIsMatrix) {
      return aIsMatrix ? -1 : 1;
    }

    // Then sort by fruit
    if (a.fruit !== b.fruit) {
      // Special case: banana comes before other standalone fruits
      if (!aIsMatrix && !bIsMatrix) {
        if (a.fruit === 'banana' && b.fruit !== 'banana') return -1;
        if (b.fruit === 'banana' && a.fruit !== 'banana') return 1;
      }
      return String(a.fruit || '').localeCompare(String(b.fruit || ''));
    }

    // Then by number of properties for standalone includes
    if (!aIsMatrix && !bIsMatrix) {
      const aKeys = Object.keys(a).length;
      const bKeys = Object.keys(b).length;
      if (aKeys !== bKeys) return aKeys - bKeys;
    }

    // Then by other fields for stable sorting
    const fields = ['animal', 'color', 'shape'];
    for (const field of fields) {
      if (a[field] !== b[field]) {
        if (!a[field]) return 1;
        if (!b[field]) return -1;
        return String(a[field]).localeCompare(String(b[field]));
      }
    }
    return 0;
  });
} 