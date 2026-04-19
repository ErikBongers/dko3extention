(function(exports) {

"use strict";

//#region typescript/def.ts
const CLOUD_BASE_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/";
const JSON_URL = CLOUD_BASE_URL + "json";
const CHECK_STATUS_URL = CLOUD_BASE_URL + "check-status";

//#endregion
//#region typescript/cloud.ts
let cloud = { json: {
	fetch: fetchJson,
	upload: uploadJson
} };
async function fetchJson(fileName) {
	return fetch(JSON_URL + "?fileName=" + fileName, { method: "GET" }).then((res) => res.json());
}
async function uploadJson(fileName, data) {
	let res = await fetch(JSON_URL + "?fileName=" + fileName, {
		method: "POST",
		body: JSON.stringify(data),
		keepalive: true
	});
	return await res.text();
}

//#endregion
//#region typescript/roster_diff/diffSettings.ts
const defaultTagDefs = [
	{
		tag: "Vestiging Sterrenkijker/SL Durlet",
		searchString: " sterr"
	},
	{
		tag: "Vestiging Sterrenkijker/SL Durlet",
		searchString: " durlet"
	},
	{
		tag: "Vestiging De Kleine Stad",
		searchString: " kleine stad "
	},
	{
		tag: "Vestiging De Kleine Wereld",
		searchString: " wereld "
	},
	{
		tag: "Vestiging De Nieuwe Vrede",
		searchString: " vrede "
	},
	{
		tag: "Vestiging De Nieuwe Vrede",
		searchString: " dnv "
	},
	{
		tag: "Vestiging De Nieuwe Vrede",
		searchString: " tegel"
	},
	{
		tag: "Vestiging De Nieuwe Vrede",
		searchString: " tango "
	},
	{
		tag: "Vestiging De Nieuwe Vrede",
		searchString: " vergaderzaal "
	},
	{
		tag: "Vestiging De Kosmos",
		searchString: " kosmos "
	},
	{
		tag: "Vestiging De Schatkist",
		searchString: " schatk"
	},
	{
		tag: "Vestiging De Kolibrie",
		searchString: " kolibri"
	},
	{
		tag: "Vestiging Het Fonkelpad",
		searchString: " fonkel"
	},
	{
		tag: "Vestiging Alberreke",
		searchString: " alber"
	},
	{
		tag: "Vestiging c o r s o",
		searchString: " corso "
	},
	{
		tag: "Vestiging c o r s o",
		searchString: "c o r s o"
	},
	{
		tag: "Vestiging c o r s o",
		searchString: " studio 3 "
	},
	{
		tag: "Vestiging Prins Dries",
		searchString: " prins "
	},
	{
		tag: "Vestiging Prins Dries",
		searchString: " dries "
	},
	{
		tag: "Vestiging Groenhout Kasteelstraat",
		searchString: " groenhout "
	},
	{
		tag: "Vestiging Groenhout Kasteelstraat",
		searchString: " kasteel"
	},
	{
		tag: "Vestiging Het Fonkelpad",
		searchString: " fonkel "
	},
	{
		tag: "Vestiging OLV Pulhof",
		searchString: " pulhof "
	},
	{
		tag: "Vestiging OLV Pulhof",
		searchString: " 1p "
	},
	{
		tag: "Vestiging OLV Pulhof",
		searchString: " 2p "
	},
	{
		tag: "Vestiging Sterrenkijker/SL Durlet",
		searchString: " 1d "
	},
	{
		tag: "Vestiging Sterrenkijker/SL Durlet",
		searchString: " 2d "
	},
	{
		tag: "Vestiging Via Louiza",
		searchString: " louiza "
	},
	{
		tag: "Vestiging Frans Van Hombeeck",
		searchString: " hombee"
	},
	{
		tag: "Vestiging Klavertje Vier",
		searchString: " klaver"
	},
	{
		tag: "Academie Willem Van Laarstraat, Berchem",
		searchString: " bib "
	},
	{
		tag: "Academie Willem Van Laarstraat, Berchem",
		searchString: "laarstr"
	},
	{
		tag: "Academie Willem Van Laarstraat, Berchem",
		searchString: " wvl "
	},
	{
		tag: "Vestiging Frans Van Hombeeck",
		searchString: " beeld "
	},
	{
		tag: "Cabaret en comedy",
		searchString: " cabaret "
	},
	{
		tag: "Woordatelier",
		searchString: " woordatelier "
	},
	{
		tag: "Woordatelier",
		searchString: " wa "
	},
	{
		tag: "Woordlab",
		searchString: " woordlab "
	},
	{
		tag: "Woordlab",
		searchString: " wl "
	},
	{
		tag: "Literair atelier",
		searchString: " literair atelier "
	},
	{
		tag: "Literaire teksten",
		searchString: " literaire teksten "
	},
	{
		tag: "Schrijven",
		searchString: " basiscursus "
	},
	{
		tag: "Spreken en vertellen",
		searchString: " spreken "
	},
	{
		tag: "Kunstenbad muziek/woord",
		searchString: " kunstenbad "
	},
	{
		tag: "Musicalatelier",
		searchString: " musicalatelier "
	},
	{
		tag: "Musical koor",
		searchString: " musical koor "
	},
	{
		tag: "Musical zang",
		searchString: " musical zang "
	},
	{
		tag: "Theater",
		searchString: " acteren "
	},
	{
		tag: "Muziekatelier",
		searchString: " 1p "
	},
	{
		tag: "Muziekatelier",
		searchString: " 2p "
	},
	{
		tag: "Muziekatelier",
		searchString: " 1d "
	},
	{
		tag: "Muziekatelier",
		searchString: " 2d "
	},
	{
		tag: "Muziekatelier",
		searchString: " 1va "
	},
	{
		tag: "Muziekatelier",
		searchString: " 1vb "
	},
	{
		tag: "Muziekatelier",
		searchString: " 1vc "
	},
	{
		tag: "Muziekatelier",
		searchString: " 2va "
	},
	{
		tag: "Muziekatelier",
		searchString: " 2vb "
	},
	{
		tag: "Muziekatelier",
		searchString: " 3v "
	},
	{
		tag: "Muziekatelier",
		searchString: " 1t "
	},
	{
		tag: "Muziekatelier",
		searchString: " 2t "
	},
	{
		tag: "Groepsmusiceren (klassiek)",
		searchString: " gm "
	},
	{
		tag: "Atelier (musical)",
		searchString: " musicalatelier "
	},
	{
		tag: "Musicalatelier 2e graad",
		searchString: " musical for kids "
	}
];
const defaultIgnoreList = [
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
	" slagwerkensemble "
];
async function saveDiffSettings(diffSettings) {
	let fileName = createDiffSettingsFileName(diffSettings.schoolyear);
	return cloud.json.upload(fileName, diffSettings);
}
function createDiffSettingsFileName(schoolyear) {
	return "diffSettings_" + schoolyear + ".json";
}

//#endregion
exports.createDiffSettingsFileName = createDiffSettingsFileName
exports.defaultIgnoreList = defaultIgnoreList
exports.defaultTagDefs = defaultTagDefs
exports.saveDiffSettings = saveDiffSettings
return exports;
})({});
//# sourceMappingURL=diffSettings.js.map