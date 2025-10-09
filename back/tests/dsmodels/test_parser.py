import pytest
import ast
from dsmodels.DSParser import DSParser


def test_parse_side_constants():
    parser = DSParser()
    # Constante
    node = ast.Constant(value=42)
    assert parser.parse_side(node) == 42
    # Nombre de variable
    node = ast.Name(id="x", ctx=ast.Load())
    assert parser.parse_side(node) == "x"

def test_extract_condition_simple_compare():
    parser = DSParser()
    expr = ast.parse("x > 10").body[0].value
    result = parser.extract_condition(expr)
    assert result == [{"left": "x", "op": ">", "right": 10}]

def test_extract_condition_bool_and():
    parser = DSParser()
    expr = ast.parse("x > 1 and y < 5").body[0].value
    result = parser.extract_condition(expr)
    assert result["op"] == "and"
    assert len(result["values"]) == 2

def test_build_expr_single_condition():
    parser = DSParser()
    condition = [{"left": "x", "op": ">", "right": 5}]
    ast_node = parser.build_expr(condition, ["x"])
    # Evaluar que es un Compare
    assert isinstance(ast_node, ast.Compare)
    assert isinstance(ast_node.ops[0], ast.Gt)

def test_json_to_lambda_eval():
    parser = DSParser()
    array = [6, 4]
    json_cond = [{"left": "x", "op": ">", "right": 5}]
    func = parser.json_to_lambda(json_cond, ["x", "y"])
    func2 = parser.json_to_lambda(json_cond, ["y", "x"])
    # Lambda evaluable
    assert func(array) == True
    assert func2(array) == False

def test_json_index_nested():
    parser = DSParser()
    json_cond = {
        "op": "and",
        "values": [
            {"left": {"base": "x", "index": 0}, "op": ">", "right": 5},
            {"left": "y", "op": "==", "right": 10}
        ]
    }
    indices = parser.json_index(json_cond, ["x"])
    assert indices == []


def test_parse_side_binop():
    parser = DSParser()
    node = ast.BinOp(left=ast.Constant(value=2), op=ast.Add(), right=ast.Constant(value=3))
    result = parser.parse_side(node)
    assert result["op"] == "+"
    assert result["left"] == 2
    assert result["right"] == 3

def test_extract_condition_chained_compare():
    parser = DSParser()
    expr = ast.parse("0 < x < 2").body[0].value
    result = parser.extract_condition(expr)
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["op"] == ">"
    assert result[1]["op"] == "<"

def test_extract_condition_nested_bool():
    parser = DSParser()
    expr = ast.parse("(x > 1 and y < 5) or z == 3").body[0].value
    result = parser.extract_condition(expr)
    assert result["op"] == "or"
    assert len(result["values"]) == 2
    assert result["values"][0]["op"] == "and"

def test_parse_side_subscript():
    parser = DSParser()
    node = ast.Subscript(value=ast.Name(id="x", ctx=ast.Load()), slice=ast.Constant(value=0), ctx=ast.Load())
    result = parser.parse_side(node)
    assert result["base"] == "x"
    assert result["index"] == 0

def test_build_expr_or_condition():
    parser = DSParser()
    condition = {"op": "or", "values": [
        {"left": "x", "op": ">", "right": 5},
        {"left": "y", "op": "<", "right": 10}
    ]}
    ast_node = parser.build_expr(condition, ["x", "y"])
    assert isinstance(ast_node, ast.BoolOp)
    assert isinstance(ast_node.op, ast.Or)

def test_build_side_variable_and_constant():
    parser = DSParser()
    # Variable in columns
    node = parser.build_side("x", ["x", "y"])
    assert isinstance(node, ast.Subscript)
    # Variable not in columns
    node2 = parser.build_side("z", ["x", "y"])
    assert isinstance(node2, ast.Name)
    # Constant
    node3 = parser.build_side(7, ["x"])
    assert isinstance(node3, ast.Constant)

def test_json_to_lambda_complex():
    parser = DSParser()
    json_cond = {"op": "and", "values": [
        {"left": "x", "op": ">", "right": 5},
        {"left": {"op": "+", "left": "y", "right": 2}, "op": "<", "right": 10}
    ]}
    func = parser.json_to_lambda(json_cond, ["x", "y"])
    assert func([6, 7]) is True
    assert func([4, 7]) is False
    assert func([6, 9]) is False