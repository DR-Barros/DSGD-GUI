import { useParams } from "react-router-dom";
import DrawerMenu from "./components/DrawerMenu";

import "./Experiment.css"
import { useState, useEffect } from "react";
import PreTrainPhase from "./components/PreTrainPhase";
import { fetchProtected } from "../../api/client";
import type { Dataset } from "../../types/dataset";

export default function Experiment() {
    const {id} = useParams();
    const [phase, setPhase] = useState<"pretrain" | "train" | "posttrain">("pretrain");
    const [datasetPreview, setDatasetPreview] = useState<any[]>([]);
    const [datasetStats, setDatasetStats] = useState<any[]>([]);
    const [Dataset, setDataset] = useState<Dataset | null>(null);

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

    return (
        <div>
            <DrawerMenu />
            <div className="experiment-container">
                {phase === "pretrain" && <PreTrainPhase datasetPreview={datasetPreview} datasetStats={datasetStats} Dataset={Dataset} experimentId={id} />}
            </div>
        </div>
    );
}
