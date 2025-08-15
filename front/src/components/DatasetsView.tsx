import type { GridColDef } from "@mui/x-data-grid";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button,
  Select,
  MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type HistogramBin = {
    bin: string;
    count: number;
};


interface Dataset {
    summaryStats: any[];
    rows: any[];
    columns: GridColDef[];
    targetColumn: string | null;
}

export default function DatasetsView(
    { summaryStats, rows, columns, targetColumn }: Dataset,
) {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const rowsOptions = [5, 10, 15, 20, 25];
    return (
        <>
            <div style={{ display: "flex", gap: "20px", overflowX: "auto" }}>
            {/* Tabla Data */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ height: 150, overflowY: "auto" }}>
                        <TableRow>
                            {columns.filter(col => col.field !== targetColumn).map((col) => (
                                <TableCell key={col.field} sx={{ padding: 1, minWidth: 75 }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                        <span>{col.headerName}</span>
                                        {(() => {
                                            const stats = summaryStats.find((s) => s.column === col.field);
                                            return stats ? (
                                                <div style={{ fontSize: 10, color: "#666", height: "150px", overflowY: "auto" }}>
                                                    <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.nulls")}: {stats.nulls} ({stats.nullPercent})</p>
                                                    <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.unique")}: {stats.uniqueCount}</p>
                                                    {stats.min !== undefined && (
                                                        <>
                                                            <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.min")}: {stats.min}</p>
                                                            <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.max")}: {stats.max}</p>
                                                            <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.mean")}: {stats.mean}</p>
                                                            {stats.histogram && stats.histogram.length > 0 && (
                                                                <div style={{ width: "100px", height: "80px", marginTop: 4 }}>
                                                                    <Bar
                                                                        data={{
                                                                            labels: stats.histogram.map((h: HistogramBin) => h.bin),
                                                                            datasets: [
                                                                                {
                                                                                    data: stats.histogram.map((h: HistogramBin) => h.count),
                                                                                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                                                                                },
                                                                            ],
                                                                        }}
                                                                        options={{
                                                                            responsive: true,
                                                                            maintainAspectRatio: false,
                                                                            plugins: {
                                                                                legend: { display: false },
                                                                            },
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
                                        })()}
                                    </div>
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows
                            .slice(
                                (currentPage - 1) * rowsPerPage,
                                currentPage * rowsPerPage
                            )
                            .map((row) => (
                                <TableRow key={row.id}>
                                    {columns.filter(col => col.field !== targetColumn).map((col) => (
                                        <TableCell key={col.field}>{row[col.field]}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {/* Tabla clase */}
            <TableContainer
                component={Paper}
                sx={{
                    width: "fit-content",
                    minWidth: 100,
                    maxWidth: "100%",
                    boxSizing: "content-box",
                    padding: 0,
                    margin: 0,
                }}
            >
                <Table>
                    <TableHead sx={{ height: 150, overflowY: "auto" }}>
                        <TableRow>
                            <TableCell key="target" sx={{ padding: 1, minWidth: 75 }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", height: 200 }}>
                                    <span>{targetColumn}</span>
                                    {(() => {
                                        const stats = summaryStats.find((s) => s.column === targetColumn);
                                        return stats ? (
                                            <div style={{ fontSize: 10, color: "#666", height: "150px", overflowY: "auto" }}>
                                                <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.nulls")}: {stats.nulls} ({stats.nullPercent})</p>
                                                <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.unique")}: {stats.uniqueCount}</p>
                                                {stats.min !== undefined && (
                                                    <>
                                                        <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.min")}: {stats.min}</p>
                                                        <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.max")}: {stats.max}</p>
                                                        <p style={{margin: 0, lineHeight: 1.3}}>{t("datasets.mean")}: {stats.mean}</p>
                                                    </>
                                                )}
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows
                            .slice(
                                (currentPage - 1) * rowsPerPage,
                                currentPage * rowsPerPage
                            )
                            .map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell key="target" >
                                        {targetColumn ? row[targetColumn] : ""}
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Button
                    onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                >
                    {"<"}
                </Button>
                <span>
                    {currentPage} / {Math.ceil((rows.length || 0) / rowsPerPage)}
                </span>
                <Button
                    onClick={() =>
                        setCurrentPage((prev) => {
                            const maxPage = Math.ceil((rows.length || 0) / rowsPerPage);
                            return prev < maxPage ? prev + 1 : prev;
                        })
                    }
                    disabled={currentPage === Math.ceil((rows.length || 0) / rowsPerPage)}
                >
                    {">"}
                </Button>
                <Select
                    value={rowsPerPage}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        setRowsPerPage(value);
                        setCurrentPage((prev) => Math.max(prev - 1, 1));
                    }}
                >
                    {rowsOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </Select>
            </div>
            </>
    );
}
