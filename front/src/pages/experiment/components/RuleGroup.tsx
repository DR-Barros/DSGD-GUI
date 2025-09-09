import React, { useEffect } from "react";
import { Bar } from "react-chartjs-2";
import RuleEditor from "./RuleEditor"; // Ajusta la importación según corresponda
import VisibilityIcon from '@mui/icons-material/Visibility';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { Tooltip } from "@mui/material";
import type { Dataset } from "../../../types/dataset";

type HistogramBin = {
  bin: string | number;
  count: number;
};

type RuleItem = {
    mass: number[];
    labels: any;
    parsedRule: any;
};

interface RuleGroupProps {
  idx: string;
  rulesArray: RuleItem[];
  datasetStats: any[];
  Dataset: Dataset | null;
  t: (key: string) => string;
  setEncodedRules: React.Dispatch<
    React.SetStateAction<Record<string, RuleItem[]>>
  >;
}

const RuleGroup: React.FC<RuleGroupProps> = ({
  idx,
  rulesArray,
  datasetStats,
  Dataset,
  t,
  setEncodedRules,
}) => {
    const [viewStats, setViewStats] = React.useState(false);
    const [editing, setEditing] = React.useState<boolean>(false);
    useEffect(() => {
        console.log("Rendering RuleGroup for idx:", idx);
        console.log("Current rulesArray:", rulesArray);
    }, [idx]);

    return (
        <div
        style={{
            marginBottom: "1rem",
            padding: "0.5rem",
            border: "1px solid #ccc",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
        }}
        >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3>Index: {idx}</h3>
            <button onClick={() => setViewStats(!viewStats)}>
                <VisibilityIcon />
            </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => setEditing(!editing)}>
                {editing ? <EditOffIcon /> : <ModeEditIcon />}
            </button>
            <button onClick={() => setEncodedRules((prev) => {
                const newRules = { ...prev };
                delete newRules[idx];
                return newRules;
            })}>
                <DeleteIcon />
            </button>
        </div>
        </div>

        {viewStats && (
        <div style={{display: "flex", flexDirection: "row", gap: "20px", overflowX: "auto" }}>      
        {idx.split("-").map((i) => {
            const stats = datasetStats[0].find((s: any) => s.column == i);
            return stats ? (
            <div
                key={i}
                style={{
                fontSize: 10,
                color: "#666",
                }}
            >
                <h4 style={{ margin: "5px 0" }}>{i}</h4>
                <p style={{ margin: 0, lineHeight: 1.3 }}>
                {t("datasets.nulls")}: {stats.nulls} ({stats.nullPercent})
                </p>
                <p style={{ margin: 0, lineHeight: 1.3 }}>
                {t("datasets.unique")}: {stats.uniqueCount}
                </p>
                {stats.min !== undefined && stats.min !== null && (
                <>
                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                    {t("datasets.min")}: {Number(stats.min).toFixed(2)}
                    </p>
                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                    {t("datasets.max")}: {Number(stats.max).toFixed(2)}
                    </p>
                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                    {t("datasets.mean")}: {Number(stats.mean).toFixed(2)}
                    </p>
                    {stats.histogram && stats.histogram.length > 0 && (
                    <div style={{ width: "100px", height: "80px", marginTop: 4 }}>
                        <Bar
                        data={{
                            labels: stats.histogram.map((h: HistogramBin) => h.bin),
                            datasets: [
                            {
                                data: stats.histogram.map(
                                (h: HistogramBin) => h.count
                                ),
                                backgroundColor: "rgba(75, 192, 192, 0.6)",
                            },
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                            x: { ticks: { display: false } },
                            y: { ticks: { display: false } },
                            },
                        }}
                        />
                    </div>
                    )}
                </>
                )}
            </div>
            ) : null;
        })}
        </div>
        )}

        {/* Reglas */}
        <table
        style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "1rem",
        }}
        >
        <thead>
            <tr>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: "4px" }}>
                {t("experiment.rule")}
            </th>
            {rulesArray[0]?.mass.map((_: number, mi: number) => (
                <th
                key={mi}
                style={{
                    borderBottom: "1px solid #ccc",
                    textAlign: "center",
                    padding: "4px",
                }}
                >
                {mi === rulesArray[0].mass.length - 1 ? t("experiment.uncertainty") : `${t("experiment.mass")} ${mi + 1}`}
                </th>
            ))}
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "center", padding: "4px" }}>
                {t("experiment.valid")}
            </th>
            {editing && <th></th>}
            </tr>
        </thead>
        <tbody>
            {rulesArray.map((item, i) => (
            <tr key={i}>
                <td style={{ borderBottom: "1px solid #eee", padding: "4px" }}>
                {editing ? (
                <RuleEditor
                    columns={idx.split("-").map(i=>i.trim())}
                    label={item.labels}
                    updateLabel={(newLabel: string) => {
                        setEncodedRules((prev) => {
                            const updated = { ...prev };
                            const updatedArray = [...updated[idx]];
                            updatedArray[i] = {
                                ...updatedArray[i],
                                labels: newLabel,
                            };
                            updated[idx] = updatedArray;
                            return updated;
                        });
                    }}
                    rule={item.parsedRule}
                    updateRule={(newRule: string) => {
                        setEncodedRules((prev) => {
                            const updated = { ...prev };
                            const updatedArray = [...updated[idx]];
                            updatedArray[i] = {
                                ...updatedArray[i],
                                parsedRule: newRule,
                            };
                            updated[idx] = updatedArray;
                            return updated;
                        });
                    }}
                />
                ) : (
                    <p>
                        {item.labels}
                    </p>
                )}
                </td>

                {/* Columnas Mass */}
                {item.mass.map((m: number, mi: number) => (
                <td
                    key={mi}
                    style={{ borderBottom: "1px solid #eee", padding: "4px", textAlign: "center" }}
                >
                    {editing ? (
                    <input
                    type="number"
                    step="0.0001"
                    min={0}
                    max={1}
                    value={m}
                    onChange={(e) => {
                        const newValue = parseFloat(e.target.value);

                        setEncodedRules((prev) => {
                        const updated = { ...prev };
                        const updatedArray = [...updated[idx]];
                        const updatedItem = { ...updatedArray[i] };

                        const newMass = [...updatedItem.mass];
                        newMass[mi] = isNaN(newValue) ? 0 : newValue;

                        updatedItem.mass = newMass;
                        updatedArray[i] = updatedItem;
                        updated[idx] = updatedArray;

                        return updated;
                        });
                    }}
                    style={{
                        width: "80px",
                        padding: "2px 4px",
                        fontSize: "0.8rem",
                        textAlign: "right",
                    }}
                    />
                    ) : (
                    <span>{m.toFixed(3)}</span>
                    )}
                </td>
                ))}
                {/* valido si las masas suman 1 */}
                <td style={{ borderBottom: "1px solid #eee", padding: "4px", textAlign: "center" }}>
                    <Tooltip title={Math.abs(item.mass.reduce((a, b) => a + b, 0)) }>
                        <p>{Math.abs(item.mass.reduce((a, b) => a + b, 0)) == 1 ? "✅" : "❌"}</p>
                    </Tooltip>
                </td>
                {editing && (
                <td style={{ borderBottom: "1px solid #eee", padding: "4px", textAlign: "center" }}>
                    <button onClick={() => {
                        setEncodedRules((prev) => {
                            const updated = { ...prev };
                            const updatedArray = [...updated[idx]];
                            const filtered = updatedArray.filter((_, ri) => ri !== i);
                            updated[idx] = filtered;
                            return updated;
                        })}}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                    <DeleteIcon />
                    </button>
                </td>
                )}
            </tr>
            ))}
        </tbody>
        </table>
        {/* Botón para agregar nueva regla */}
        {editing && (
        <button
        onClick={() => {
            setEncodedRules((prev) => {
            const updated = { ...prev };
            const currentRules = updated[idx] ? [...updated[idx]] : [];

            // Nueva regla "vacía"
            const newRule: RuleItem = {
                mass: new Array(rulesArray[0]?.mass.length || Dataset!.n_classes +1 || 2).fill(0), // ej: tantas columnas mass como las demás
                labels: "",
                parsedRule: "",
            };

            currentRules.push(newRule);
            updated[idx] = currentRules;
            return updated;
            });
        }}
        style={{
            marginTop: "0.5rem",
            padding: "6px 12px",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
        }}
        >
        {t("experiment.addRule")}
        </button>
        )}
        </div>
    );
};

export default RuleGroup;