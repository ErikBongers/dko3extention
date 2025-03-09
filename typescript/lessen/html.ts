export function emmet(text: string) {
    /*
       #SOME_ID>div.someClass+anotherDiv>someChild>span*5
    * */
    debugger;
    let nested = text.split(">");

    if(nested[0][0] !== "#") {
        throw "No root id defined.";
    }

    let root = document.querySelector(nested.shift()) as HTMLElement;
    if(!root)
        throw `Root ${nested[0]} doesn't exist`;
    addChildren(root, nested);
    return root;
}

function addChildren(parent: HTMLElement, nested: string[]) {
    let next = nested.shift();
    if(!next)
        return;

    let children = next.split("+");
    for(let child of children) {
        addChild(parent, child, nested);
    }
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

function addChild(parent: HTMLElement, child: string, nested: string[]) {
    let def = createChild(parent, child, nested);
    let el: HTMLElement;
    for(let index = 0; index < def.count; index++) {
        el = parent.appendChild(document.createElement(def.tag));
        if (def.id)
            el.id = def.id;
        if (def.classList.length)
            el.classList.add(...def.classList);
        for (let att of def.atts) {
            if (att.sub)
                el[att.name][att.sub] = att.value;
            else {
                el.setAttribute(att.name, att.value);
            }
        }
        if(def.text) {
            el.appendChild(document.createTextNode(def.text));
        }
    }
    addChildren(el, nested);//TODO: this doesn't multiply the sub-children.
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