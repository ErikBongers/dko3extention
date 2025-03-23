import * as def from "./def";

export let cloud = {
    json: {
        fetch: fetchJson,
        upload: uploadJson
    }
};

export async function fetchJson(fileName: string) {
    return fetch(def.JSON_URL + "?fileName="+fileName, {method: "GET"})
        .then((res) => res.json());
}

export async function uploadJson(fileName: string, data: any) {
    let res = await fetch(def.JSON_URL + "?fileName=" + fileName, {
        method: "POST",
        body: JSON.stringify(data)
    });
    return await res.text();
}