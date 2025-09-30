import { useState, useEffect } from 'react';
import {
    Drawer,
    Box,
    Fab,
    Modal,
    Typography,
    Button,
    Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import PendingIcon from '@mui/icons-material/Pending';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import { fetchProtected, downloadProtected, deleteProtected, postProtected } from '../../../api/client';
import type { Iteration } from '../../../types/experiment';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 250;

export default function DrawerMenu(
    { id, openIterations, train }: { id: string | undefined, openIterations: (iterationId: number, status: string) => void, train: () => void }
) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [modalUploadOpen, setModalUploadOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [params, setParams] = useState({
        labelEncoder: "{}",
        splitSeed: 42,
        testSize: 0.2,
        shuffle: true,
        dropNulls: true,
        dropDuplicates: true,
    });
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
            if (data.length > 0) {
                setParams({
                    ...params,
                    labelEncoder: data[0].label_encoder ? JSON.stringify(data[0].label_encoder) : "{}",
                    splitSeed: data[0].train_test_split_seed,
                    testSize: data[0].train_test_split,
                    shuffle: data[0].shuffle,
                    dropNulls: data[0].delete_nulls,
                    dropDuplicates: data[0].drop_duplicates,
                });
            }
        }
    };

    const handleDownload = (iterationId: number) => {
        downloadProtected(`/experiments/${iterationId}/download`, `iteration_${iterationId}.zip`)
        .catch((err) => {
            console.error("Error en descarga:", err);
            alert("No se pudo descargar el archivo");
        });
    };

    const handleDelete = async (iterationId: string) => {
        if (window.confirm(t('experiment.confirmDeleteIteration'))) {
            try {
                await deleteProtected(`/experiments/iteration/${iterationId}`);
            } catch (error) {
                console.error("Error deleting iteration:", error);
                alert(t('experiment.errorDeletingIteration'));
            } finally {
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
        formData.append('label_encoder', params.labelEncoder);
        formData.append('split_seed', params.splitSeed.toString());
        formData.append('test_size', params.testSize.toString());
        formData.append('shuffle', params.shuffle ? "true" : "false");
        formData.append('drop_nulls', params.dropNulls ? "true" : "false");
        formData.append('drop_duplicates', params.dropDuplicates ? "true" : "false");
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
    };


    const toggleDrawer = (open: boolean) => () => {
        setMobileOpen(open);
    };

    useEffect(() => {
        if (id) {
            handleIterations();
        }
    }, [mobileOpen]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);
        }
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
                            <button onClick={() => handleDelete(item.id.toString())} style={{ background: "none", border: "none", display: "flex", alignItems: "center", color: "#d32f2f" }}>
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
                        <label>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: 0 }}>
                                {t('experiment.labelEncoder')}: 
                                <Tooltip title={t('experiment.labelEncoderTooltip')} arrow>
                                    <InfoIcon fontSize="small" style={{ color: '#1976d2' }} />
                                </Tooltip>
                            </p>
                            <textarea
                                placeholder="e.g. {'column1': {'A': 0, 'B': 1}, 'column2': {'X': 0, 'Y': 1}}"
                                style={{ width: '100%', height: '100px', marginTop: '10px', border: '1px solid #ccc', borderRadius: '4px', padding: '5px' }}
                                value={params.labelEncoder} onChange={(e) => setParams({...params, labelEncoder: e.target.value})}
                            />
                        </label>
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
                        <Button onClick={handleUpload} variant="contained" color="primary" style={{ marginTop: "10px", marginRight: "10px" }}>
                            {t('experiment.upload')}
                        </Button>
                        <Button onClick={() => setModalUploadOpen(false)} variant="contained" color="primary" style={{ marginTop: "10px" }}>
                            Close
                        </Button>
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
                    zIndex: 1300,
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