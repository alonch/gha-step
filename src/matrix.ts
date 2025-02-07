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
  const standaloneIncludes = includes.filter((inc: MatrixInclude) => {
    // Check if this include has a complete configuration that doesn't need matrix values
    const hasRequiredMatrixKeys = keys.every(key => inc.hasOwnProperty(key));
    if (hasRequiredMatrixKeys) return true;

    // Check if this include specifies values that override matrix completely
    const specifiedKeys = Object.keys(inc);
    return specifiedKeys.some(key => matrix[key] && !matrix[key].includes(inc[key]));
  });

  return [...result, ...standaloneIncludes];
} 