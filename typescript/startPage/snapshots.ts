import {emmet} from "../../libs/Emmeter/html";

export async function setupSnapshotPage() {
    let pluginContainer = document.getElementById("plugin_container");
    emmet.appendChild(pluginContainer, "div.mb-1>div>(h4{Snapshots van lessen.})");
}