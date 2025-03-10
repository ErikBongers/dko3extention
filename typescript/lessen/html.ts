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
    children: (ElementDef | GroupDef)[]
}

interface ElementDef {
    tag: string,
    id: string,
    atts: AttDef[]
    classList: string[],
    text: string,
    children: (GroupDef | ElementDef)[]
}

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
    let rootGroup: GroupDef = {
        count:1,
        children: []
    };
    let rootDef = parseChildren(rootGroup, nested) ;
    buildElement(root, rootDef, 1);
    return {root, last: lastCreated};
}

function parseText(nested: string[]) {
    let el1 = parsePlus(nested);
    return parseDown(el1, nested);
}

// parse >...
function parseDown(parent: (GroupDef | ElementDef), nested: string[]) {
    let next = nested.shift();
    if(!next)
        return parent;
    if(next === '>') {
        return parseChildren(parent, nested);
    }
    nested.unshift(next);
    return parent;
}

//parse everything after a '>'
function parseChildren(parent: (GroupDef | ElementDef), nested: string[]) {
    let el = parsePlus(nested);
    if(el)
        parent.children.push(el);
    return parent;
}

//parse a+b..., or just a if no plus.
function parsePlus(nested: string[]): (GroupDef | ElementDef) {
    //todo: there could be multiple plus operations...

    let el1 = parseMult(nested);
    if(!el1)
        return undefined;
    let plus = nested.shift();
    if(!plus)
        return el1; //eof
    if(plus !== '+') {
        nested.unshift(plus);
        return el1;
    }
    let el2 = parseText(nested);
    if(!el2)
        return el1; //todo: actually this is an error
    return {count:1, children: [el1, el2]};
}

function parseMult(nested: string[]) {
    let el = parseElement(nested);
    if(!el)
        return el;
    let mult = nested.shift(); //todo: replace shift(), test and unshift() with match();
    if(mult === '*') {
        let count = parseInt(nested.shift());
        //wrap el in a count group.
        return  {
            count,
            children: [
                parseDown(el, nested)
            ]
        };
    } else {
        nested.unshift(mult);
        return parseDown(el, nested);
    }
}

// parse group or primary element (and children)
function parseElement(nested: string[]) {
    let next = nested.shift();
    let el: GroupDef | ElementDef;
    if(next === '(') {
        el = parseText(nested);
        let closingBrace = nested.shift(); //todo: test!
        return el;
    } else {
        return parseChildDef(next);
    }
}

function addIndex(text: string, index: number) {
    return text.replace("$", (index+1).toString());
}


function parseChildDef(child: string): ElementDef {
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
    return {tag, id, atts, classList, text, children: []};
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

function buildElement(parent: HTMLElement, el: (GroupDef | ElementDef), index: number) {
    if("tag" in el) {
        let created = createElement(parent, el, index);
        for(let child of el.children)
            buildElement(created, child, index);
        return;
    }
    //must be GroupDef
    for(let i = 0; i < el.count; i++) {
        for( let def of el.children) {
            buildElement(parent, def, i);
        }
    }
}

