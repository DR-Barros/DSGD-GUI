import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import type { GridColDef } from "@mui/x-data-grid";
import {
  CircularProgress,
  TextField
} from "@mui/material";
import * as XLSX from "xlsx";
import { postProtected } from "../../api/client";


type HistogramBin = {
    bin: string;
    count: number;
};

import "./UploadDatasets.css"
import DatasetsView from "../../components/DatasetsView";
import { useNavigate } from "react-router-dom";

export default function UploadDatasets() {
    const { t } = useTranslation();
    type TranslationReturn = ReturnType<typeof t>;
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFileTest, setSelectedFileTest] = useState<File | null>(null);
    const [nFiles, setNFiles] = useState<1|2>(1);
    const [hasHeader, setHasHeader] = useState<boolean>(true);
    const [datasetName, setDatasetName] = useState<string>("");
    const [uploadPhase, setUploadPhase] = useState<0 | 1>(0);
    const [parsedData, setParsedData] = useState<any[][]>([]);
    const [summaryStats, setSummaryStats] = useState<any[][]>([]);
    const [targetColumn, setTargetColumn] = useState<string | null>(null);
    const [rows, setRows] = useState<any[][]>([]);
    const [columns, setColumns] = useState<GridColDef[]>([]);
    const [canContinue, setCanContinue] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<TranslationReturn | null>(null);
    const [loadingPhase0, setLoadingPhase0] = useState<boolean>(false);
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files)
            setSelectedFile(filesArray[0] || null);
            setTargetColumn(null);
            setParsedData([]);
            setSummaryStats([]);
        }
    };

    const handleFileChangeTest = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files)
            setSelectedFileTest(filesArray[0] || null);
            setTargetColumn(null);
            setParsedData([]);
            setSummaryStats([]);
        }
    };

    useEffect(() => {
        const validTypes = ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"];
        //validamos los archivos
        if (nFiles === 1) {
            if (selectedFile && validTypes.includes(selectedFile.type)) {
                setCanContinue(true);
            } else{
                setErrorMsg(t("datasets.upload.error.file_type"));
                setCanContinue(false);
            }
        } else if (nFiles === 2) {
            if (selectedFile && selectedFileTest && validTypes.includes(selectedFileTest.type) && validTypes.includes(selectedFile.type)) {
                if (selectedFile.type !== selectedFileTest.type) {
                    setErrorMsg(t("datasets.upload.error.file_type_mismatch"));
                    setCanContinue(false);
                } else {
                    setCanContinue(true);
                }
            } else {
                setErrorMsg(t("datasets.upload.error.file_type"));
                setCanContinue(false);
            }
        }
    }, [selectedFile, selectedFileTest, nFiles]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile) {
            setLoadingPhase0(true);
            console.log("Archivo seleccionado:", selectedFile);
            if (selectedFile.type === "text/csv") {
                Papa.parse(selectedFile, {
                    header: hasHeader,
                    complete: (results: Papa.ParseResult<any>) => {
                        const filteredData = results.data.filter((row: any) => {
                            return Object.values(row).some(
                                (val) => val !== null && val !== undefined && String(val).trim() !== ""
                            );
                        });
                        setParsedData([filteredData]);
                    },
                });
            }
            else if (selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: "array" });

                    // Tomar la primera hoja
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    // Convertir a JSON
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { 
                        defval: "",
                        header: hasHeader ? undefined : 1
                    });

                    // Filtrar filas vacías
                    const filteredData = jsonData.filter((row) =>
                        Object.values(row).some(
                            (val) => val !== null && val !== undefined && String(val).trim() !== ""
                        )
                    );

                    setParsedData([filteredData]);
                };
                reader.readAsArrayBuffer(selectedFile);
            }
            else {
                setErrorMsg(t("datasets.upload.error.file_type"));
                return;
            }
        } else {
            setErrorMsg(t("datasets.upload.error.no_files"));
            return;
        }
        if (nFiles === 2){
            if (selectedFileTest) {
                console.log("Archivo de prueba seleccionado:", selectedFileTest);
                if (selectedFileTest.type === "text/csv") {
                    Papa.parse(selectedFileTest, {
                        header: hasHeader,
                        complete: (results: Papa.ParseResult<any>) => {
                            const filteredData = results.data.filter((row: any) => {
                                return Object.values(row).some(
                                    (val) => val !== null && val !== undefined && String(val).trim() !== ""
                                );
                            });
                            setParsedData((prev) => [...prev, filteredData]);
                        },
                    });
                }
                else if (selectedFileTest.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: "array" });

                        // Tomar la primera hoja
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];

                        // Convertir a JSON
                        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                        // Filtrar filas vacías
                        const filteredData = jsonData.filter((row) =>
                            Object.values(row).some(
                                (val) => val !== null && val !== undefined && String(val).trim() !== ""
                            )
                        );

                        setParsedData((prev) => [...prev, filteredData]);
                    };
                    reader.readAsArrayBuffer(selectedFileTest);
                }
                else{
                    setErrorMsg(t("datasets.upload.error.file_type"));
                }
            } else {
                setErrorMsg(t("datasets.upload.error.no_files"));
            }
        }
    };

    const handleSave = async () => {
        //validamos
        if (!datasetName) {
            setErrorMsg(t("datasets.upload.error.name_required"));
            return;
        }
        //validamos archivos
        if (selectedFile === null || (nFiles === 2 && selectedFileTest === null)) {
            setErrorMsg(t("datasets.upload.error.no_files"));
            return;
        }
        if (!targetColumn) {
            setErrorMsg(t("datasets.upload.error.target_column_required"));
            return;
        }
        // Implementar la lógica para guardar los datos analizados
        console.log("Guardando datos analizados:", parsedData);
        const formsData = new FormData();
        //agregamos los archivos
        if (selectedFile) {
            formsData.append("files", selectedFile);
        }
        if (nFiles === 2 && selectedFileTest) {
            formsData.append("files", selectedFileTest);
        }
        //agregamos nombre
        formsData.append("name", datasetName);
        //enviamos array de columnas
        formsData.append("columns", JSON.stringify(summaryStats[0].map((s) => s.column)));
        //enviamos numero de clases
        formsData.append("n_classes", summaryStats[0].filter(s => s.column === targetColumn).map(s => s.uniqueCount)[0]);
        //enviamos numero de filas
        formsData.append(
            "n_rows",
            String(rows[0].length + (rows[1] ? rows[1].length : 0))
        );
        //enviamos si tiene header
        formsData.append("header", hasHeader.toString());
        //enviamos columna objetivo
        formsData.append("target_column", targetColumn ? targetColumn : "");
        let { data, status } = await postProtected("/datasets/upload", formsData)
        console.log("Response from server:", data, status);
        if (status === 200) {
            navigate("/datasets");
        } else {
            console.error("Error al subir el dataset:", data);
            setErrorMsg(t("datasets.upload.error.upload_failed"));
        }
    };

    useEffect(() => {
        console.log("Parsed data:", parsedData);
        //si hay 2 archivos revisa que tengan el mismo numero de columnas
        if (parsedData.length > 1) {
            const colCounts = parsedData.map((data) => Object.keys(data[0] || {}).length);
            const allEqual = colCounts.every((count) => count === colCounts[0]);
            if (!allEqual) {
                console.error("Los archivos no tienen el mismo número de columnas");
                setErrorMsg(t("datasets.upload.error.column_size_mismatch"));
                setCanContinue(false);
                setLoadingPhase0(false);
                return;
            }
        }
        setErrorMsg(null);
        if (parsedData.length > 0) {
            let allData = [];
            for (let i = 0; i < parsedData.length; i++) {
                const fileData = parsedData[i];
                if (fileData.length === 0) continue; // Si no hay datos, saltar
                const cols = Object.keys(fileData[0]);
                const stats = cols.map((col) => {
                    const values = fileData.map((row) => row[col]);
                    const nullCount = values.filter((v) => v === null || v === "" || v === undefined).length;
                    const uniqueVals = new Set(values.filter((v) => v !== null && v !== "" && v !== undefined));
                    let numericSummary: { min?: number; max?: number; mean?: number; histogram?: HistogramBin[] } = {};
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
                        numericSummary.mean = Number((sum / numericVals.length).toFixed(2));
                        let histogram: HistogramBin[] = [];
                        const binSize = (max - min) / Math.min(10, uniqueVals.size);
                        for (let i = 0; i < 10; i++) {
                            const binMin = min + i * binSize;
                            const binMax = min + (i + 1) * binSize;
                            const count = numericVals.filter((v) => v >= binMin && v < binMax).length;
                            histogram.push({ bin: `${binMin.toFixed(2)} - ${binMax.toFixed(2)}`, count });
                        }
                        numericSummary.histogram = histogram;
                    }

                    return {
                        column: col,
                        nulls: nullCount,
                        nullPercent: ((nullCount / parsedData.length) * 100).toFixed(1) + "%",
                        uniqueCount: uniqueVals.size,
                        ...numericSummary,
                    };
                });
                allData.push(stats);
            }
            console.log("Summary stats:", allData);
            setSummaryStats(allData);
            //definine la ultima columna como el target
            setTargetColumn(Object.keys(parsedData[0][0] || {}).pop() || "");
            // Definir las columnas para la tabla
            setColumns(
                parsedData.length > 0
                    ? Object.keys(parsedData[0][0]).map((key) => ({
                        field: key,
                        headerName: key,
                        flex: 1
                    }))
                    : []
            );
            // Definir las filas para la tabla
            setRows(
                parsedData.length > 0
                    ? parsedData.map((fileData, index) => {
                        return fileData.map((row, rowIndex) => ({
                            id: `${index}-${rowIndex}`,
                            ...row
                        }));
                    })
                    : []
            );
            setLoadingPhase0(false);
            setUploadPhase(1);
        }
    }, [parsedData]);

    return (
        <div className="upload-datasets-container">
            <h1>{t("datasets.upload.title")}</h1>
            {uploadPhase === 0 ? (
                <form onSubmit={handleSubmit} className="upload-form">
                    <select value={nFiles} onChange={(e) => setNFiles(Number(e.target.value) as 1 | 2)}>
                        <option value={1}>{t("datasets.upload.single_file")}</option>
                        <option value={2}>{t("datasets.upload.multiple_files")}</option>
                    </select>
                    <label>
                        <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                        {t("datasets.upload.file_header")}
                    </label>
                <label className="file-upload-label">
                    <span>{nFiles === 1 ? t("datasets.upload.select_file") : t("datasets.upload.select_train_file")}</span>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".csv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        multiple={false}
                        className="file-upload-input"
                    />
                </label>
                {nFiles === 2 && (
                <label className="file-upload-label">
                    <span>{t("datasets.upload.select_test_file")}</span>
                    <input
                        type="file"
                        onChange={handleFileChangeTest}
                        accept=".csv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        multiple={false}
                        className="file-upload-input"
                    />
                </label>
                )}
                {errorMsg && <p className="error-message">{errorMsg}</p>}
                <ul>
                    {selectedFile && <li>{nFiles === 1 ? t("datasets.upload.selected_file") : t("datasets.upload.selected_train_file")}: {selectedFile.name}</li>}
                    {selectedFileTest && <li>{t("datasets.upload.selected_test_file")}: {selectedFileTest.name}</li>}
                </ul>
                {loadingPhase0 && 
                <div className="loading-indicator">
                    <CircularProgress />
                </div>
                }
                <p>{t("datasets.upload.instructions1")}</p>
                <p>{t("datasets.upload.instructions2")}</p>
                <p>{t("datasets.upload.instructions3")}</p>
                <div className="upload-buttons">
                <button onClick={() =>{navigate("/datasets")}}>{t("back")}</button>
                <button type="submit" disabled={!canContinue || (canContinue && loadingPhase0)} className={!canContinue && loadingPhase0 ? "disabled" : ""}>
                    {t("continue")}
                </button>
                </div>
                </form>
            ) : (
                <>
                    <div>
                        <label>
                            {t("datasets.upload.select_class")}
                            <select value={targetColumn ? targetColumn : ""} onChange={(e) => setTargetColumn(e.target.value)}>
                                {Object.keys(parsedData[0]?.[0] || {}).map((col) => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                        </label>
                        <br />
                        {parsedData.length > 0 && (
                            <>
                            <h3>{nFiles === 1 ? t("datasets.dataset") : t("datasets.train_dataset")}</h3>
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-around"
                            }}>
                                <p>{t("rows")}: {rows.length > 0 ? rows[0].length : 0}</p>
                                <p>{t("features")}: {Object.keys(parsedData[0][0] || {}).length - 1}</p>
                                <p>{t("classes")}: {
                                    summaryStats.length > 0 && targetColumn ?
                                    summaryStats[0].filter(s => s.column === targetColumn).map(s => s.uniqueCount)[0]
                                    : 0
                            }</p>
                            </div>
                            {(parsedData.length > 0 && rows.length > 0 && summaryStats.length > 0) &&
                            (<DatasetsView
                                summaryStats={summaryStats[0]}
                                rows={rows[0]}
                                columns={columns}
                                targetColumn={targetColumn}
                            />
                            )}
                            </>
                        )}
                        {parsedData.length == 2 && (
                            <>
                            <h3>{t("datasets.test_dataset")}</h3>
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-around"
                            }}>
                                <p>{t("rows")}: {rows.length > 1 ? rows[1].length : 0}</p>
                                <p>{t("features")}: {Object.keys(parsedData[1][0] || {}).length - 1}</p>
                                <p>{t("classes")}: {
                                    summaryStats.length > 1 && targetColumn ?
                                    summaryStats[1].filter(s => s.column === targetColumn).map(s => s.uniqueCount)[0]
                                    : 0
                            }</p>
                            </div>
                            {(parsedData.length > 1 && rows.length > 1 && summaryStats.length > 1) &&
                            (<DatasetsView
                                summaryStats={summaryStats[1]}
                                rows={rows[1]}
                                columns={columns}
                                targetColumn={targetColumn}
                            />
                            )}
                            </>
                        )}
                    </div>
                    <TextField
                        label={t("datasets.upload.dataset_name")}
                        value={datasetName}
                        onChange={(e) => setDatasetName(e.target.value)}
                    />
                    <br />
                    <div className="upload-buttons">
                    <button onClick={() => {
                        setUploadPhase(0);
                        setParsedData([]);
                        setSummaryStats([]);
                        setSelectedFile(null);
                        setSelectedFileTest(null);
                        setLoadingPhase0(false);
                    }}>
                        {t("back")}
                    </button>
                    {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
                    <button onClick={handleSave}>{t("save")}</button>
                    </div>
                </>
            )}
        </div>
    );
}
