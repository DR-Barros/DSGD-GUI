import React from "react";
import { Bar } from "react-chartjs-2";
import RuleEditor from "./RuleEditor";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { Alert, Snackbar, TablePagination } from "@mui/material";
import type { Dataset } from "../../../types/dataset";
import ValidateRule from "./ValidateRule";

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
        React.SetStateAction<RuleItem[]>
    >;
    columnsEncoder: Record<string, Record<string, number>>;
}

const RuleGroup: React.FC<RuleGroupProps> = ({
    idx,
    rulesArray,
    datasetStats,
    Dataset,
    t,
    setEncodedRules,
    columnsEncoder
}) => {
    const [viewStats, setViewStats] = React.useState(false);
    const [editing, setEditing] = React.useState<boolean>(false);
    const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; type: "success" | "error" }>({
        open: false,
        message: "",
        type: "success"
    });
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);
    const rowsOptions = [5, 10, 25];

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
            <h3>{t("experiment.rules")}</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {editing && (
            <button
                onClick={() => {
                    setEncodedRules([]);
                }}
            >
                <DeleteIcon />
            </button>
            )}
            <button onClick={() => setViewStats(!viewStats)}>
                {viewStats ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </button>
            <button onClick={() => setEditing(!editing)}>
                {editing ? <EditOffIcon /> : <ModeEditIcon />}
            </button>
        </div>
        </div>

        {viewStats && (
        <div style={{display: "flex", flexDirection: "row", gap: "20px", overflowX: "scroll" }}>      
        {Dataset ? Dataset.columns.filter(col => col !== Dataset.target_column).map((i) => {
            const stats = datasetStats[0].find((s: any) => s.column == i);
            return stats ? (
            <div
                key={i}
                style={{
                fontSize: 10,
                color: "#666",
                maxHeight: "200px",
                }}
            >
                <h4 style={{ margin: "5px 0" }}>{i}</h4>
                <p style={{ margin: 0, lineHeight: 1.3 }}>
                {t("datasets.nulls")}: {stats.nulls} ({stats.nullPercent.toFixed(2)}%)
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
                </>
                )}
                {columnsEncoder[i] ? (
                <div style={{ marginTop: 4 }}>
                    <p style={{ margin: 0, lineHeight: 1.3 }}>{t("datasets.encoding")}</p>
                    <ul style={{ margin: 0, paddingLeft: "20px", height: stats.histogram && stats.histogram.length > 0 ? "50px" : "100px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#ccc transparent" }}>
                    {Object.entries(columnsEncoder[i]).map(([key, val]) => (
                        <li key={key} style={{ margin: 0, lineHeight: 1.3 }}>{`${key}: ${val}`}</li>
                    ))}
                    </ul>
                </div>
                ) : null}
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
                {/* si la columna esta en columnsEncoder mostramos la info */}
            </div>
            ) : null;
        }) : (
            <div>No dataset selected</div>
        )}
        </div>
        )}

        {/* Reglas */}
        <div
            style={{
                overflowX: "scroll",
            }}
        >
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
                    width: "100px",
                }}
                >
                {mi === rulesArray[0].mass.length - 1 ? t("experiment.uncertainty") : `${t("experiment.mass")} ${mi + 1}`}
                </th>
            ))}
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "center", padding: "4px", width: "50px" }}>
                {t("experiment.valid")}
            </th>
            {editing && <th style={{ width: "50px", borderBottom: "1px solid #ccc" }}></th>}
            </tr>
        </thead>
        <tbody>
            {rulesArray
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((item, i) => {
            const itemId = page * rowsPerPage + i;  // índice absoluto en rulesArray
            return (
            <tr key={itemId}>
                <td style={{ borderBottom: "1px solid #eee", padding: "4px" }}>
                {editing ? (
                <RuleEditor
                    columns={Dataset ? Dataset.columns.filter(col => col !== Dataset.target_column) : []}
                    label={item.labels}
                    updateLabel={(newLabel: string) => {
                        setEncodedRules((prev) => {
                        const updated = [...prev];
                        const updatedItem = { ...updated[itemId], labels: newLabel };
                        updated[itemId] = updatedItem;
                        return updated;
                        });
                    }}
                    rule={item.parsedRule}
                    updateRule={(newRule: string) => {
                        setEncodedRules((prev) => {
                        const updated = [...prev];
                        const updatedItem = { ...updated[itemId], parsedRule: newRule };
                        updated[itemId] = updatedItem;
                        return updated;
                        });
                    }}
                    setSnackbar={setSnackbar}
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
                        const updated = [...prev];
                        const updatedMass = [...updated[itemId].mass];
                        updatedMass[mi] = isNaN(newValue) ? 0 : newValue;
                        updated[itemId] = { ...updated[itemId], mass: updatedMass };
                        return updated;
                        });
                    }}
                    style={{
                        width: "80px",
                        padding: "2px 4px",
                        fontSize: "0.8rem",
                        textAlign: "right",
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        height: "30px",
                    }}
                    />
                    ) : (
                    <span>{m.toFixed(3)}</span>
                    )}
                </td>
                ))}
                {/* válido si las masas suman 1 Y la expresión es parseable */}
                <ValidateRule
                    rule={item.parsedRule}
                    mass={item.mass}
                    columns={Dataset ? Dataset.columns.filter(col => col !== Dataset.target_column) : []}
                    id={idx}
                    t={t}
                />
                {editing && (
                <td style={{ borderBottom: "1px solid #eee", padding: "4px", textAlign: "center" }}>
                    <button onClick={() => {
                        setEncodedRules((prev) => {
                        const updated = [...prev];
                        updated.splice(itemId, 1);
                        return updated;
                        })}}
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                    <DeleteIcon />
                    </button>
                </td>
                )}
            </tr>
            );
            })}
        </tbody>
        </table>
        </div>
        {/* Botón para agregar nueva regla */}
        {editing && (
        <button
        onClick={() => {
            setEncodedRules((prev) => {
            const updated = [...prev];

            // Nueva regla "vacía"
            const newRule: RuleItem = {
                mass: new Array(rulesArray[0]?.mass.length || Dataset!.n_classes +1 || 2).fill(0), // ej: tantas columnas mass como las demás
                labels: "",
                parsedRule: "",
            };
            updated.push(newRule);
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
        <Snackbar
            open={snackbar.open}
            autoHideDuration={5000}
            onClose={(_, reason) => {
                if (reason === "clickaway") return;
                setSnackbar({ open: false, message: "", type: "success" });
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
            <Alert
                onClose={() => setSnackbar({ open: false, message: "", type: "success" })}
                severity={snackbar.type}
                sx={{ width: "100%" }}
            >
                {snackbar.message}
            </Alert>
        </Snackbar>
        <TablePagination
            rowsPerPageOptions={rowsOptions}
            component="div"
            count={rulesArray.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
            }}
        />
        </div>
    );
};

export default RuleGroup;