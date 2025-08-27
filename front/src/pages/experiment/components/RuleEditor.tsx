import React from "react";

type Expression =
  | string
  | number
  | {
      base?: string;
      index?: string;
      op?: string;
      left?: Expression;
      right?: Expression;
    };

type Condition = {
  left: Expression;
  op: string;
  right: Expression;
};

type RuleEditorProps = {
  conditions: Condition[];
  onChange: (newConditions: Condition[]) => void;
  columns: string[];
};

/** 🔄 Renderiza recursivamente una expresión (puede ser simple o árbol) */
const ExpressionEditor: React.FC<{
  expr: Expression;
  onChange: (newExpr: Expression) => void;
  columns: string[];
}> = ({ expr, onChange, columns }) => {
  if (typeof expr === "string" || typeof expr === "number") {
    // Caso base: literal (string/number)
    if (columns.includes(expr.toString())) {
      return <p style={{ margin: 0 }}>{expr}</p>;
    }
    return (
      <input
        type="text"
        value={expr}
        onChange={(e) =>
          onChange(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
        }
        style={{ width: "120px" }}
      />
    );
  }

  // Caso: expresión compuesta (con op, base, left/right)
  if (expr.op) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <ExpressionEditor expr={expr.left!} onChange={(newLeft) => onChange({ ...expr, left: newLeft })} columns={columns} />
        <select
          value={expr.op}
          onChange={(e) => onChange({ ...expr, op: e.target.value })}
        >
          <option value="+">+</option>
          <option value="-">-</option>
          <option value="*">*</option>
          <option value="/">/</option>
          <option value="<=">{"<="}</option>
          <option value=">=">{">="}</option>
          <option value="<">{"<"}</option>
          <option value=">">{">"}</option>
          <option value="==">{"=="}</option>
          <option value="!=">{"!="}</option>
        </select>
        <ExpressionEditor expr={expr.right!} onChange={(newRight) => onChange({ ...expr, right: newRight })} columns={columns} />
      </div>
    );
  }

  // Caso: variable con base/index
  if (expr.base === "x" && expr.index) {
    return <p style={{ margin: 0 }}>{expr.index}</p>;
  }

  return <p>??</p>;
};

const RuleEditor: React.FC<RuleEditorProps> = ({ conditions, onChange, columns }) => {
  const handleUpdate = (index: number, field: keyof Condition, value: Expression) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div>
      {conditions.map((cond, ci) => (
        <div
          key={ci}
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: "0.5rem",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          {/* Left side */}
          <ExpressionEditor
            expr={cond.left}
            onChange={(newExpr) => handleUpdate(ci, "left", newExpr)}
            columns={columns}
          />

          {/* Operator */}
          <select
            value={cond.op}
            onChange={(e) => handleUpdate(ci, "op", e.target.value)}
          >
            <option value="<=">{"<="}</option>
            <option value=">=">{">="}</option>
            <option value="<">{"<"}</option>
            <option value=">">{">"}</option>
            <option value="==">{"=="}</option>
            <option value="!=">{"!="}</option>
          </select>

          {/* Right side */}
          <ExpressionEditor
            expr={cond.right}
            onChange={(newExpr) => handleUpdate(ci, "right", newExpr)}
            columns={columns}
          />
        </div>
      ))}
    </div>
  );
};

export default RuleEditor;
