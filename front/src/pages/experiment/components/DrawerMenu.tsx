import { useState } from 'react';
import {
    Drawer,
    ListItem,
    ListItemText,
    ListItemButton,
    Box,
    Fab
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Outlet } from 'react-router-dom';

const drawerWidth = 100;

export default function DrawerMenu() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [iterations, setIterations] = useState([
        { id: 1 },
        { id: 2 },
        { id: 3 },
    ]);

    const toggleDrawer = (open: boolean) => () => {
        setMobileOpen(open);
    };

    const drawerContent = (
        <Box sx={{ width: drawerWidth-1, display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }} role="presentation">
            {iterations.map((item) => (
                    <p key={item.id}>{item.id}</p>
            ))}
        </Box>
    );

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