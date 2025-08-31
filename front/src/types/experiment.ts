import type { Dataset } from "./dataset";

export type Experiment = {
    id: number;
    name: string;
    user_id: number;
    created_at: string;
    datasets: Dataset
};

export type Iteration = {
  label_encoder: Record<string, number>;
  learning_rate: number;
  training_end_time: string | null;
  roc_auc: number | null;
  id: number;
  train_test_split: number;
  optimizer: string;
  accuracy: number | null;
  train_test_split_seed: number;
  loss_function: string;
  precision: number | null;
  created_at: string; 
  delete_nulls: boolean;
  precompute_rules: boolean;
  recall: number | null;
  drop_duplicates: boolean;
  force_precompute: boolean;
  experiment_id: number;
  min_epochs: number;
  training_status: "pending" | "running" | "completed" | "failed" | string; 
  f1_score: number | null;
  trained: boolean;
  max_epochs: number;
  training_message: string | null;
  confusion_matrix: number[][] | null;
  model_path: string;
  batch_size: number;
  training_start_time: string | null;
  classification_report: Record<string, any> | null;
};
