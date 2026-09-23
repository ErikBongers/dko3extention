export type BaseRequest = {
    status: string;
};

export type InitPath = BaseRequest & { type: "initPath"; data: string }
export type GetNames = BaseRequest & { type: "getNames"; data: string[], output: string[] }
export type FindNamesInText = BaseRequest & { type: "findNames"; data: string, output: string[] }

export type WorkerRequest =
    InitPath |
    GetNames |
    FindNamesInText

// GetClassification
