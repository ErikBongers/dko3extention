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

export class ExactHashPageFilter implements PageFilter{
    private readonly urlHash: string;
    constructor(urlHash: string) {
        this.urlHash = urlHash;
    }

    match() {
        return window.location.hash === this.urlHash;
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
    private readonly trackModal: boolean;
    constructor(onPageChangedCallback: () => void, pageFilter: PageFilter, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false) {
        this.onPageChangedCallback = onPageChangedCallback;
        this.pageFilter = pageFilter;
        this.onMutation = onMutationCallback;
        this.trackModal = trackModal;
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
        if(this.trackModal)
            this.observeElement(document.getElementById("dko3_modal"));
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

export interface Observer {
    onPageChanged: () => void;
}

export class HashObserver implements Observer {
    private baseObserver: BaseObserver;
    //onMutationCallback should return true if handled definitively.
    constructor(urlHash: string, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false) {
        this.baseObserver = new BaseObserver(undefined, new HashPageFilter(urlHash), onMutationCallback, trackModal);
    }

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
}
export class ExactHashObserver implements Observer {
    private baseObserver: BaseObserver;
    //onMutationCallback should return true if handled definitively.
    constructor(urlHash: string, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false) {
        this.baseObserver = new BaseObserver(undefined, new ExactHashPageFilter(urlHash), onMutationCallback, trackModal);
    }

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
}

export class PageObserver implements Observer {
    private baseObserver: BaseObserver;
    constructor(onPageChangedCallback: () => void) {
        this.baseObserver = new BaseObserver(onPageChangedCallback, new AllPageFilter(), undefined, false);
    }

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
}