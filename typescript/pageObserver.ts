import {createQueryItem, saveQueryItems, scrapeMenuPage} from "./powerQuery/setupPowerQuery";

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

export class BaseObserver implements Observer{
    private readonly onPageChangedCallback: () => void;
    private readonly onPageLoadedCallback: () => void;
    private pageFilter: PageFilter;
    private readonly onMutation: (mutation: MutationRecord) => boolean;
    private observer: MutationObserver;
    private readonly trackModal: boolean;
    constructor(onPageChangedCallback: () => void, pageFilter: PageFilter, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false, onPageLoadedCallback: () => void = undefined) {
        this.onPageChangedCallback = onPageChangedCallback;
        this.onPageLoadedCallback = onPageLoadedCallback;
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

    isPageMatching = () => this.pageFilter.match();

    onPageLoaded() {
        this.onPageLoadedCallback?.();
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
    onPageLoaded: () => void;
    isPageMatching: () => boolean;
    disconnect: () => void;
    observeElement: (element: HTMLElement) => void;
}

export class HashObserver implements Observer {
    private baseObserver: BaseObserver;
    //onMutationCallback should return true if handled definitively.
    constructor(urlHash: string, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false, onPageLoadedCallback: () => void = undefined) {
        this.baseObserver = new BaseObserver(undefined, new HashPageFilter(urlHash), onMutationCallback, trackModal, onPageLoadedCallback);
    }

    disconnect() {
        this.baseObserver.disconnect();
    }

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }

    onPageLoaded() {
        this.baseObserver.onPageLoaded();
    }

    isPageMatching = () => this.baseObserver.isPageMatching();

    observeElement(element: HTMLElement): void {
        this.baseObserver.observeElement(element);
    }
}
export class ExactHashObserver implements Observer {
    private baseObserver: BaseObserver;
    //onMutationCallback should return true if handled definitively.
    constructor(urlHash: string, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false, onPageLoadedCallback: () => void = undefined) {
        this.baseObserver = new BaseObserver(undefined, new ExactHashPageFilter(urlHash), onMutationCallback, trackModal, onPageLoadedCallback);
    }

    disconnect: () => void;

    isPageMatching = () => this.baseObserver.isPageMatching();

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
    onPageLoaded() {
        this.baseObserver.onPageLoaded();
    }

    observeElement(element: HTMLElement): void {
        this.baseObserver.observeElement(element);
    }
}

export class PageObserver implements Observer {
    private baseObserver: BaseObserver;
    constructor(onPageChangedCallback: () => void, onPageLoadedCallback: () => void = undefined) {
        this.baseObserver = new BaseObserver(onPageChangedCallback, new AllPageFilter(), undefined, false, onPageLoadedCallback);
    }

    isPageMatching = () => this.baseObserver.isPageMatching();

    onPageChanged() {
        this.baseObserver.onPageChanged();
    }
    onPageLoaded() {
        this.baseObserver.onPageLoaded();
    }

    disconnect(): void {
        this.baseObserver.disconnect();
    }

    observeElement(element: HTMLElement): void {
        this.baseObserver.observeElement(element);
    }
}

export class MenuScrapingObserver implements Observer {
    private hashObserver: ExactHashObserver;
    private readonly page: string;
    private readonly longLabelPrefix: string;

    constructor(urlHash: string, page: string, longLabelPrefix: string) {
        let self = this;
        this.hashObserver = new ExactHashObserver(urlHash, (_) => {
            return self.onMutationPageWithMenu();
        });
        this.page = page;
        this.longLabelPrefix = longLabelPrefix;
    }

    isPageMatching = () => this.hashObserver.isPageMatching();

    onPageChanged() {
        this.hashObserver.onPageChanged();
        if(this.isPageMatching())
            this.onMutationPageWithMenu(); //calling this here, because a menu page is often a single load, and MutationObserver is then too late to
    }

    onPageLoaded() {
        this.onPageChanged();
    }

    onMutationPageWithMenu() {
        saveQueryItems(this.page, scrapeMenuPage(this.longLabelPrefix, MenuScrapingObserver.defaultLinkToQueryItem));
        return true;
    }

    static defaultLinkToQueryItem(headerLabel: string, link: HTMLAnchorElement, longLabelPrefix: string) {
        let label = link.textContent.trim();
        return createQueryItem(headerLabel, label, link.href, undefined, longLabelPrefix + label);
    }

    disconnect(): void {
        this.hashObserver.disconnect();
    }

    observeElement(element: HTMLElement): void {
        this.hashObserver.observeElement(element);
    }

}