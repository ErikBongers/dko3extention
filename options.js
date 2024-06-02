const saveOptions = () => {
  const showDebug = document.getElementById('showDebug').checked;
  const showNotAssignedClasses = document.getElementById('showNotAssignedClasses').checked;

  chrome.storage.sync.set(
    {
        showDebug: showDebug,
        showNotAssignedClasses: showNotAssignedClasses
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Opties bewaard.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
  );
};

const restoreOptions = () => {
  chrome.storage.sync.get(
    null, //get all
    (items) => {
      document.getElementById('showDebug').checked = items.showDebug;
      document.getElementById('showNotAssignedClasses').checked = items.showNotAssignedClasses;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);