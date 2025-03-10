export let emmet = {
    create,
    append
};


interface AttDef {
    name: string,
    sub: string,
    value: string
}

interface GroupDef {
    count: number,
    child: Node
}

interface ListDef {
    list: Node[];
}

interface ElementDef {
    tag: string,
    id: string,
    atts: AttDef[]
    classList: string[],
    text: string,
    child: Node
}

type Node = GroupDef | ElementDef | ListDef;

let lastCreated: HTMLElement = undefined;
// noinspection RegExpRedundantEscape
let reSplit = /([>\(\)\+\*])/;

function create(text: string) {
    let root: HTMLElement = undefined;
    let nested: string[];
    // noinspection RegExpRedundantEscape
    nested = text.split(reSplit);
    if (nested[0][0] !== "#") {
        throw "No root id defined.";
    }
    root = document.querySelector(nested.shift()) as HTMLElement;
    if(!root)
        throw `Root ${nested[0]} doesn't exist`;
    nested.shift(); //consume > todo: should be tested.
    return parse(root, nested);
}

function append(root: HTMLElement, text: string) {
    let nested = text.split(reSplit);
    return parse(root, nested);
}

function parse(root: HTMLElement, nested: string[]) {
    nested = nested.filter(token => token);
    let rootDef = parseChildren(nested) ;
    buildElement(root, rootDef, 1);
    return {root, last: lastCreated};
}

// parse a>b...  or a+b+c>d...
function parseText(nested: string[]): Node {
    return parsePlus(nested);
}

// parse >...
function parseDown(nested: string[]) : Node {
    let next = nested.shift();
    if(!next)
        return undefined;
    if(next === '>') {
        return parseChildren(nested);
    }
    nested.unshift(next);
    return undefined;
}

//parse everything after a '>'
function parseChildren(nested: string[]) {
    return parsePlus(nested);
}

//parse a+b+c>d...
function parsePlus(nested: string[]): Node {
    let list = [];
    while(true) {
        let el = parseMult(nested);
        if (!el)
            return list.length===1 ? list[0] : {list};
        list.push(el)
        let plus = nested.shift();
        if (!plus)
            return list.length===1 ? list[0] : {list};
        if (plus !== '+') {
            nested.unshift(plus);
            return list.length===1 ? list[0] : {list};
        }
    }
}

function parseMult(nested: string[]) : Node {
    let el = parseElement(nested);
    if(!el)
        return el;
    let mult = nested.shift(); //todo: replace shift(), test and unshift() with match();
    if(mult === '*') {
        let count = parseInt(nested.shift());
        //wrap el in a count group.
        return  {
            count,
            child: el
        };
    } else {
        nested.unshift(mult);
        return el;
    }
}

// parse group or primary element (and children)
function parseElement(nested: string[]): Node {
    let next = nested.shift();
    let el: Node;
    if(next === '(') {
        el = parseText(nested);
        let _closingBrace = nested.shift(); //todo: test!
        return el;
    } else {
        return parseChildDef(next, nested);
    }
}

function addIndex(text: string, index: number) {
    return text.replace("$", (index+1).toString());
}

function parseChildDef(child: string, nested: string[]): ElementDef {
    if(!child)
        return undefined;
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
            case '[':
                atts = getAttributes( props);
                break;
            case '{':
                text = getText(props);
                break;
        }
    }
    return {tag, id, atts, classList, text, child: parseDown(nested)};
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

//CREATION
function createElement(parent: HTMLElement, def: ElementDef, index: number) {
    let el = parent.appendChild(document.createElement(def.tag));
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
    lastCreated = el;
    return el;
}

function buildElement(parent: HTMLElement, el: Node, index: number) {
    if("tag" in el) { //ElementDef
        let created = createElement(parent, el, index);
        if(el.child)
            buildElement(created, el.child, index);
        return;
    }
    if("list" in el) { //ListDef
        for( let def of el.list) {
            buildElement(parent, def, index);
        }
    }
    if("count" in el) { //GroupDef
        for(let i = 0; i < el.count; i++) {
            buildElement(parent, el.child, i);
        }
    }
}

