import { List, ListItem, ListItemText, ListItemIcon, Divider } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from "react-i18next";

import "./Datasets.css"

export default function Datasets() {
    const { t } = useTranslation();
    const datasets = [
        { name: "Iris #4", description: "Columnas: 5, Filas: 150" },
        { name: "Iris #5", description: "Columnas: 5, Filas: 150" },
        { name: "Iris #6", description: "Columnas: 5, Filas: 150" },
    ];

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
        </div>
    );
}