import * as acorn from 'acorn';

type condition = {
    left: expression;
    op: mathop | logicop | logicbinop;
    right: expression;
}

type mathop = '+' | '-' | '*' | '/';
type logicop = '<=' | '>=' | '<' | '>' | '==' | '!=';
type logicbinop = '&&' | '||';
type subscript = {
    base: string;
    index: string;
}

type BoolOp = { op: logicbinop; values: expression[] };

type expression = condition | subscript | condition[] | expression[] | string | number | BoolOp;

const transform = {
    '&&': 'and',
    '||': 'or',
}


function desParseExpr(expr: expression, vars: Record<string, any>): string {
    // caso base/index
    if (typeof expr === 'object' && expr !== null && 'base' in expr && 'index' in expr) {
        return `${vars[expr.index]}`;
    }
    // caso condición simple
    else if (typeof expr === 'object' && expr !== null && 'left' in expr && 'op' in expr && 'right' in expr) {
        const left = desParseExpr(expr.left, vars);
        const right = desParseExpr(expr.right, vars);
        return `(${left} ${expr.op} ${right})`;
    }
    // caso BoolOp
    else if (typeof expr === 'object' && expr !== null && 'op' in expr && 'values' in expr) {
        const values = expr.values.map(v => desParseExpr(v, vars));
        const transforminv = Object.fromEntries(Object.entries(transform).map(([k, v]) => [v, k]));
        return `(${values.join(` ${transforminv[expr.op]} `)})`;
    }
    // caso array de condiciones
    else if (Array.isArray(expr)) {
        return expr.map(e => desParseExpr(e, vars)).join(' && ');
    }
    // caso string
    else if (typeof expr === 'string') {
        if (expr in vars) {
            return vars[expr];
        } else {
            return expr;
        }
    }
    // caso número
    else if (typeof expr === 'number') {
        return expr.toString();
    }
    else {
        throw new Error(`Invalid expression: ${JSON.stringify(expr)}`);
    }
}

function parseExpr(exprStr: string): expression {
    const ast = acorn.parse(exprStr, { ecmaVersion: 2020 }) as acorn.Node & { body: any[] };
    const firstStmt = ast.body[0];
    if (firstStmt && firstStmt.type === 'ExpressionStatement') {
        return parseNode(firstStmt.expression);
    } else {
        throw new Error('Input string is not a valid expression statement');
    }
}

function parseNode(node: any): expression {
    try {
    switch (node.type) {
        case 'Literal':
            return node.value;
        case 'BinaryExpression':
            let op = node.operator;
            if (!['+', '-', '*', '/', '<=', '>=', '<', '>', '==', '!='].includes(op)) {
                throw new Error(`Unsupported binary operator: ${node.operator}`);
            }
            if (
                ['<', '<=', '>', '>='].includes(op) && 
                node.left.type === 'BinaryExpression' && 
                ['<', '<=', '>', '>='].includes(node.left.operator)
            ) {
                throw new Error("Chained comparisons (like 'a <= x < b') are not supported");
            }
            return {
                left: parseNode(node.left),
                op: op,
                right: parseNode(node.right)
            };
        case 'LogicalExpression':
            if (!['&&', '||'].includes(node.operator)) {
                throw new Error(`Unsupported logical operator: ${node.operator}`);
            }
            return {
                op: transform[node.operator as keyof typeof transform] || node.operator,
                values: [parseNode(node.left), parseNode(node.right)]
            };
        case 'Identifier':
            return node.name;
        case 'ArrayExpression':
            return node.elements.map(parseNode);
        default:
            throw new Error(`Unknown node type: ${node.type}`);
    }} catch (error) {
        console.error("Error parsing node:", node, error);
        throw error;
    }
}

export { desParseExpr, parseExpr };