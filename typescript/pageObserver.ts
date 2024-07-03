interface PageFilter {
    match: () => boolean;
}

export class HashPageFilter implements PageFilter{
    private readonly urlHash: string;
    constructor(urlHash: string) {
        this.urlHash = urlHash;
    }

    match() {
        return window.location.hash.startsWith(this.urlHash);
    }
}

export class AllPageFilter implements PageFilter{
    constructor() {
    }

    match() {
        return true;
    }
}

export class BaseObserver {
    private readonly onPageChangedCallback: () => void;
    private pageFilter: PageFilter;
    private readonly onMutation: (mutation: MutationRecord) => boolean;
    private observer: MutationObserver;
    constructor(onPageChangedCallback: () => void, pageFilter: PageFilter, onMutationCallback: (mutation: MutationRecord) => boolean) {
        this.onPageChangedCallback = onPageChangedCallback;
        this.pageFilter = pageFilter;
        this.onMutation = onMutationCallback;
        if (onMutationCallback) {
            this.observer = new MutationObserver((mutationList, observer) => this.observerCallback(mutationList, observer));
        }
    }

    observerCallback(mutationList: MutationRecord[] , _observer: MutationObserver) {
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

    observeElement(element: HTMLElement) {
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
    private baseObserver: BaseObserver;
    constructor(urlHash: string, onMutationCallback: (mutation: MutationRecord) => boolean) {
        this.baseObserver = new BaseObserver(undefined, new HashPageFilter(urlHash), onMutationCallback);
    }

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
}

export class PageObserver {
    private baseObserver: BaseObserver;
    constructor(onPageChangedCallback: () => void) {
        this.baseObserver = new BaseObserver(onPageChangedCallback, new AllPageFilter(), undefined);
    }

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
}