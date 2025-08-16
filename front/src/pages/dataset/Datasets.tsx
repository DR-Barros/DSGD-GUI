import { List, ListItem, ListItemText, ListItemIcon, Divider, Fab, Button, Modal } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from "react-i18next";
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from "react-router-dom";
import { fetchProtected } from "../../api/client";
import type { Dataset } from "../../types/dataset";
import { useEffect, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';

import "./Datasets.css"

export default function Datasets() {
    const { t } = useTranslation();
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
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

    const handlePreviewDataset = async (datasetId: Number) => {
        setSelectedDataset(datasets.find(dataset => dataset.id === datasetId) || null);
        const { data, status } = await fetchProtected(`/datasets/preview/${datasetId}`);
        console.log("Dataset preview data:", data);
    };

    return (
        <div className="datasets-container">
        <h1>{t("datasets.title")}</h1>
        <List>
            {datasets.map((exp, index) => (
            <div key={index}>
                <ListItem>
                <ListItemText 
                primary={
                    <h3>
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
                <ListItemIcon>
                    <Button onClick={() => handlePreviewDataset(exp.id)}>
                        <VisibilityIcon color="primary" />
                    </Button>
                </ListItemIcon>
                </ListItem>
                {index < datasets.length - 1 && <Divider />}
            </div>
            ))}
        </List>
        <Fab color="primary" aria-label="add" style={{
            position: "absolute",
            bottom: 16,
            right: 16
        }}
            onClick={handleAddDataset}
        >
            <AddIcon />
        </Fab>
        <Modal
            open={Boolean(selectedDataset)}
            onClose={() => setSelectedDataset(null)}
        >
            <div className="modal-content" style={{
                padding: "20px",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
            }}
            >
                <Button onClick={() => setSelectedDataset(null)}>
                    <CloseIcon />
                </Button>
            {selectedDataset && (
                <>
                    <h2>{selectedDataset.name}</h2>
                    <p>{t("columns")}: {selectedDataset.columns.join(", ")}</p>
                        <p>{t("classes")}: {selectedDataset.n_classes}</p>
                        <p>{t("rows")}: {selectedDataset.n_rows}</p>
                    </>
                )}
            </div>
        </Modal>
    </div>
);
}