export class HashPageFilter {
    constructor(urlHash) {
        this.urlHash = urlHash;
    }
    match() {
        return window.location.hash.startsWith(this.urlHash);
    }
}
export class AllPageFilter {
    constructor() {
    }
    match() {
        return true;
    }
}
export class BaseObserver {
    constructor(onPageChangedCallback, pageFilter, onMutationCallback) {
        this.onPageChangedCallback = onPageChangedCallback;
        this.pageFilter = pageFilter;
        this.onMutation = onMutationCallback;
        if (onMutationCallback) {
            this.observer = new MutationObserver((mutationList, observer) => this.observerCallback(mutationList, observer));
        }
    }
    observerCallback(mutationList, _observer) {
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
        if (!this.pageFilter.match()) {
            this.disconnect();
            return;
        }
        if (this.onPageChangedCallback) {
            this.onPageChangedCallback();
        }
        if (!this.onMutation)
            return;
        this.observeElement(document.querySelector("main"));
    }
    observeElement(element) {
        if (!element) {
            console.error("Can't attach observer to element.");
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
        this.observer?.disconnect();
    }
}
export class HashObserver {
    constructor(urlHash, onMutationCallback) {
        this.baseObserver = new BaseObserver(undefined, new HashPageFilter(urlHash), onMutationCallback);
    }
    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
}
export class PageObserver {
    constructor(onPageChangedCallback) {
        this.baseObserver = new BaseObserver(onPageChangedCallback, new AllPageFilter(), undefined);
    }
    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
}
