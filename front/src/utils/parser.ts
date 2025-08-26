function replaceVariables(obj: any, values: any) {
    if (Array.isArray(obj)) {
        return obj.map(o => replaceVariables(o, values));
    } else if (typeof obj === 'object' && obj !== null) {
        // Reemplazo x[i]
        if ('base' in obj && obj.base === 'x' && 'index' in obj) {
        return values[obj.index]; // ej: i -> "0"
        }

        // Recorremos todas las propiedades
        const newObj = {};
        for (const key in obj) {
        newObj[key] = replaceVariables(obj[key], values);
        }
        return newObj;
    } else if (typeof obj === 'string') {
        // Reemplazo variables tipo v, vl, mi, mj
        return obj in values ? values[obj] : obj;
    } else {
        return obj; // números u otros primitivos
    }
}


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

export { replaceVariables, indexValues };