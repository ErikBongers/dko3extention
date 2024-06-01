export const options = {};

export function db3(message) {
    if (options?.showDebug) {
        console.log(message);
    }
}

export function observeElement(observer, element) {
    if (!element) {
        console.log("Can't attach observer.");
        return;
    }

    const config = {
        attributes: false,
        childList: true,
        subtree: true
    };
    observer.observe(element, config);
}

