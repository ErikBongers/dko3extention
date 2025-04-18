declare module 'default_items' {
    type DefaultQueryItem = {
        headerLabel: string;
        label: string;
        href: string;
        weight: number;
        longLabel: string;
        lowerCase: string;
    }

    type DefaultQueryItems = {
        [key: string]: DefaultQueryItem[];
    };
    const default_items: DefaultQueryItems;
}
