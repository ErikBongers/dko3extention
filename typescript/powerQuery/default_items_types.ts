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

export type DefaultQueryItemsWithVersion = {
    __version__: number;
    queryItems: DefaultQueryItems;
}

export function isDefaultQueryItemsWithVersion(item: object): item is DefaultQueryItemsWithVersion {
    return '__version__' in item && 'queryItems' in item;
}