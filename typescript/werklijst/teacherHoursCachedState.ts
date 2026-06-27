import {scrapeUren, StudentUrenRow} from "./scrapeUren";
import {mapHourSettings, TeacherHoursSetup, TeacherHoursSetupMapped} from "./hoursSettings";
import {CloudData, JsonCloudData} from "./urenData";
import {createWerklijstBuilderWithReset} from "../table/werklijstBuilder";
import {CriteriumName, Domein, FIELD, Grouping, Operator} from "./criteria";
import {NamedCellTableFetchListener} from "../pageHandlers";
import {fetchHoursSettingsOrSaveDefault} from "./prefillInstruments";
import {getUrenVakLeraarFileName} from "./buildUren";
import {Schoolyear} from "../globals";
import {cloud} from "../cloud";

export class TeacherHoursCachedState {
    schoolYear: string;
    studentRowData: StudentUrenRow[] | null = null;
    private hourSettingsMapped: TeacherHoursSetupMapped | null = null;
    private fromCloud: CloudData | null = null;
    private selectedVakNames: string[] | null = null;
    private allDko3Vakken: { name: string, value: string }[] | null = null;

    constructor(schoolYear: string) {
        this.schoolYear = schoolYear;
    }

    async getStudentRowData() {
        if (!this.studentRowData) {
            let table = await this.fetchTeacherHours(this.schoolYear, (await this.getHourSettingsMapped()));
            this.studentRowData = scrapeUren(table.rows, table.headerIndices);
        }
        return this.studentRowData;
    }

    private async fetchTeacherHours(schooljaar: string, hourSettings: TeacherHoursSetupMapped) {
        //Hack for DKO3 bug. Split S1 and S2 and fetch those separately. This way, if 1 subject is present in both 4.1 and S1, they are both listed!
        let tableNoSpec = await this.fetchHourRows(schooljaar, await this.getSelectedVakNames(), "nospec");
        let tableOnlySpec = await this.fetchHourRows(schooljaar, await this.getSelectedVakNames(), "spec");
        // await setViewFromCurrentUrl();
        return {rows: tableNoSpec.rows.concat(tableOnlySpec.rows), headerIndices: tableNoSpec.headerIndices};
    }

    private async fetchHourRows(schooljaar: string, vakNames: string[], spec: "spec" | "nospec") {
        let builder = await createWerklijstBuilderWithReset(schooljaar, Grouping.LES);
        builder.addCriterium(CriteriumName.Domein, Operator.EQUALS, [Domein.Muziek]);
        builder.addCriterium(CriteriumName.Vak, Operator.EQUALS, vakNames); //todo: we already have the codes: Immediately add the codes?
        builder.addFields([FIELD.NAAM, FIELD.VOORNAAM, FIELD.VAK_NAAM, FIELD.GRAAD_LEERJAAR, FIELD.KLAS_LEERKRACHT]);
        builder.addCriterium(CriteriumName.Graad, spec == "spec" ? Operator.EQUALS : Operator.NOT_EQUALS, ["specialisatie"]);
        let preparedBuilder = await builder.sendSettings();
        let table = await preparedBuilder.fetchTable(undefined, true);
        return {rows: [...table.getRows()], headerIndices: NamedCellTableFetchListener.getHeaderIndicesFromHeaderCells(table.getTable().tHead!.rows[0].cells)};
    }


    async getSelectedVakNames() {
        if (!this.selectedVakNames) {
            let selectedInstrumentNames = new Set((await this.getHourSettingsMapped()).subjects.filter(i => i.checked).map(i => i.name));
            let validInstruments = (await this.getAllDko3Vakken()).filter((vak) => selectedInstrumentNames.has(vak.name));
            this.selectedVakNames = validInstruments.map(vak => vak.name);
        }
        return this.selectedVakNames;
    }

    async getAllDko3Vakken() {
        if(!this.allDko3Vakken) {
            let builder = await createWerklijstBuilderWithReset(this.schoolYear, Grouping.LES);
            this.allDko3Vakken = await builder.fetchAvailableSubjects();
        }
        return this.allDko3Vakken;
    }

    async getHourSettingsMapped() {
        if (!this.hourSettingsMapped) {
            this.hourSettingsMapped = mapHourSettings(await fetchHoursSettingsOrSaveDefault(this.schoolYear, await this.getAllDko3Vakken()));
        }
        return this.hourSettingsMapped;
    }

    setHourSettings(hourSettings: TeacherHoursSetup) {
        this.hourSettingsMapped = mapHourSettings(hourSettings);
    }

    async getFromCloud() {
        if (!this.fromCloud) {
            let jsonCloudData = await getUrenFromCloud(getUrenVakLeraarFileName(this.schoolYear))
            this.fromCloud = new CloudData(jsonCloudData);
        }
        return this.fromCloud;
    }
}

async function getUrenFromCloud(fileName: string): Promise<JsonCloudData> {
    try {
        return await cloud.json.fetch(fileName);
    } catch (e) {
        return new JsonCloudData();
    }
}

