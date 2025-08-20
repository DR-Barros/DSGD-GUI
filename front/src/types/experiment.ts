import type { Dataset } from "./dataset";

export type Experiment = {
    id: number;
    name: string;
    user_id: number;
    created_at: string;
    datasets: Dataset
};
