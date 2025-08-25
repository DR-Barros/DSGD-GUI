import Stepper from '@mui/joy/Stepper';
import Step from '@mui/joy/Step';
import StepButton from '@mui/joy/StepButton';
import { useState } from "react";
import DatasetsView from '../../../components/DatasetsView';
import { useTranslation } from "react-i18next";
import type { Dataset } from '../../../types/dataset';

interface PreTrainPhaseProps {
    datasetPreview: any[];
    datasetStats: any[];
    Dataset: Dataset | null;
}

export default function PreTrainPhase({ datasetPreview, datasetStats, Dataset }: PreTrainPhaseProps) {
    const [activeStep, setActiveStep] = useState(0);
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
                </>}
                {activeStep === 1 && <div>Rules configuration content goes here.</div>}
                {activeStep === 2 && <div>Training initiation content goes here.</div>}
            </div>
        </div>
    );
}
