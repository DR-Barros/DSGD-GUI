import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_URL } from "../api/client";
import {Card, CardContent, Select, MenuItem, TextField } from '@mui/material';
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../store/AppContext";

import "./Login.css"

export default function Login() {
    const { t, i18n } = useTranslation();
    const [loginState, setLoginState] = useState<string>("logging");
    const [credentials, setCredentials] = useState<{ email: string; password: string; name: string; password2: string }>({
        email: "",
        password: "",
        password2: "",
        name: ""
    });
    const navigate = useNavigate();
    const { setUser } = useAppContext();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };
    const currentLang = i18n.language.split('-')[0];

    const login = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const body = new URLSearchParams();
        body.append("username", credentials.email);
        body.append("password", credentials.password);

        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString(),
            credentials: "include"
        });

        const data = await res.json();
        console.log(data);
        if (data) {
            setUser(data);
            navigate("/");
        }
    };

    const register = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: credentials.name,
                email: credentials.email,
                password: credentials.password
            })
        });

        const data = await res.json();
        console.log(data);
    };

    return (
        <div className="login-container">
            <h1>{t("welcome")}</h1>
            <Card className="login-card">
                <CardContent className="login-card-content">
                <div className="language-selector">
                <h3>{t("select_language")}:</h3>
                <Select
                    value={currentLang}
                    onChange={(e) => changeLanguage(e.target.value)}
                    style={{ width: 200, backgroundColor: "#f0f0f0" }}
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
                </div>
                {loginState === "logging" && (
                    <form onSubmit={login} className="login-form">
                        <TextField
                            label={t("email")}
                            variant="outlined"
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                            className="input"
                            required
                        />
                        <TextField
                            label={t("password")}
                            type="password"
                            variant="outlined"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            className="input"
                            required
                        />
                        <button type="submit">{t("login")}</button>
                        <button type="button" onClick={() => setLoginState("register")}>{t("register")}</button>
                    </form>
                )}
                {loginState === "register" && (
                    <form onSubmit={register} className="login-form">
                        <TextField
                            label={t("name")}
                            variant="outlined"
                            value={credentials.name}
                            onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
                            className="input"
                            required
                        />
                        <TextField
                            label={t("email")}
                            variant="outlined"
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                            className="input"
                            required
                        />
                        <TextField
                            label={t("password")}
                            type="password"
                            variant="outlined"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            className="input"
                            required
                        />
                        <TextField
                            label={t("confirm_password")}
                            type="password"
                            variant="outlined"
                            value={credentials.password2}
                            onChange={(e) => setCredentials({ ...credentials, password2: e.target.value })}
                            className="input"
                            required
                        />
                        <button type="submit">{t("signup")}</button>
                        <button type="button" onClick={() => setLoginState("logging")}>{t("backToLogin")}</button>
                    </form>
                )}
                </CardContent>
            </Card>
        </div>
    );
}
