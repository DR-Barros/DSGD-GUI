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
            <label>
                {t("experiment.rule")}: {""}
                <textarea
                    value={ruleStr}
                    onChange={(e) => setRuleStr(e.target.value)}
                    onBlur={(e) => {
                        e.preventDefault();
                        try{
                            parseExpr(e.target.value, columns);
                            updateRule(e.target.value);
                        }catch (error) {
                            console.error("Error parsing expression:", error);
                            setRuleStr(rule); // Revertir al valor anterior si hay error
                            setSnackbar({ 
                                open: true, 
                                message: t("experiment.invalidRule") + ": " + (error instanceof Error ? error.message : String(error)),
                                type: "error" });
                        }
                    }}
                />
            </label>
        </div>
    );
};

export default RuleEditor;
