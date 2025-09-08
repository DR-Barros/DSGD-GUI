import React from "react";
import { useTranslation } from "react-i18next";

type Expression =
    | string
    | number
    | {
        base?: string;
        index?: string;
        op?: string;
        left?: Expression;
        right?: Expression;
        }
    

type Condition = {
  left: Expression;
  op: string;
  right: Expression;
};

type RuleEditorProps = {
  conditions: Condition[];
  onChange: (newConditions: Condition[]) => void;
  columns: string[];
  idx: string;
  editing: boolean;
  label: string;
  updateLabel: (newLabel: string) => void;
};

/** 🔄 Renderiza recursivamente una expresión (puede ser simple o árbol) */
const ExpressionEditor: React.FC<{
    expr: Expression;
    onChange: (newExpr: Expression) => void;
    columns: string[];
    idxs: string[];
    editing: boolean;
}> = ({ expr, onChange, columns, idxs, editing }) => {
    if (typeof expr === "string" || typeof expr === "number") {
        // Caso base: literal (string/number)
        if (idxs.includes(expr.toString())) {
            if (idxs.length > 1) {
                return (
                <>
                {editing ? (
                <select
                    value={expr}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {idxs.map((col, i) => (
                    <option key={i} value={col}>
                        {col}
                    </option>
                    ))}
                </select>
                ) : (
                    <p style={{ margin: 0 }}>{expr}</p>
                )}
                </>
                );
            } else {
                return <p style={{ margin: 0 }}>{expr}</p>;
            }
        }
        return (
        <>
        {editing ? (
        <input
            type="text"
            value={expr}
            onChange={(e) =>
            onChange(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
            }
            style={{ width: "120px" }}
        />
        ) : (
            <p style={{ margin: 0 }}>{expr}</p>
        )}
        </>
        );
    }

    // Caso: expresión compuesta (con op, base, left/right)
    if (expr.op) {
        return (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ExpressionEditor expr={expr.left!} onChange={(newLeft) => onChange({ ...expr, left: newLeft })} columns={columns} idxs={idxs} editing={editing} />
            {editing ? (
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
            ) : (
            <span>{expr.op}</span>
            )}
            <ExpressionEditor expr={expr.right!} onChange={(newRight) => onChange({ ...expr, right: newRight })} columns={columns} idxs={idxs} editing={editing} />
        </div>
        );
    }

    // Caso: variable con base/index
    if (expr.base === "x" && expr.index) {
        return <p style={{ margin: 0 }}>{expr.index}</p>;
    }

    return <p>??</p>;
};

const RuleEditor: React.FC<RuleEditorProps> = ({ conditions, onChange, columns, idx, editing, label, updateLabel }) => {
    const {t} = useTranslation()
    const handleUpdate = (index: number, field: keyof Condition, value: Expression) => {
        const updated = [...conditions];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };
    const idxs = idx.split("-");

    return (
        <div>
            <label>
                {t("experiment.label")}: {""}
                <input
                    type="text"
                    value={label}
                    onChange={(e) => {
                        e.preventDefault();
                        updateLabel(e.target.value);
                    }}
                />
            </label>
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
                    idxs={idxs}
                    editing={editing}
                />

                {/* Operator */}
                {editing ? (
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
                ) : (
                <span>{cond.op}</span>
                )}

                {/* Right side */}
                <ExpressionEditor
                    expr={cond.right}
                    onChange={(newExpr) => handleUpdate(ci, "right", newExpr)}
                    columns={columns}
                    idxs={idxs}
                    editing={editing}
                />
                {/* si no es la ultima columna agregamos un and */}
                {ci < conditions.length - 1 && (
                    <span>{t('and')}</span>
                )}
                {/* boton eliminar condición */}
                {(editing && conditions.length > 1) &&
                <button onClick={() =>{
                    const updated = conditions.filter((_, idx) => idx !== ci);
                    onChange(updated);
                }}>
                    delete
                </button>}
            </div>
        ))}
        {editing &&
        <button onClick={() => {
            const newCondition: Condition = {
            left: idxs[0],
            op: "==",  
            right: ""              
            };

            onChange([...conditions, newCondition]);
        }}>
            agregar condición
        </button>
        }
        </div>
    );
};

export default RuleEditor;
