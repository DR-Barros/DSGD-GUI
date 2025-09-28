import { Box, Button, Modal, Select, MenuItem, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Dataset } from "../../../types/dataset";
import { useState, useEffect } from "react";
import { fetchProtected, postProtected } from "../../../api/client";
import { useNavigate, useLocation } from "react-router-dom";

interface ModalExperimentProps {
    open: boolean;
    onClose: () => void;
    reload: () => void;
}

export default function ModalExperiment(
    { open, onClose, reload }: ModalExperimentProps
) {
    const navigate = useNavigate();
    const location = useLocation();
    const [datasetsOptions, setDatasetsOptions] = useState<Dataset[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<number | null>(null);
    const [experimentName, setExperimentName] = useState<string>(location.state?.experimentName || "");
    const { t } = useTranslation();


    useEffect(() => {
        fetchDatasets();
    }, []);
    
    const fetchDatasets = async () => {
        const { data, status } = await fetchProtected("/datasets");
        if (status === 200) {
            console.log("Datasets fetched successfully", data);
            setDatasetsOptions(data);
        } else {
            console.log("Error fetching datasets");
        }
    };

    const handleCreateExperiment = async () => {
        if (selectedDataset === null || experimentName.trim() === "") {
            console.log("Invalid input");
            return;
        }
        const formData = new FormData();
        formData.append("dataset_id", selectedDataset!.toString());
        formData.append("name", experimentName);

        const { data, status } = await postProtected("/experiments", formData);
        if (status === 200) {
            console.log("Experiment created successfully", data);
            onClose();
            reload();
        } else {
            console.log("Error creating experiment");
        }
    };

    return (
        <Modal open={open} onClose={onClose} sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Box sx={{
                backgroundColor: 'white',
                maxHeight: '80vh',
                overflowY: 'auto',
                width: '90vw',
                borderRadius: "30px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                boxShadow: 24
            }}>
                <h2>{t("experiments.add_experiment")}</h2>
                <label htmlFor="dataset-select">{t("experiments.select_dataset")}</label>
                <Select
                    value={selectedDataset || ""}
                    onChange={(e) => setSelectedDataset(e.target.value as number)}
                    id="dataset-select"
                    fullWidth
                >
                    <MenuItem value="" onClick={() => navigate("/datasets/upload", { state: {
                        from: "experiments", modal: true, experimentName: experimentName
                    }})}>
                        {t("datasets.upload_new")}
                    </MenuItem>
                    {datasetsOptions.map((dataset) => (
                        <MenuItem key={dataset.id} value={dataset.id}>
                            {dataset.name} # {dataset.id} - {t("datasets.shape")}: ({dataset.n_rows}, {dataset.columns.length}) - {t("classes")}: {dataset.n_classes}
                        </MenuItem>
                    ))}
                </Select>
                <TextField
                    label={t("experiments.name")}
                    variant="outlined"
                    fullWidth
                    value={experimentName}
                    onChange={(e) => setExperimentName(e.target.value)}
                />
                <Button variant="contained" color="primary" onClick={handleCreateExperiment}>
                    {t("experiments.add_experiment")}
                </Button>
                <Button onClick={onClose}>{t("close")}</Button>
            </Box>
        </Modal>
    );
}
