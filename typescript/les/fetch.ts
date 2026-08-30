import {FetchChain} from "../table/fetchChain";
import * as def from "../def";

export interface LesDetails {
    id: string;
    editableName: boolean;
}

export async function fetchLes(id: string): Promise<LesDetails> {
    let chain = new FetchChain();

    // await chain.fetch(def.DKO3_BASE_URL+"#" + hash);
    await chain.fetch("view.php?args=lessen-les?id=" + id);
    chain.findDocReadyLoadUrl();
    await chain.fetch(); //index.view.php
    let tab = "details";
    await chain.fetch(`views/lessen/les/index.${tab}.tab.php`);
    let nameDiv = await chain.fetch("views/lessen/les/details/index.details.benaming.card.php");
    return {
        id: id,
        editableName: nameDiv.includes("benaming_wijzigen"),
    };
}
