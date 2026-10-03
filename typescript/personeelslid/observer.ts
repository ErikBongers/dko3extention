import {checkAndDecorate, decorateName} from "../globals";
import {HashObserver} from "../pageObserver";

class PersoneelsLidObserver extends HashObserver {
    constructor() {
        super("#personeel-personeelslid", onMutation);
    }
    isPageReallyLoaded(): boolean {
        throw new Error("Method not implemented.");
    }
}

export default new PersoneelsLidObserver();

function onMutation() {
    checkAndDecorate("vh_header_personeel_personeelslid_left_title", decorateName);
    return false;
}
