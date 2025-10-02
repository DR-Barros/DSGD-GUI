import { useTranslation } from "react-i18next";
import Stepper from '@mui/joy/Stepper';
import Step from '@mui/joy/Step';
import StepButton from '@mui/joy/StepButton';
import { useEffect, useState } from "react";
import { fetchProtected } from "../../../api/client";
import type { Iteration } from '../../../types/experiment';
import { Button, Card, CardContent} from "@mui/material";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LinearScale,
  CategoryScale
} from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Chart, Bar } from "react-chartjs-2";
import type { Rules } from "../../../types/rules";
import RuleView from "./RuleView";
import Predict from "./Predict";
import { useNavigate, useParams } from "react-router-dom";
import type { Metrics } from "../../../types/experiment";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LinearScale,
  CategoryScale,
  MatrixController,
  MatrixElement
);

export default function PostTrainPhase({ iterationId, back }: { iterationId: number | null, back: () => void }) {
    const { id } = useParams();
    const { t } = useTranslation();
    const [activeStep, setActiveStep] = useState<0|1|2>(0);
    const [compareMode, setCompareMode] = useState(false);
    const [postTrainData, setPostTrainData] = useState<Iteration | null>(null);
    const [metrics, setMetrics] = useState<Metrics[] | null>(null);
    const [rules, setRules] = useState<Rules | null>(null);
    const navigation = useNavigate();


    useEffect(() => {
        if (iterationId) {
            fetchPostTrainData(iterationId);
            fetchRules(iterationId);
            fetchMetrics();
        }
    }, [iterationId]);

    const fetchPostTrainData = async (iterationId: number) => {
        const { data, status } = await fetchProtected(`/train/iteration/${iterationId}`);
        if (status === 200) {
            setPostTrainData(data);
        } else {
            console.error("Error fetching post-training data");
        }
    };

    const fetchRules = async (iterationId: number) => {
        const { data, status } = await fetchProtected(`/rules/iteration/${iterationId}`);
        if (status === 200) {
            console.log("Fetched rules:", data);
            setRules(data);
        } else {
            console.error("Error fetching post-training rules");
        }
    };

    const fetchMetrics = async () => {
        if (id) {
            const { data, status } = await fetchProtected(`/experiments/${id}/metrics`);
            if (status === 200) {
                console.log("Fetched metrics:", data);
                setMetrics(data);
            } else {
                console.error("Error fetching metrics");
            }
        }
    };

    if (!postTrainData) {
        return <p>{t("postTrain.loading")}</p>;
    }

    const cm = postTrainData.confusion_matrix;

    // Datos para el heatmap
    const labels = Object.keys(postTrainData.label_encoder ?? {});
    const matrixData =
        cm?.flatMap((row, i) =>
        row.map((value, j) => ({
            x: labels[j],
            y: labels[i],
            v: value
        }))
        ) ?? [];

    const data = {
        datasets: [
        {
            label: "Confusion Matrix",
            data: matrixData,
            backgroundColor(ctx: any) {
            const value = ctx.dataset.data[ctx.dataIndex].v;
            const max =
                cm && Array.isArray(cm)
                    ? Math.max(...cm.flat().map((v: number | null) => v ?? 0))
                    : 1;
            const intensity = value / (max || 1);
            return `rgba(33, 150, 243, ${intensity})`; // azul con opacidad según valor
            },
            borderWidth: 1,
            width: ({ chart }: any) =>
            chart.chartArea ? chart.chartArea.width / labels.length - 4 : 20,
            height: ({ chart }: any) =>
            chart.chartArea ? chart.chartArea.height / labels.length - 4 : 20,

        }
        ]
    };

    const options = {
        plugins: {
            legend: { display: false },
            tooltip: {
            callbacks: {
                title: (items: any) => {
                const d = items[0].raw;
                return `True: ${d.y}, Pred: ${d.x}`;
                },
                label: (item: any) => `Count: ${item.raw.v}`
            }
            },
            datalabels: {
            color: "black",           // Color del texto
            font: { weight: "bold" }, // Negrita
            formatter: (value: any) => value.v // Muestra el valor "v" de tu matriz
            }
        },
        scales: {
        x: {
            type: "category" as const,
            labels,
            offset: true,
            title: { display: true, text: t("experiment.prediction") }
        },
        y: {
            type: "category" as const,
            labels,
            offset: true,
            title: { display: true, text: t("experiment.trueLabel") }
        }
        }
    };

    const inverseLabelMap: Record<number, string> = Object.fromEntries(
        Object.entries(postTrainData.label_encoder ?? {}).map(([name, idx]) => [idx, name])
    );

    const idxToClassName: Record<number, string> = {};
    if (rules?.classes) {
        Object.entries(rules.classes).forEach(([name, idx]) => {
            idxToClassName[idx] = name;
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "16px", position: "relative", minHeight: "calc(80vh- 40px)" }}>
            <Stepper sx={{ width: '100%', maxWidth: 600, margin: '20px auto' }}>
                <Step key={0}>
                    <StepButton onClick={() => setActiveStep(0)} className={activeStep === 0 ? 'active' : ''}>{t('experiment.metrics')}</StepButton>
                </Step>
                <Step key={1}>
                    <StepButton onClick={() => setActiveStep(1)} className={activeStep === 1 ? 'active' : ''}>{t('experiment.rules')}</StepButton>
                </Step>
                <Step key={2}>
                    <StepButton onClick={() => setActiveStep(2)} className={activeStep === 2 ? 'active' : ''}>{t('experiment.predict')}</StepButton>
                </Step>
            </Stepper>
            {/* Cards en fila */}
            {activeStep === 0 &&
            <>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                <Button sx={{ borderRadius: "10px 0 0 10px", width: "200px", maxWidth: "45%" }} variant={compareMode ? "outlined" : "contained"} color="primary" onClick={() => setCompareMode(false)}>
                    {t("postTrain.viewMetrics")}
                </Button>
                <Button sx={{ borderRadius: "0 10px 10px 0", width: "200px", maxWidth: "45%" }} variant={!compareMode ? "outlined" : "contained"} color="primary" onClick={() => setCompareMode(true)}>
                    {t("postTrain.compareMetrics")}
                </Button>
                </div>
                {!compareMode &&
                <>
                <div style={{ display: "flex", flexDirection: "row", gap: "16px", flexWrap: "wrap" }}>
                {postTrainData && (
                    <Card style={{ flex: 1, minWidth: "250px" }}>
                    <CardContent>
                        <h3>{t("experiment.metrics")}</h3>
                        <ul>
                        <li>Accuracy: {postTrainData.accuracy?.toFixed(2) ?? "—"}</li>
                        <li>Precision: {postTrainData.precision?.toFixed(2) ?? "—"}</li>
                        <li>Recall: {postTrainData.recall?.toFixed(2) ?? "—"}</li>
                        <li>F1 Score: {postTrainData.f1_score?.toFixed(2) ?? "—"}</li>
                        <li>ROC AUC: {postTrainData.roc_auc?.toFixed(2) ?? "—"}</li>
                        </ul>
                        {/* Tabla por clase */}
                        <table>
                            <thead>
                            <tr >
                                <th >Class</th>
                                <th >Precision</th>
                                <th >Recall</th>
                                <th >F1 Score</th>
                                <th >Support</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.keys(postTrainData.classification_report ?? {})
                                .filter((k) => !isNaN(Number(k))) // solo claves numéricas (clases)
                                .map((cls) => (
                                <tr key={cls}>
                                    <td >{inverseLabelMap[Number(cls)] ?? cls}</td>
                                    <td >{postTrainData.classification_report?.[cls].precision.toFixed(2)}</td>
                                    <td >{postTrainData.classification_report?.[cls].recall.toFixed(2)}</td>
                                    <td >{postTrainData.classification_report?.[cls]["f1-score"].toFixed(2)}</td>
                                    <td >{postTrainData.classification_report?.[cls].support}</td>
                                </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                    </Card>
                )}

                {cm && (
                    <Card style={{ flex: 1, minWidth: "250px" }}>
                    <CardContent>
                        <h3>{t("experiment.confusionMatrix")}</h3>
                        <Chart type="matrix" data={data} options={options} />
                    </CardContent>
                    </Card>
                )}
                </div>

                {/* Botón abajo */}
                <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "20px" }}>
                <Button variant="contained" color="primary" onClick={() => {
                    navigation(`/experiment/${postTrainData?.experiment_id}`);
                    setTimeout(() => {
                        back();
                    }, 10);
                }} style={{
                    width: 300,
                    maxWidth: '90%',
                }}>
                    {t("postTrain.backToSetup")}
                </Button>
                <Button variant="contained" color="primary" onClick={back} style={{
                    width: 300,
                    maxWidth: '90%',
                }}>
                    {t("postTrain.backwithSameSetup")}
                </Button>
                </div>
                </>}
                { compareMode && 
                <>
                {metrics ? (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.keys(metrics[0]).filter(k => k !== 'iteration_id' && k !== 'created_at').map(metric => (
                        <div key={metric} style={{ marginBottom: '30px', width: '100%', maxWidth: 400, margin: '0 auto' }}>
                        <h3 style={{ textTransform: 'capitalize' }}>{metric.replace(/([A-Z])/g, ' $1')}</h3>
                        <Bar
                            data={{
                                labels: metrics.map(m => `It: ${m.iteration_id}`),
                                datasets: [
                                    {
                                        data: metrics.map(m => (m as any)[metric].toFixed(3)),
                                        backgroundColor: metrics.map((_, i) => {
                                        const colors = [
                                            "rgba(52, 152, 219, 0.7)",
                                            "rgba(46, 204, 113, 0.7)",  
                                            "rgba(142, 68, 173, 0.7)",
                                            "rgba(52, 73, 94, 0.7)",    
                                            "rgba(22, 160, 133, 0.7)",
                                            "rgba(41, 128, 185, 0.7)",
                                            "rgba(26, 188, 156, 0.7)",
                                            "rgba(39, 174, 96, 0.7)",
                                            "rgba(155, 89, 182, 0.7)",
                                        ];
                                        return colors[i % colors.length];
                                        }),
                                    },
                                ]
                            }}
                            options={{
                                responsive: true,
                                plugins: {
                                    legend: {
                                        display: false,
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => {
                                                const label = context.dataset.label || '';
                                                const value = context.raw || 0;
                                                return `${label}: ${value}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: false,
                                    }
                                }
                            }}
                        />
                        </div>
                    ))}
                    </div>
                ) : (
                    <p>{t("experiment.loadingMetrics")}</p>
                )}
                </>
                }
            </>}
            {activeStep === 1 &&
            <>
                {rules ? (
                    <RuleView rules={rules} />
                ) : (
                    <p>{t("experiment.loadingRules")}</p>
                )}
            </>}
            {activeStep === 2 &&
            <>
                {iterationId !== null && <Predict iterationId={iterationId} />}
            </>}
            <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "auto" }}>
            {activeStep != 0 && <Button variant="contained" color="primary" onClick={() => setActiveStep(0)}>
                {t("postTrain.metrics")}
            </Button>}
            {activeStep != 1 && <Button variant="contained" color="primary" onClick={() => setActiveStep(1)}>
                {t("postTrain.rules")}
            </Button>}
            {activeStep != 2 && <Button variant="contained" color="primary" onClick={() => setActiveStep(2)}>
                {t("postTrain.predict")}
            </Button>}
            </div>
        </div>
    );
}