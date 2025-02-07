interface StepOutputs {
  [key: string]: string | string[];
}

export function collectStepOutputs(outputs: string[]): StepOutputs {
  // Use a Map to track all values for each key
  const valueMap = new Map<string, Set<string>>();

  for (const line of outputs) {
    // Skip malformed lines
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    // Skip empty keys or empty values
    if (!key.trim() || !value.trim()) continue;

    // Get or create Set for this key
    if (!valueMap.has(key)) {
      valueMap.set(key, new Set());
    }
    valueMap.get(key)!.add(value);
  }

  // Convert to final output format
  const result: StepOutputs = {};
  for (const [key, values] of valueMap.entries()) {
    const valuesArray = Array.from(values);
    // If we only have one value, return it as a string
    // Otherwise return the array of values in insertion order
    result[key] = valuesArray.length === 1 ? valuesArray[0] : valuesArray;
  }

  return result;
} 