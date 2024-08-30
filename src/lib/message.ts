export function message(role: "assistant" | "user" | "system") {
  return function taggedLiteral(templates: TemplateStringsArray, ...args: any[]) {
    return {
      role,
      content: zip(
        [...templates],
        args.map((arg) => `${arg}`)
      ).join(""),
    };
  };
}

export function assistant(templates: TemplateStringsArray, ...args: any[]) {
  return {
    role: "assistant" as const,
    content: zip(
      [...templates],
      args.map((arg) => `${arg}`)
    ).join(""),
  };
}

export function user(templates: TemplateStringsArray, ...args: any[]) {
  return {
    role: "user" as const,
    content: zip(
      [...templates],
      args.map((arg) => `${arg}`)
    ).join(""),
  };
}

export function system(templates: TemplateStringsArray, ...args: any[]) {
  return {
    role: "system" as const,
    content: zip(
      [...templates],
      args.map((arg) => `${arg}`)
    ).join(""),
  };
}

function zip<T, U>(array1: T[], array2: U[]): (T | U)[] {
  const array1Mut = array1.slice();
  const array2Mut = array2.slice();
  const result: (T | U)[] = [];

  while (array1Mut.length > 0 || array2Mut.length > 0) {
    if (array1Mut.length > 0) {
      result.push(array1Mut.shift()!);
    }
    if (array2Mut.length > 0) {
      result.push(array2Mut.shift()!);
    }
  }

  return result;
}
