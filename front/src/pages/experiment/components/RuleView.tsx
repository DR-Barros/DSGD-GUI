import type { Rule, Rules } from "../../../types/rules";
import { useTranslation } from "react-i18next";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TableSortLabel,
    Autocomplete,
    TextField
} from "@mui/material";
import { useEffect, useState } from "react";

export default function RuleView({ 
    rules
}: { 
    rules: Rules
}) {
    const [sortedRules, setSortedRules] = useState<Rule[]>([...rules.rules]);
    const [sortColumn, setSortColumn] = useState<number | "rule">("rule");
    const [sortAsc, setSortAsc] = useState(true);
    const [stateRule, setStateRule] = useState<"all" | "top">("all");
    const [classRules, setClassRules] = useState<Record<number, {rule:Rule, score:number}[]>>({});
    const [topRules, setTopRules] = useState<number>(5);
    const { t } = useTranslation();
    const idxToClassName: Record<number, string> = {};
    Object.entries(rules.classes).forEach(([className, idx]) => {
        idxToClassName[idx] = className;
    });


    const handleSort = (col: number | "rule") => {
        const asc = sortColumn === col ? !sortAsc : true;
        setSortColumn(col);
        setSortAsc(asc);

        const sorted = [...sortedRules].sort((a, b) => {
            if (col === "rule") {
            return asc
                ? a.rule.localeCompare(b.rule)
                : b.rule.localeCompare(a.rule);
            } else {
            return asc ? a.mass[col] - b.mass[col] : b.mass[col] - a.mass[col];
            }
        });

        setSortedRules(sorted);
    };

    const filterClassRules = () => {
        const classRuleMap: Record<number, {rule:Rule, score:number}[]> = {};
        for (let i = 0; i < Object.keys(rules.classes).length; i++) {
            classRuleMap[i] = [];
            rules.rules.forEach((rule: Rule) => {
                const score = Math.sqrt(rule.mass[i] * (1 - rule.mass[rule.mass.length - 1]));
                classRuleMap[i].push({rule: rule, score: score});
            });
            // Sort rules by score in descending order
            classRuleMap[i].sort((a, b) => b.score - a.score);
        }
        setClassRules(classRuleMap);
    };

    useEffect(() => {
        filterClassRules();
    }, [rules, stateRule]);

    useEffect(() => {
        setSortedRules([...rules.rules]);
    }, [rules, stateRule]);

    return (
        <>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px", justifyContent: "center" }}>
                <button onClick={() => setStateRule("all")}>
                    {t("experiment.allRules")}
                </button>
                <button onClick={() => setStateRule("top")}>
                    {t("experiment.topRules")}
                </button>
            </div>
            {stateRule === "all" ? (
            <TableContainer component={Paper}>
            <Table>
                <TableHead>
                <TableRow>
                    <TableCell>
                    <TableSortLabel
                        active={sortColumn === "rule"}
                        direction={sortColumn === "rule" && !sortAsc ? "desc" : "asc"}
                        onClick={() => handleSort("rule")}
                    >
                        Rule
                    </TableSortLabel>
                    </TableCell>

                    {rules.rules[0].mass.map((_, idx) => (
                    <TableCell key={idx}>
                        <TableSortLabel
                        active={sortColumn === idx}
                        direction={sortColumn === idx && !sortAsc ? "desc" : "asc"}
                        onClick={() => handleSort(idx)}
                        >
                        {idxToClassName[idx] ?? t("experiment.uncertainty")}
                        </TableSortLabel>
                    </TableCell>
                    ))}
                </TableRow>
                </TableHead>

                <TableBody>
                {sortedRules.map((rule, index) => (
                    <TableRow key={index}>
                    <TableCell>{rule.rule}</TableCell>
                    {rule.mass.map((value, i) => (
                        <TableCell key={i}>{value.toFixed(2)}</TableCell>
                    ))}
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </TableContainer>
            ) : (
            <>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    {t("experiment.showTop")}
                <Autocomplete
                    options={[5, 10, 15, 20]}
                    value={topRules}
                    onChange={(_, value: string | number | null) => {
                        if (typeof value === "number" && value) {
                            setTopRules(value);
                        } else if (typeof value === "string" && value) {
                            const parsed = parseInt(value, 10);
                            if (!isNaN(parsed)) {
                                setTopRules(parsed);
                            }
                        }
                    }}
                    getOptionLabel={(option) => option.toString()}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            style={{ width: "200px", padding: "10px", marginBottom: "10px" }}
                        />
                    )}
                    freeSolo
                />
                </div>
                {Object.entries(classRules).map(([classIdx, rulesWithScores]) => (
                    <div key={classIdx} style={{ marginBottom: "20px" }}>
                        <h4>{idxToClassName[Number(classIdx)]}</h4>
                        <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                            <TableRow>
                                <TableCell>{t("experiment.rules")}</TableCell>
                                <TableCell>{t("experiment.score")}</TableCell>
                                {rulesWithScores[0].rule.mass.map((_, idx) => (
                                <TableCell key={idx}>
                                    {idxToClassName[idx] ?? t("experiment.uncertainty")}
                                </TableCell>
                                ))}
                            </TableRow>
                            </TableHead>

                            <TableBody>
                            {rulesWithScores
                                .sort((a, b) => b.score - a.score)
                                .slice(0, Math.min(topRules, rulesWithScores.length))
                                .map(({rule, score}, index) => (
                                <TableRow key={index}>
                                    <TableCell>{rule.rule}</TableCell>
                                    <TableCell>{score.toFixed(2)}</TableCell>
                                    {rule.mass.map((value, i) => (
                                    <TableCell key={i}>{value.toFixed(2)}</TableCell>
                                    ))}
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </TableContainer>
                    </div>
                ))}
            </>
            )}
        </>
    );
}