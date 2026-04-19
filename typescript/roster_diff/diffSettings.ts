import {cloud} from "../cloud";

export type TagDef = {
    tag: string,
    searchString: string
}

export const defaultTagDefs: TagDef[] = [
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " sterr"},
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " durlet"},
    { tag: "Vestiging De Kleine Stad", searchString: " kleine stad "}, //"stad" could be a word in a different context.
    { tag: "Vestiging De Kleine Wereld", searchString: " wereld "},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " vrede "},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " dnv "},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " tegel"},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " tango "},
    { tag: "Vestiging De Nieuwe Vrede", searchString: " vergaderzaal "},
    { tag: "Vestiging De Kosmos", searchString: " kosmos "},
    { tag: "Vestiging De Schatkist", searchString: " schatk"},
    { tag: "Vestiging De Kolibrie", searchString: " kolibri"},
    { tag: "Vestiging Het Fonkelpad", searchString: " fonkel"},
    { tag: "Vestiging Alberreke", searchString: " alber"},
    { tag: "Vestiging c o r s o", searchString: " corso "},
    { tag: "Vestiging c o r s o", searchString: "c o r s o"},
    { tag: "Vestiging c o r s o", searchString: " studio 3 "},
    { tag: "Vestiging Prins Dries", searchString: " prins "},
    { tag: "Vestiging Prins Dries", searchString: " dries "},
    { tag: "Vestiging Groenhout Kasteelstraat", searchString: " groenhout "},
    { tag: "Vestiging Groenhout Kasteelstraat", searchString: " kasteel"},
    { tag: "Vestiging Het Fonkelpad", searchString: " fonkel "},
    { tag: "Vestiging OLV Pulhof", searchString: " pulhof "},
    { tag: "Vestiging OLV Pulhof", searchString: " 1p "},
    { tag: "Vestiging OLV Pulhof", searchString: " 2p "},
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " 1d "},
    { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " 2d "},
    { tag: "Vestiging Via Louiza", searchString: " louiza "},
    { tag: "Vestiging Frans Van Hombeeck", searchString: " hombee"},
    { tag: "Vestiging Klavertje Vier", searchString: " klaver"},
    { tag: "Academie Willem Van Laarstraat, Berchem", searchString: " bib "},
    { tag: "Academie Willem Van Laarstraat, Berchem", searchString: "laarstr"},
    { tag: "Academie Willem Van Laarstraat, Berchem", searchString: " wvl "},
    { tag: "Vestiging Frans Van Hombeeck", searchString: " beeld "},

    { tag: "Cabaret en comedy", searchString: " cabaret "},
    { tag: "Woordatelier", searchString: " woordatelier "},
    { tag: "Woordatelier", searchString: " wa "}, //todo: searchString is assumed to be in lower case.
    { tag: "Woordlab", searchString: " woordlab "},
    { tag: "Woordlab", searchString: " wl "},
    { tag: "Literair atelier", searchString: " literair atelier "},
    { tag: "Literaire teksten", searchString: " literaire teksten "},
    { tag: "Schrijven", searchString: " basiscursus "},
    { tag: "Spreken en vertellen", searchString: " spreken "},
    { tag: "Kunstenbad muziek/woord", searchString: " kunstenbad "},
    { tag: "Musicalatelier", searchString: " musicalatelier "},
    { tag: "Musical koor", searchString: " musical koor "},
    { tag: "Musical zang", searchString: " musical zang "},
    { tag: "Theater", searchString: " acteren "},
    { tag: "Muziekatelier", searchString: " 1p "},
    { tag: "Muziekatelier", searchString: " 2p "},
    { tag: "Muziekatelier", searchString: " 1d "},
    { tag: "Muziekatelier", searchString: " 2d "},
    { tag: "Muziekatelier", searchString: " 1va "},
    { tag: "Muziekatelier", searchString: " 1vb "},
    { tag: "Muziekatelier", searchString: " 1vc "},
    { tag: "Muziekatelier", searchString: " 2va "},
    { tag: "Muziekatelier", searchString: " 2vb "},
    { tag: "Muziekatelier", searchString: " 3v "},
    { tag: "Muziekatelier", searchString: " 1t "},
    { tag: "Muziekatelier", searchString: " 2t "},
    { tag: "Groepsmusiceren (klassiek)", searchString: " gm "},
    { tag: "Atelier (musical)", searchString: " musicalatelier "},
    { tag: "Musicalatelier 2e graad", searchString: " musical for kids "},
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
    schoolyear: string;
    tagDefs: TagDef[],
    ignoreList: string[]
}

export async function saveDiffSettings(diffSettings: DiffSettings) {
    let fileName = createDiffSettingsFileName(diffSettings.schoolyear);
    return cloud.json.upload(fileName, diffSettings);
}

export function createDiffSettingsFileName(schoolyear: string) { //todo: add academie
    return "diffSettings_" + schoolyear + ".json";
}

