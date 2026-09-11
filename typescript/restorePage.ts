import {FetchChain} from "./table/fetchChain";

let savedUrl = "";

export async function restorePage(fullRefresh: boolean = false) {
    console.log("Restoring page: " + savedUrl);
    if (savedUrl) {
        let chain =  new FetchChain();
        await chain.fetch(savedUrl);
        if(fullRefresh) {
            location.href = savedUrl;
            await changeView();
            // location.reload();
        }
    }
}

export function savePage() {
    console.log("Saving page: " + window.location.href);
    savedUrl = window.location.href;
}


async function changeView() {
    console.log("Changing view to: " + location.hash.replace('#',''));
    await fetch('view.php?args='+location.hash.replace('#',''));
}

export function showView(view: string, file: string, args: string) {
    file = file || '';
    args = args || '';

    var file_string = "";
    var args_string = "";
    if (file.length>0) {
        file_string = "$" + file;
    }
    if (args.length>0) {
        args_string = "?" + args;
    }

    location.hash = "#" + view + file_string + args_string;
}
