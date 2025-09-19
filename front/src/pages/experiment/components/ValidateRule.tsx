import { postProtected } from "../../../api/client";
import { parseExpr } from "../../../utils/RuleParser";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import { Tooltip } from "@mui/material";
import { useEffect, useState } from "react";

interface ValidateRuleProps {
    rule: string;
    mass: number[];
    columns: string[];
    id: string;
    t: (key: string) => string;
}


const ValidateRule = ({ rule, mass, columns, id, t }: ValidateRuleProps) => {
    const [coverage, setCoverage] = useState<number | null>(null);


    const getCoverage = async (rule: string, id: string) => {
        try {
            setCoverage(null);
            const expr = parseExpr(rule, columns);
            const { data, status } = await postProtected(`/train/coverage-rule/${id}`, { rule: expr });
            if (status === 200) {
                setCoverage(data.percentage);
            }
        } catch (error) {
            console.error("Error fetching coverage:", error);
        }
    };

    useEffect(() => {
        if (rule && columns.length > 0) {
            getCoverage(rule, id);
        }
    }, [rule]);

    return <td
        style={{
            borderBottom: "1px solid #eee",
            padding: "4px",
            textAlign: "center",
        }}
        >
        {(() => {
            const sum = mass.reduce((a, b) => a + b, 0);
            const massSumValid = Math.abs(sum - 1) < 1e-6; // tolerancia pequeña
            let exprValid = true;

            try {
            parseExpr(rule, columns);
            } catch (err) {
            exprValid = false;
            }

            let icon, tooltip;

            if (massSumValid && exprValid) {
            icon = <CheckCircleIcon color="success" />;
            tooltip = t("experiment.validRule");
            } else if (!massSumValid && exprValid) {
            icon = <WarningAmberIcon color="warning" />;
            tooltip =
                t("experiment.invalidRule") +
                " (sum=" +
                sum.toFixed(6) +
                ")";
            } else {
            icon = <ErrorIcon color="error" />;
            tooltip = t("experiment.invalidExpression");
            }
            return (
            <Tooltip title={tooltip} arrow>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {icon}
                    {coverage !== null && (<span style={{ marginLeft: "8px" }}>{coverage.toFixed(1)}%</span>)}
                </span>
            </Tooltip>
            );
        })()}
        </td>
};

export default ValidateRule;