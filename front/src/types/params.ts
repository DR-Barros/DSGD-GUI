export type TrainingParams = {
    testSize: number;
    splitSeed: number;
    shuffle: boolean;
    dropNulls: boolean;
    dropDuplicates: boolean;
    maxEpochs: number;
    minEpochs: number;
    batchSize: number;
    lossFunction: string;
    optimFunction: string;
    learningRate: number;
    minDloss: number;
};

export type RuleParams = {
    singleRule: boolean;
    multipleRules: boolean;
    breakRules: number;
    selectedColumns: string[];
    manualColumns?: string[];
};