export type Dataset = {
    id: number;
    name: string;
    created_at: string;
    columns: string[];
    target_column: string;
    n_classes: number;
    n_rows: number;
};
