import { List, ListItem, ListItemText, ListItemIcon, Divider } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useTranslation } from "react-i18next";

import "./Experiments.css"

export default function Experiments() {
    const { t } = useTranslation();
    const experiments = [
        { name: "Iris #4", description: "Acc: 95%      Precision: 90%   Recall: 92%" },
        { name: "Iris #5", description: "Acc: 93%      Precision: 88%   Recall: 90%" },
        { name: "Iris #6", description: "Acc: 91%      Precision: 85%   Recall: 89%" },
    ];

    return (
        <div className="experiments-container">
        <h1>{t("experiments.title")}</h1>
        <List>
            {experiments.map((exp, index) => (
            <div key={index}>
                <ListItem>
                <ListItemText primary={exp.name} secondary={exp.description} />
                <ListItemIcon>
                    <VisibilityIcon color="primary" />
                </ListItemIcon>
                </ListItem>
                {index < experiments.length - 1 && <Divider />}
            </div>
            ))}
        </List>
        </div>
    );
}