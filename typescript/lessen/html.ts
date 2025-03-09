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
        addChild(parent, child);
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
    classList: string[]
}

function addChild(parent: HTMLElement, child: string) {
    // table.trimesterTable[border="2" style.width="100%"]
    // noinspection RegExpRedundantEscape
    let props = child.split(/([#\.\[\]])/);
    let tagName = props.shift();
    let id = undefined;
    let atts: AttDef[] = [];
    let classList: string[] = [];

    while(props.length) {
        let prop = props.shift();
        switch(prop) {
            case '.' :
                classList.push(props.shift());
                break;
            case '#':
                id = props.shift();
                break;
            case '[':
                atts = getAttributes( props);
                break;
        }
    }
    let el = parent.appendChild(document.createElement(tagName));
    if(id)
        el.id = id;
    if (classList.length)
        el.classList.add(...classList);
    for(let att of atts) {
        if(att.sub)
            el[att.name][att.sub] = att.value;
        else {
            el.setAttribute(att.name, att.value);
        }
    }
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

function stripQuotes(text: string) {
    if(text[0] === "'" || text[0] === '"')
        return text.substring(1, text.length-1);
    return text;
}