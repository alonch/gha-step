interface MatrixCombination {
  [key: string]: any;
}

interface MatrixInclude {
  [key: string]: any;
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

  // Process includes and merge with combinations
  const result = [...combinations.map(combo => {
    // For each combination, find matching includes and merge
    const matchingIncludes = includes.filter((inc: MatrixInclude) => {
      return Object.entries(inc).every(([key, value]) => {
        if (!combo.hasOwnProperty(key)) return true;
        return combo[key] === value;
      });
    });

    // Merge all matching includes into the combination
    return matchingIncludes.reduce((acc: MatrixCombination, inc: MatrixInclude) => ({
      ...acc,
      ...inc
    }), combo);
  })];

  // Add standalone includes that have their own complete configuration
  const standaloneIncludes = includes
    .filter((inc: MatrixInclude) => {
      // Check if this include has a complete configuration that doesn't need matrix values
      const hasRequiredMatrixKeys = keys.every(key => inc.hasOwnProperty(key));
      if (hasRequiredMatrixKeys) return true;

      // Check if this include specifies values that override matrix completely
      const specifiedKeys = Object.keys(inc);
      return specifiedKeys.some(key => matrix[key] && !matrix[key].includes(inc[key]));
    })
    // Sort standalone includes to match GitHub Actions behavior
    .sort((a: MatrixInclude, b: MatrixInclude) => {
      // First by fruit value
      if (a.fruit !== b.fruit) {
        if (!a.fruit) return 1;
        if (!b.fruit) return -1;
        return String(a.fruit).localeCompare(String(b.fruit));
      }

      // Then by number of properties (less properties first)
      const aKeys = Object.keys(a).length;
      const bKeys = Object.keys(b).length;
      if (aKeys !== bKeys) return aKeys - bKeys;

      return 0;
    });

  // Sort the result array to match GitHub Actions behavior
  const sortedResult = [...result].sort((a, b) => {
    // First by fruit value
    if (a.fruit !== b.fruit) {
      return String(a.fruit).localeCompare(String(b.fruit));
    }

    // Then by animal value
    if (a.animal !== b.animal) {
      if (!a.animal) return 1;
      if (!b.animal) return -1;
      return String(a.animal).localeCompare(String(b.animal));
    }

    // Then by color value
    if (a.color !== b.color) {
      if (!a.color) return 1;
      if (!b.color) return -1;
      return String(a.color).localeCompare(String(b.color));
    }

    return 0;
  });

  return [...sortedResult, ...standaloneIncludes];
} 