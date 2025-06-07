import {TokenScanner} from "../tokenScanner";

export class FetchChain {
    private lastText = "";

    get() {
        return this.lastText;
    }

    set(text: string) {
        this.lastText = text;
    }

    async fetch(url?: string) {
        this.lastText = await fetchText(url ?? this.lastText);
        return this.lastText;
    }

    findDocReadyLoadUrl() {
        this.lastText = getDocReadyLoadUrl(this.lastText);
        return this.lastText;
    }

    findDocReadyLoadScript() {
        this.lastText = getDocReadyLoadScript(this.lastText).result();
        return this.lastText;
    }

    find(...args: string[]) {
        this.lastText = new TokenScanner(this.lastText).find(...args).result();
        return this.lastText;
    }

    getQuotedString() {
        let daString= "";
        let scanner = new TokenScanner(this.lastText).captureString((res => daString = res));
        this.lastText  = scanner.result();
        return daString;
    }

    clipTo(end: string) {
        this.lastText = new TokenScanner(this.lastText).clipTo(end).result();
    }

    div() {
        let el = document.createElement("div");
        el.innerHTML = this.lastText;
        return el;
    }

    includes(text: string) {
        return this.lastText.includes(text);
    }
}

export function findDocReady(scanner: TokenScanner) {
    return scanner.find("$", "(", "document", ")", ".", "ready", "(");
}

export function getDocReadyLoadUrl(text: string) {
    let scanner = new TokenScanner(text);
    while (true) {
        let docReady = findDocReady(scanner);
        if (!docReady.valid)
            return undefined;
        let url = docReady
            .clone()
            .clipTo("</script>")
            .find(".", "load", "(")
            .clipString()
            .result();
        if (url)
            return url;
        scanner = docReady;
    }
}

export function getDocReadyLoadScript(text: string) {
    let scanner = new TokenScanner(text);
    while (true) {
        let docReady = findDocReady(scanner);
        if (!docReady.valid)
            return undefined;
        let script = docReady
            .clone()
            .clipTo("</script>");
        let load = script
            .clone()
            .find(".", "load", "(");
        if (load.valid)
            return script;
        scanner = docReady;
    }
}

export async function fetchText(url: string) {
    let res = await fetch(url);
    return res.text();
}