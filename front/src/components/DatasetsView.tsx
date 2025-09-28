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
    columns_encoder?: Record<string, Record<any, number>> | null;
}

export default function DatasetsView(
    { summaryStats, rows, columns, targetColumn, columns_encoder = null }: Dataset,
) {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [tempPage, setTempPage] = useState<string>(String(currentPage));
    const rowsOptions = [5, 10, 15, 20, 25];
    
    console.log({columns_encoder});
    return (
        <>
            <TableContainer component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                    <TableRow>
                        {columns
                        .filter((col) => col.field !== targetColumn)
                        .map((col) => (
                        <TableCell
                            key={col.field}
                            sx={{
                            padding: 1,
                            minWidth: 75,
                            verticalAlign: "top",
                            }}
                        >
                            <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                            }}
                            >
                            <span>{col.headerName}</span>
                            {(() => {
                                const stats = summaryStats.find((s) => s.column === col.field);
                                console.log(col.field, columns_encoder?.[col.field], stats);
                                return stats ? (
                                <div
                                    style={{
                                    fontSize: 10,
                                    color: "#666",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    scrollbarWidth: "thin",
                                    scrollbarColor: "#ccc transparent",
                                    }}
                                >
                                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                                    {t("datasets.nulls")}: {stats.nulls} ({stats.nullPercent.toFixed(2)}%)
                                    </p>
                                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                                    {t("datasets.unique")}: {stats.uniqueCount}
                                    </p>
                                    {(stats.min !== undefined && stats.min !== null) && (
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
                                    {columns_encoder && columns_encoder[col.field] && (
                                        <div>
                                            <p style={{ margin: 0, lineHeight: 1.3 }}>{t("datasets.encoding")}</p>
                                            <ul style={{ margin: 0, paddingLeft: "20px", maxHeight: "75px", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#ccc transparent" }}>
                                                {Object.keys(columns_encoder[col.field]).map((key) =>
                                                    <li key={key} style={{ margin: 0, lineHeight: 1.3 }}>
                                                        {key}: {columns_encoder[col.field][key]}
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                    {stats.histogram && stats.histogram.length > 0 && (
                                        <div style={{ width: "100px", height: "75px", marginTop: 4 }}>
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
                                </div>
                                ) : null;
                            })()}
                            </div>
                        </TableCell>
                        ))}
                        {columns
                        .filter((col) => col.field === targetColumn)
                        .map((col) => (
                        <TableCell
                            key={col.field}
                            sx={{
                            padding: 1,
                            minWidth: 75,
                            position: "sticky",
                            right: 0,
                            background: "#fff", 
                            zIndex: 2,
                            }}
                        >
                            <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                            }}
                            >
                            <span>{col.headerName}</span>
                            {(() => {
                                const stats = summaryStats.find((s) => s.column === col.field);
                                return stats ? (
                                <div
                                    style={{
                                    fontSize: 10,
                                    color: "#666",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    }}
                                >
                                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                                    {t("datasets.nulls")}: {stats.nulls} ({stats.nullPercent})
                                    </p>
                                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                                    {t("datasets.unique")}: {stats.uniqueCount}
                                    </p>
                                    {(stats.min !== undefined && stats.min !== null) && (
                                    <>
                                        <p style={{ margin: 0, lineHeight: 1.3 }}>
                                        {t("datasets.min")}: {stats.min}
                                        </p>
                                        <p style={{ margin: 0, lineHeight: 1.3 }}>
                                        {t("datasets.max")}: {stats.max}
                                        </p>
                                        <p style={{ margin: 0, lineHeight: 1.3 }}>
                                        {t("datasets.mean")}: {stats.mean}
                                        </p>
                                    </>
                                    )}
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
                            {columns
                            .filter((col) => col.field !== targetColumn)
                            .map((col) => (
                            <TableCell
                                key={col.field}
                                sx={{
                                ...(col.field === targetColumn && {
                                    position: "sticky",
                                    right: 0,
                                    background: "#fff",
                                    zIndex: 1,
                                }),
                                }}
                            >
                                {row[col.field]}
                            </TableCell>
                            ))}
                            {columns
                            .filter((col) => col.field === targetColumn)
                            .map((col) => (
                            <TableCell
                                key={col.field}
                                sx={{
                                ...(col.field === targetColumn && {
                                    position: "sticky",
                                    right: 0,
                                    background: "#fff",
                                    zIndex: 1,
                                }),
                                }}
                            >
                                {row[col.field]}
                            </TableCell>
                            ))}
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Button
                    onClick={() =>{
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                        setTempPage(String(Math.max(currentPage - 1, 1))); 
                    }}
                    disabled={currentPage === 1}
                >
                    {"<"}
                </Button>
                <div style={{ display: "flex", alignItems: "center", width: 200, justifyContent: "center" }}>
                    <input
                    type="number"
                    min={1}
                    max={Math.max(1, Math.ceil((rows.length || 0) / rowsPerPage))}
                    value={tempPage} 
                    onChange={(e) => setTempPage(e.target.value)} 
                    onBlur={() => {
                        const value = Number(tempPage);
                        if (!isNaN(value)) {
                        setCurrentPage(
                            Math.max(1, Math.min(value, Math.ceil((rows.length || 0) / rowsPerPage)))
                        );
                        }
                    }}
                    style={{ width: 75, background: "transparent", border: "none", fontSize: "inherit", textAlign: "right" }}
                    />
                    <p> / {Math.ceil((rows.length || 0) / rowsPerPage)}</p>
                </div>
                <Button
                    onClick={() =>{
                        setCurrentPage((prev) => {
                            const maxPage = Math.ceil((rows.length || 0) / rowsPerPage);
                            return prev < maxPage ? prev + 1 : prev;
                        })
                        setTempPage(String(Math.min(currentPage + 1, Math.ceil((rows.length || 0) / rowsPerPage)))); 
                    }}
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
                        setTempPage(String(Math.max(currentPage - 1, 1)));
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
