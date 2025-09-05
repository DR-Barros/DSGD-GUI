import { Paper, Table, TableContainer, TableBody, TableHead, TableRow, TableCell, TableFooter, TablePagination, Button } from "@mui/material";
import { fetchProtected } from "../../../api/client";
import { useEffect, useState } from "react";
import DeleteIcon from '@mui/icons-material/Delete';
import Papa from "papaparse";
import { useTranslation } from "react-i18next";


export default function Predict({ id }: { id: number | string | undefined }) {
    const [columns, setColumns] = useState<string[]>([]);
    const [target, setTarget] = useState<string>("");
    const [data, setData] = useState<any[][]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const { t } = useTranslation();

    const handleUpload = async () => {
        console.log("Uploading data for prediction:", data);
    }

    const fetchPostTrainData = async (experimentId: number) => {
        const { data, status } = await fetchProtected(`/experiments/dataset/${experimentId}/columns`);
        if (status === 200) {
            console.log("Fetched post-training data:", data);
            setColumns(data.columns.filter((col: string) => col !== data.target));
            setTarget(data.target);
        } else {
            console.error("Error fetching post-training data");
        }
    };
    useEffect(() => {
        if (id) {
            fetchPostTrainData(Number(id));
        }
    }, [id]);

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

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    }


    return (
        <div>
            <h2>Predict Component - Experiment ID: {id}</h2>
            <h3>Columns:</h3>
            <TableContainer component={Paper}>
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
                        {data
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
                                        const newData = [...data];
                                        newData[globalIndex][cellIndex] = e.target.value;
                                        setData(newData);
                                    }}
                                    />
                                </TableCell>
                                ))}
                                <TableCell>
                                <button
                                    onClick={() => {
                                    const newData = data.filter((_, idx) => idx !== globalIndex);
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
                                    count={data.length}
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
            <button onClick={() => {
                const newRow = columns.map(() => "");
                setData([...data, newRow]);
            }}>
                Add Row
            </button>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ marginLeft: "10px" }}
            />
            <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                style={{ marginLeft: "10px" }}
            >
                {t("experiment.predict")}
            </Button>
        </div>
    );
}