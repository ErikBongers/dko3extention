function sortTableByColumn(table: HTMLTableElement, index: number) {
    let header = table.tHead.children[0].children[index];
    let rows = Array.from(table.tBodies[0].rows);
    let wasAscending = header.classList.contains("sortAscending");
    for (let thead of table.tHead.children[0].children) {
        thead.classList.remove("sortAscending", "sortDescending")
    }
    if (wasAscending) {
        rows.sort((a, b) => {
            return b.cells[index].textContent.localeCompare(a.cells[index].textContent);
        })
        header.classList.add("sortDescending");
    } else {
        rows.sort((a, b) => {
            return a.cells[index].textContent.localeCompare(b.cells[index].textContent);
        })
        header.classList.add("sortAscending");
    }
    rows.forEach(row => table.tBodies[0].appendChild(row));
}

export function addTableHeaderClickEvents(table: HTMLTableElement) {
    if (table.tHead.classList.contains("clickHandler"))
        return;
    table.tHead.classList.add("clickHandler");
    Array.from(table.tHead.children[0].children).forEach((header: HTMLElement, index) => {
        header.onclick = _ev => {
            sortTableByColumn(table, index);
        };
    });
}