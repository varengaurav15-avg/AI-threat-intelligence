const { app, BrowserWindow, Tray, Menu, Notification, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow, tray, backendProcess

function startBackend() {
  // Point to the venv Python, not system Python
  const pythonPath = process.platform === 'win32'
    ? path.join(__dirname, '../backend/venv/Scripts/python.exe')
    : path.join(__dirname, '../backend/venv/bin/python')

  const backendScript = path.join(__dirname, '../backend/main.py')

  backendProcess = spawn(pythonPath, [backendScript], {
    cwd: path.join(__dirname, '../backend')
  })

  backendProcess.stdout.on('data', d => console.log(`Backend: ${d}`))
  backendProcess.stderr.on('data', d => console.error(`Backend err: ${d}`))
  
  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 1024, minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#060c14'
  })

  // Always use dev server for now (dist build not created yet)
  mainWindow.loadURL('http://localhost:5174')

  // Tray icon — safe load with fallback
  const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png')
  
  try {
    const { nativeImage } = require('electron')
    const trayImg = nativeImage.createFromPath(trayIconPath)
    
    if (trayImg.isEmpty()) {
      console.warn('Tray icon not found — skipping tray')
    } else {
      tray = new Tray(trayImg)
      tray.setToolTip('ThreatLens AI')
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Open ThreatLens', click: () => mainWindow.show() },
        { label: 'Quit', click: () => app.quit() }
      ]))
    }
  } catch (e) {
    console.warn('Could not create tray icon:', e.message)
  }

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow.hide()
  })
}

app.whenReady().then(() => {
  startBackend()
  setTimeout(createWindow, 2000)
})

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill()
})

ipcMain.on('show-notification', (_, { title, body }) => {
  new Notification({ title, body }).show()
})