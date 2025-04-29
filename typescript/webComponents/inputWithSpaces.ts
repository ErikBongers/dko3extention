const template = document.createElement('template');
template.innerHTML = `
    <div class="container">
        <div class="foreground">
            <input type="text"/>
        </div>
        <div id="background" class="background">
        </div>
    </div>
    `;
// language=CSS
const css = `
    /* noinspection CssUnusedSymbol*/
    .container {
        background-color: rgba(100, 150, 255, 0.1);
        position: relative;
        font-family: inherit; /* font of container MUST be the same as the input*/
        font-size: 1em;
        input {
            background: transparent;
            font-family: inherit; /* font of container MUST be the same as the input*/
            font-size: 1em;
            border: none;
            padding: 0;
            margin: 0;
            width: 100%;
            box-sizing: border-box;
        }
        /* noinspection CssUnusedSymbol*/
        .foreground {
            padding: 0;
        }
        /* noinspection CssUnusedSymbol*/
        .background {
            position: absolute;
            inset-inline-start: 0;
            inset-block-start: 0;
            z-index: -1;
            background: rgba(100, 150, 255, 0.1); /* this is the text background color. Should be set by user.*/
            border: 1px solid transparent;
            padding: 0;

        }
        /* noinspection CssUnusedSymbol*/
        span.spaces {
            /*
            background-color: red; // can be set with ::part(space) selector.
        
            */
        }
        /* noinspection CssUnusedSymbol*/
        span.text {
            color: transparent;
        }
    }
    `;
function loadWebComponent() {
    class InputWithSpaces extends HTMLElement {
        static get observedAttributes() {
            return ['value'];
        }
        input: HTMLInputElement = undefined;
        #shadow = undefined;
        background: HTMLDivElement = undefined;
        value = "";
        constructor() {
            super();
            this.#shadow = this.attachShadow({mode: 'closed'});
            let cssStyleSheet = new CSSStyleSheet();
            cssStyleSheet.replaceSync(css);
            this.#shadow.adoptedStyleSheets = [cssStyleSheet];
            this.#shadow.append(template.content.cloneNode(true));
            this.input = this.#shadow.querySelector('input');
            this.background = this.#shadow.querySelector('div.background');
        }

        // noinspection JSUnusedGlobalSymbols
        connectedCallback() {
            this.onContentComplete(); //note: if class is constructed before the full dom is parsed: use setTimeout() here. Or put the whole class in a DOMContentLoaded listerer.
        }
        // noinspection JSUnusedGlobalSymbols
        attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
            if (name === 'value') {
                this.input.value = newValue;
                this.onInput();
            }
        }

        onContentComplete() {
            this.input.addEventListener('input', (_: Event) => {
                this.onInput();
                this.setAttribute('value', this.input.value);//don't put this is onInput to avoid a dead-loop.
            });
        }

        onInput() {
            this.value = this.input.value;
            let stringArray = this.input.value.split(/(\s+)/);
            let stringArray2 = stringArray.filter(slice => slice);
            this.background.innerHTML = '';
            for (let slice of stringArray2) {
                let span = this.background.appendChild(document.createElement('span'));
                if (slice.trim() === '') {
                    span.classList.add("spaces");
                    span.part.add("space");
                } else {
                    span.classList.add("text");
                }
                span.innerHTML = slice.replaceAll(" ", "&nbsp;");
            }

        }

    }
    customElements.define('input-with-spaces', InputWithSpaces);
}

type InputWithSpaces = HTMLElement & {
    value: string;
}

export type Type = InputWithSpaces;

export function registerWebComponent()  {
    document.addEventListener('DOMContentLoaded', () => {loadWebComponent();}); //assures the page is fully parsed, including the custom element's content.
}