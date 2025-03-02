let defaultOptions = {
    showDebug: true,
    showNotAssignedClasses: true,
    markOtherAcademies: true,
    otherAcademies: ""
};

chrome.runtime.onInstalled.addListener(() => {
    console.log("installed.");
    chrome.storage.sync.get(
        defaultOptions,
        (items) => {
            chrome.storage.sync.set(
                {...defaultOptions, ...items},
                () => {
                    console.log("Options initialized");
                }
            );
        }
    );

})


async function downloadFile(realFileId) {
    // Get credentials and build service
    const {GoogleAuth} = require('google-auth-library');
    const {google} = require('googleapis');

    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/drive',
    });
    const service = google.drive({version: 'v3', auth});

    fileId = realFileId;
    try {
        const file = await service.files.get({
            fileId: fileId,
            alt: 'media',
        });
        console.log(file.status);
        return file.status;
    } catch (err) {
        throw err;
    }
}