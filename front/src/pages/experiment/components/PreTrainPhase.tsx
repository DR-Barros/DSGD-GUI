import Stepper from '@mui/joy/Stepper';
import Step from '@mui/joy/Step';
import StepButton from '@mui/joy/StepButton';
import { useState, useEffect } from "react";
import DatasetsView from '../../../components/DatasetsView';
import { useTranslation } from "react-i18next";
import type { Dataset } from '../../../types/dataset';
import { Alert, Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, CircularProgress, Select, Snackbar, TextField, Tooltip, Box } from '@mui/material';
import { fetchProtected, postProtected } from '../../../api/client';
import RuleGroup from './RuleGroup';
import LoopIcon from '@mui/icons-material/Loop';
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import type { TrainingParams, RuleParams } from '../../../types/params';
import type { GroupedRule } from '../../../types/rules';
import { desParseExpr, parseExpr } from '../../../utils/RuleParser';
import { useParams } from 'react-router-dom';

interface PreTrainPhaseProps {
    datasetPreview: any[];
    datasetStats: any[];
    Dataset: Dataset | null;
    experimentId?: string;
    startTraining: (params: TrainingParams, rulesWithValues: any[], masses: any[], labels: any[]) => Promise<void>;
} 

interface RuleEntry {
    0: any; 
    1: any; 
}

