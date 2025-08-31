import { useParams } from "react-router-dom";
import DrawerMenu from "./components/DrawerMenu";

import "./Experiment.css"
import { useState, useEffect } from "react";
import PreTrainPhase from "./components/PreTrainPhase";
import { fetchProtected } from "../../api/client";
import type { Dataset } from "../../types/dataset";
import type { TrainingParams } from "../../types/params";
import type { MessageData } from "../../types/train";
import TrainPhase from "./components/TrainPhase";
import PostTrainPhase from "./components/PostTrainPhase";


export default function Experiment() {
    const {id} = useParams();
    const [phase, setPhase] = useState<"pretrain" | "train" | "posttrain">("pretrain");
    const [datasetPreview, setDatasetPreview] = useState<any[]>([]);
    const [datasetStats, setDatasetStats] = useState<any[]>([]);
    const [Dataset, setDataset] = useState<Dataset | null>(null);
    const [trainingMsg, setTrainingMsg] = useState<MessageData | null>(null);
    const [iterations, setIterations] = useState<number | null>(null);

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

    async function startTraining(params: TrainingParams, rulesWithValues: any[]) {
        try {
            const body = {
                ...params,
                rules: rulesWithValues
            };
            // 1️⃣ Hacer POST para encolar el entrenamiento
            const response = await fetch(`http://localhost:8000/api/train/train-model/${id}`, {
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
            // 2️⃣ Conectarse al WebSocket para recibir progreso
            const ws = new WebSocket(`ws://localhost:8000/api/train/ws/${taskId}`);

            ws.onopen = () => {
                console.log('WebSocket conectado');
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

        } catch (err) {
            console.error('Error iniciando entrenamiento:', err);
        }
    }

    useEffect(() => {
        if (trainingMsg) {
            console.log("Mensaje de entrenamiento:", trainingMsg);
        }
    }, [trainingMsg]);

    return (
        <div>
            <DrawerMenu id={id} />
            <div className="experiment-container">
                {phase === "pretrain" && <PreTrainPhase datasetPreview={datasetPreview} datasetStats={datasetStats} Dataset={Dataset} experimentId={id} startTraining={startTraining} />}
                {phase === "train" && <TrainPhase trainingMsg={trainingMsg} />}
                {phase === "posttrain" && <PostTrainPhase id={iterations} back={() => setPhase("pretrain")} />}
            </div>
        </div>
    );
}
