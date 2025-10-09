import { List, ListItem, ListItemText, ListItemIcon, Divider, Fab, Button, Modal, Select, MenuItem, Tooltip } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from "react-i18next";
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from "react-router-dom";
import { deleteProtected, fetchProtected } from "../../api/client";
import type { Dataset } from "../../types/dataset";
import { useEffect, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import "./Datasets.css"
import DatasetsView from "../../components/DatasetsView";

export default function Datasets() {
    const { t } = useTranslation();
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
    const [datasetPreview, setDatasetPreview] = useState<any[]>([]);
    const [datasetStats, setDatasetStats] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [tempPage, setTempPage] = useState("1");
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const rowsOptions = [5, 10, 20];
    const [edit, setEdit] = useState(false);
    const navigate = useNavigate();

    const handleAddDataset = () => {
        navigate("/datasets/upload");
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        const { data, status } = await fetchProtected("/datasets");
        if (status === 200) {
            console.log("Datasets fetched successfully", data);
            setDatasets(data);
        } else {
            console.log("Error fetching datasets");
        }
    };

    const deleteDataset = async (id: number) => {
        try {
            await deleteProtected(`/datasets/${id}`);
            setDatasets(datasets.filter(dataset => dataset.id !== id));
        } catch (error) {
            console.error("Error deleting dataset:", error);
        }
    }

    const handlePreviewDataset = async (datasetId: Number) => {
        setSelectedDataset(datasets.find(dataset => dataset.id === datasetId) || null);
        const { data, status } = await fetchProtected(`/datasets/preview/${datasetId}`);
        console.log("Dataset preview data:", data);
        if (status !== 200) {
            console.log("Error fetching dataset preview");
        }
        else {
            setDatasetPreview(data.map((item: any) => item.data));
            setDatasetStats(data.map((item: any) => item.stats));
        }
    };

    useEffect(() => {
        console.log("datasetStats:", datasetStats);
    }, [datasetStats]);
    useEffect(() => {
        console.log("datasetPreview:", datasetPreview);
    }, [datasetPreview]);

    return (
        <div className="datasets-container">
        <h1>{t("datasets.title")}</h1>
        <List>
            <Divider />
            {datasets
            .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
            .map((exp, index) => (
            <div key={index} className="dataset-item">
                <ListItem>
                <ListItemText 
                primary={
                    <h3 style={{margin: 0}}>
                        {exp.name} <span style={{ marginLeft: "15px" }}>#{exp.id}</span>
                    </h3>
                }
                secondary={
                    <div style={{ display: "flex", flexDirection: "row", gap: "40px" }}>
                        <p>{t("columns")}: {exp.columns.length}</p>
                        <p>{t("classes")}: {exp.n_classes}</p>
                        <p>{t("rows")}: {exp.n_rows}</p>
                    </div>
                } />
                <ListItemIcon className="dataset-item-preview-icon">
                    {edit ?
                    <Tooltip title={t("datasets.deleteDataset")} placement="top">
                    <Button onClick={() => {
                        if (window.confirm(t("datasets.confirmDelete"))) {
                            deleteDataset(exp.id);
                        }
                    }}>
                        <DeleteIcon color="error" />
                    </Button>
                    </Tooltip>
                    :
                    <Button onClick={() => handlePreviewDataset(exp.id)}>
                        <VisibilityIcon color="primary" />
                    </Button>
                    }
                </ListItemIcon>
                </ListItem>
                <Divider />
            </div>
            ))}
        </List>
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
                    max={Math.max(1, Math.ceil((datasets.length || 0) / rowsPerPage))}
                    value={tempPage} 
                    onChange={(e) => setTempPage(e.target.value)} 
                    onBlur={() => {
                        const value = Number(tempPage);
                        if (!isNaN(value)) {
                        setCurrentPage(
                            Math.max(1, Math.min(value, Math.ceil((datasets.length || 0) / rowsPerPage)))
                        );
                        }
                    }}
                    style={{ width: 50, background: "transparent", border: "none", fontSize: "inherit", textAlign: "right" }}
                    />
                    <p> / {Math.ceil((datasets.length || 0) / rowsPerPage)}</p>
                </div>
                <Button
                    onClick={() =>{
                        setCurrentPage((prev) => {
                            const maxPage = Math.ceil((datasets.length || 0) / rowsPerPage);
                            return prev < maxPage ? prev + 1 : prev;
                        })
                        setTempPage(String(Math.min(currentPage + 1, Math.ceil((datasets.length || 0) / rowsPerPage)))); 
                    }}
                    disabled={currentPage === Math.ceil((datasets.length || 0) / rowsPerPage)}
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
        <Tooltip title={t("datasets.addDataset")} placement="top">
        <Fab color="primary" aria-label="add" style={{
            position: "absolute",
            bottom: 16,
            right: 16
        }}
            onClick={handleAddDataset}
        >
            <AddIcon />
        </Fab>
        </Tooltip>
        <Tooltip title={t("datasets.editDataset")} placement="top">
        <Fab color="primary" aria-label="edit" style={{
            position: "absolute",
            bottom: 16,
            left: 16
        }}
            onClick={() => setEdit(!edit)}
        >
            {edit ? <EditOffIcon /> : <EditIcon />}
        </Fab>
        </Tooltip>
        <Modal
            open={Boolean(selectedDataset)}
            onClose={() => {
                setSelectedDataset(null);
                setDatasetPreview([]);
                setDatasetStats([]);
            }}
        >
            <div className="modal-content" style={{
                padding: "20px",
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                height: "calc(90vh - 40px)",
                overflowY: "auto",
                width: "90vw",
                margin: "5vh auto",
                position: "relative",
            }}
            >
                <Button 
                    onClick={() => {
                        setSelectedDataset(null);
                        setDatasetPreview([]);
                        setDatasetStats([]);
                    }}
                    style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        minWidth: "40px",
                        minHeight: "40px",
                        borderRadius: "50%",
                        border: "none",
                    }}
                ><CloseIcon /></Button>
            {selectedDataset && (
                <>
                    <h2>{selectedDataset.name} <span style={{ marginLeft: "15px" }}>#{selectedDataset.id}</span></h2>
                    <div style={{ display: "flex", flexDirection: "row", gap: "40px" }}>
                    <p>{t("columns")}: {selectedDataset.columns.length}</p>
                    <p>{t("classes")}: {selectedDataset.n_classes}</p>
                    <p>{t("rows")}: {selectedDataset.n_rows}</p>
                    </div>
                    {(datasetPreview.length > 0 && datasetStats.length > 0) && (
                        <DatasetsView
                            rows={datasetPreview[0]}
                            summaryStats={datasetStats[0]}
                            columns={selectedDataset.columns.map((col: string) => ({
                                field: col,
                            headerName: col,
                            flex: 1,
                        }))}
                        targetColumn={selectedDataset.target_column}
                    />
                    )}
                    {(datasetPreview.length > 1 && datasetStats.length > 1) && (
                        <DatasetsView
                            rows={datasetPreview[1]}
                            summaryStats={datasetStats[1]}
                            columns={selectedDataset.columns.map((col: string) => ({
                                field: col,
                                headerName: col,
                                flex: 1,
                            }))}
                            targetColumn={selectedDataset.target_column}
                        />
                    )}
                </>
            )}
        </div>
    </Modal>
</div>
);
}