import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  ListItem,
  Box,
  Select,
  MenuItem,
  Button
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTranslation } from "react-i18next";
import { useAppContext } from "../store/AppContext";
import { Link } from "react-router-dom";

export default function ResponsiveAppBar() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language.split('-')[0];
    const menuItems = [
        { label: t("menu.datasets"), href: "/datasets" },
        { label: t("menu.experiments"), href: "/experiments" }
        , { label: t("menu.documentation"), href: "/documentation" }
    ];
    const toggleDrawer = (open: boolean) => () => {
        setDrawerOpen(open);
    };

    const { logout } = useAppContext();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <>
        <AppBar position="static" color="default" sx={{ backgroundColor: "#1E293B" }}>
            <Toolbar>
            <IconButton
                color="inherit"
                edge="start"
                sx={{ display: { xs: "flex", md: "none" }, mr: 2 }}
                onClick={toggleDrawer(true)}
            >
                <MenuIcon sx={{ color: "white" }} />
            </IconButton>

            <Typography variant="h6" sx={{ flexGrow: 1, color: "white" }}>
                DSGD GUI
            </Typography>

            {/* Botones del menú (solo en pantallas grandes) */}
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
                <Box sx={{ display: "flex", alignItems: "center" }}></Box>
                    {menuItems.map((item) => (
                        <Link
                            to={item.href}
                            style={{
                                textDecoration: "none",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                height: "40px",
                                marginRight: "16px"
                            }}
                        >
                            {item.label}
                        </Link>
                    ))}
                <Button color="inherit" onClick={logout} sx={{ color: "white", font: "inherit", fontWeight: "500", textTransform: "none" }}>
                    {t("logout")}
                </Button>
                <Select
                    value={currentLang}
                    onChange={(e) => changeLanguage(e.target.value)}
                    style={{ marginLeft: 16, backgroundColor: "#f0f0f0", padding: 0, height: 40, minHeight: 40 }}
                    MenuProps={{
                        PaperProps: {
                            style: { marginTop: 4 }
                        }
                    }}
                    sx={{
                        "& .MuiSelect-select": {
                            paddingTop: "10px",
                            paddingBottom: "10px",
                            minHeight: "unset"
                        }
                    }}
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
            </Box>
            </Toolbar>
        </AppBar>

        {/* Drawer para pantallas pequeñas */}
        <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)} sx={{zIndex: 1400}}>
            <Box
            sx={{ width: 200, padding: 2, backgroundColor: "#f5f5f5", height: "100%" }}
            role="presentation"
            onClick={toggleDrawer(false)}
            onKeyDown={toggleDrawer(false)}
            >
                {menuItems.map((item) => (
                    <ListItem key={item.href} disablePadding>
                        <Link
                            to={item.href}
                            style={{
                                textDecoration: "none",
                                color: "black",
                                display: "flex",
                                alignItems: "center",
                                height: "40px",
                                marginRight: "16px"
                            }}
                        >
                            {item.label}
                        </Link>
                    </ListItem>
                ))}
                <Button color="inherit" onClick={logout} sx={{ color: "black", font: "inherit", fontWeight: "500", textTransform: "none", padding: 0, marginBottom: 2, marginTop: 2 }}>
                    Logout
                </Button>
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
            </Box>
        </Drawer>
        </>
    );
}
