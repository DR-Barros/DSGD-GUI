import React from "react";
import { Bar } from "react-chartjs-2";
import RuleEditor from "./RuleEditor"; // Ajusta la importación según corresponda
import VisibilityIcon from '@mui/icons-material/Visibility';

type HistogramBin = {
  bin: string | number;
  count: number;
};

type RuleItem = {
  rule: any;
  vars: any;
  mass: number[];
  rulesWithValues: any;
};

interface RuleGroupProps {
  idx: string;
  rulesArray: RuleItem[];
  datasetStats: any[];
  Dataset: any;
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
        <h3>Index: {idx}</h3>
        <button onClick={() => setViewStats(!viewStats)}>
            <VisibilityIcon />
        </button>
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
                Rule
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
            </tr>
        </thead>
        <tbody>
            {rulesArray.map((item, i) => (
            <tr key={i}>
                {/* Columna RuleEditor */}
                <td style={{ borderBottom: "1px solid #eee", padding: "4px" }}>
                <RuleEditor
                    conditions={item.rulesWithValues}
                    onChange={(newConditions) => {
                    setEncodedRules((prev) => {
                        const updated = { ...prev };
                        const updatedArray = [...updated[idx]];
                        updatedArray[i] = {
                        ...updatedArray[i],
                        rulesWithValues: newConditions,
                        };
                        updated[idx] = updatedArray;
                        return updated;
                    });
                    }}
                    columns={Dataset?.columns || []}
                />
                </td>

                {/* Columnas Mass */}
                {item.mass.map((m: number, mi: number) => (
                <td
                    key={mi}
                    style={{ borderBottom: "1px solid #eee", padding: "4px", textAlign: "center" }}
                >
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
                </td>
                ))}
            </tr>
            ))}
        </tbody>
        </table>

        </div>
    );
};

export default RuleGroup;