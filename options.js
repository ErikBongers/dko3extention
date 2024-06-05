let optionDefs = new Map();

defineOption("showDebug", 'checked');
defineOption("showNotAssignedClasses", 'checked');
defineOption("markOtherAcademies", 'checked');
defineOption("otherAcademies", 'value');

const saveOptions = () => {
    let newOptions = {};
    for (let option of optionDefs.values()) {
        newOptions[option.id] = document.getElementById(option.id)[option.property];

    }
    chrome.storage.sync.set(
        newOptions, () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('status');
            status.textContent = 'Opties bewaard.';
            setTimeout(() => {
                status.textContent = '';
            }, 750);
        }
    );

};

function defineOption(id, property) {
    optionDefs.set(id, {id: id, property: property});
}

const restoreOptions = () => {
    chrome.storage.sync.get(
        null, //get all
        (items) => {
            console.log(items)
            for (const [key, value] of Object.entries(items)) {
                let optionDef = optionDefs.get(key);
                if(!optionDef) {
                    console.error(`No option definition "${key}".`);
                    continue;
                }
                document.getElementById(optionDef.id)[optionDef.property] = value;
            }
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);