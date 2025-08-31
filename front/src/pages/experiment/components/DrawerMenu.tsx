import { useState, useEffect } from 'react';
import {
    Drawer,
    ListItem,
    ListItemText,
    ListItemButton,
    Box,
    Fab
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { fetchProtected } from '../../../api/client';
import type { Iteration } from '../../../types/experiment';

const drawerWidth = 150;

export default function DrawerMenu(
    { id }: { id: string | undefined }
) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [iterations, setIterations] = useState<Iteration[]>([]);

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
        <Box sx={{ width: drawerWidth-1, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }} role="presentation">
            {iterations.map((item) => (
                    <p key={item.id}>{item.id} - {item.training_status}</p>
            ))}
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