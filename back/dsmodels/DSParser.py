import ast
import dill


class DSParser:
    def __init__(self):
        self.op_map = {
            # comparadores
            ast.Gt: '>',
            ast.Lt: '<',
            ast.GtE: '>=',
            ast.LtE: '<=',
            ast.Eq: '==',
            ast.NotEq: '!=',
            # aritméticos
            ast.Add: '+',
            ast.Sub: '-',
            ast.Mult: '*',
            ast.Div: '/',
            ast.Mod: '%',
            ast.Pow: '**',
            ast.FloorDiv: '//'
        }
        self.op_inverse_map = {
            # comparadores
            '>': ast.Gt,
            '<': ast.Lt,
            '>=': ast.GtE,
            '<=': ast.LtE,
            '==': ast.Eq,
            '!=': ast.NotEq,
            # aritméticos
            '+': ast.Add,
            '-': ast.Sub,
            '*': ast.Mult,
            '/': ast.Div,
            '%': ast.Mod,
            '**': ast.Pow,
            '//': ast.FloorDiv
        }
    def extract_condition(self, expr, vars_map=None):
        """
        Extrae una condición de una expresión AST, devolviendo un JSON con la estructura
        adecuada. Soporta combinaciones booleanas (and/or) y comparaciones encadenadas.
        
        :param expr: Expresión AST a procesar.
        :param vars_map: Mapa de variables para resolver nombres de variables.
        :return: JSON representando la condición.
        """
        if isinstance(expr, ast.BoolOp):
            op_type = type(expr.op)
            op_str = 'and' if op_type == ast.And else 'or' if op_type == ast.Or else None
            if op_str is None:
                raise NotImplementedError("Solo se soporta 'and' y 'or'")
            values = [self.extract_condition(v, vars_map) for v in expr.values]
            return {"op": op_str, "values": values}

        # Comparación encadenada: 0 < x < 2
        elif isinstance(expr, ast.Compare):
            left = expr.left
            comps = expr.comparators
            ops = expr.ops
            conditions = []
            for i in range(len(ops)):
                a = left
                b = comps[i]
                op = ops[i]

                var = self.parse_side(a, vars_map)
                value = self.parse_side(b, vars_map)
                direction = self.op_map[type(op)]
                # Si la variable está en b y el valor en a, invertimos
                if isinstance(b, (ast.Name, ast.Subscript)) and not isinstance(a, (ast.Name, ast.Subscript)):
                    var, value = value, var
                    direction = {
                        ">": "<", "<": ">", ">=": "<=", "<=": ">=", "==": "==", "!=": "!="
                    }[direction]

                conditions.append({"left": var, "op": direction, "right": value})
                left = comps[i]
            return conditions

        else:
            raise NotImplementedError("Expresión no soportada (aún)")
    
    def parse_side(self, side, vars_map=None):
        """
        Convierte un lado de una expresión AST a su representación en JSON.
        Soporta variables, subíndices, constantes y operaciones aritméticas básicas.
        
        :param side: Nodo AST a procesar.
        :param vars_map: Mapa de variables para resolver nombres de variables.
        :return: Representación en JSON del lado de la expresión.
        """
        if isinstance(side, ast.Name): # Nombre de variable
            """ if vars_map is not None and side.id in vars_map and vars_map[side.id] is not None:
                return vars_map[side.id] """
            return side.id
        elif isinstance(side, ast.Subscript):
            base = self.parse_side(side.value, vars_map)
            index = self.parse_side(side.slice, vars_map)
            return self.parse_subscript(base, index)
        elif isinstance(side, ast.Constant):
            return side.value
        elif isinstance(side, ast.NameConstant):
            return side.value
        elif isinstance(side, ast.Num):
            return side.n
        elif isinstance(side, ast.BinOp):
            op_str = self.op_map[type(side.op)]
            if op_str is None:
                print(f"Operador no soportado: {type(side.op)}")
                raise NotImplementedError("Solo se soportan operaciones aritméticas básicas")
            return {
                "op": op_str,
                "left": self.parse_side(side.left, vars_map),
                "right": self.parse_side(side.right, vars_map)
            }
        else:
            return ast.unparse(side)
        
    def parse_subscript(self, base, index):
        """
        Convierte un nodo Subscript AST a su representación en JSON.
        
        :param base: Nodo base (value) del subíndice.
        :param index: Nodo índice (slice) del subíndice.
        :return: Representación en JSON del subíndice.
        """
        return {
            "base": base,
            "index": index
        }

    def lambda_rule_to_json(self, lambda_fn, vars_values=None):
        """
        Convierte una función lambda que usa DSRule a su representación JSON.
        Si la función ya tiene un JSON guardado, lo devuelve directamente.
        
        :param lambda_fn: Función lambda a procesar.
        :param vars_values: Valores de las variables si se proporcionan.
        :return: JSON de la condición y un mapa de variables.
        """
        if hasattr(lambda_fn, "_ds_json_condition"):
            json_condition = lambda_fn._ds_json_condition
            vars_map = {}
            if vars_values is not None:
                vars_map = {f"var{i}": v for i, v in enumerate(vars_values)}
            return json_condition, vars_map

        
        source = dill.source.getsource(lambda_fn).strip()
        tree = ast.parse(source)
        visitor = DSRuleVisitor()
        visitor.visit(tree)

        if visitor.dsrule_call is None:
            raise ValueError("No se encontró una llamada a DSRule en la lambda")

        dsrule_call = visitor.dsrule_call
        lambda_node = dsrule_call.args[0]  # Primer argumento: la función lambda

        # Nos interesa el cuerpo del lambda
        if not isinstance(lambda_node, ast.Lambda):
            raise ValueError("El primer argumento no es una lambda")

        
        condition_expr = lambda_node.body
        vars = lambda_node.args
        vars_map = {}
        for i, var in enumerate(vars.args):
            if isinstance(var, ast.arg):
                vars_map[var.arg] = var.annotation if var.annotation else None
        #usamos vars_values si se proporcionó, pero nos saltamos la primera variable (self)
        if vars_values is not None:
            for i, var in enumerate(vars_values):
                vars_map[vars.args[i + 1].arg] = var if i <= len(vars_values) - 1 else None
        print(f"Vars map: {vars_map}")
              
        return self.extract_condition(condition_expr, vars_map), vars_map
    
    
    
    def json_index(self, json, vars_values):
        """
        Recorre el json buscando que variables de vars_values son un index de un subscription
        """
        index_values = []
        if isinstance(json, list):
            for item in json:
                index_values.extend(self.json_index(item, vars_values))
        elif isinstance(json, dict):
            keys = list(json.keys())
            for key in keys:
                if key == "index":
                    index_values.append(json[key])
                elif isinstance(json[key], dict):
                    index_values.extend(self.json_index(json[key], vars_values))
        else:
            []
        return index_values

    def build_expr(self, condition, columns):
        """
        Construye un nodo AST a partir de una condición en JSON.
        Soporta combinaciones booleanas (and/or) y comparaciones encadenadas.
        
        :param condition: Condición en formato JSON.
        :return: Nodo AST representando la condición.
        """
        if isinstance(condition, dict) and 'op' in condition and condition['op'] in ('and', 'or'):
            # caso de combinación booleana
            op = ast.And() if condition['op'] == 'and' else ast.Or()
            values = [self.build_expr(c, columns) for c in condition['values']]
            return ast.BoolOp(op=op, values=values)
        

        elif isinstance(condition, list):
            # caso de comparación encadenada: [a <= x[0], x[0] < b]
            left = self.build_side(condition[0]['left'], columns)
            comparators = []
            ops = []

            for c in condition:
                ops.append(self.op_inverse_map[c['op']]())
                comparators.append(self.build_side(c['right'], columns))

            return ast.Compare(left=left, ops=ops, comparators=comparators)

        elif isinstance(condition, dict):
            # caso simple: {'left': ..., 'op': ..., 'right': ...}
            return ast.Compare(
                left=self.build_side(condition['left'], columns),
                ops=[self.op_inverse_map[condition['op']]()],
                comparators=[self.build_side(condition['right'], columns)]
            )

        else:
            raise ValueError(f"No se puede procesar la condición: {condition}")

    def build_side(self, value, columns):
        """
        Construye un lado de una expresión AST a partir de un valor en JSON.
        
        :param value: Valor en formato JSON.
        :return: Nodo AST representando el lado de la expresión.
        """
        if isinstance(value, dict) and 'op' in value:
            # Expresión binaria
            op_class = self.op_inverse_map[value['op']]
            left = self.build_side(value['left'], columns)
            right = self.build_side(value['right'], columns)
            return ast.BinOp(left=left, op=op_class(), right=right)
        elif isinstance(value, str) and value.startswith('x['):
            # parseamos 'x[0]' → ast.Subscript
            index_str = value[2:-1]  # lo que está dentro de los []
            index_val = int(index_str)
            return ast.Subscript(
                value=ast.Name(id='x', ctx=ast.Load()),
                slice=ast.Constant(value=index_val),
                ctx=ast.Load()
            )
        elif isinstance(value, str):
            if value in columns:
                return ast.Subscript(
                    value=ast.Name(id='x', ctx=ast.Load()),
                    slice=ast.Constant(value=columns.index(value)),
                    ctx=ast.Load()
                )
            # Nombre de variable
            return ast.Name(id=value, ctx=ast.Load())
        else:
            # Constante (numero, booleano, etc.)
            return ast.Constant(value=value)

    def json_to_lambda(self, json_condition, columns):
        """
        Retorna una lambda x: ... a partir de una condición en JSON,
        y guarda el JSON dentro de un atributo oculto para reconstrucción futura.
        """
        expr = self.build_expr(json_condition, columns)
        lambda_func = ast.Lambda(
            args=ast.arguments(
                posonlyargs=[], args=[ast.arg(arg='x')], kwonlyargs=[],
                kw_defaults=[], defaults=[]
            ),
            body=expr
        )
        mod = ast.Expression(body=lambda_func)
        ast.fix_missing_locations(mod)
        compiled = compile(mod, "<string>", mode="eval")
        func = eval(compiled)

        # Guardamos el JSON original como atributo oculto
        func._ds_json_condition = json_condition
        return func

        
class DSRuleVisitor(ast.NodeVisitor):
    def __init__(self):
        self.dsrule_call = None

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name) and node.func.id == "DSRule":
            self.dsrule_call = node
        self.generic_visit(node)