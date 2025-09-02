import { useState, useEffect } from 'react';
import {
    Drawer,
    Box,
    Fab
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { fetchProtected } from '../../../api/client';
import type { Iteration } from '../../../types/experiment';
import { useTranslation } from 'react-i18next';

const drawerWidth = 250;

export default function DrawerMenu(
    { id, openIterations, train }: { id: string | undefined, openIterations: (iterationId: number, status: string) => void, train: () => void }
) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [iterations, setIterations] = useState<Iteration[]>([]);
    const { t } = useTranslation();

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

    const toggleDrawer = (open: boolean) => () => {
        setMobileOpen(open);
    };

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
                        <button onClick={() => openIterations(item.id, item.training_status)} style={{ background: "none", border: "none"}}> <ArrowForwardIcon style={{ color: "#1976d2" }} /> </button>
                        </div>
                        <p>acc: {item.accuracy?.toFixed(2)}</p>
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