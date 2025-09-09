function indexValues(obj: any, values: any, indices: Set<string> = new Set()): Set<string> {
  if (Array.isArray(obj)) {
    for (const o of obj) {
      indexValues(o, values, indices);
    }
  } else if (typeof obj === "object" && obj !== null) {
    // Caso x[i]
    if ("base" in obj && obj.base === "x" && "index" in obj) {
      indices.add(values[obj.index]);
    }

    // Recorremos todas las propiedades
    for (const key in obj) {
      indexValues(obj[key], values, indices);
    }
  }

  return indices;
}

export { indexValues };