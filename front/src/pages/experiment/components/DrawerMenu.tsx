import { useState, useEffect } from 'react';
import {
    Drawer,
    Box,
    Fab
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import PendingIcon from '@mui/icons-material/Pending';
import { fetchProtected, downloadProtected } from '../../../api/client';
import type { Iteration } from '../../../types/experiment';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 250;

export default function DrawerMenu(
    { id, openIterations, train }: { id: string | undefined, openIterations: (iterationId: number, status: string) => void, train: () => void }
) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [iterations, setIterations] = useState<Iteration[]>([]);
    const { t } = useTranslation();
    const navigation = useNavigate();

    const handleIterations = async () => {
        const { data, status } = await fetchProtected(`/experiments/iteration/${id}`);
        console.log("Dataset preview data:", data);
        if (status !== 200) {
            console.log("Error fetching dataset preview");
        }
        else {
            setIterations(data);
        }
    };

    const handleDownload = (iterationId: number) => {
        downloadProtected(`/experiments/${iterationId}/download`, `iteration_${iterationId}.zip`)
        .catch((err) => {
            console.error("Error en descarga:", err);
            alert("No se pudo descargar el archivo");
        });
    };


    const toggleDrawer = (open: boolean) => () => {
        setMobileOpen(open);
    };

    useEffect(() => {
        if (id) {
            handleIterations();
        }
    }, [mobileOpen]);

    const drawerContent = (
        <Box sx={{ width: drawerWidth-20, display: 'flex', flexDirection: 'column', pt: 1, pb: 1 }} role="presentation">
            {iterations.map((item) => (
                    <div key={item.id} style={{paddingLeft: "10px"}}>
                        <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
                        <p>{item.id} - {item.training_status}</p>
                        {item.training_status === "completed" ? (
                            <CheckCircleIcon style={{ color: "#1976d2" }} />
                        ) : (
                            <PendingIcon style={{ color: "#1976d2" }} />
                        )}
                        <button onClick={() => {
                            navigation(`/experiment/${id}/${item.id}`);
                            openIterations(item.id, item.training_status);
                            setMobileOpen(false);
                        }} style={{ background: "none", border: "none"}}> <ArrowForwardIcon style={{ color: "#1976d2" }} /> </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <p>acc: {item.accuracy?.toFixed(2)}</p>
                        {item.training_status === "completed" && (
                            <button onClick={() => handleDownload(item.id)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", color: "#1976d2" }}>
                                <DownloadForOfflineIcon style={{ marginRight: "5px" }} />
                            </button>
                        )}
                        </div>
                        <hr />
                    </div>
            ))}
            <div style={{paddingLeft: "10px", marginTop: "10px"}}>
                <button onClick={train}>{t('experiment.train')}</button>
            </div>
        </Box>
    );

    useEffect(() => {
        if (id) {
            handleIterations();
        }
    }, [id]);

    return (
        <>
            <Drawer
                variant="temporary"
                anchor="left"
                open={mobileOpen}
                onClose={toggleDrawer(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    zIndex: 1301,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        top: 64,
                        height: 'calc(100vh - 64px)',
                    },
                }}
            >
                {drawerContent}
            </Drawer>

            <Fab
                aria-label="menu"
                onClick={toggleDrawer(true)}
                sx={{
                    position: 'fixed',
                    top: 75,
                    left: 16,
                    zIndex: 1300,
                    borderRadius: '10px',
                    backgroundColor: '#F5F3F3',
                }}
            >
                <MenuIcon />
            </Fab>
        </>
    );
}