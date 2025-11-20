import {createQueryItem, saveQueryItems, scrapeMenuPage} from "./powerQuery/setupPowerQuery";
import {tryUntilThen} from "./globals";

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
        if(!this.urlHash)
            return true; //no hash means always match.
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

export interface Observer {
    onPageChanged: () => void;
    onPageLoaded: () => void;
    isPageMatching: () => boolean;
    disconnect: () => void;
    observeElement: (element: HTMLElement) => void;
    isPageReallyLoaded: () => boolean;
}

export abstract class BaseObserver implements Observer {
    private readonly onPageChangedCallback: () => void;
    private readonly onPageLoadedCallback: () => void;
    private pageFilter: PageFilter;
    private readonly onMutation: (mutation: MutationRecord) => boolean;
    private observer: MutationObserver;
    private readonly trackModal: boolean;
    protected constructor(onPageChangedCallback: () => void, pageFilter: PageFilter, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false, onPageLoadedCallback: () => void = undefined) {
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
        if(this.onPageLoadedCallback)
            tryUntilThen(this.isPageReallyLoaded, this.onPageLoadedCallback);
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
        console.log("Observing main element.");
        if(!document.querySelector("main"))
            console.error("Can't attach observer to element.");
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

    abstract isPageReallyLoaded(): boolean;
}

export abstract class HashObserver extends BaseObserver {
    //onMutationCallback should return true if handled definitively, and no further mutation records from the mutationList should be handled.
    protected constructor(urlHash: string, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false, onPageLoadedCallback: () => void = undefined) {
        super(undefined, new HashPageFilter(urlHash), onMutationCallback, trackModal, onPageLoadedCallback);
    }
}

export abstract class ExactHashObserver extends BaseObserver {
    protected constructor(urlHash: string, onMutationCallback: (mutation: MutationRecord) => boolean, trackModal: boolean = false, onPageLoadedCallback: () => void = undefined) {
        super(undefined, new ExactHashPageFilter(urlHash), onMutationCallback, trackModal, onPageLoadedCallback);
    }
}

export abstract class PageObserver extends BaseObserver {
    protected constructor(onPageChangedCallback: () => void, onPageLoadedCallback: () => void = undefined) {
        super(onPageChangedCallback, new AllPageFilter(), undefined, false, onPageLoadedCallback);
    }
}

export class MenuScrapingObserver extends ExactHashObserver {
    private readonly pageLoadedQuerySelector: string;
    isPageReallyLoaded(): boolean {
        return undefined != document.querySelector(this.pageLoadedQuerySelector);
    }
    private readonly page: string;
    private readonly longLabelPrefix: string;

    constructor(urlHash: string, page: string, longLabelPrefix: string, pageLoadedQuerySelector: string) {
        super(urlHash, (_) => {
            return this.onMutationPageWithMenu();
        });
        this.page = page;
        this.longLabelPrefix = longLabelPrefix;
        this.pageLoadedQuerySelector = pageLoadedQuerySelector;
    }

    onPageChanged() {
        super.onPageChanged.call(this);
        if(this.isPageMatching())
            this.onMutationPageWithMenu(); //calling this here, because a menu page is often a single load, and MutationObserver is then too late to
    }

    onMutationPageWithMenu() {
        saveQueryItems(this.page, scrapeMenuPage(this.longLabelPrefix, MenuScrapingObserver.defaultLinkToQueryItem));
        return true;
    }

    static defaultLinkToQueryItem(headerLabel: string, link: HTMLAnchorElement, longLabelPrefix: string) {
        let label = link.textContent.trim();
        return createQueryItem(headerLabel, label, link.href, undefined, longLabelPrefix + label);
    }
}