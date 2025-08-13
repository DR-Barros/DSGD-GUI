import { List, ListItem, ListItemText, ListItemIcon, Divider, Fab } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from "react-i18next";
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from "react-router-dom";

import "./Datasets.css"

export default function Datasets() {
    const { t } = useTranslation();
    const datasets = [
        { name: "Iris #4", description: "Columnas: 5, Filas: 150" },
        { name: "Iris #5", description: "Columnas: 5, Filas: 150" },
        { name: "Iris #6", description: "Columnas: 5, Filas: 150" },
    ];
    const navigate = useNavigate();

    const handleAddDataset = () => {
        navigate("/datasets/upload");
    };



    return (
        <div className="datasets-container">
        <h1>{t("datasets.title")}</h1>
        <List>
            {datasets.map((exp, index) => (
            <div key={index}>
                <ListItem>
                <ListItemText primary={exp.name} secondary={exp.description} />
                <ListItemIcon>
                    <VisibilityIcon color="primary" />
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
        </div>
    );
}