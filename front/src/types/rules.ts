export type Rule = {
    rule: string;
    mass: number[];
}

export type Rules = {
    rules: Rule[];
    classes: Record<string, number>;
}

export type GroupedRule = {
    mass: number[];
    labels: any;
    parsedRule: any;
}