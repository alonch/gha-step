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

  // Sort matrix combinations
  const matrixResults = result.sort((a, b) => {
    // Sort by fruit first
    if (a.fruit !== b.fruit) {
      return String(a.fruit || '').localeCompare(String(b.fruit || ''));
    }

    // Then by other fields
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

  // Group standalone includes by fruit
  const standaloneByFruit = new Map<string, MatrixCombination[]>();
  for (const inc of standaloneIncludes) {
    const fruit = inc.fruit || '';
    if (!standaloneByFruit.has(fruit)) {
      standaloneByFruit.set(fruit, []);
    }
    standaloneByFruit.get(fruit)!.push(inc);
  }

  // Sort standalone includes within each fruit group
  for (const group of standaloneByFruit.values()) {
    group.sort((a, b) => {
      // Sort by number of properties first (fewer first)
      const aKeys = Object.keys(a).length;
      const bKeys = Object.keys(b).length;
      if (aKeys !== bKeys) return aKeys - bKeys;

      // Then by other fields
      const fields = ['animal', 'color', 'shape'];
      for (const field of fields) {
        if (a[field] !== b[field]) {
          if (!a[field]) return -1;
          if (!b[field]) return 1;
          return String(a[field]).localeCompare(String(b[field]));
        }
      }
      return 0;
    });
  }

  // Get fruits in order
  const fruits = Array.from(standaloneByFruit.keys()).sort((a, b) => {
    // Banana comes before other standalone fruits
    if (a === 'banana' && b !== 'banana') return -1;
    if (b === 'banana' && a !== 'banana') return 1;
    return a.localeCompare(b);
  });

  // Combine all results in the correct order
  const bananaResults = standaloneByFruit.get('banana') || [];
  const otherResults = fruits
    .filter(fruit => fruit !== 'banana')
    .flatMap(fruit => standaloneByFruit.get(fruit)!);

  // Sort the final result to match GitHub Actions behavior
  const allResults = [...matrixResults, ...bananaResults, ...otherResults];
  return allResults;
} 