export const options = {};
export let observers = [];

export function db3(message) {
    if (options?.showDebug) {
        console.log(message);
    }
}

export function registerObserver(observer) {
    console.log("registering observer" + observer.urlHash);
    observers.push(observer);
    if(observers.length > 10) //just in case...
        console.error("Too many observers!");
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

export class ObserverWrapper {
    constructor(onMutationCallback, urlHash) {
        this.onMutation = onMutationCallback;
        this.urlHash = urlHash;
        this.observer = new MutationObserver((mutationList, observer) => this.observerCallback(mutationList, observer));
    }
    observerCallback (mutationList /*, observer*/) {
        for (const mutation of mutationList) {
            if (mutation.type !== "childList") {
                continue;
            }
            if (this.onMutation(mutation)) {
                break;
            }
        }
    }

    onPageChanged() {
        if (window.location.hash.startsWith(this.urlHash)) {
            db3("In" + this.urlHash);
            this.observeElement(document.querySelector("main"));
        } else {
            db3("Niet in In" + this.urlHash);
            this.disconnect();
        }
    }

    observeElement(element) {
        if (!element) {
            console.log("Can't attach observer to element.");
            return;
        }

        const config = {
            attributes: false,
            childList: true,
            subtree: true
        };
        this.observer.observe(element, config);
    }

    disconnect() {
        this.observer.disconnect();
    }
}
