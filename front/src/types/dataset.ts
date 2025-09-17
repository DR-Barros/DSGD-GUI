export type Dataset = {
    id: number;
    name: string;
    created_at: string;
    columns: string[];
    columns_encoder: Record<string, Record<any, number>>;
    target_column: string;
    n_classes: number;
    n_rows: number;
};
