import * as def from "./def.js";

export async function fetchFromCloud(fileName: string) {
    return fetch(def.JSON_URL + "?fileName="+fileName, {method: "GET"})
        .then((res) => res.json());
}

export function uploadData(fileName: string, data: any) {
    fetch(def.JSON_URL + "?fileName="+fileName, {
        method: "POST",
        body: JSON.stringify(data)
    })
        .then((res) => res.text().then((text) => {
            console.log(text);
        }));
}