let lastCreated: HTMLElement = undefined; //TODO: get rid of global.

export function emmet(root_or_text: (HTMLElement | string), text?: string) {
    let root: HTMLElement = undefined;
    let nested: string[];
    if(typeof root_or_text === "string") {
        nested = root_or_text.split(">");
        if (nested[0][0] !== "#") {
            throw "No root id defined.";
        }
        root = document.querySelector(nested.shift()) as HTMLElement;
    } else {
        root = root_or_text;
        nested = text.split(">");
    }
    if(!root)
        throw `Root ${nested[0]} doesn't exist`;
    addChildren(root, nested);
    return {root, last: lastCreated};
}

function addChildren(parent: HTMLElement, nested: string[]) {
    let next = nested.shift();
    if(!next)
        return;

    let children = next.split("+");
    let lastChild = undefined;
    for(let child of children) {
        lastChild = addChild(parent, child, nested);
    }
    addChildren(lastChild, nested);
}

interface AttDef {
    name: string,
    sub: string,
    value: string
}

interface ElementDef {
    tag: string,
    id: string,
    atts: AttDef[]
    classList: string[],
    text: string,
    count: number
}

function addIndex(text: string, index: number) {
    return text.replace("$", (index+1).toString());
}

function addChild(parent: HTMLElement, child: string, nested: string[]) {
    let def = createChild(parent, child, nested);
    let el: HTMLElement;
    for(let index = 0; index < def.count; index++) {
        el = parent.appendChild(document.createElement(def.tag));
        lastCreated = el;
        if (def.id)
            el.id = addIndex(def.id, index);
        for(let clazz of def.classList) {
            el.classList.add(addIndex(clazz, index));
        }
        for (let att of def.atts) {
            if (att.sub)
                el[addIndex(att.name, index)][addIndex(att.sub, index)] = addIndex(att.value, index);
            else {
                el.setAttribute(addIndex(att.name, index), addIndex(att.value, index));
            }
        }
        if(def.text) {
            el.appendChild(document.createTextNode(addIndex(def.text, index)));
        }
    }
    return el;
}

function createChild(parent: HTMLElement, child: string, nested: string[]): ElementDef {
    // table.trimesterTable[border="2" style.width="100%"]
    // noinspection RegExpRedundantEscape
    let props = child.split(/([#\.\[\]\*\{\}])/);
    let tag = props.shift();
    let id = undefined;
    let atts: AttDef[] = [];
    let classList: string[] = [];
    let count = 1;
    let text = "";

    while(props.length) {
        let prop = props.shift();
        switch(prop) {
            case '.' :
                classList.push(props.shift());
                break;
            case '#':
                id = props.shift();
                break;
            case '*':
                count = parseInt(props.shift());
                break;
            case '[':
                atts = getAttributes( props);
                break;
            case '{':
                text = getText(props);
                break;
        }
    }
    return { tag, id, atts, classList, text, count };
}

function getAttributes(props: string[]) {
    //gather all the attributes
    let atts: string[][] = [];
    while(props.length) {
        let prop = props.shift();
        if(prop == ']')
            break;
        atts.push(prop.split(/([\s=])/));
    }
    let tokens = atts.flat()

    let attDefs: AttDef[] = [];

    while(tokens.length) {
        let name = tokens.shift();
        let eq = tokens.shift();
        let sub = "";
        if(eq === '.') {
            sub = tokens.shift();
            eq = tokens.shift();
        }
        if (eq != '=') {
            throw "Equal sign expected.";
        }
        let value = stripQuotes(tokens.shift());
        if (!value)
            throw "Value expected.";
            attDefs.push({name, sub, value});
        if(!tokens.length)
            break;
        let space = tokens.shift();
        //TODO: should test for multiple spaces
    }
    return attDefs;
}

function getText(props: string[]) {
    //gather all the attributes
    let text = "";
    while(props.length) {
        let prop = props.shift();
        if(prop == '}')
            break;
        text += prop;
    }
    return text;
}

function stripQuotes(text: string) {
    if(text[0] === "'" || text[0] === '"')
        return text.substring(1, text.length-1);
    return text;
}