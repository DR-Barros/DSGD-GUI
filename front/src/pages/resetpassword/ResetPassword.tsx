import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_URL } from "../../api/client";
import {Card, CardContent, Select, MenuItem, TextField, Snackbar, Alert, Button  } from '@mui/material';
import { useNavigate, useSearchParams } from "react-router-dom";
import { changeLanguage } from "i18next";


export default function ResetPassword() {
    const { t, i18n } = useTranslation();
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setSnackbarMessage(t("passwords_do_not_match"));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
            return;
        }
        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token, new_password: newPassword }),
            });
            if (response.ok) {
                setSnackbarMessage(t("password_reset_success"));
                setSnackbarSeverity("success");
                setSnackbarOpen(true);
                navigate("/login");
            } else {
                const data = await response.json();
                setSnackbarMessage(data.detail || t("password_reset_failed"));
                setSnackbarSeverity("error");
                setSnackbarOpen(true);
            }
        } catch (error) {
            setSnackbarMessage(t("network_error"));
            setSnackbarSeverity("error");
            setSnackbarOpen(true);
        }
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };
    const currentLang = i18n.language.split('-')[0];

    return (
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100vh"}}>
            <Card style={{ minWidth: 300, padding: 20, borderRadius: 10, backgroundColor: "#1E293B" }}>
                <CardContent style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <h2 style={{ color: "white" }}>{t("reset_password")}</h2>
                    <Select
                        value={currentLang}
                        onChange={(e) => changeLanguage(e.target.value)}
                        style={{ width: "100%", backgroundColor: "#f0f0f0" }}
                    >
                        <MenuItem value="en" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            English
                            <img src={`${import.meta.env.BASE_URL}flags/en.png`} alt="English" height={20} style={{ marginLeft: 8 }} />
                        </MenuItem>
                        <MenuItem value="es" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            Español
                            <img src={`${import.meta.env.BASE_URL}flags/es.png`} alt="Español" height={20} style={{ marginLeft: 8 }} />
                        </MenuItem>
                    </Select>
                    <form className="login-form" onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <TextField
                            label={t("new_password")}
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input"
                            required
                            sx={{backgroundColor: 'white', borderRadius: 1}}
                        />
                        <TextField
                            label={t("confirm_password")}
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input"
                            required
                            sx={{backgroundColor: 'white', borderRadius: 1}}
                        />
                        <Button type="submit" variant="contained" color="primary">
                            {t("reset_password")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}
