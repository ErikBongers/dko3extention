import * as def from "./def";

export let cloud = {
    json: {
        fetch: fetchJson,
        upload: uploadJson
    }
};

async function fetchJson(fileName: string) {
    return fetch(def.JSON_URL + "?fileName="+fileName, {method: "GET"})
        .then((res) => res.json());
}

async function uploadJson(fileName: string, data: any) {
    let res = await fetch(def.JSON_URL + "?fileName=" + fileName, {
        method: "POST",
        body: JSON.stringify(data),
        keepalive: true, //keeps the data valid even if window is closing.
    });
    return await res.text();
}

export type CheckName  = "WOORD_ROSTERS";

export async function fetchCheckStatus(checkName: CheckName) {
    let res = await fetch(def.CHECK_STATUS_URL + "?name="+checkName);
    return res.json();
}

