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

let nested: string[] = undefined;
let lastCreated: HTMLElement = undefined;
let globalStringCache: string[] = [];

// noinspection RegExpRedundantEscape
let reSplit = /([>\(\)\+\*])/;

// replace {string values} with {n} in case the strings contain special chars.
function prepareNested(text: string) {
    let stringCache: string[] = [];
    let stringMatches = text.matchAll(/{(.*?)}/gm);
    if(stringMatches) {
        for(let match of stringMatches){
            stringCache.push(match[1]);
        }
        stringCache = [...new Set(stringCache)];
    }
    for(let [index, str] of stringCache.entries()) {
        text = text.replace("{"+str+"}", "{"+index+"}");
    }
    nested = text.split(reSplit);
    return stringCache;
}

function create(text: string, onIndex?: (index: number) => string) {
    let root: HTMLElement = undefined;
    globalStringCache = prepareNested(text);
    if (nested[0][0] !== "#") {
        throw "No root id defined.";
    }
    root = document.querySelector(nested.shift()) as HTMLElement;
    if(!root)
        throw `Root ${nested[0]} doesn't exist`;
    nested.shift(); //consume > todo: should be tested.
    return parse(root, onIndex);
}

function append(root: HTMLElement, text: string, onIndex?: (index: number) => string) {
    globalStringCache = prepareNested(text);
    return parse(root, onIndex);
}

function parse(root: HTMLElement, onIndex: (index: number) => string) {
    nested = nested.filter(token => token);
    let rootDef = parseChildren() ;
    buildElement(root, rootDef, 1, onIndex);
    return {root, last: lastCreated};
}

// parse a>b...  or a+b+c>d...
function parseText(): Node {
    return parsePlus();
}

// parse >...
function parseDown() : Node {
    let next = nested.shift();
    if(!next)
        return undefined;
    if(next === '>') {
        return parseChildren();
    }
    nested.unshift(next);
    return undefined;
}

//parse everything after a '>'
function parseChildren() {
    return parsePlus();
}

//parse a+b+c>d...
function parsePlus(): Node {
    let list = [];
    while(true) {
        let el = parseMult();
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

function parseMult() : Node {
    let el = parseElement();
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
function parseElement(): Node {
    let next = nested.shift();
    let el: Node;
    if(next === '(') {
        el = parseText();
        let _closingBrace = nested.shift(); //todo: test!
        return el;
    } else {
        return parseChildDef(next);
    }
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
    return {tag, id, atts, classList, text, child: parseDown()};
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
function createElement(parent: HTMLElement, def: ElementDef, index: number, onIndex: (index: number) => string) {
    let el = parent.appendChild(document.createElement(def.tag));
    if (def.id)
        el.id = addIndex(def.id, index, onIndex);
    for(let clazz of def.classList) {
        el.classList.add(addIndex(clazz, index, onIndex));
    }
    for (let att of def.atts) {
        if (att.sub)
            el[addIndex(att.name, index, onIndex)][addIndex(att.sub, index, onIndex)] = addIndex(att.value, index, onIndex);
        else {
            el.setAttribute(addIndex(att.name, index, onIndex), addIndex(att.value, index, onIndex));
        }
    }
    if(def.text) {
        let str = globalStringCache[parseInt(def.text)];
        el.appendChild(document.createTextNode(addIndex(str, index, onIndex)));
    }
    lastCreated = el;
    return el;
}

function buildElement(parent: HTMLElement, el: Node, index: number, onIndex: (index: number) => string) {
    if("tag" in el) { //ElementDef
        let created = createElement(parent, el, index, onIndex);
        if(el.child)
            buildElement(created, el.child, index, onIndex);
        return;
    }
    if("list" in el) { //ListDef
        for( let def of el.list) {
            buildElement(parent, def, index, onIndex);
        }
    }
    if("count" in el) { //GroupDef
        for(let i = 0; i < el.count; i++) {
            buildElement(parent, el.child, i, onIndex);
        }
    }
}

function addIndex(text: string, index: number, onIndex: (index: number) => string) {
    if(onIndex) {
        let result = onIndex(index);
        text = text.replace("$$", result);
    }
    return text.replace("$", (index+1).toString());
}

