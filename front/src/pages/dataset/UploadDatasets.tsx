import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button,
  TableFooter
} from "@mui/material";

import "./UploadDatasets.css"

export default function UploadDatasets() {
    const { t } = useTranslation();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadPhase, setUploadPhase] = useState<0 | 1>(0);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [summaryStats, setSummaryStats] = useState<any[]>([]);
    const [targetColumn, setTargetColumn] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files).slice(0, 2); // solo 1 o 2 archivos
            setSelectedFiles(filesArray);
            setTargetColumn(null);
            setParsedData([]);
            setSummaryStats([]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length > 0) {
            console.log("Archivos seleccionados:", selectedFiles);
            setUploadPhase(1);
            selectedFiles.forEach((file) => {
                console.log("Parsing file:", file.name);
                Papa.parse(file, {
                    header: true,
                    complete: (results: Papa.ParseResult<any>) => {
                        setParsedData((prev) => [...prev, ...results.data]);
                    },
                });
            });
        }
    };

    useEffect(() => {
        if (parsedData.length > 0) {
        const cols = Object.keys(parsedData[0]);
        const stats = cols.map((col) => {
            const values = parsedData.map((row) => row[col]);
            const nullCount = values.filter((v) => v === null || v === "" || v === undefined).length;
            const uniqueVals = new Set(values.filter((v) => v !== null && v !== "" && v !== undefined));
            
            let numericSummary: { min?: number; max?: number; mean?: number } = {};
            const numericVals = values
                .map((v) => Number(v))
                .filter((v) => !isNaN(v));
            if (numericVals.length > 0) {
                let min = numericVals[0];
                let max = numericVals[0];
                let sum = 0;
                for (let i = 0; i < numericVals.length; i++) {
                    const val = numericVals[i];
                    if (val < min) min = val;
                    if (val > max) max = val;
                    sum += val;
                }
                numericSummary.min = min;
                numericSummary.max = max;
                numericSummary.mean = sum / numericVals.length;
            }

            return {
                column: col,
                nulls: nullCount,
                nullPercent: ((nullCount / parsedData.length) * 100).toFixed(1) + "%",
                uniqueCount: uniqueVals.size,
                ...numericSummary,
            };
        });
        setSummaryStats(stats);
        }
    }, [parsedData]);

    const columns: GridColDef[] =
    parsedData.length > 0
      ? Object.keys(parsedData[0]).map((key) => ({
          field: key,
          headerName: key,
          flex: 1
        }))
      : [];

    const rows = parsedData.map((row, index) => ({ id: index, ...row }));

    // Add pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    return (
        <div className="upload-datasets-container">
            <h1>{t("datasets.upload.title")}</h1>
            {uploadPhase === 0 ? (
                <>
                <form onSubmit={handleSubmit}>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".csv,.xlsx,.parquet"
                    multiple
                />
                <button type="submit" disabled={selectedFiles.length === 0}>
                    {t("datasets.upload.submit")}
                </button>
                </form>
                {selectedFiles.length > 0 && (
                    <ul>
                        {selectedFiles.map((file, idx) => (
                            <li key={idx}>{file.name}</li>
                        ))}
                    </ul>
                )}
                </>
            ) : (
                <>
                    <div>
                        <label>
                            {t("datasets.upload.select_class")}
                            <select value={targetColumn ? targetColumn : ""} onChange={(e) => setTargetColumn(e.target.value)}>
                                {Object.keys(parsedData[0] || {}).map((col) => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </label>
                        <br />
                        <div>
                            <p>{t("columns")}: {rows.length}</p>
                            <p>{t("features")}: {Object.keys(parsedData[0] || {}).length - 1}</p>
                            <p>{t("classes")}: {
                                summaryStats.filter(s => s.column === targetColumn).map(s => s.uniqueCount)[0]
                            }</p>
                        </div>
                    </div>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {columns.map((col) => (
                                        <TableCell key={col.field}>
                                            <div style={{ display: "flex", alignItems: "center" }}>
                                                {col.headerName}
                                                {/* Desplegable de stats */}
                                                <ColumnStatsPopover
                                                    column={col.field}
                                                    stats={summaryStats.find((s) => s.column === col.field)}
                                                />
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
                                            {columns.map((col) => (
                                                <TableCell key={col.field}>{row[col.field]}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={columns.length}>
                                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                                            <Button
                                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            {"<"}
                                        </Button>
                                        <span>
                                            {currentPage} / {Math.ceil(rows.length / rowsPerPage)}
                                        </span>
                                        <Button
                                            onClick={() =>
                                                setCurrentPage((prev) =>
                                                    prev < Math.ceil(rows.length / rowsPerPage)
                                                        ? prev + 1
                                                        : prev
                                                )
                                            }
                                            disabled={currentPage === Math.ceil(rows.length / rowsPerPage)}
                                        >
                                            {">"}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                            </TableFooter>
                        </Table>
                    </TableContainer>
                    <br></br>
                    <button onClick={() => {
                        setUploadPhase(0);
                        setParsedData([]);
                        setSummaryStats([]);
                    }}>
                        {t("back")}
                    </button>
                </>
            )}
        </div>
    );
}


function ColumnStatsPopover({ column, stats }: { column: string; stats: any }) {
    const [open, setOpen] = useState(false);

    return (
        <span style={{ marginLeft: 8 }}>
            <Button
                size="small"
                variant="outlined"
                onClick={() => setOpen((prev) => !prev)}
                style={{ minWidth: 24, padding: 0, fontSize: 12 }}
            >
                i
            </Button>
            {open && (
                <div
                    style={{
                        position: "absolute",
                        background: "#fff",
                        border: "1px solid #ccc",
                        padding: 8,
                        zIndex: 1000,
                        minWidth: 180,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
                    }}
                >
                    {stats && (
                        <>
                            <strong>{column}</strong>
                            <div>Nulls: {stats.nulls} ({stats.nullPercent})</div>
                            <div>Unique: {stats.uniqueCount}</div>
                            {stats.min !== undefined && (
                            <>
                                <div>Min: {stats.min}</div>
                                <div>Max: {stats.max}</div>
                                <div>Mean: {stats.mean}</div>
                            </>
                        )}
                        </>
                    )}
                    <Button
                        size="small"
                        onClick={() => setOpen(false)}
                        style={{ marginTop: 4 }}
                    >
                        Close
                    </Button>
                </div>
            )}
        </span>
    );
}
