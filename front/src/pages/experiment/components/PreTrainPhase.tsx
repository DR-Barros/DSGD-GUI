import Stepper from '@mui/joy/Stepper';
import Step from '@mui/joy/Step';
import StepButton from '@mui/joy/StepButton';
import { useState, useEffect } from "react";
import DatasetsView from '../../../components/DatasetsView';
import { useTranslation } from "react-i18next";
import type { Dataset } from '../../../types/dataset';
import { Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, Modal, Select, TextField } from '@mui/material';
import { postProtected } from '../../../api/client';
import { indexValues, replaceVariables } from '../../../utils/parser';
import RuleGroup from './RuleGroup';
import LoopIcon from '@mui/icons-material/Loop';
import type { TrainingParams, RuleParams } from '../../../types/params';
import { desParseExpr, parseExpr } from '../../../utils/RuleParser';

interface PreTrainPhaseProps {
    datasetPreview: any[];
    datasetStats: any[];
    Dataset: Dataset | null;
    experimentId?: string;
    startTraining: (params: TrainingParams, rulesWithValues: any[], masses: any[], labels: any[]) => Promise<void>;
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
        optimFunction: "Adam",
        learningRate: 0.005
    });
    const [generateRuleParams, setGenerateRuleParams] = useState<RuleParams>({
        singleRule: true,
        multipleRules: false,
        breakRules: 3,
        selectedColumns: Dataset ? Dataset.columns.filter(col => col !== Dataset.target_column) : [],
        manualColumns: [],
    });
    const [encodedRules, setEncodedRules] = useState<Record<string, Array<{mass: any; labels: any; parsedRule: any }>>>({});
    const [modalRuleOpen, setModalRuleOpen] = useState(false);
    const { t } = useTranslation();

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
        const { data, status } = await postProtected(`/train/generate-rules/${experimentId}`, {
            singleRule: generateRuleParams.singleRule,
            multipleRule: generateRuleParams.multipleRules,
            breakRules: generateRuleParams.breakRules,
            selectedColumns: generateRuleParams.selectedColumns
        });

        if (status === 200) {
            console.log("Generated rules:", data.rules);
            for (let i = 0; i < data.rules.length; i++) {
                console.log(`Rule ${i}:`, data.rules[i]);
                let parsed = desParseExpr(data.rules[i][0], data.rules[i][1]);
                console.log(`Parsed Rule ${i}:`, parsed);
                let reparsed = parseExpr(parsed, generateRuleParams.selectedColumns || []);
                console.log(`Re-parsed Rule ${i}:`, reparsed);
            }
            console.log("Masses:", data.masses);

            const updatedRules: Record<string, Array<{ mass: any; labels: any; parsedRule: any }>> = {
                ...encodedRules
            };

            interface RuleEntry {
                0: any; 
                1: any; 
            }
            interface GroupedRule {
                mass: any;
                labels: any;
                parsedRule: any;
            }

            const newGroupedRules: Record<string, GroupedRule[]> = {};

            // Creamos un nuevo conjunto de reglas por índice
            (data.rules as RuleEntry[]).forEach((ruleEntry: RuleEntry, index: number) => {
                const r: any = ruleEntry[0];
                const vars: any = ruleEntry[1];
                const mass: any = data.masses[index];
                const labels: any = data.labels[index]
                const indices: string[] = Array.from(indexValues(r, vars));
                const parsedRule: any = desParseExpr(r, vars);

                if (indices.length > 1) {
                    const joinedIdx: string = indices.join('-');
                    if (!newGroupedRules[joinedIdx]) newGroupedRules[joinedIdx] = [];
                    newGroupedRules[joinedIdx].push({ mass, labels, parsedRule });
                } else {
                    indices.forEach((idx: string) => {
                        if (!newGroupedRules[idx]) newGroupedRules[idx] = [];
                        newGroupedRules[idx].push({ mass, labels, parsedRule });
                    });
                }
            });

            Object.keys(newGroupedRules).forEach(idx => {
                updatedRules[idx] = newGroupedRules[idx];
            });

            console.log("Updated Grouped Rules:", updatedRules);
            setEncodedRules(updatedRules);
        } else {
            console.error("Error generating rules:", data);
        }
    };



    useEffect(() => {
        console.log(datasetStats);
    }, [datasetStats]);

    return (
        <div>
            <Stepper sx={{ width: '100%', maxWidth: 600, margin: '20px auto' }}>
                <Step key={0}>
                    <StepButton onClick={() => setActiveStep(0)} className={activeStep === 0 ? 'active' : ''}>{t('experiment.dataset')}</StepButton>
                </Step>
                <Step key={1}>
                    <StepButton onClick={() => setActiveStep(1)} className={activeStep === 1 ? 'active' : ''}>{t('experiment.rules')}</StepButton>
                </Step>
                <Step key={2}>
                    <StepButton onClick={() => setActiveStep(2)} className={activeStep === 2 ? 'active' : ''}>{t('experiment.train')}</StepButton>
                </Step>
            </Stepper>
            <div>
            {activeStep === 0 && <>
                <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "row", gap: "16px" }}>
                    {datasetPreview.length === 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                    <h3>{t("experiment.splitSettings")}</h3>
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
                    <h3>{t("experiment.cleaningSettings")}</h3>
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
                <div style={{ display: "flex", flexDirection: "row", gap: "40px", marginTop: "20px", marginBottom: "20px", alignItems: "center", justifyContent: "space-evenly" }}>
                    <p>{t("columns")}: {Dataset?.columns.length}</p>
                    <p>{t("classes")}: {Dataset?.n_classes}</p>
                    <p>{t("rows")}: {Dataset?.n_rows}</p>
                    <Button onClick={() => setActiveStep(1)} variant="contained">
                        {t("experiment.seeRules")}
                    </Button>
                </div>
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
                    <CardContent sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={generateRuleParams.singleRule}
                                    onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, singleRule: e.target.checked })}
                                />
                            }
                            label={t("experiment.singleRule")}
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 1,
                            }}
                        />
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
                            label={t("experiment.breakRules")}
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
                                    style={{ maxWidth: '300px' }}
                                    >
                                {Dataset?.columns
                                .filter((col) => col !== Dataset.target_column)
                                .map((col) => (
                                    <MenuItem key={col} value={col}>
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
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={generateRuleParams.multipleRules}
                                    onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, multipleRules: e.target.checked })}
                                />
                            }
                            label={t("experiment.multipleRules")}
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 1,
                            }}
                        />
                        <div style={{gridColumn: 'span 3', margin: '0 auto'}}>
                        <Button variant="contained" color="primary" style={{ marginTop: '20px' }} onClick={handleGenerateRules}>
                            {t("experiment.generateRules")}
                        </Button>
                        </div>
                    </CardContent>
                </Card>
                <div style={{ display: 'flex', justifyContent: 'space-evenly', marginTop: '20px', marginBottom: '20px' }}>
                    <Button variant='contained' onClick={() => setActiveStep(0)}>
                        {t("back")}
                    </Button>
                    <Button variant='contained' onClick={() => setModalRuleOpen(true)}>
                        {t("experiment.addManualRule")}
                    </Button>
                    <Button variant='contained' onClick={() => setActiveStep(2)}>
                        {t("experiment.train")}
                    </Button>
                </div>
                <div>
                    {/* mostramos las reglas */}
                    {Object.entries(encodedRules).map(([idx, rulesArray]) => (
                    <RuleGroup
                        key={idx}
                        idx={idx}
                        rulesArray={rulesArray}
                        datasetStats={datasetStats}
                        Dataset={Dataset}
                        t={t}
                        setEncodedRules={setEncodedRules}
                    />
                    ))}
                </div>
                <Modal
                    open={modalRuleOpen}
                    onClose={() => setModalRuleOpen(false)}
                >
                    <div style={{ backgroundColor: 'white', padding: '20px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <FormControlLabel
                            control={
                                <Select
                                    multiple
                                    value={generateRuleParams.manualColumns}
                                    onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, manualColumns: e.target.value as string[] })}
                                    renderValue={(selected) => (selected as string[]).join(', ')}
                                    style={{ minWidth: '200px' }}
                                >
                                    {Dataset?.columns
                                        .filter((col) => col !== Dataset.target_column)
                                        .map((col) => (
                                            <MenuItem key={col} value={col}>
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
                        <button onClick={() => {
                            setModalRuleOpen(false);
                            //creamos el idx a crear
                            let idx = generateRuleParams.manualColumns?.join('-') || '';
                            setEncodedRules(prev => ({...prev, [idx]: []}))
                        }}>Crear</button>
                    </div>
                </Modal>
            </>}
            {activeStep === 2 && <>
                <Card sx={{marginBottom: 10, marginTop: 10}}>
                    <CardContent sx={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2}}>
                        <h2 style={{gridColumn: 'span 3', textAlign: 'center'}}>
                            {t("experiment.training")}
                        </h2>
                        <FormControlLabel
                            control={
                                <TextField
                                    type="number"
                                    value={params.maxEpochs}
                                    onChange={(e) => setParams({ ...params, maxEpochs: parseInt(e.target.value) })}
                                    style={{ width: '100px' }}
                                    slotProps={{
                                        htmlInput: {
                                            min: params.minEpochs + 1,
                                            max: 10000
                                        }
                                    }}
                                />
                            }
                            label={t("experiment.maxEpochs")}
                            labelPlacement='start'
                        />
                        <FormControlLabel
                            control={
                                <TextField
                                    type="number"
                                    value={params.minEpochs}
                                    onChange={(e) => setParams({ ...params, minEpochs: parseInt(e.target.value) })}
                                    style={{ width: '100px' }}
                                    slotProps={{
                                        htmlInput: {
                                            min: 1,
                                            max: params.maxEpochs - 1
                                        }
                                    }}
                                />
                            }
                            label={t("experiment.minEpochs")}
                            labelPlacement='start'
                        />
                        <FormControlLabel
                            control={
                                <TextField
                                    type="number"
                                    value={params.batchSize}
                                    onChange={(e) => setParams({ ...params, batchSize: parseInt(e.target.value) })}
                                    style={{ width: '100px' }}
                                    slotProps={{
                                        htmlInput: {
                                            min: 1
                                        }
                                    }}
                                />
                            }
                            label={t("experiment.batchSize")}
                            labelPlacement='start'
                        />
                        <FormControlLabel
                            control={
                                <TextField
                                    type="number"
                                    value={params.learningRate}
                                    onChange={(e) => setParams({ ...params, learningRate: parseFloat(e.target.value) })}
                                    style={{ width: '100px' }}
                                    slotProps={{
                                        htmlInput: {
                                            min: 0.0000000000001,
                                            max: 0.9999999999999,
                                            step: 0.0001
                                        }
                                    }}
                                />
                            }
                            label={t("experiment.learningRate")}
                            labelPlacement='start'
                        />
                        <FormControlLabel
                            control={
                                <Select
                                    value={params.lossFunction}
                                    onChange={(e) => setParams({ ...params, lossFunction: e.target.value })}
                                    style={{ width: '150px' }}
                                >
                                    <MenuItem value="MSE">MSE</MenuItem>
                                    <MenuItem value="CE">CrossEntropy</MenuItem>
                                </Select>
                            }
                            label={t("experiment.lossFunction")}
                            labelPlacement='start'
                        />
                        <FormControlLabel
                            control={
                                <Select
                                    value={params.optimFunction}
                                    onChange={(e) => setParams({ ...params, optimFunction: e.target.value })}
                                    style={{ width: '150px' }}
                                >
                                    <MenuItem value="Adam">Adam</MenuItem>
                                    <MenuItem value="sgd">SGD</MenuItem>
                                </Select>
                            }
                            label={t("experiment.optimFunction")}
                            labelPlacement='start'
                        />
                        <div style={{gridColumn: 'span 3', margin: '0 auto'}}>
                        <Button
                            variant="contained"
                            color="primary"
                            style={{ marginTop: '20px' }}
                            onClick={() => {
                                // Flatten all rule arrays and extract parsedRule
                                const allRulesWithValues: any[] = Object.values(encodedRules)
                                    .flat()
                                    .map((rule: any) => parseExpr(rule.parsedRule, Dataset?.columns || []));   
                                const allMases: any [] = Object.values(encodedRules)
                                    .flat()
                                    .map((rule:any) => rule.mass)
                                const allLabels: any [] = Object.values(encodedRules)
                                    .flat()
                                    .map((rule:any) => rule.labels)
                                startTraining(params, allRulesWithValues, allMases, allLabels)
                            }}
                        >
                            {t("experiment.train")}
                        </Button>
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
        </div>
    );
}
