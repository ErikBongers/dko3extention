export type SubjectDef = {
    checked: boolean,
    name: string,
    alias: string
}

export type TranslationDef = {
    find: string,
    replace: string,
    prefix: string,
    suffix: string,
}

export type TeacherHoursSetup = {
    schoolyear: string,
    subjects: SubjectDef[];
    translations: TranslationDef[];
}

export let defaultInstruments = [
    {checked:  true, name:  "Accordeon", alias: ""},
    {checked:  true, name:  "Altfluit", alias: "Dwarsfluit"},
    {checked:  true, name:  "Althoorn", alias: ""},
    {checked:  true, name:  "Altklarinet", alias: ""},
    {checked:  true, name:  "Altsaxofoon", alias: "Saxofoon"},
    {checked:  true, name:  "Altsaxofoon (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Altviool", alias: ""},
    {checked:  true, name:  "Baglama/saz (wereldmuziek)", alias: ""},
    {checked:  true, name:  "Bariton", alias: ""},
    {checked:  true, name:  "Baritonsaxofoon", alias: ""},
    {checked:  true, name:  "Baritonsaxofoon (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Basfluit", alias: ""},
    {checked:  true, name:  "Basgitaar (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Basklarinet", alias: "Klarinet"},
    {checked:  true, name:  "Bastrombone", alias: ""},
    {checked:  true, name:  "Bastuba", alias: "Koper"},
    {checked:  true, name:  "Bugel", alias: "Koper"},
    {checked:  true, name:  "Cello", alias: ""},
    {checked:  true, name:  "Contrabas (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Contrabas (klassiek)", alias: ""},
    {checked:  true, name:  "Dwarsfluit", alias: ""},
    {checked:  true, name:  "Engelse hoorn", alias: ""},
    {checked:  true, name:  "Eufonium", alias: "Koper"},
    {checked:  true, name:  "Fagot", alias: ""},
    {checked:  true, name:  "Gitaar", alias: ""},
    {checked:  true, name:  "Gitaar (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Harp", alias: ""},
    {checked:  true, name:  "Hobo", alias: ""},
    {checked:  true, name:  "Hoorn", alias: "Koper"},
    {checked:  true, name:  "Keyboard (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Klarinet", alias: ""},
    {checked:  true, name:  "Kornet", alias: ""},
    {checked:  true, name:  "Orgel", alias: ""},
    {checked:  true, name:  "Piano", alias: ""},
    {checked:  true, name:  "Piano (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Pianolab", alias: ""},
    {checked:  true, name:  "Piccolo", alias: "Dwarsfluit"},
    {checked:  true, name:  "Slagwerk", alias: ""},
    {checked:  true, name:  "Slagwerk (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Sopraansaxofoon", alias: "Saxofoon"},
    {checked:  true, name:  "Sopraansaxofoon (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Tenorsaxofoon", alias: "Saxofoon"},
    {checked:  true, name:  "Tenorsaxofoon (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Trombone", alias: "Koper"},
    {checked:  true, name:  "Trompet", alias: "Koper"},
    {checked:  true, name:  "Trompet (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Ud (wereldmuziek)", alias: ""},
    {checked:  true, name:  "Viool", alias: ""},
    {checked:  true, name:  "Zang", alias: ""},
    {checked:  true, name:  "Zang (jazz pop rock)", alias: ""},
    {checked:  true, name:  "Zang (musical 2e graad)", alias: ""},
    {checked:  true, name:  "Zang (musical)", alias: ""},
];

export let defaultInstrumentsMap = new Map<string, SubjectDef>();
defaultInstruments.forEach(i => defaultInstrumentsMap.set(i.name, i));

export let translationDefs: TranslationDef[] = [
    {find: "Altsaxofoon", replace: "Saxofoon", prefix: "", suffix: ""},
    {find: "Sopraansaxofoon", replace: "Saxofoon", prefix: "", suffix: ""},
    {find: "Tenorsaxofoon", replace: "Saxofoon", prefix: "", suffix: ""},

    {find: "(klassiek)", replace: "", prefix: "K ", suffix: ""},
    {find: "(jazz pop rock)", replace: "", prefix: "JPR ", suffix: ""},
    {find: "(musical)", replace: "", prefix: "M ", suffix: ""},
    {find: "(musical 2e graad)", replace: "(2e graad)", prefix: "M ", suffix: ""},
    {find: "(wereldmuziek)", replace: "", prefix: "WM ", suffix: ""},
    {find: "instrumentinitiatie", replace: "init", prefix: "", suffix: ""},
    {find: "", replace: "", prefix: "K ", suffix: ""},
];
