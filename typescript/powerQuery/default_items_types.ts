export type DefaultQueryItem = {
    headerLabel: string;
    label: string;
    href: string;
    weight: number;
    longLabel: string;
    lowerCase: string;
}

export type DefaultQueryItems = {
    [key: string]: DefaultQueryItem[];
};