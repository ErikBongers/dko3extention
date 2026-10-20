import {emmet} from "../../libs/Emmeter";

export function createSearchField(id: string, onSearchInput: (ev: Event) => any, value: string) {
    let input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.classList.add("tableFilter");
    input.oninput = onSearchInput;
    input.value = value;
    input.placeholder = "filter";
    let span = document.createElement("span");
    span.classList.add("searchButton");
    span.appendChild(input);
    let {first: clearButton} = emmet.appendChild(span, `button>img[src="${chrome.runtime.getURL("images/circle-xmark-regular.svg")}"`);
    (clearButton as HTMLElement).onclick = () => {
        input.value = "";
        // @ts-ignore
        input.oninput(undefined);
        input.focus();
    };
    return span;
}