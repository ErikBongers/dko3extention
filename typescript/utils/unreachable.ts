// separate file because it gets included in aiworker, and we don't want to include all global stuff.
export function unreachable(x: never): never {
    throw new Error("This error will never be thrown. It is used for type safety.");
}