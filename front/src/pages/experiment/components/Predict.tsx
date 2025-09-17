import { Paper, Table, TableContainer, TableBody, TableHead, TableRow, TableCell, TableFooter, TablePagination, Button, Modal, CircularProgress } from "@mui/material";
import { fetchProtected, postProtected } from "../../../api/client";
import { useEffect, useState } from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Papa from "papaparse";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";


interface PredictData {
    class: number;
    probabilities: number[];
    rules: any;
}

export default function Predict({ iterationId }: { iterationId: number | string | undefined }) {
    const {id} = useParams();
    const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
    const [columns, setColumns] = useState<string[]>([]);
    const [labels, setLabels] = useState<Record<string, number>>({});
    const [predictData, setData] = useState<any[][]>([]);
    const [predictedResults, setPredictedResults] = useState<PredictData[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [modalId, setModalId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const { t } = useTranslation();

    const fetchPostTrainData = async (experimentId: number) => {
        const { data, status } = await fetchProtected(`/experiments/dataset/${experimentId}/columns`);
        if (status === 200) {
            console.log("Fetched post-training data:", data);
            setColumns(data.columns.filter((col: string) => col !== data.target));
        } else {
            console.error("Error fetching post-training data");
        }
    };
    useEffect(() => {
        if (id) {
            fetchPostTrainData(Number(id));
        }
    }, [id]);

    useEffect(() => {
        if (predictedResults.length > 0) {
            setStatus("success");
        }
    }, [predictedResults]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            Papa.parse(file, {
            header: true,
            complete: (results) => {
                const parsedData = results.data as Record<string, string>[];
                const formattedData = parsedData
                .filter(row => Object.keys(row).length > 0) 
                .map(row =>
                    columns.map(col => row[col] ?? "") 
                );
                setData(prev => [...prev, ...formattedData]);
            },
            error: (error) => {
                console.error("Error parsing CSV:", error);
            }
            });
        } else {
            console.error("No file selected");
        }
    };

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }

    const handlePredict = async () => {
        if (!iterationId) {
            console.error("No iteration ID provided for prediction");
            return;
        }
        if (predictData.length === 0) {
            console.error("No data available for prediction");
            return;
        }
        setStatus("loading");
        try {
            const { data, status } = await postProtected(`/predict/${iterationId}`, { predictData });
            if (status === 200) {
                console.log("Prediction successful:", data);
                setPredictedResults(data.predictions);
                setLabels(data.labels || {});
                setErrorMessage("");
            } else {
                console.error("Error during prediction");
                setErrorMessage(data.detail || "Unknown error");
                setStatus("error");
                
            }
        } catch (error) {
            console.error("Error during prediction:", error);
            setStatus("error");
        }
    }

    const invertLabels = (labels: Record<string, number>) => {
        const inverted: Record<number, string> = {};
        Object.entries(labels).forEach(([key, value]) => {
            inverted[value] = key;
        });
        return inverted;
    };

    return (
        <div>
            <h2>{t("experiment.predict")}</h2>
            {status == "idle" &&
            <>
            <TableContainer component={Paper} sx={{ marginBottom: "50px" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell key={col}>{col}</TableCell>
                            ))}
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {predictData
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row, rowIndex) => {
                            const globalIndex = page * rowsPerPage + rowIndex; // índice real en `data`
                            return (
                            <TableRow key={globalIndex}>
                                {row.map((cell: any, cellIndex: number) => (
                                <TableCell key={cellIndex}>
                                    <input
                                    type="text"
                                    value={cell}
                                    style={{ width: "100%" }}
                                    onChange={(e) => {
                                        const newData = [...predictData];
                                        newData[globalIndex][cellIndex] = e.target.value;
                                        setData(newData);
                                    }}
                                    />
                                </TableCell>
                                ))}
                                <TableCell>
                                <button
                                    onClick={() => {
                                    const newData = predictData.filter((_, idx) => idx !== globalIndex);
                                    setData(newData);
                                    }}
                                    style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    }}
                                >
                                    <DeleteIcon />
                                </button>
                                </TableCell>
                            </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={columns.length}>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 15]}
                                    count={predictData.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                />
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-evenly"}}>
            <Button 
                variant="contained"
                color="primary"
                onClick={() => {
                    const newRow = columns.map(() => "");
                    setData([...predictData, newRow]);
                }}
            >
                {t("experiment.addRow")}
            </Button>
            <label style={{ marginRight: "10px", padding: "6px 12px", backgroundColor: "#1976d2", color: "white", borderRadius: "4px", cursor: "pointer" }}>
                {t("experiment.uploadCSV")}
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
            />
            </label>
            <Button
                variant="contained"
                color="primary"
                onClick={handlePredict}
                style={{ marginLeft: "10px" }}
            >
                {t("experiment.predict")}
            </Button>
            </div>
            </>
            }
            {status == "loading" && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
                <CircularProgress />
                <p>{t("experiment.predictingInProgress")}</p>
            </div>}
            {status == "error" && <>
                <p>{t("experiment.errorPredictingMessage")}</p>
                {errorMessage && <p><strong>Error: </strong>{errorMessage}</p>}
                <button onClick={() => setStatus("idle")}>{t("experiment.tryAgain")}</button>
            </>}
            {status == "success" && 
            <>
                <h3>{t("experiment.predictedResults")}</h3>
                <TableContainer component={Paper} sx={{ marginBottom: "50px" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell key={col}>{col}</TableCell>
                            ))}
                            <TableCell>{t("experiment.prediction")}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {predictData
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row, rowIndex) => {
                            const globalIndex = page * rowsPerPage + rowIndex; // índice real en `data`
                            return (
                            <TableRow key={globalIndex}>
                                {row.map((cell: any, cellIndex: number) => (
                                <TableCell key={cellIndex}>
                                    <p>{cell}</p>
                                </TableCell>
                                ))}
                                <TableCell>
                                    <p>{labels && Object.keys(labels).length > 0 ? invertLabels(labels)[predictedResults[globalIndex]?.class] : predictedResults[globalIndex]?.class}</p>
                                </TableCell>
                                <TableCell>
                                <button
                                    onClick={() => {
                                        setModalId(globalIndex);
                                        console.log("Rules for row", globalIndex, ":", predictedResults[globalIndex]?.rules);
                                    }}
                                >
                                    <VisibilityIcon />
                                </button>
                                </TableCell>
                            </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={columns.length}>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 15]}
                                    count={predictData.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                />
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
            <button onClick={() => setStatus("idle")}>{t("experiment.newPrediction")}</button>
            </>}
            {predictData.length > 0 &&
            <Modal
                open={modalId !== null}
                onClose={() => setModalId(null)}
            >
                <div style={{
                    position: 'absolute' as 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: "90vw",
                    maxWidth: "800px",
                    maxHeight: "80vh",
                    overflowY: "auto",
                    backgroundColor: 'white',
                    padding: '20px',
                }}>
                    <h1 style={{margin: 0}}>{t("row")} {modalId}</h1>
                    <h2>
                        <strong>{t("class")}:</strong>{" "}
                        {modalId !== null ? predictedResults[modalId]?.class : ""}
                        {labels && Object.keys(labels).length > 0
                            ? ` (${invertLabels(labels)[predictedResults[modalId !== null ? modalId : 0]?.class]})`
                            : ""}
                    </h2>
                    {columns.map((col, idx) => (
                        <p key={idx}><strong>{col}:</strong> {predictData[modalId !== null ? modalId : 0][idx]}</p>
                    ))}
                    <p>
                        <strong>{t("experiment.probabilities")}:</strong>{" "}
                        {predictedResults[modalId !== null ? modalId : 0]?.probabilities
                            .map((p: number) => p.toFixed(3))
                            .join(", ")}
                    </p>
                    <h3>{t("experiment.rules")}:</h3>
                    <TableContainer>
                    <Table size="small">
                        <TableHead>
                        <TableRow>
                            <TableCell>{t("experiment.rule")}</TableCell>
                            {Object.keys(labels).map((clsKey) => (
                            <TableCell key={clsKey}>
                                {clsKey}
                            </TableCell>
                            ))}
                            <TableCell>{t("experiment.uncertainty")}</TableCell>
                        </TableRow>
                        </TableHead>
                        <TableBody>
                        {predictedResults[modalId ?? 0]?.rules?.map(
                            (rule: any, rIdx: number) => (
                            <TableRow key={rIdx}>
                                <TableCell>{rule.rule}</TableCell>
                                {Object.keys(labels).map((clsKey) => (
                                <TableCell key={clsKey}>
                                    {rule[labels[clsKey]]?.toFixed(3)}
                                </TableCell>
                                ))}
                                <TableCell>{rule.uncertainty.toFixed(3)}</TableCell>
                            </TableRow>
                            )
                        )}
                        </TableBody>
                    </Table>
                    </TableContainer>
                </div>
            </Modal>
            }
        </div>
    );
}