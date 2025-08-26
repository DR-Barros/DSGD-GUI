import Stepper from '@mui/joy/Stepper';
import Step from '@mui/joy/Step';
import StepButton from '@mui/joy/StepButton';
import { useState } from "react";
import DatasetsView from '../../../components/DatasetsView';
import { useTranslation } from "react-i18next";
import type { Dataset } from '../../../types/dataset';
import { Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, Select, TextField } from '@mui/material';

interface PreTrainPhaseProps {
    datasetPreview: any[];
    datasetStats: any[];
    Dataset: Dataset | null;
}

export default function PreTrainPhase({ datasetPreview, datasetStats, Dataset }: PreTrainPhaseProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [params, setParams] = useState({
        testSize: 0.2,
        splitSeed: 42,
        shuffle: true,
        dropNulls: true,
        dropDuplicates: true,
        maxEpochs: 100,
        minEpochs: 10,
        batchSize: 32,
        lossFunction: "MSE",
        optimFunction: "Adam",
        learningRate: 0.001
    });
    const [generateRuleParams, setGenerateRuleParams] = useState<{
        singleRule: boolean;
        multipleRules: boolean;
        breakRules: number;
        selectedRules: string[];
    }>({
        singleRule: true,
        multipleRules: false,
        breakRules: 3,
        selectedRules: []
    });
    const { t } = useTranslation();

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
                    <label>
                        {t("experiment.splitSeed")}
                        <input
                            type="number"
                            value={params.splitSeed}
                            onChange={(e) => setParams({ ...params, splitSeed: parseInt(e.target.value) })}
                        />
                    </label>
                    <button onClick={() => setParams({ ...params, splitSeed: Math.floor(Math.random() * 100) })}>
                        {t("experiment.randomSeed")}
                    </button>
                    <label>
                        {t("experiment.shuffle")}
                        <input
                            type="checkbox"
                            checked={params.shuffle}
                            onChange={(e) => setParams({ ...params, shuffle: e.target.checked })}
                        />
                    </label>
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
                </Card>
                <div style={{ display: "flex", flexDirection: "row", gap: "40px" }}>
                <p>{t("columns")}: {Dataset?.columns.length}</p>
                <p>{t("classes")}: {Dataset?.n_classes}</p>
                <p>{t("rows")}: {Dataset?.n_rows}</p>
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
                <button onClick={() => setActiveStep(1)}>
                    {t("experiment.seeRules")}
                </button>
            </>}
            {activeStep === 1 && <>
                <Card sx={{marginBottom: 2}}>
                    <h2>{t("experiment.generateRules")}</h2>
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
                                    value={generateRuleParams.selectedRules}
                                    onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, selectedRules: e.target.value as string[] })}
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
                        <Button variant="contained" color="primary" style={{ marginTop: '20px' }}>
                            {t("experiment.generateRules")}
                        </Button>
                        </div>
                    </CardContent>
                </Card>
                <button onClick={() => setActiveStep(0)}>
                    {t("back")}
                </button>
                <button onClick={() => setActiveStep(2)}>
                    {t("experiment.train")}
                </button>
            </>}
            {activeStep === 2 && <>
                <Card sx={{marginBottom: 10, marginTop: 10}}>
                    <CardContent sx={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2}}>
                        <h2 style={{gridColumn: 'span 3', textAlign: 'center'}}>
                            {t("experiment.training")}
                        </h2>
                        <label>
                            {t("experiment.maxEpochs")}
                            <TextField
                                type="number"
                                value={params.maxEpochs}
                                onChange={(e) => setParams({ ...params, maxEpochs: parseInt(e.target.value) })}
                                style={{ width: '100px' }}
                            />
                        </label>
                        <label>
                            {t("experiment.minEpochs")}
                            <TextField
                                type="number"
                                value={params.minEpochs}
                                onChange={(e) => setParams({ ...params, minEpochs: parseInt(e.target.value) })}
                                style={{ width: '100px' }}
                            />
                        </label>
                        <label>
                            {t("experiment.batchSize")}
                            <TextField
                                type="number"
                                value={params.batchSize}
                                onChange={(e) => setParams({ ...params, batchSize: parseInt(e.target.value) })}
                                style={{ width: '100px' }}
                            />
                        </label>
                        <label>
                            {t("experiment.learningRate")}
                            <TextField
                                type="number"
                                value={params.learningRate}
                                onChange={(e) => setParams({ ...params, learningRate: parseFloat(e.target.value) })}
                                style={{ width: '100px' }}
                            />
                        </label>
                         <div style={{gridColumn: 'span 3', margin: '0 auto'}}>
                        <Button variant="contained" color="primary" style={{ marginTop: '20px' }}>
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
