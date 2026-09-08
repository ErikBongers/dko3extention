export class ClampedValue {
    private _value: number = NaN;
    private min: number;
    private max: number;

    changedHandler: ((index: number) => void) | undefined;

    constructor(value: number, min: number, max: number, changedHandler: ((index: number) => void) | undefined) {
        this.min = min;
        this.max = max;
        this.changedHandler = changedHandler;
        this.value = value; //immediately trigger change handler
    }

    get value() {
        return this._value;
    }

    set value(value: number) {
        let oldValue = this._value;
        if(isNaN(value))
            this._value = this.min;
        else
            this._value = Math.max(this.min, Math.min(this.max, value));
        if (oldValue !== this.value)
            this.changedHandler?.(this.value);
    }

    setRange(min: number, max: number) {
        this.min = min;
        this.max = max;
        this.value = this.value + parseInt("0"); //force recalculation
        console.log("setRange", this);
    }

}