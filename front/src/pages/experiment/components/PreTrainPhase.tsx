import Stepper from '@mui/joy/Stepper';
import Step from '@mui/joy/Step';
import StepButton from '@mui/joy/StepButton';
import { useState, useEffect } from "react";
import DatasetsView from '../../../components/DatasetsView';
import { useTranslation } from "react-i18next";
import type { Dataset } from '../../../types/dataset';
import { Button, Card, CardContent, Checkbox, FormControlLabel, MenuItem, Select, TextField } from '@mui/material';
import { postProtected } from '../../../api/client';
import { indexValues, replaceVariables } from '../../../utils/parser';
import RuleEditor from './RuleEditor';
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


type HistogramBin = {
    bin: string;
    count: number;
};

interface PreTrainPhaseProps {
    datasetPreview: any[];
    datasetStats: any[];
    Dataset: Dataset | null;
    experimentId?: string;
}

export default function PreTrainPhase({ datasetPreview, datasetStats, Dataset, experimentId }: PreTrainPhaseProps) {
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
        selectedColumns: string[];
    }>({
        singleRule: true,
        multipleRules: false,
        breakRules: 3,
        selectedColumns: []
    });
    const [encodedRules, setEncodedRules] = useState<Record<string, Array<{ rule: any; vars: any; mass: any; rulesWithValues: any }>>>({});
    const { t } = useTranslation();

    const handleGenerateRules = async () => {
        const {data, status} = await postProtected(`/train/generate-rules/${experimentId}`, {
            singleRule: generateRuleParams.singleRule,
            multipleRule: generateRuleParams.multipleRules,
            breakRules: generateRuleParams.breakRules,
            selectedColumns: generateRuleParams.selectedColumns
        });
        if (status === 200) {
            console.log("Generated rules:", data.rules);
            console.log("Masses:", data.masses);
            const groupedRules: Record<string, Array<{ rule: any; vars: any; mass: any; rulesWithValues: any }>> = {};

            interface RuleEntry {
                0: any; // rule
                1: any; // vars
            }

            interface GroupedRule {
                rule: any;
                vars: any;
                mass: any;
                rulesWithValues: any;
            }

            (data.rules as RuleEntry[]).forEach((ruleEntry: RuleEntry, index: number) => {
                const r: any = ruleEntry[0];
                const vars: any = ruleEntry[1];
                const mass: any = data.masses[index];
                const rulesWithValues: any = replaceVariables(r, vars);
                const indices: string[] = Array.from(indexValues(r, vars));

                if (indices.length > 1) {
                    const joinedIdx: string = indices.join('-');
                    if (!groupedRules[joinedIdx]) groupedRules[joinedIdx] = [];
                    groupedRules[joinedIdx].push({ rule: r, vars, mass, rulesWithValues } as GroupedRule);
                } else {
                    indices.forEach((idx: string) => {
                        if (!groupedRules[idx]) groupedRules[idx] = [];
                        groupedRules[idx].push({ rule: r, vars, mass, rulesWithValues } as GroupedRule);
                    });
                }
            });
            console.log("Grouped Rules:", groupedRules);
            setEncodedRules(groupedRules);
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
                                    value={generateRuleParams.selectedColumns}
                                    onChange={(e) => setGenerateRuleParams({ ...generateRuleParams, selectedColumns: e.target.value as string[] })}
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
                        <Button variant="contained" color="primary" style={{ marginTop: '20px' }} onClick={handleGenerateRules}>
                            {t("experiment.generateRules")}
                        </Button>
                        </div>
                    </CardContent>
                </Card>
                <div>
                    {/* mostramos las reglas */}
                    {(() => {
                    // Renderizamos los grupos
                    return Object.entries(
                        encodedRules
                    ).map(([idx, rulesArray]) => (
                    <div key={idx} style={{ marginBottom: "1rem", padding: "0.5rem", border: "1px solid #ccc", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <h3>Index: {idx}</h3>
                        {idx.split('-').map((i) => {
                            console.log(i);
                            console.log(datasetStats);
                            const stats = datasetStats[0].find((s: any) => s.column == i);
                            console.log(stats);
                            return stats ? (
                                <div
                                    style={{
                                    fontSize: 10,
                                    color: "#666",
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    }}
                                >
                                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                                    {t("datasets.nulls")}: {stats.nulls} ({stats.nullPercent})
                                    </p>
                                    <p style={{ margin: 0, lineHeight: 1.3 }}>
                                    {t("datasets.unique")}: {stats.uniqueCount}
                                    </p>
                                    {(stats.min !== undefined && stats.min !== null) && (
                                    <>
                                        <p style={{ margin: 0, lineHeight: 1.3 }}>
                                        {t("datasets.min")}: {Number(stats.min).toFixed(2)}
                                        </p>
                                        <p style={{ margin: 0, lineHeight: 1.3 }}>
                                        {t("datasets.max")}: {Number(stats.max).toFixed(2)}
                                        </p>
                                        <p style={{ margin: 0, lineHeight: 1.3 }}>
                                        {t("datasets.mean")}: {Number(stats.mean).toFixed(2)}
                                        </p>
                                        {stats.histogram && stats.histogram.length > 0 && (
                                            <div style={{ width: "100px", height: "80px", marginTop: 4 }}>
                                                <Bar
                                                    data={{
                                                        labels: stats.histogram.map((h: HistogramBin) => h.bin),
                                                        datasets: [
                                                            {
                                                                data: stats.histogram.map((h: HistogramBin) => h.count),
                                                                backgroundColor: "rgba(75, 192, 192, 0.6)",
                                                            },
                                                        ],
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false },
                                                        },
                                                        scales: {
                                                            x: { ticks: { display: false } },
                                                            y: { ticks: { display: false } },
                                                        },
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </>
                                    )}
                                </div>
                                ) : null;
                        })}
                        {rulesArray.map((item, i) => (
                        <div key={i} style={{ marginBottom: "1rem", borderBottom: "1px solid #ccc", display: "flex", flexDirection: "row", gap: "0.5rem" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                                <RuleEditor
                                    conditions={item.rulesWithValues}
                                    onChange={(newConditions) => {
                                        setEncodedRules((prev) => {
                                        // Clonamos todo el objeto
                                        const updated = { ...prev };

                                        // Clonamos el array del índice actual
                                        const updatedArray = [...updated[idx]];

                                        // Reemplazamos el item en la posición i
                                        updatedArray[i] = {
                                            ...updatedArray[i],
                                            rulesWithValues: newConditions,
                                        };

                                        // Asignamos el array modificado de vuelta al índice
                                        updated[idx] = updatedArray;

                                        return updated;
                                        });
                                    }}
                                    columns={Dataset?.columns || []}
                                />
                            </div>
                            {item.mass.map((m: number, mi: number) => (
                            <div key={mi}>Mass {mi + 1}: {m.toFixed(4)}</div>
                            ))}
                        </div>
                        ))}
                    </div>
                    ));
                })()}
                </div>
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
