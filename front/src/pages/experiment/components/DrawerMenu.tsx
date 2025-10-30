import { useState, useEffect } from 'react';
import {
    Drawer,
    Box,
    Fab,
    Modal,
    Typography,
    Button,
    Tooltip,
    CircularProgress
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import PendingIcon from '@mui/icons-material/Pending';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchProtected, downloadProtected, deleteProtected, postProtected } from '../../../api/client';
import type { Iteration } from '../../../types/experiment';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 230;

export default function DrawerMenu(
    { id, openIterations, train, setDrawerOpen, nFilesDataset }: { id: string | undefined, openIterations: (iterationId: number, status: string) => void, train: () => void, setDrawerOpen: (open: boolean) => void, nFilesDataset: number }
) {
    const [mobileOpen, setMobileOpen] = useState(true);
    const [modalUploadOpen, setModalUploadOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [params, setParams] = useState({
        splitSeed: 42,
        testSize: 0.2,
        shuffle: true,
        dropNulls: true,
        dropDuplicates: true,
    });
    const [iterations, setIterations] = useState<Iteration[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingModal, setLoadingModal] = useState<boolean>(false);
    const { t } = useTranslation();
    const navigation = useNavigate();
    const location = useLocation();

    useEffect(() => {
        setDrawerOpen(mobileOpen);
    }, [mobileOpen]);

    const handleIterations = async () => {
        setLoading(true);
        const { data, status } = await fetchProtected(`/experiments/iteration/${id}`);
        console.log("Dataset preview data:", data);
        if (status !== 200) {
            console.log("Error fetching dataset preview");
        }
        else {
            setIterations(data);
            if (data.length > 0) {
                setParams({
                    ...params,
                    splitSeed: data[0].train_test_split_seed,
                    testSize: data[0].train_test_split,
                    shuffle: data[0].shuffle,
                    dropNulls: data[0].delete_nulls,
                    dropDuplicates: data[0].drop_duplicates,
                });
            }
        }
        setLoading(false);
    };

    const handleDownload = (iterationId: number) => {
        setLoading(true);
        downloadProtected(`/experiments/${iterationId}/download`, `iteration_${iterationId}.zip`)
        .catch((err) => {
            console.error("Error en descarga:", err);
            alert("No se pudo descargar el archivo");
        })
        .finally(() => {
            setLoading(false);
        });
    };

    const handleDelete = async (iterationId: string) => {
        if (window.confirm(t('experiment.confirmDeleteIteration'))) {
            setLoading(true);
            try {
                await deleteProtected(`/experiments/iteration/${iterationId}`);
            } catch (error) {
                console.error("Error deleting iteration:", error);
                alert(t('experiment.errorDeletingIteration'));
            } finally {
                setLoading(false);
                handleIterations();
            }
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert(t('experiment.noFileSelected'));
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('split_seed', params.splitSeed.toString());
        formData.append('test_size', params.testSize.toString());
        formData.append('shuffle', params.shuffle ? "true" : "false");
        formData.append('drop_nulls', params.dropNulls ? "true" : "false");
        formData.append('drop_duplicates', params.dropDuplicates ? "true" : "false");
        setLoadingModal(true);
        try {
        const { data, status } = await postProtected(`/experiments/${id}/upload`, formData);
        if (status !== 200) {
            console.error("Error uploading model:", data);
            alert(t('experiment.errorUploadingModel'));
        } else {
            alert(t('experiment.modelUploadedSuccessfully'));
            setModalUploadOpen(false);
            setFile(null);
            handleIterations();
        }
        } catch (error) {
            console.error("Error uploading model:", error);
            alert(t('experiment.errorUploadingModel'));
        } finally {
            setLoadingModal(false);
        }
    };


    const toggleDrawer = (open: boolean) => () => {
        setMobileOpen(open);
    };

    useEffect(() => {
        if (id) {
            handleIterations();
        }
    }, [mobileOpen]);

    /* si cambia la url, reiniciar iteraciones */
    useEffect(() => {
        if (id) {
            console.log("ID changed, refreshing iterations...");
            handleIterations();
        }
    }, [location.pathname]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);
        }
    };

    const drawerContent = (
        <Box sx={{ width: drawerWidth-20, display: 'flex', flexDirection: 'column', pt: 1, pb: 1 }} role="presentation">
            <Button onClick={() => setMobileOpen(false)} variant="contained" color="primary" style={{ marginBottom: "10px", marginLeft: "10px", width: '90%' }}>
                {t('close')}
            </Button>
            <Typography variant="h6" component="div" style={{paddingLeft: "10px"}}>
                {t('experiment.iterations')}:
            </Typography>
            <hr style={{width: "90%", borderTop: "1px solid #000", marginLeft: "10px"}} />
            {loading && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px' }}>
                <CircularProgress />
            </div>} 
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
                            <Tooltip title={t('experiment.downloadModel')} arrow>
                                <button onClick={() => handleDownload(item.id)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", color: "#1976d2" }} disabled={loading}>
                                    <DownloadForOfflineIcon style={{ marginRight: "5px" }} />
                                </button>
                            </Tooltip>
                        )}
                            <button onClick={() => handleDelete(item.id.toString())} style={{ background: "none", border: "none", display: "flex", alignItems: "center", color: "#d32f2f" }} disabled={loading}>
                                <DeleteIcon style={{ marginRight: "5px" }} />
                            </button>
                        </div>
                        <hr />
                    </div>
            ))}
            <div style={{paddingLeft: "10px", marginTop: "10px"}}>
                <Button onClick={train} variant="contained" color="primary" style={{ marginTop: "10px", width: '100%' }}>
                    {t('experiment.train')}
                </Button>
                <Button onClick={() => setModalUploadOpen(true)} variant="contained" color="primary" style={{ marginTop: "10px", width: '100%' }}>
                    {t('experiment.uploadModel')}
                </Button>
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
                variant="persistent"
                anchor="left"
                open={mobileOpen}
                onClose={toggleDrawer(false)}
                ModalProps={{ keepMounted: true }}
                style={{ zIndex: 1301 }}
                sx={{
                    zIndex: 1301,
                    [`& .MuiDrawer-paper`]: {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        top: {
                            xs: '56px',
                            sm: '64px',
                        },
                        height: {
                            xs: 'calc(100% - 56px)',
                            sm: 'calc(100% - 64px)',
                        },
                    },
                }}
            >
                {drawerContent}
                <Modal
                    open={modalUploadOpen}
                    onClose={() => setModalUploadOpen(false)}
                    sx={{ zIndex: 1302 }}
                    >
                    <Box sx={{ position:'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4, zIndex: 1302, display: 'flex', flexDirection: 'column', gap: 2, borderRadius: '10px' }}>
                        <Typography id="modal-modal-title" variant="h6" component="h2">
                            {t('experiment.uploadModel')}
                        </Typography>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', backgroundColor: '#1976d2', color: 'white', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                            <p>{t('datasets.upload.select_file')}</p>
                            <input
                                style={{display: "none"}}
                                type="file"
                                accept='.bin'
                                multiple={false}
                                onChange={handleFileChange}
                            />
                        </label>
                        {file && <span style={{ color: 'green' }}>{t('datasets.upload.selected_file')}: {file.name}</span>}
                        {nFilesDataset === 1 &&
                        <>
                        <label>
                            {t('experiment.splitSeed')}:
                            <input type="number" style={{ marginLeft: '10px', border: '1px solid #ccc', borderRadius: '4px', padding: '5px' }} value={params.splitSeed} onChange={(e) => setParams({...params, splitSeed: Number(e.target.value)})} />
                        </label>
                        <label>
                            {t('experiment.testSize')}:
                            <input type="number" step="0.01" min="0" max="1" style={{ marginLeft: '10px', border: '1px solid #ccc', borderRadius: '4px', padding: '5px' }} value={params.testSize} onChange={(e) => setParams({...params, testSize: Number(e.target.value)})} />
                        </label>
                        <label>
                            {t('experiment.shuffle')}:
                            <input type="checkbox" style={{ marginLeft: '10px' }} checked={params.shuffle} onChange={(e) => setParams({...params, shuffle: e.target.checked})}/>
                        </label>
                        <label>
                            {t('experiment.dropNulls')}:
                            <input type="checkbox" style={{ marginLeft: '10px' }} checked={params.dropNulls} onChange={(e) => setParams({...params, dropNulls: e.target.checked})}/>
                        </label>
                        <label>
                            {t('experiment.dropDuplicates')}:
                            <input type="checkbox" style={{ marginLeft: '10px' }} checked={params.dropDuplicates} onChange={(e) => setParams({...params, dropDuplicates: e.target.checked})}/>
                        </label>
                        </>}
                        <Button onClick={handleUpload} variant="contained" color="primary" style={{ marginTop: "10px", marginRight: "10px" }} disabled={loadingModal}>
                            {t('experiment.upload')}
                        </Button>
                        <Button onClick={() => setModalUploadOpen(false)} variant="contained" color="primary" style={{ marginTop: "10px" }}>
                            {t('close')}
                        </Button>
                        {loadingModal && <div style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            backgroundColor: "rgba(255, 255, 255, 0.7)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <CircularProgress />
                        </div>}
                    </Box>
                </Modal>
            </Drawer>
            <Tooltip title={t('experiment.openIterations')} arrow>
            <Fab
                aria-label="menu"
                onClick={toggleDrawer(true)}
                sx={{
                    position: 'fixed',
                    top: 75,
                    left: 16,
                    borderRadius: '10px',
                    backgroundColor: '#F5F3F3',
                }}
            >
                <MenuIcon />
            </Fab>
            </Tooltip>
        </>
    );
}