const { autoUpdater } = require('electron-updater');

function initUpdater(mainWindow) {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.error('Failed to check for updates:', err);
  }

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-ready', info.version);
    }
  });
}

module.exports = { initUpdater };
