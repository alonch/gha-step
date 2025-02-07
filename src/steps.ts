interface StepOutputs {
  [key: string]: string | string[];
}

export function collectStepOutputs(outputs: string[]): StepOutputs {
  const result: StepOutputs = {};

  for (const line of outputs) {
    // Skip malformed lines
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const [, key, value] = match;
    // Skip empty keys or empty values
    if (!key.trim() || !value.trim()) continue;

    if (key in result) {
      // If we already have this key
      const existing = result[key];
      if (Array.isArray(existing)) {
        // If it's already an array, append to it only if not already present
        if (!existing.includes(value)) {
          existing.push(value);
        }
      } else {
        // Convert to array with both values only if they're different
        result[key] = existing === value ? existing : [existing, value];
      }
    } else {
      // First occurrence of this key
      result[key] = value;
    }
  }

  return result;
} 