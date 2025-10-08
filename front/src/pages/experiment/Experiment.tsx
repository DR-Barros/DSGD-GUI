import { useNavigate, useParams } from "react-router-dom";
import DrawerMenu from "./components/DrawerMenu";
import "./Experiment.css"
import { useState, useEffect, useRef } from "react";
import PreTrainPhase from "./components/PreTrainPhase";
import { fetchProtected } from "../../api/client";
import type { Dataset } from "../../types/dataset";
import type { TrainingParams } from "../../types/params";
import type { MessageData } from "../../types/train";
import TrainPhase from "./components/TrainPhase";
import PostTrainPhase from "./components/PostTrainPhase";
import { API_WS_URL, API_URL } from "../../api/client";

export default function Experiment() {
    const {id} = useParams();
    const [phase, setPhase] = useState<"pretrain" | "train" | "posttrain">("pretrain");
    const [datasetPreview, setDatasetPreview] = useState<any[]>([]);
    const [datasetStats, setDatasetStats] = useState<any[]>([]);
    const [Dataset, setDataset] = useState<Dataset | null>(null);
    const [trainingMsg, setTrainingMsg] = useState<MessageData | null>(null);
    const [iterations, setIterations] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const navigation = useNavigate();

    useEffect(() => {
        if (id) {
            handlePreviewDataset();
        }
    }, [id]);

    const handlePreviewDataset = async () => {
        const { data, status } = await fetchProtected(`/experiments/dataset/${id}`);
        console.log("Dataset preview data:", data);
        if (status !== 200) {
            console.log("Error fetching dataset preview");
        }
        else {
            setDatasetPreview(data.data.map((item: any) => item.data));
            setDatasetStats(data.data.map((item: any) => item.stats));
            setDataset(data.info);
        }
    };

    async function startTraining(params: TrainingParams, rulesWithValues: any[], masses: any[], labels: any[]) {
        try {
            const body = {
                ...params,
                rules: rulesWithValues,
                masses: masses,
                labels: labels
            };
            // 1️⃣ Hacer POST para encolar el entrenamiento
            const response = await fetch(`${API_URL}/train/train-model/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Error en POST: ${response.statusText}`);
            }

            const data = await response.json();
            const taskId = data.task_id;
            setIterations(taskId);
            console.log(`Task enqueued. Task ID: ${taskId}`);
            if (!taskId) {
                console.error("No task ID returned");
                return;
            }
            // 2️⃣ Conectar al WebSocket para recibir actualizaciones
            websocket(taskId);

        } catch (err) {
            console.error('Error iniciando entrenamiento:', err);
        }
    }

    const websocket = async (taskId: string) => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        const ws = new WebSocket(`${API_WS_URL}/train/ws/${taskId}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket conectado');
            navigation(`/experiment/${id}/${taskId}`);
            setPhase("train");
        };

        ws.onmessage = (event) => {
            console.log(`Progreso: ${event.data}`);
            try {
                let evento = JSON.parse(event.data);
                setTrainingMsg(evento);
            } catch (error) {
                console.error("Error al parsear el mensaje:", error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket cerrado');
            setPhase("posttrain");
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setPhase("pretrain");
        };
    };

    const sendStopTraining = () => {
        if (wsRef.current) {
            wsRef.current.send("stop");
        } else {
            console.error("WebSocket no está conectado");
        }
    };

    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <div>
            <DrawerMenu setDrawerOpen={setDrawerOpen} id={id} openIterations={(iterationId, status) => {
                    setIterations(iterationId);
                    if (wsRef.current) {
                        wsRef.current.close();
                    }
                    if (status === "running" || status === "pending"){
                        setPhase("train");
                        websocket(iterationId.toString());
                    }
                    else if (status === "completed") setPhase("posttrain");
                }}
                train={() => {
                    navigation(`/experiment/${id}`);
                    setTimeout(() => {
                        setPhase("pretrain");
                    }, 10);
                }}
            />
            <div className="experiment-container" style={{ marginLeft: drawerOpen ? 240 : "auto", width: drawerOpen ? "calc(100% - 290px)" : "calc(100% - 40px)" }}>
                {phase === "pretrain" && <PreTrainPhase datasetPreview={datasetPreview} datasetStats={datasetStats} Dataset={Dataset} experimentId={id} startTraining={startTraining} />}
                {phase === "train" && <TrainPhase trainingMsg={trainingMsg} sendStopTraining={sendStopTraining} />}
                {phase === "posttrain" && <PostTrainPhase iterationId={iterations} back={() => setPhase("pretrain")} />}
            </div>
        </div>
    );
}
