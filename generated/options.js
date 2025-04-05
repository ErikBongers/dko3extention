(() => {
  // typescript/def.ts
  var JSON_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/json";
  var GLOBAL_SETTINGS_FILENAME = "global_settings.json";

  // typescript/cloud.ts
  var cloud = {
    json: {
      fetch: fetchJson,
      upload: uploadJson
    }
  };
  async function fetchJson(fileName) {
    return fetch(JSON_URL + "?fileName=" + fileName, { method: "GET" }).then((res) => res.json());
  }
  async function uploadJson(fileName, data) {
    let res = await fetch(JSON_URL + "?fileName=" + fileName, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await res.text();
  }

  // typescript/globals.ts
  async function saveGlobalSettings(globalSettings2) {
    return cloud.json.upload(GLOBAL_SETTINGS_FILENAME, globalSettings2);
  }
  async function fetchGlobalSettings(defaultSettings) {
    return await cloud.json.fetch(GLOBAL_SETTINGS_FILENAME).catch((err) => {
      console.log(err);
      return defaultSettings;
    });
  }

  // typescript/plugin_options/options.ts
  var htmlOptionDefs = /* @__PURE__ */ new Map();
  defineHtmlOption("showDebug", "checked");
  defineHtmlOption("showNotAssignedClasses", "checked");
  defineHtmlOption("markOtherAcademies", "checked");
  defineHtmlOption("myAcademies", "value");
  document.body.addEventListener("keydown", onKeyDown);
  var globalSettings = {
    globalHide: false
  };
  function onKeyDown(ev) {
    if (ev.key === "h" && ev.altKey && !ev.shiftKey && !ev.ctrlKey) {
      ev.preventDefault();
      let answer = prompt("Verberg plugin bij iedereen?");
      saveHide(answer === "hide").then(() => saveOptions());
    }
  }
  async function saveHide(hide) {
    globalSettings = await fetchGlobalSettings(globalSettings);
    globalSettings.globalHide = hide;
    await saveGlobalSettings(globalSettings);
    console.log("Global settings saved.");
  }
  var saveOptions = () => {
    let newOptions = {
      touched: Date.now()
      // needed to trigger the storage changed event.
    };
    for (let option of htmlOptionDefs.values()) {
      newOptions[option.id] = document.getElementById(option.id)[option.property];
    }
    chrome.storage.sync.set(
      newOptions,
      () => {
        const status = document.getElementById("status");
        status.textContent = "Opties bewaard.";
        setTimeout(() => {
          status.textContent = "";
        }, 750);
      }
    );
  };
  function defineHtmlOption(id, property) {
    htmlOptionDefs.set(id, { id, property });
  }
  var restoreOptions = () => {
    chrome.storage.sync.get(
      null,
      //get all
      (items) => {
        for (const [key, value] of Object.entries(items)) {
          let optionDef = htmlOptionDefs.get(key);
          if (!optionDef)
            continue;
          document.getElementById(optionDef.id)[optionDef.property] = value;
        }
      }
    );
  };
  document.addEventListener("DOMContentLoaded", restoreOptions);
  document.getElementById("save").addEventListener("click", saveOptions);
})();
//# sourceMappingURL=options.js.map
