import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { fetchProtected } from "../../../api/client";
import type { Iteration } from '../../../types/experiment';
import { Button, Card, CardContent } from "@mui/material";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LinearScale,
  CategoryScale
} from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Chart } from "react-chartjs-2";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LinearScale,
  CategoryScale,
  MatrixController,
  MatrixElement
);

export default function PostTrainPhase({ id, back }: { id: number | null, back: () => void }) {
    const { t } = useTranslation();
    const [postTrainData, setPostTrainData] = useState<Iteration | null>(null);

    useEffect(() => {
        if (id) {
            fetchPostTrainData(id);
        }
    }, [id]);

    const fetchPostTrainData = async (experimentId: number) => {
        const { data, status } = await fetchProtected(`/train/iteration/${experimentId}`);
        if (status === 200) {
            setPostTrainData(data);
        } else {
            console.error("Error fetching post-training data");
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
            title: { display: true, text: "Predicted" }
        },
        y: {
            type: "category" as const,
            labels,
            offset: true,
            title: { display: true, text: "True" }
        }
        }
    };

    const inverseLabelMap: Record<number, string> = Object.fromEntries(
        Object.entries(postTrainData.label_encoder ?? {}).map(([name, idx]) => [idx, name])
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: "16px" }}>
            {/* Título ocupa todo el ancho */}
            <h2 style={{ width: "100%" }}>{t("postTrain.title")}</h2>

            {/* Cards en fila */}
            <div style={{ display: "flex", flexDirection: "row", gap: "16px", flexWrap: "wrap" }}>
            {postTrainData && (
                <Card style={{ flex: 1, minWidth: "250px" }}>
                <CardContent>
                    <h3>{t("postTrain.metrics")}</h3>
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
                    <h3 className="text-lg font-semibold mb-2">Confusion Matrix</h3>
                    <Chart type="matrix" data={data} options={options} />
                </CardContent>
                </Card>
            )}
            </div>

            {/* Botón abajo */}
            <div style={{ display: "flex", justifyContent: "center" }}>
            <Button variant="contained" color="primary" onClick={back}>
                Back to Pre-Training
            </Button>
            </div>
        </div>
    );
}