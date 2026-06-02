export type TagDef = {
    tag: string,
    searchString: string,
    gradeYears?: string,
    isClassName?: boolean,
}

export const defaultTagDefs: TagDef[] = [
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " sterr", gradeYears: ""},
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " durlet", gradeYears: ""},
    { tag: "Vestiging De Kleine Stad", searchString: " kleine stad ", gradeYears: ""}, //"stad" could be a word in a different context.
    { tag: "Vestiging De Kleine Wereld", searchString: " wereld ", gradeYears: ""},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " vrede ", gradeYears: ""},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " dnv ", gradeYears: ""},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " tegel", gradeYears: ""},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " tango ", gradeYears: ""},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " vergaderzaal ", gradeYears: ""},
    { tag: "Vestiging De Kosmos", searchString: " kosmos ", gradeYears: ""},
    { tag: "Vestiging De Schatkist", searchString: " schatk", gradeYears: ""},
    { tag: "Vestiging De Kolibrie", searchString: " kolibri", gradeYears: ""},
    { tag: "Vestiging Het Fonkelpad", searchString: " fonkel", gradeYears: ""},
    { tag: "Vestiging Alberreke", searchString: " alber", gradeYears: ""},
    { tag: "Vestiging c o r s o", searchString: " corso ", gradeYears: ""},
    { tag: "Vestiging c o r s o", searchString: "c o r s o", gradeYears: ""},
    { tag: "Vestiging c o r s o", searchString: " studio 3 ", gradeYears: ""},
    { tag: "Vestiging Prins Dries", searchString: " prins ", gradeYears: ""},
    { tag: "Vestiging Prins Dries", searchString: " dries ", gradeYears: ""},
    { tag: "Vestiging Groenhout Kasteelstraat", searchString: " groenhout ", gradeYears: ""},
    { tag: "Vestiging Groenhout Kasteelstraat", searchString: " kasteel", gradeYears: ""},
    { tag: "Vestiging Het Fonkelpad", searchString: " fonkel ", gradeYears: ""},
    { tag: "Vestiging OLV Pulhof", searchString: " pulhof ", gradeYears: ""},
    { tag: "Vestiging OLV Pulhof", searchString: " 1p ", gradeYears: ""},
    { tag: "Vestiging OLV Pulhof", searchString: " 2p ", gradeYears: ""},
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " 1d ", gradeYears: ""},
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " 2d ", gradeYears: ""},
    { tag: "Vestiging Via Louiza", searchString: " louiza ", gradeYears: ""},
    { tag: "Vestiging Frans Van Hombeeck", searchString: " hombee", gradeYears: ""},
    { tag: "Vestiging Klavertje Vier", searchString: " klaver", gradeYears: ""},
    { tag: "Academie Willem Van Laarstraat, Berchem", searchString: " bib ", gradeYears: ""},
    { tag: "Academie Willem Van Laarstraat, Berchem", searchString: "laarstr", gradeYears: ""},
    { tag: "Academie Willem Van Laarstraat, Berchem", searchString: " wvl ", gradeYears: ""},
    { tag: "Vestiging Frans Van Hombeeck", searchString: " beeld ", gradeYears: ""},
    { tag: "Cabaret en comedy", searchString: " cabaret ", gradeYears: ""},
    { tag: "Woordatelier", searchString: " woordatelier ", gradeYears: ""},
    { tag: "Woordatelier", searchString: " wa ", gradeYears: ""},
    { tag: "Woordlab", searchString: " woordlab ", gradeYears: ""},
    { tag: "Woordlab", searchString: " wl ", gradeYears: ""},
    { tag: "Literair atelier", searchString: " literair atelier ", gradeYears: ""},
    { tag: "Literaire teksten", searchString: " literaire teksten ", gradeYears: ""},
    { tag: "Schrijven", searchString: " basiscursus ", gradeYears: ""},
    { tag: "Spreken en vertellen", searchString: " spreken ", gradeYears: ""},
    { tag: "Kunstenbad muziek/woord", searchString: " kunstenbad ", gradeYears: ""},
    { tag: "Musicalatelier", searchString: " musicalatelier ", gradeYears: ""},
    { tag: "Musical koor", searchString: " musical koor ", gradeYears: ""},
    { tag: "Musical zang", searchString: " musical zang ", gradeYears: ""},
    { tag: "Theater", searchString: " acteren ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 1p ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 2p ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 1d ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 2d ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 1va ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 1vb ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 1vc ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 2va ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 2vb ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 3v ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 1t ", gradeYears: ""},
    { tag: "Muziekatelier", searchString: " 2t ", gradeYears: ""},
    { tag: "Groepsmusiceren (klassiek)", searchString: " gm ", gradeYears: ""},
    { tag: "Atelier (musical)", searchString: " musicalatelier ", gradeYears: ""},
    { tag: "Musicalatelier 2e graad", searchString: " musical for kids ", gradeYears: ""},
] as const;

export const defaultIgnoreList: string[] = [
    " kunstkuren ",
    " arrangeren",
    " combo ",
    " harmonielab ",
    " klanklab ",
    " muzieklab ",
    " electronics ",
    " big band ",
    " blazersensemble ",
    " groepsmusiceren (jass pop rock) ",
    " geluidsleer ",
    " koor (jazz pop rock) ",
    " koor (musical) ",
    " slagwerkensemble ",
] as const;


export interface DiffSettings {
    version: number,
    academie: string;
    schoolYear: string;
    tagDefs: TagDef[],
    ignoreList: string[],
    urls: string[],
    classNamesFromTags?: string[];
}

export interface PreTranslation {
    trigger: string; //a searchtext or regex (starting with /...)
    search: string,
    replace: string,
    dscr: string, //make sense of this replacement
}

//todo: put pe-translations in settings
export let preTranslations: PreTranslation[] = [
    {trigger: "", search: "Kunstenbad beeld - muziek - woord", replace: "Kunstenbad Kleine Stad bk - muziek - woord", dscr: ""},
    {trigger: "", search: "blazersensemble", replace: "Blazersensemble 2e graad", dscr: "todo: conditional on page headers."},
    {trigger: "", search: "gitaarensemble", replace: "Gitaarensemble 2e graad", dscr: "todo: conditional on page headers."},
    {trigger: "", search: "strijkersensemble", replace: "Strijkersensemble 2e graad", dscr: "todo: conditional on page headers."},
    {trigger: "", search: "ü", replace: "u", dscr: "Jürgen !!!"},
];