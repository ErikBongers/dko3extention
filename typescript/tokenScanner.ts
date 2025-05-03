import {escapeRegexChars} from "./globals";

export class ScannerElse {
    scannerIf: ScannerIf;

    constructor(scannerIf: ScannerIf) {
        this.scannerIf = scannerIf;
    }

    not(callback?: (scanner: TokenScanner) => TokenScanner) {
        if(!this.scannerIf.yes) {
            callback?.(this.scannerIf.scanner);
        }
        return this.scannerIf.scanner;
    }
}

export class ScannerIf {
    yes: boolean;
    scanner: TokenScanner;

    constructor(yes: boolean, scanner: TokenScanner) {
        this.yes = yes;
        this.scanner = scanner;
    }

    then(callback: (scanner: TokenScanner) => TokenScanner) : ScannerElse {
        if(this.yes) {
            callback(this.scanner);
        }
        return new ScannerElse(this);
    }
}

export class TokenScanner {
    valid: boolean;
    source: string;
    cursor: string;
    constructor(text: string) {
        this.valid = true;
        this.source = text;
        this.cursor = text;
    }

    result(): string | undefined {
        if(this.valid)
            return this.cursor;
        return undefined;
    }

    find(...tokens: string[]) {
        return this.#find("", tokens);
    }

    match(...tokens: string[]) {
        return this.#find("^\\s*", tokens);
    }

    #find(prefix: string, tokens: string[]) {
        if(!this.valid)
            return this;
        let rxString = prefix + tokens
            .map(token => escapeRegexChars(token) + "\\s*")
            .join("");
        let match = RegExp(rxString).exec(this.cursor);
        if (match) {
            this.cursor = this.cursor.substring(match.index + match[0].length);
            return this;
        }
        this.valid = false;
        return this;
    }

    ifMatch(...tokens: string[]) : ScannerIf {
        if(!this.valid)
            return new ScannerIf(true, this); //never mind the yes: the scanner is invalid.

        this.match(...tokens);
        if(this.valid) {
            return new ScannerIf(true, this);
        } else {
            this.valid = true;
            return new ScannerIf(false, this);
        }
    }

    clip(len: number) {
        if(!this.valid)
            return this;
        this.cursor = this.cursor.substring(0, len);
        return this;
    }

    clipTo(end: string) {
        if(!this.valid)
            return this;
        let found = this.cursor.indexOf(end);
        if(found < 0) {
            this.valid = false;
            return this;
        }
        this.cursor = this.cursor.substring(0, found);
        return this;
    }

    clone() : TokenScanner {
        let newScanner = new TokenScanner(this.cursor);
        newScanner.valid = this.valid;
        return newScanner;
    }

    clipString() {
        let isString = false;
        this.ifMatch("'")
            .then(result => {
                isString = true;
                return result.clipTo("'");
            })
            .not()
            .ifMatch("\"")
            .then(result => {
                isString = true;
                return result.clipTo("\"")
            })
            .not();
        this.valid = this.valid && isString;
        return this;
    }

    getString(callback: (res: string) => void) {
        let subScanner = this.clone();
        let result = subScanner
            .clipString()
            .result();
        if(result) {
            callback(result);
            //now skip the string in <this>.
            this
                .ifMatch("'")
                .then(result => result.find("'"))
                .not()
                .ifMatch("\"")
                .then(result => result.find("\""))
                .not();
        }
        return this;
    }
}

