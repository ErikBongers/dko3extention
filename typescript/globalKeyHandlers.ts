export class UpDownNavigator {
    get selectedItem(): number {
        return this._selectedItem;
    }

    set selectedItem(value: number) {
        this._selectedItem = value;
        this.selectionChangedHandler(this);
    }
    private _selectedItem: number = 0;
    min: number = 0;
    max: number = 0;
    selectionChangedHandler: (navigator: UpDownNavigator) => void;
    selectingHandler: (navigator: UpDownNavigator) => void;

    constructor(selectionChangedHandler?: (navigator: UpDownNavigator) => void, selectingHandler?: (navigator: UpDownNavigator) => void) {
        if (selectionChangedHandler)
            this.selectionChangedHandler = selectionChangedHandler;
        else
            this.selectionChangedHandler = () => {};
        if (selectingHandler)
            this.selectingHandler = selectingHandler;
        else
            this.selectingHandler = () => {};
        document.body.addEventListener("keydown", (ev) => this.handleMenuKeys(ev), { capture: true, passive: false });
        //todo: add this listener when activated. Now it runs CONSTANTLY.
        // >> or...attach it to the menu itself and set focus to menu?
        //   > No! because focus must stay on the input field.
        // document.body.addEventListener("keyup", (ev) => this.handleKeyUp(ev), { capture: true, passive: false });
    }

    setRange(min: number, max: number) {
        this.min = min;
        this.max = max;
        return this.clampSelectedItem();
    }

    clampSelectedItem() {
        return this.selectedItem = Math.min(Math.max(this.selectedItem, this.min), this.max);
    }

    private handleMenuKeys(ev: KeyboardEvent) {
        return false;
    }

    setSelectionChangedHandler(selectionChangedHandler: (navigator: UpDownNavigator) => void) {
        console.log("setting selection changed handler");
        this.selectionChangedHandler = selectionChangedHandler;
    }

    clearSelectionChangedHandler() {
        console.log("clearing selection changed handler");
        this.selectionChangedHandler = () => {};
    }

    setSelectingHandler(selectingHandler: (navigator: UpDownNavigator) => void) {
        this.selectingHandler = selectingHandler;
    }

    clearSelectingHandler() {
        this.selectingHandler = () => {};
    }

}

let upDownNavigator: UpDownNavigator = new UpDownNavigator();
let stopEnterKey: boolean = false;

function getUpDownNavigator() {
    return upDownNavigator;
}

