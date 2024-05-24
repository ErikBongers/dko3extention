const saveOptions = () => {
  const showDebug = document.getElementById('showDebug').checked;

  chrome.storage.sync.set(
    { showDebug: showDebug },
    () => {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
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
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);