export default function PreTrainPhase({ datasetPreview, datasetStats, Dataset, experimentId, startTraining }: PreTrainPhaseProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [params, setParams] = useState<TrainingParams>({
        testSize: 0.2,
        splitSeed: 42,
        shuffle: true,
        dropNulls: true,
        dropDuplicates: true,
        maxEpochs: 100,
        minEpochs: 10,
        batchSize: 4000,
        lossFunction: "MSE",
        optimFunction: "adam",
        learningRate: 0.005,
        minDloss: 0.0001
    });
    const [generateRuleParams, setGenerateRuleParams] = useState<RuleParams>({
        singleRule: true,
        multipleRules: false,
        breakRules: 3,
        selectedColumns: Dataset ? Dataset.columns.filter(col => col !== Dataset.target_column) : [],
        manualColumns: [],
    });
    const [encodedRules, setEncodedRules] = useState<Array<GroupedRule>>([]);
    const [loadingRules, setLoadingRules] = useState(false);
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
    const {id, iteration_id} = useParams();
    const [snackbar, setSnackbar] = useState<{open: boolean, message: String, type: 'error' | 'info' | 'success' | 'warning'}>({open: false, message: '', type: 'info'});

    useEffect(() => {
        if (iteration_id && id) {
            handleRules(id, iteration_id);
        } else {
            console.log("No iteration_id or id provided");
        }
    }, [iteration_id]);

    const handleRules = async (id: string, iteration_id: string): Promise<void> => {
        // Aquí puedes implementar la lógica para manejar las reglas con los IDs proporcionados
        console.log("Handling rules for experiment ID:", id, "and iteration ID:", iteration_id);
        // Por ejemplo, podrías hacer una llamada a una API para obtener las reglas asociadas
        const { data, status } = await fetchProtected(`/experiments/result/${id}/${iteration_id}`);
        if (status === 200) {
            console.log("Fetched rules:", data);
            const fetchedRules: Array<GroupedRule> = data.rules.map((rule: RuleEntry, index: number) => ({
                mass: data.masses[index],
                labels: data.labels[index],
                parsedRule: desParseExpr(rule[0], rule[1])
            }));
            setEncodedRules(fetchedRules);
            const dataParams: RuleParams = data.params;
            console.log("Fetched rule params:", dataParams);
            setParams(
                {...params,
                    ...dataParams
                }
            );

        } else {
            console.error("Error fetching rules:", data);
        }
    }

    const handleTrain = async () => {
        // Flatten all rule arrays and extract parsedRule
        if (encodedRules.length === 0) {
            setSnackbar({
                open: true,
                message: t("experiment.noRules"),
                type: 'error'
            });
            return;
        }
        /* chequea que los parametros tengan valores validos */
        if (params.maxEpochs <= params.minEpochs) {
            setSnackbar({
                open: true,
                message: t("experiment.invalidEpochs"),
                type: 'error'
            });
            return;
        } 
        if (params.batchSize <= 0) {
            setSnackbar({
                open: true,
                message: t("experiment.invalidBatchSize"),
                type: 'error'
            });
            return;
        }
        if (params.learningRate <= 0 || params.learningRate >= 1) {
            setSnackbar({
                open: true,
                message: t("experiment.invalidLearningRate"),
                type: 'error'
            });
            return;
        }
        if (params.testSize <= 0 || params.testSize >= 1) {
            setSnackbar({
                open: true,
                message: t("experiment.invalidTestSize"),
                type: 'error'
            });
            return;
        }
        if (params.lossFunction === '') {
            setSnackbar({
                open: true,
                message: t("experiment.invalidLossFunction"),
                type: 'error'
            });
            return;
        }
        if (params.optimFunction === '') {
            setSnackbar({
                open: true,
                message: t("experiment.invalidOptimFunction"),
                type: 'error'
            });
            return;
        }
        try {
            const allRulesWithValues: any[] = Object.values(encodedRules)
                .flat()
                .map((rule: any) => parseExpr(rule.parsedRule, Dataset?.columns || []));   
            const allMases: any [] = Object.values(encodedRules)
                .flat()
                .map((rule:any) => rule.mass)
            const allLabels: any [] = Object.values(encodedRules)
                .flat()
                .map((rule:any) => rule.labels)
            setLoading(true);
            startTraining(params, allRulesWithValues, allMases, allLabels);
        } catch (error) {
            setSnackbar({
                open: true,
                message: t("experiment.errorMessage") +
                    (error instanceof Error ? error.message : String(error)),
                type: 'error'
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log("Dataset changed, updating selectedColumns and manualColumns");
        if (Dataset) {
            const cols = Dataset.columns.filter(col => col !== Dataset.target_column);
            setGenerateRuleParams(prev => ({
                ...prev,
                selectedColumns: cols,
            }));
        }
    }, [Dataset]);

    const handleGenerateRules = async () => {
        if (!experimentId) {
            setSnackbar({ open: true, message: t("experiment.errorMessage"), type: "error" });
            return;
        }
        setLoadingRules(true);
        try {
            const { data, status } = await postProtected(`/rules/generate/${experimentId}`, {
                singleRule: generateRuleParams.singleRule,
                multipleRule: generateRuleParams.multipleRules,
                breakRules: generateRuleParams.breakRules,
                selectedColumns: generateRuleParams.selectedColumns,
                testSize: params.testSize,
                splitSeed: params.splitSeed,
                shuffle: params.shuffle,
                dropNulls: params.dropNulls,
                dropDuplicates: params.dropDuplicates
            });

            if (status === 200) {
                console.log("Generated rules:", data.rules);
                console.log("Masses:", data.masses);

                const updatedRules: Array<GroupedRule> = [
                    ...encodedRules
                ];

                const newGroupedRules: GroupedRule[] = [];

                // Creamos un nuevo conjunto de reglas por índice
                (data.rules as RuleEntry[]).forEach((rule: RuleEntry, index: number) => {
                    const parsedRule = desParseExpr(rule[0], rule[1]);
                    newGroupedRules.push({
                        mass: data.masses[index],
                        labels: data.labels[index],
                        parsedRule: parsedRule
                    });
                });

                console.log("Updated Grouped Rules:", newGroupedRules);
                setEncodedRules([...updatedRules, ...newGroupedRules]);
            } else {
                console.error("Error generating rules:", data);
            }
            setLoadingRules(false);
        } catch (error) {
            setSnackbar({ open: true, message: t("experiment.errorMessage") + (error instanceof Error ? error.message : String(error)), type: "error" });
            setLoadingRules(false);
        }
    };



    useEffect(() => {
        console.log(datasetStats);
    }, [datasetStats]);

    return (
        <div>
            <Stepper sx={{ width: '100%', maxWidth: 600, margin: '20px auto' }}>
                <Step key={0}>
                    <StepButton onClick={() => setActiveStep(0)} className={activeStep === 0 ? 'active' : 'no-active'}>{t('experiment.dataset')}</StepButton>
                </Step>
                <Step key={1}>
                    <StepButton onClick={() => setActiveStep(1)} className={activeStep === 1 ? 'active' : 'no-active'}>{t('experiment.rules')}</StepButton>
                </Step>
                <Step key={2}>
                    <StepButton onClick={() => setActiveStep(2)} className={activeStep === 2 ? 'active' : 'no-active'}>{t('experiment.train')}</StepButton>
                </Step>
            </Stepper>
            <div>
            {activeStep === 0 && <>
                <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "row", gap: "16px", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {datasetPreview.length === 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0 }}>{t("experiment.splitSettings")}</h3>
                    <Tooltip title={t("experiment.cleaningInfo")}>
                        <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                    </Tooltip>
                    </div>
                    <label>
                        {t("experiment.testSize")}
                        <input
                            type="number"
                            value={params.testSize}
                            min={0.01}
                            max={0.99}
                            step={0.01}
                            onChange={(e) => setParams({ ...params, testSize: parseFloat(e.target.value) })}
                        />
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label>
                        {t("experiment.splitSeed")}
                        <input
                            type="number"
                            value={params.splitSeed}
                            onChange={(e) => setParams({ ...params, splitSeed: parseInt(e.target.value) })}
                        />
                    </label>
                    <button 
                        onClick={() => setParams({ ...params, splitSeed: Math.floor(Math.random() * 100) })}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#1976d2',
                            padding: "0 10px",
                        }}
                        >
                        <LoopIcon />
                    </button>
                    </div>
                    <label>
                        {t("experiment.shuffle")}
                        <input
                            type="checkbox"
                            checked={params.shuffle}
                            onChange={(e) => setParams({ ...params, shuffle: e.target.checked })}
                        />
                    </label>
                    </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3 style={{ margin: 0 }}>{t("experiment.cleaningSettings")}</h3>
                        <Tooltip title={t("experiment.cleaningInfo")}>
                        <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                        </Tooltip>
                    </div>
                    <label>
                        {t("experiment.dropNulls")}
                        <input
                            type="checkbox"
                            checked={params.dropNulls}
                            onChange={(e) => setParams({ ...params, dropNulls: e.target.checked })}
                        />
                    </label>
                    <label>
                        {t("experiment.dropDuplicates")}
                        <input
                            type="checkbox"
                            checked={params.dropDuplicates}
                            onChange={(e) => setParams({ ...params, dropDuplicates: e.target.checked })}
                        />
                    </label>
                    </div>
                    </CardContent>
                </Card>
                <div style={{ display: "flex", flexDirection: "row", gap: "40px", marginTop: "20px", marginBottom: "20px", alignItems: "center", justifyContent: "space-evenly", flexWrap: "wrap" }}>
                    <p>{t("columns")}: {Dataset?.columns.length}</p>
                    <p>{t("classes")}: {Dataset?.n_classes}</p>
                    <p>{t("rows")}: {Dataset?.n_rows}</p>
                    <Button onClick={() => setActiveStep(1)} variant="contained">
                        {t("experiment.seeRules")}
                    </Button>
                </div>
                {(datasetPreview.length === 0 || datasetStats.length === 0) && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px' }}>
                        <CircularProgress />
                    </div>
                )}
                {(datasetPreview.length > 0 && datasetStats.length > 0) && (
                    <DatasetsView
                        rows={datasetPreview[0]}
                        summaryStats={datasetStats[0]}
                        columns={Dataset!.columns.map((col: string) => ({
                            field: col,
                            headerName: col,
                            flex: 1,
                        }))}
                        targetColumn={Dataset!.target_column}
                        columns_encoder={Dataset!.columns_encoder}
                />
                )}
                {(datasetPreview.length > 1 && datasetStats.length > 1) && (
                    <DatasetsView
                        rows={datasetPreview[1]}
                        summaryStats={datasetStats[1]}
                        columns={Dataset!.columns.map((col: string) => ({
                            field: col,
                            headerName: col,
                            flex: 1,
                        }))}
                        targetColumn={Dataset!.target_column}
                    />
                )}
            </>}
            {activeStep === 1 && <>
                <Card sx={{marginBottom: 2}}>
                    <h2 style={{marginLeft: "16px"}}>{t("experiment.generateRules")}</h2>
                    <CardContent sx={{display: 'flex', flexDirection: 'row', gap: 2, flexWrap: 'wrap', justifyContent: 'center'}}
                        >
                            <div style={{display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center'}}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={generateRuleParams.singleRule}
                                            onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, singleRule: e.target.checked })}
                                        />
                                    }
                                    label={
                                        <>
                                        <span>{t("experiment.singleRule")}</span>
                                        <Tooltip title={<>
                                            <p>{t("experiment.singleRuleInfo")}</p>
                                            <p>{t("experiment.singleRuleExample")}</p>
                                        </>}>
                                            <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                        </Tooltip>
                                        </>
                                    }
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: 1,
                                        height: '56px'
                                    }}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={generateRuleParams.multipleRules}
                                            onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, multipleRules: e.target.checked })}
                                        />
                                    }
                                    label={
                                    <>
                                    <span>{t("experiment.multipleRules")}</span>
                                    <Tooltip title={<>
                                        <p>{t("experiment.multipleRulesInfo")}</p>
                                        <p>{t("experiment.multipleRulesExample")}</p>
                                    </>}>
                                        <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                    </Tooltip>
                                    </>}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: 1,
                                        height: '56px'
                                    }}
                                />
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center'}}>
                                <FormControlLabel
                                    control={
                                        <TextField
                                        
                                            type="number"
                                            value={generateRuleParams.breakRules}
                                            onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, breakRules: parseInt(e.target.value) })}
                                            style={{ width: '100px' }}
                                            inputProps={{
                                                min: 1,
                                                step: 1,
                                            }}
                                            />
                                        }
                                    label={
                                        <>
                                        <span>{t("experiment.breakRules")}</span>
                                        <Tooltip title={t("experiment.breakRulesInfo")}>
                                            <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                        </Tooltip>
                                        </>
                                    }
                                    labelPlacement='start'
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                />
                                <FormControlLabel
                                    control={
                                        <Select
                                            multiple
                                            value={generateRuleParams.selectedColumns}
                                            onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, selectedColumns: e.target.value as string[] })}
                                            renderValue={(selected) => (selected as string[]).join(', ')}
                                            sx={{ 
                                                maxWidth: {
                                                    xs: 200,
                                                    sm: 300,
                                                    md: 300
                                                }
                                            }}
                                            >
                                        {Dataset?.columns
                                        .filter((col) => col !== Dataset.target_column)
                                        .map((col) => (
                                            <MenuItem key={col} value={col}>
                                                <input type="checkbox" checked={generateRuleParams.selectedColumns.indexOf(col) > -1} readOnly />   
                                                {col}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    }
                                    label={t("experiment.selectColumns")}
                                    labelPlacement='start'
                                    sx={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                />
                            </div>
                        <div style={{width: '100%', display: 'flex', justifyContent: 'center'}}>
                        <Button variant="contained" color="primary" style={{ marginTop: '20px' }} onClick={handleGenerateRules} disabled={loadingRules}>
                            {t("experiment.generateRules")}
                        </Button>
                        </div>
                    </CardContent>
                </Card>
                <div style={{ display: 'flex', justifyContent: 'space-evenly', marginTop: '20px', marginBottom: '20px' }}>
                    <Button variant='contained' onClick={() => setActiveStep(0)}>
                        {t("back")}
                    </Button>
                    <Button variant='contained' onClick={() => setActiveStep(2)}>
                        {t("experiment.train")}
                    </Button>
                </div>
                {loadingRules && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px' }}>
                        <CircularProgress />
                    </div>
                )}
                <div>
                    <RuleGroup
                        idx={id ? id : "all-rules"}
                        rulesArray={encodedRules}
                        datasetStats={datasetStats}
                        Dataset={Dataset}
                        t={t}
                        setEncodedRules={setEncodedRules}
                        columnsEncoder={Dataset?.columns_encoder || {}}
                    />
                </div>
            </>}
            {activeStep === 2 && <>
                <Card sx={{marginBottom: 10, marginTop: 10}}>
                    <CardContent>
                        <h2 style={{width: '100%', textAlign: 'center'}}>
                            {t("experiment.training")}
                        </h2>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                xs: '1fr',      
                                sm: '1fr 1fr',  
                                md: '1fr 1fr 1fr 1fr',
                                },
                                gap: 3,
                                justifyItems: 'center',
                                mb: 3
                            }}
                        >
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div>
                                <span>{t("experiment.maxEpochs")}</span>
                                <Tooltip title={t("experiment.maxEpochsInfo")} arrow>
                                    <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                </Tooltip>
                            </div>
                            <input
                                type="number"
                                value={params.maxEpochs}
                                onChange={(e) => setParams({ ...params, maxEpochs: parseInt(e.target.value) })}
                                style={{ width: '100px', marginLeft: '10px', textAlign: 'center', padding: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
                                step={1}
                                min={params.minEpochs + 1}
                                max={10000}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div>
                                <span>{t("experiment.minEpochs")}</span>
                                <Tooltip title={t("experiment.minEpochsInfo")} arrow>
                                    <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                </Tooltip>
                            </div>
                            <input
                                type="number"
                                value={params.minEpochs}
                                onChange={(e) => setParams({ ...params, minEpochs: parseInt(e.target.value) })}
                                style={{ width: '100px', marginLeft: '10px', textAlign: 'center', padding: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
                                step={1}
                                min={1}
                                max={params.maxEpochs - 1}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div>
                                <span>{t("experiment.batchSize")}</span>
                                <Tooltip title={t("experiment.batchSizeInfo")} arrow>
                                    <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                </Tooltip>
                            </div>
                            <input
                                type="number"
                                value={params.batchSize}
                                onChange={(e) => setParams({ ...params, batchSize: parseInt(e.target.value) })}
                                style={{ width: '100px', marginLeft: '10px', textAlign: 'center', padding: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
                                step={1}
                                min={1}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div>
                                <span>{t("experiment.learningRate")}</span>
                                <Tooltip title={t("experiment.learningRateInfo")} arrow>
                                    <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                </Tooltip>
                            </div>
                            <input
                                type="number"
                                value={params.learningRate}
                                onChange={(e) => setParams({ ...params, learningRate: parseFloat(e.target.value) })}
                                style={{ width: '100px', marginLeft: '10px', textAlign: 'center', padding: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
                                step={0.0001}
                                min={0.00000001}
                                max={0.99999999}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div>
                                <span>{t("experiment.lossFunction")}</span>
                                <Tooltip title={t("experiment.lossFunctionInfo")} arrow>
                                    <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                </Tooltip>
                            </div>
                            <Select
                                value={params.lossFunction}
                                onChange={(e) => setParams({ ...params, lossFunction: e.target.value })}
                                style={{ width: '150px', marginLeft: '10px' }}
                            >
                                <MenuItem value="MSE">MSE</MenuItem>
                                <MenuItem value="CE">CrossEntropy</MenuItem>
                            </Select>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div>
                                <span>{t("experiment.optimFunction")}</span>
                                <Tooltip title={t("experiment.optimFunctionInfo")} arrow>
                                    <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                </Tooltip>
                            </div>
                            <Select
                                value={params.optimFunction}
                                onChange={(e) => setParams({ ...params, optimFunction: e.target.value })}
                                style={{ width: '150px', marginLeft: '10px' }}
                            >
                                <MenuItem value="adam">Adam</MenuItem>
                                <MenuItem value="sgd">SGD</MenuItem>
                            </Select>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div>
                                <span>{t("experiment.minDloss")}</span>
                                <Tooltip title={t("experiment.minDlossInfo")} arrow>
                                    <HelpOutlineIcon style={{ fontSize: "18px", color: "#666", cursor: "pointer" }} />
                                </Tooltip>
                            </div>
                            <input
                                type="number"
                                value={params.minDloss}
                                onChange={(e) => setParams({ ...params, minDloss: parseFloat(e.target.value) })}
                                style={{ width: '100px', marginLeft: '10px', textAlign: 'center', padding: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
                                step={0.0001}
                                min={0.0000000000001}
                                max={0.9999999999999}
                            />
                        </label>
                        </Box>
                        <div style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
                        <Button
                            disabled={loading}
                            variant="contained"
                            color="primary"
                            style={{ marginTop: '20px' }}
                            onClick={handleTrain}
                        >
                            {t("experiment.train")}
                        </Button>
                        {loading && <CircularProgress size={24} style={{ marginLeft: '15px' }} />}
                        </div>
                    </CardContent>
                </Card>
                <div style={{ display: 'flex', justifyContent: 'space-evenly', marginTop: '20px' }}>
                <button onClick={() => setActiveStep(0)}>
                    {t("experiment.dataset")}
                </button>
                <button onClick={() => setActiveStep(1)}>
                    {t("experiment.rules")}
                </button>
                </div>
            </>}
            </div>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.type}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </div>
    );
}
