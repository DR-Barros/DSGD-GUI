import { List, ListItem, ListItemText, ListItemIcon, Divider, Select, MenuItem, Button, Tooltip, CircularProgress } from "@mui/material";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useTranslation } from "react-i18next";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import {Fab} from "@mui/material";
import { useEffect, useState } from "react";
import ModalExperiment from "./components/ModalExperiment";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteProtected, fetchProtected } from "../../api/client";
import type { Experiment } from "../../types/experiment";

import "./Experiments.css"

export default function Experiments() {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [modalOpen, setModalOpen] = useState(location.state?.modal || false);
    const [currentPage, setCurrentPage] = useState(1);
    const [tempPage, setTempPage] = useState("1");
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const rowsOptions = [5, 10, 20];
    const [edit, setEdit] = useState(false);
    const [loading, setLoading] = useState(false);


    const handleAddExperiment = () => {
        setModalOpen(true);
    };

    const fetchExperiments = async () => {
        setLoading(true);
        const { data, status } = await fetchProtected("/experiments");
        if (status === 200) {
            console.log("Experiments fetched successfully", data);
            setExperiments(data);
        } else {
            console.log("Error fetching experiments");
        }
        setLoading(false);
    };

    const deleteExperiment = async (id: number) => {
        setLoading(true);
        try {
            await deleteProtected(`/experiments/${id}`);
            setExperiments(experiments.filter(exp => exp.id !== id));
        } catch (error) {
            console.error("Error deleting experiment:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExperiments();
    }, []);

    return (
        <div className="experiments-container">
        <h1>{t("experiments.title")}</h1>
        <List>
            <Divider />
            {experiments
            .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
            .map((exp, index) => (
            <div key={index}>
                <ListItem>
                <ListItemText primary={
                    <h3 style={{margin: 0}}>
                        {exp.name} <span style={{ marginLeft: "15px" }}>#{exp.id}</span>
                    </h3>
                    } 
                    secondary={
                        <p style={{ margin: 0 }}>
                            {t("experiments.dataset")}: {exp.datasets.name}<span style={{ marginLeft: "15px" }}></span> | <span style={{ marginLeft: "15px" }}>{t("experiments.createdAt")}: {new Date(exp.created_at).toLocaleDateString()}</span>
                        </p>
                    } />
                <ListItemIcon>
                    {edit ?
                    <Tooltip title={t("experiments.deleteExperiment")} placement="top">
                    <Button onClick={() => {
                        if (window.confirm(t("experiments.confirmDelete"))) {
                            deleteExperiment(exp.id);
                        }
                    }}>
                        <DeleteIcon color="error" />
                    </Button>
                    </Tooltip>
                    :
                    <Tooltip title={t("experiments.goToExperiment")} placement="top">
                    <Button onClick={() => navigate(`/experiment/${exp.id}`)}>
                        <ArrowForwardIcon color="primary" />
                    </Button>
                    </Tooltip>}
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
                max={Math.max(1, Math.ceil((experiments.length || 0) / rowsPerPage))}
                value={tempPage} 
                onChange={(e) => setTempPage(e.target.value)} 
                onBlur={() => {
                    const value = Number(tempPage);
                    if (!isNaN(value)) {
                    setCurrentPage(
                        Math.max(1, Math.min(value, Math.ceil((experiments.length || 0) / rowsPerPage)))
                    );
                    }
                }}
                style={{ width: 50, background: "transparent", border: "none", fontSize: "inherit", textAlign: "right" }}
                />
                <p> / {Math.ceil((experiments.length || 0) / rowsPerPage)}</p>
            </div>
            <Button
                onClick={() =>{
                    setCurrentPage((prev) => {
                        const maxPage = Math.ceil((experiments.length || 0) / rowsPerPage);
                        return prev < maxPage ? prev + 1 : prev;
                    })
                    setTempPage(String(Math.min(currentPage + 1, Math.ceil((experiments.length || 0) / rowsPerPage)))); 
                }}
                disabled={currentPage === Math.ceil((experiments.length || 0) / rowsPerPage)}
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
        <Tooltip title={t("experiments.addExperiment")} placement="top">
            <Fab color="primary" aria-label="add" style={{
                position: "absolute",
                bottom: 16,
                right: 16
            }}
                onClick={handleAddExperiment}
            >
                <AddIcon />
            </Fab>
        </Tooltip>
        <Tooltip title={t("experiments.editExperiment")} placement="top">
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
        <ModalExperiment open={modalOpen} onClose={() => setModalOpen(false)} reload={fetchExperiments} />
        {loading && <div style={{position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(255, 255, 255, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000}}>
            <CircularProgress />
        </div>}
    </div>
);
}