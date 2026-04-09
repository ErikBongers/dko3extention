import {emmet} from "../libs/Emmeter/html";

export function setupMenu() {
    let mainMenuUl = document.querySelector("#dko3_navbar > ul") as HTMLUListElement;
    let listItems = mainMenuUl.querySelectorAll("li");

    let lastItem = listItems[listItems.length - 1];
    let {last:dropdown} = emmet.insertBefore(lastItem, `li.nav-item.dropdown>a{ Plugin }.nav-link.dropdown-toggle[href="#" role="button" data-toggle="dropdown" aria-expanded="false"]>div.dropdown-menu`);
    let menu1 = emmet.appendChild(dropdown as HTMLElement, `a.dropdown-item.pointer[href=\"#"]{Tadaaa....?}`).first as HTMLAnchorElement;
    menu1.onclick = () => {
        console.log("clicked");
    }

}

