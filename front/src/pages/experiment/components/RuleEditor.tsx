import React from "react";
import { useTranslation } from "react-i18next";
import { parseExpr } from "../../../utils/RuleParser";

type RuleEditorProps = {
    columns: string[];
    label: string;
    updateLabel: (newLabel: string) => void;
    rule: any;
    updateRule: (newRule: any) => void;
    setSnackbar: (snackbar: { open: boolean; message: string; type: "success" | "error" }) => void;
};

const RuleEditor: React.FC<RuleEditorProps> = ({ columns, label, updateLabel, rule, updateRule, setSnackbar }) => {
    const { t } = useTranslation();
    const [ruleStr, setRuleStr] = React.useState("");
    React.useEffect(() => {
        setRuleStr(rule);
    }, [rule]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            <label style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>{t("experiment.label")}: {""}</p>
                <input
                    type="text"
                    value={label}
                    onChange={(e) => {
                        e.preventDefault();
                        updateLabel(e.target.value);
                    }}
                    style={{ 
                        marginLeft: "10px",
                        flex: 1,
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        padding: "10px",
                    }}
                />
            </label>
            <label style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>{t("experiment.rule")}: {""}</p>
                <textarea
                    value={ruleStr}
                    onChange={(e) => setRuleStr(e.target.value)}
                    onBlur={(e) => {
                        e.preventDefault();
                        try{
                            parseExpr(e.target.value, columns);
                            
                        }catch (error) {
                            console.error("Error parsing expression:", error);
                            setSnackbar({ 
                                open: true, 
                                message: t("experiment.invalidRule") + ": " + (error instanceof Error ? error.message : String(error)),
                                type: "error" });
                        }
                        updateRule(e.target.value);
                    }}
                    style={{ 
                        marginLeft: "10px",
                        flex: 1,
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        padding: "10px",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        resize: "vertical",
                    }}
                />
            </label>
        </div>
    );
};

export default RuleEditor;
