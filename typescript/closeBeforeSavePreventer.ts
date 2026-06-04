export class CloseBeforeSavePreventer {
    private hasDataChanged: boolean = false; //will be cleared early to capture new changes while uploading.
    private isDataUploading: boolean = false; //will be cleared late (after uploading).
    private uploadCallback: () => Promise<any>;
    private readonly saveIntervalMillis: number;

    constructor(uploadCallback: () => Promise<any>, saveInterval: number) {
        this.uploadCallback = uploadCallback;
        this.saveIntervalMillis = saveInterval;
        setInterval(() => {
            this.checkAndSave();
        }, this.saveIntervalMillis);
        window.addEventListener("beforeunload", (ev) => {
            if (this.hasDataChanged || this.isDataUploading) {
                ev.preventDefault();
            }
        });
    }

    public checkAndSave() {
        if (this.hasDataChanged) {
            this.hasDataChanged = false;
            this.isDataUploading = true;
            this.uploadCallback()
                .then(() => this.isDataUploading = false);
        }
    }

    public setDataChanged() {
        this.hasDataChanged = true;
    }
}