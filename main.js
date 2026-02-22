const { app, screen, ipcMain, dialog, shell, Menu, Tray, nativeImage, BrowserWindow } = require('electron');
const os = require('os');
const platform = os.platform()
const { setActions } = require('./actions');
const { setPhysics } = require('./physics');
const { getRandomNumber, getRandomInteger } = require('./utils');
const { characterStates } = require('./States.js');
const activeWin = require('active-win');
const path = require('path');
const fs = require('fs');
const isSecondInstance = app.requestSingleInstanceLock();

let devMode = process.argv.includes("--dev") || process.argv.includes("-d")

if (!isSecondInstance) { // Close the new instance if one is already running
    console.log('\x1b[31m%s\x1b[0m', 'More than one instance, leaving Desktop ENA...\nIf this isn\'t expected, make sure there aren\'t any loose instances running in task manager');
    app.quit();
}


// We enable the following commands to fix the DPI (Scaled Screen)
app.commandLine.appendSwitch('high-dpi-support', 'true');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

// Is this running in an asar file?
const isAsarFile = __dirname.endsWith(".asar")
// Save data externally
const dataPath = (isAsarFile ? path.normalize(__dirname + "\\..") : __dirname)

const configPath = path.join(dataPath, 'preferences.json');
const savePath = path.join(dataPath, 'saves.json');

let globalAccessoriesConfig = { defaults: {}, imports: {} }
let tray = null;
let currentBackground = '#90ee90' // manage.html Character Background
let currentLanguage = 'en';
let currentHide = false;
let currentIgnore = false;
let currentScale = 2;
let settingScale = 4; // manage.html Scale
let monitorLock = false;
let floorSnap = 1;
let floorSnapDone = false;
let floorSnapDistance = 25;
let petStrength = 2;
let petDecay = 5;
let transparency = 1;
let inactiveTransparency = 1;
let bounciness = 1
let darkness = 50;
let allowCustoms = false;
let store_characters = {};
let translations = require(`./lang/menu_${currentLanguage}.json`);
let windows = [];
let settings;
let intervals = {};
let winIsFullscreen = false;
let contextMenu = null;
// initMenu
const WM_INITMENU = 0x0116;
ipcMain.setMaxListeners(10);

// Watermark
console.log('\x1b[36m%s\x1b[0m', 'Desktop ENA developed by TanyaHastur, all rights reserved.');
if (devMode) {
    console.log('\x1b[42m\x1b[30m\x1b[4m%s\x1b[0m', "     !!!DEVELOPER MODE ENABLED!!!     ")
}

console.log(`Running in ${isAsarFile ? "asar file" : "directory"}, saves and preferences will be loaded and saved ${isAsarFile ? "ex" : "in"}ternally`)

// Save preferences to the preferences.json file
async function savePreferences() {
    const preferences = {
        language: currentLanguage,
        scale: currentScale,
        background: currentBackground,
        allow_custom_shadows: allowCustoms,
        intensity: darkness,
        monitor_lock: monitorLock,
        floor_snap: floorSnap,
        floor_snap_dist: floorSnapDistance,
        pet_strength: petStrength,
        pet_decay: petDecay,
        transparency: transparency,
        inactive_transparency: inactiveTransparency,
        bounciness: bounciness
    };
    try {
        await fs.promises.writeFile(configPath, JSON.stringify(preferences), "utf-8");
        // Attempt file read
        let success = false
        while (!success)
            try {
                JSON.stringify(fs.readFileSync(configPath))
                success = true
            } catch (error) {
                console.log(error, fs.readFileSync(configPath))
                console.log("Read failed! Retrying save...")
                await fs.promises.writeFile(configPath, JSON.stringify(preferences), "utf-8");
            }
    } catch (err) {
        console.error("Error saving preferences: ", err);
    }
}

// Load preferences from the preferences.json file
async function loadPreferences() {
    if (fs.existsSync(configPath)) {
        try {
            const rawdata = await fs.promises.readFile(configPath, "utf-8");
            const preferences = JSON.parse(rawdata);

            if (preferences.language) {
                currentLanguage = preferences.language;
                translations = require(`./lang/menu_${currentLanguage}.json`);
            }
            if (preferences.scale) currentScale = preferences.scale;
            if (preferences.background) currentBackground = preferences.background;
            if (preferences.allow_custom_shadows) allowCustoms = preferences.allow_custom_shadows;
            if (typeof preferences.intensity != "undefined") darkness = preferences.intensity;
            if (preferences.monitor_lock) monitorLock = preferences.monitor_lock;
            if (typeof preferences.floor_snap != "undefined") floorSnap = preferences.floor_snap;
            if (typeof preferences.floor_snap_dist != "undefined") floorSnapDistance = preferences.floor_snap_dist
            if (typeof preferences.pet_strength != "undefined") petStrength = preferences.pet_strength
            if (typeof preferences.pet_decay != "undefined") petDecay = preferences.pet_decay
            if (typeof preferences.transparency != "undefined") transparency = preferences.transparency
            if (typeof preferences.inactive_transparency != "undefined") inactiveTransparency = preferences.inactive_transparency
            if (typeof preferences.bounciness != "undefined") bounciness = preferences.bounciness
        } catch (err) {
            console.error("Error loading preferences: ", err);
        }
    }
}

/**
 * Save saves to the saves.json file
 * @param {object} data - JSON string data
 * @returns {Promise<void>}
 */
async function updateSaves(data) {
    try {
        await fs.promises.writeFile(savePath, JSON.stringify(data, null, 4), "utf-8");
    } catch (err) {
        console.error("Error saving saves: ", err);
    }
}

/**
 * Fetches the saves in saves.json
 * @returns {Promise<void|object>}
 */
async function getSaves() {
    if (fs.existsSync(savePath)) {
        let backupPath = path.join(dataPath, 'saves_bak.json')
        try {
            const rawdata = await fs.promises.readFile(savePath, "utf-8");
            let returnData = JSON.parse(rawdata);
            await fs.promises.writeFile(backupPath, rawdata);
            return returnData
        } catch (err) {
            await fs.promises.readFile(backupPath, "utf-8")
                .then(
                    data => {
                        dialog.showMessageBox(
                            null,
                            {
                                message: "The save files are corrupted. Would you like to attempt to load a backup?",
                                type: "error",
                                buttons: ["Yes", "No"]
                            })
                            .then(dialogResponse => {
                                if (!dialogResponse.response) {
                                    fs.promises.writeFile(savePath, data).then(
                                        () => {
                                            fs.promises.rm(backupPath)
                                        }
                                    )
                                }
                                if (settings)
                                    settings.reload()
                            })
                    }
                )
                .catch(
                    () => {
                        dialog.showMessageBox(
                            null,
                            {
                                message: "The save files are corrupted and there is no backup available.\n\nWould you like to remake the save from scratch? This is irreversible\nYou may also open the saves.json file to manually troubleshoot",
                                type: "error",
                                noLink: true,
                                buttons: ["Yes", "No", "Open saves.json"]
                            })
                            .then(dialogResponse => {
                                ([
                                    () => {
                                        updateSaves({})
                                        if (settings)
                                            settings.reload()
                                    },
                                    () => { },
                                    () => {
                                        shell.showItemInFolder(savePath)
                                    }
                                ])[dialogResponse.response]()
                            })

                    });
            console.error("Error loading saves: ", err);
        }
    } else {
        updateSaves({})
        return {}
    }
}

loadPreferences().then(() => {
    // We will use this to prevent the scale from using the default scale and not the one we have configured.
    changeScale(currentScale);
});

app.on('before-quit', () => {
    if (settings)
        settings.destroy()
})

ipcMain.handle('get-background', async (event) => {
    try {
        let rawPreferences = fs.readFileSync(configPath, 'utf-8');
        let preferences = JSON.parse(rawPreferences);
        return preferences.background;
    } catch (err) {
        console.error("Error reading background: ", err);
    }
});

ipcMain.handle('get-characters', async (event) => {
    return store_characters;
});


ipcMain.on('get-displays', async (event) => {
    event.returnValue = screen.getAllDisplays()
});

ipcMain.on('direction', (event, arg) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        const shimejiStates = characterStates[win.id];
        shimejiStates.direction = arg === 'r' ? 'right' : 'left';
        shimejiStates.dx = arg === 'r' ? (1 * shimejiStates.scale) : (-1 * shimejiStates.scale);
    }
});

ipcMain.on('channel1', (event, arg) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        characterStates[win.id].lastEvent = event;
        if (characterStates[win.id].lastEvent) {
            characterStates[win.id].lastEvent.sender.send('setImagePath', path.join(__dirname, 'character'));
            characterStates[win.id].lastEvent.sender.send('setIsCustom', characterStates[win.id].custom);
            characterStates[win.id].lastEvent.sender.send('setIsImported', characterStates[win.id].imported);
            characterStates[win.id].lastEvent.sender.send('setPetStrength', petStrength);
            characterStates[win.id].lastEvent.sender.send('setPetDecay', petDecay);
            characterStates[win.id].lastEvent.sender.send('setTransparency', currentIgnore ? inactiveTransparency : transparency);
            characterStates[win.id].lastEvent.sender.send('changeSprite', characterStates[win.id].sprite, characterStates[win.id].blink);
            characterStates[win.id].lastEvent.sender.send('changeScale', currentScale);
            characterStates[win.id].lastEvent.sender.send('changeAccessory', characterStates[win.id].accessory, false, globalAccessoriesConfig);
        }
    }
});

// Allow dialog box from settings page
ipcMain.on('dialog', (event, arg) => {
    event.returnValue = dialog.showMessageBoxSync(settings, arg)
})

ipcMain.on('right-click', (event, arg) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    characterStates[win.id].menu.popup();
})

// Custom drag function, a work-around for aero shake
ipcMain.on('drag-me', (event, offsets) => {
    let [offset, manualOffset] = offsets
    const win = BrowserWindow.fromWebContents(event.sender);
    const shimejiStates = characterStates[win.id];

    let mouse = screen.getCursorScreenPoint()
    // Moving the Window!
    if (manualOffset != null)
        win.setPosition(shimejiStates.dragPos.newX - offset.x + manualOffset.x, shimejiStates.dragPos.newY - offset.y + manualOffset.y)
    else
        win.setPosition(mouse.x - offset.x, mouse.y - offset.y)

    shimejiStates.isDragging = true;
    shimejiStates.isFalling = true;
    const deltaX = shimejiStates.dragPos.newX - shimejiStates.dragPos.oldX;

    let move = {
        timeout: null,
        state: 'stand'
    };

    if (deltaX > 0) {
        move.state = deltaX > 5 ? 'drag-r' : 'light-drag-r';
        shimejiStates.lastEvent.sender.send('channel1', move.state);
    } else if (deltaX < 0) {
        move.state = deltaX < -5 ? 'drag-l' : 'light-drag-l';
        shimejiStates.lastEvent.sender.send('channel1', move.state);
    } else if (move.state.includes('drag')) {
        move.timeout = setTimeout(() => {
            if (shimejiStates.lastEvent && !shimejiStates.isReleased && (deltaX <= 1 || deltaX >= -1)) {
                shimejiStates.lastEvent.sender.send('channel1', 'dangle-' + (shimejiStates.direction == 'right' ? 'r' : 'l'));
                move.timeout = null;
                move.state = 'dangle';
            }
        }, 200);
    } else if (shimejiStates.lastEvent && !shimejiStates.isReleased) {
        shimejiStates.lastEvent.sender.send('channel1', 'dangle-' + (shimejiStates.direction == 'right' ? 'r' : 'l'));
        move.state = 'dangle';
    }
    shimejiStates.isReleased = false;
});

// Prevent being pinned to the wall
ipcMain.on('stop-drag', (event) => {

    const win = BrowserWindow.fromWebContents(event.sender);

    const shimejiStates = characterStates[win.id];

    const deltaX = shimejiStates.dragPos.newX - shimejiStates.dragPos.oldX;
    const deltaY = shimejiStates.dragPos.newY - shimejiStates.dragPos.oldY;

    shimejiStates.v_speed_x = deltaX;
    shimejiStates.v_speed_y = deltaY;
    shimejiStates.isDragging = false;
    shimejiStates.isReleased = true;
})

// Petting function
ipcMain.on('pet', (event, petAmount) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const shimejiStates = characterStates[win.id];
    shimejiStates.dx = 0
    shimejiStates.lastEvent.sender.send('setClosedEyes', petAmount > 200);
    if (petAmount > 400) {
        shimejiStates.isPetting = true
        shimejiStates.lastEvent.sender.send('channel1', 'sit-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
    }
});

// Prevent petting from being locked (unless explicitly told to do so)
ipcMain.on('stop-pet', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    characterStates[win.id].isPetting = false
    characterStates[win.id].lastEvent.sender.send('setClosedEyes', false);
})


ipcMain.on('duplicate-character', (event, id) => {
    createShimejiWindow({
        characterName: characterStates[id].characterName,
        spriteImage: characterStates[id].sprite,
        blinkImage: characterStates[id].blink,
        author: characterStates[id].author,
        isCustomCharacter: characterStates[id].custom,
        isImportedCharacter: characterStates[id].imported,
        frameWidth: characterStates[id].width,
        frameHeight: characterStates[id].height,
        hueShift: characterStates[id].hueShift,
        darknessOffset: characterStates[id].darknessOffset,
        characterId: id,
    });
});

ipcMain.on('fetch-accessories', (event) => {
    event.returnValue = globalAccessoriesConfig
}
)

ipcMain.on('update-background', (event, color) => {
    currentBackground = color;
    savePreferences();
});

ipcMain.on('get-background', (event) => {
    event.returnValue = currentBackground;
});

ipcMain.on('update-scale', (event, scale) => {
    settingScale = scale;
});

ipcMain.on('get-scale', (event) => {
    event.returnValue = settingScale;
});

ipcMain.on('update-monitor-lock', (event, bool) => {
    monitorLock = bool;
});

ipcMain.on("reload-preferences", e => {
    loadPreferences().then(() => {
        e.returnValue = {
            currentLanguage: currentLanguage,
            currentScale: currentScale,
            currentBackground: currentBackground,
            allowCustoms: allowCustoms,
            darkness: darkness,
            monitorLock: monitorLock,
            floorSnap: floorSnap,
            floorSnapDistance: floorSnapDistance,
            petStrength: petStrength,
            petDecay: petDecay,
            transparency: transparency,
            inactiveTransparency: inactiveTransparency,
            bounciness: bounciness
        }
    })
})

ipcMain.on('get-monitor-lock', (event) => {
    event.returnValue = monitorLock;
});

ipcMain.on('update-floor-snap', (event, bool) => {
    floorSnap = bool;
});

ipcMain.on('get-floor-snap', (event) => {
    event.returnValue = floorSnap;
});

ipcMain.on('update-floor-snap-dist', (event, val) => {
    floorSnapDistance = val;
});

ipcMain.on('get-floor-snap-dist', (event) => {
    event.returnValue = floorSnapDistance;
});


ipcMain.on('update-pet-strength', (event, val) => {
    if (petStrength == val) return
    petStrength = val;
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setPetStrength', val);
    }
});

ipcMain.on('get-pet-strength', (event) => {
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setPetStrength', petStrength);
    }
    event.returnValue = petStrength;
});

ipcMain.on('update-pet-decay', (event, val) => {
    if (petDecay == val) return
    petDecay = val;
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setPetDecay', val);
    }
});

ipcMain.on('get-pet-decay', (event) => {
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setPetDecay', petDecay);
    }
    event.returnValue = petDecay;
});

ipcMain.on('update-transparency', (event, val) => {
    if (transparency == val) return
    transparency = val;
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setTransparency', currentIgnore ? inactiveTransparency : transparency);
    }
});

ipcMain.on('get-transparency', (event) => {
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setTransparency', currentIgnore ? inactiveTransparency : transparency);
    }
    event.returnValue = transparency;
});

ipcMain.on('update-inactive-transparency', (event, val) => {
    if (inactiveTransparency == val) return
    inactiveTransparency = val;
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setTransparency', currentIgnore ? inactiveTransparency : transparency);
    }
});

ipcMain.on('get-inactive-transparency', (event) => {
    for (const character in characterStates) {
        characterStates[character].lastEvent.sender.send('setTransparency', currentIgnore ? inactiveTransparency : transparency);
    }
    event.returnValue = inactiveTransparency;
});


ipcMain.on('update-bounciness', (event, val) => {
    bounciness = val;
});

ipcMain.on('get-bounciness', (event) => {
    event.returnValue = bounciness;
});

ipcMain.on('save-settings', savePreferences)

ipcMain.on('update-darkness', (event, number) => {
    darkness = number;
});

ipcMain.on('get-darkness', (event) => {
    event.returnValue = darkness;
});

ipcMain.on('update-allow-customs', (event, bool) => {
    allowCustoms = bool;
});

ipcMain.on('get-allow-customs', (event) => {
    event.returnValue = allowCustoms;
});

ipcMain.on('update-saves', (event, data) => {
    updateSaves(data);
});

ipcMain.on('fetch-saves', (event) => {
    getSaves().then((data) => {
        event.returnValue = data;
    })
});

ipcMain.on('save-current-characters', (event, save) => {
    getSaves().then(saves => {
        const saveData = saves[save]
        saveData.characters = []
        for (let characterId in characterStates) {
            let character = characterStates[characterId]
            saveData.characters.push({
                characterName: character.characterName,
                author: character.author,
                spriteImage: character.sprite,
                blinkImage: character.blink,
                isCustomCharacter: character.custom,
                isImportedCharacter: character.imported,
                accessory: character.accessory,
                primaryColor: character.primary,
                secondaryColor: character.secondary,
                tertiaryColor: character.tertiary,
                quaternaryColor: character.quaternary,
                darknessOffset: character.darknessOffset,
                frameWidth: character.width,
                frameHeight: character.height
            })
        }
        updateSaves(structuredClone(saves)).then(() =>
            event.returnValue = structuredClone(saves)
        );

    })
});

ipcMain.on('load-save', (event, save, append = false) => {
    loadSave(save, append)
});

ipcMain.on("update-menus", () => {
    updateTray()
    windows.forEach(win => {
        characterStates[win.id].menu = null;
        buildMenu(win);
    });
})


ipcMain.on('requestChangeColor', (event, id) => {
    const win = BrowserWindow.fromId(id);
    if (win) {
        const shimejiStates = characterStates[win.id];
        if (shimejiStates.lastEvent) {
            shimejiStates.lastEvent.sender.send('changeDarkness', darkness);
            shimejiStates.lastEvent.sender.send('changeColor', [shimejiStates.primary, shimejiStates.secondary]);
            shimejiStates.lastEvent.sender.send('changeColor2', [shimejiStates.tertiary, shimejiStates.quaternary]);
        }
    }
});

ipcMain.on('requestAccessory', (event, id) => {
    const win = BrowserWindow.fromId(id);
    if (win) {
        const shimejiStates = characterStates[win.id];
        if (shimejiStates.lastEvent) {
            shimejiStates.lastEvent.sender.send('changeAccessory', shimejiStates.accessory, false, globalAccessoriesConfig);
        }
    }
});

ipcMain.on('requestAccessories', (event) => {
    let acc = { ...globalAccessoriesConfig }
    acc.flattened = (() => {
        let accFlat = {}
        for (let i in acc.defaults) {
            if (acc.defaults[i].path)
                accFlat[i] = { ...acc.defaults[i], path: "img/accessory/" + acc.defaults[i].path }
            else accFlat[i] = "img/accessory/" + acc.defaults[i]
        }

        for (let i in acc.imports) {
            if (acc.imports[i].path)
                accFlat[i] = { ...acc.imports[i], path: "../imports/accessories/" + acc.imports[i].path }
            else accFlat[i] = "../imports/accessories/" + acc.imports[i]
        }
        return accFlat
    })()
    event.returnValue = acc
});


ipcMain.on('get-character-state', (event, id) => {
    event.returnValue = sanitizeObject(characterStates[id]);
});

ipcMain.on('get-window-id', (event) => {
    let window = [];
    windows.forEach(win => {
        window.push(win.id);
    })
    event.returnValue = window;
});

ipcMain.on('close-window', (event, id) => {
    let allWindows = BrowserWindow.getAllWindows();
    let windowIds = allWindows.map(win => win.id);

    const window = BrowserWindow.fromId(id);
    if (window) {
        window.close();
    }
});

ipcMain.on('update-character-state', (event, id, newState) => {
    const characterState = characterStates[id]
    if (characterState) {
        Object.assign(characterState, newState)
        event.sender.send('character-state-updated', id)
    }
});

ipcMain.on('unlockTanya', (event) => {
    globalAccessoriesConfig.defaults["Tanya accessory!"] = "Tanya_accessory.png"
    fs.writeFileSync(path.join(__dirname, "img/accessory/config.json"), JSON.stringify(globalAccessoriesConfig.defaults, null, 4))
    windows.forEach(win => {
        characterStates[win.id].menu = null;
        buildMenu(win);
    });
});

/**
 * Cleans an object
 * @param {object} object
 */
function sanitizeObject(object) {
    let cleanObject = {};
    for (let key in object) {
        if (key === 'lastEvent' || key === 'menu') continue;
        if (typeof object[key] !== 'function') {
            cleanObject[key] = object[key];
        }
    }
    return cleanObject;
}

const win_config = {
    width: 992,
    height: 600,
    minWidth: 446,
    minHeight: 290,
    frame: false,
    titleBarStyle: "hidden",
    icon: nativeImage.createFromPath(path.join(__dirname, platform == "win32" ? "img/icon.app.png" : "img/icon.ico")),
    titleBarOverlay: { color: "#181818", symbolColor: "#fff", height: 34 },
    backgroundColor: "#181818",
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
    },
}

/**
 * Create a browser window with preset options
 * @param {object} options - An object storing the browser options
 * @returns {BrowserWindow}
 */
function createBrowserWindow(options) {
    const windowOptions = { ...win_config };
    if (options) Object.assign(windowOptions, options);
    return new BrowserWindow(windowOptions);
}

app.on('ready', () => {
    loadSave()
    onInit();
});

app.on('window-all-closed', function (e) {
    e.preventDefault();
});

function createTray() {
    tray = new Tray(path.join(__dirname, 'img/icon.app.png'));
    //go see line 689 for why it's the same here. ".ico" is evil on Linux, i guess.
    tray.setToolTip('Desktop ENA');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (settings) {
            settings.focus();
            return;
        }
        settings = createBrowserWindow();

        settings.setFullScreenable(false); // Disable Fullscreen
        settings.webContents.on('before-input-event', (e, input) => {
            if ((input.control && input.shift && input.key === 'I') && !devMode) {
                e.preventDefault(); // Disabled DevTool
            }
        });

        settings.once('ready-to-show', () => {
            settings.maximize();
        });

        settings.loadFile('manage.html');

        settings.on('resize', () => {
            let size = settings.getSize();
            settings.webContents.send('window-size', size);
        });

        settings.on('focus', () => {
            settings.setTitleBarOverlay({ color: '#181818', symbolColor: '#ffffff' });
        });

        settings.on('blur', () => {
            settings.setTitleBarOverlay({ color: '#1f1f1f', symbolColor: '#9d9d9d' });
        });

        settings.on('closed', () => {
            settings = null;
        });
    });
}

function updateTray() {

    let config,
        importsConfig,
        newImportedCharacterSubMenu = [
            { label: 'No one\'s here...', type: 'normal', enabled: false }
        ],
        newCharacterSubMenu = [
            {
                label: 'Imported characters',
                type: 'submenu',
                submenu: newImportedCharacterSubMenu
            },
            {
                label: 'Ena',
                icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/ena.png')),
                type: 'normal',
                click: () => createShimejiWindow({
                    characterName: 'Ena',
                    spriteImage: 'ena_default.png',
                    blinkImage: 'ena_blink.png',
                    isCustomCharacter: false,
                    isImportedCharacter: false,
                    primaryColor: '#2c5bf5',
                    secondaryColor: '#ffe308',
                    frameWidth: 36,
                    frameHeight: 52
                })
            }
        ];

    try {
        const configPath = path.join(__dirname, 'character', 'config.json');
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
        console.error('Error reading config file:', err);
    }

    try {
        const importPath = path.join(__dirname, '../imports/characters', 'config.json');
        if (!fs.existsSync(importPath)) {
            fs.mkdirSync(path.join(__dirname, '../imports/characters'), { recursive: true })
            fs.writeFileSync(importPath, "[]", { recursive: true })
        }
        importsConfig = JSON.parse(fs.readFileSync(importPath, 'utf8'));
        if (Object.keys(importsConfig).length) newImportedCharacterSubMenu = []
    } catch (err) {
        console.error('Error reading imports config file:', err);
        if (!importsConfig)
            importsConfig = []
    }


    config.forEach((character) => {
        newCharacterSubMenu.push({
            label: character.name,
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/custom.png')),
            type: 'normal',
            click: () => createShimejiWindow({
                characterName: character.name,
                author: character.author,
                spriteImage: character.sprite_path,
                blinkImage: character.blink_path,
                isCustomCharacter: true,
                isImportedCharacter: false,
                primaryColor: character.primary_color ?? undefined,
                secondaryColor: character.secondary_color ?? undefined,
                hueShift: character.hueShift ?? [0, 0, 0],
                darknessOffset: character.darknessOffset ?? [0.85, 1.45, 1.60],
                frameWidth: character.width ?? 36,
                frameHeight: character.height ?? 52
            })
        });
    });

    if (importsConfig)
        importsConfig.forEach((character, i) => {
            let icon = nativeImage.createFromPath(path.join(__dirname, character.icon ? '../imports/characters/' + character.icon : 'img/icons/custom.png'))
            icon = icon.resize({ width: 16, height: 16, quality: "best" })
            newImportedCharacterSubMenu.push({
                label: character.name,
                icon: icon,
                type: 'normal',
                click: () => createShimejiWindow({
                    characterName: character.name,
                    author: character.author,
                    spriteImage: character.sprite_path,
                    blinkImage: character.blink_path,
                    isCustomCharacter: true,
                    isImportedCharacter: true,
                    primaryColor: character.primary_color ?? undefined,
                    secondaryColor: character.secondary_color ?? undefined,
                    hueShift: character.hueShift ?? [0, 0, 0],
                    darknessOffset: character.darknessOffset ?? [0.85, 1.45, 1.60],
                    frameWidth: character.width ?? 36,
                    frameHeight: character.height ?? 52
                })
            });
            newCharacterSubMenu[0].submenu = newImportedCharacterSubMenu
        });
    contextMenu = null;
    contextMenu = Menu.buildFromTemplate([
        {
            label: 'Desktop ENA',
            enabled: false,
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icon.png'))
        },
        {
            type: 'separator'
        },
        {
            label: translations.language,
            submenu: [
                {
                    label: 'English',
                    type: 'radio',
                    checked: currentLanguage === 'en',
                    click: () => changeLanguage('en')
                },
                {
                    label: 'Español',
                    type: 'radio',
                    checked: currentLanguage === 'es',
                    click: () => changeLanguage('es')
                },
                {
                    label: 'Português',
                    type: 'radio',
                    checked: currentLanguage === 'pt',
                    click: () => changeLanguage('pt')
                },
                {
                    label: '日本語',
                    type: 'radio',
                    checked: currentLanguage === 'ja',
                    click: () => changeLanguage('ja')
                },
                {
                    label: 'فارسی',
                    type: 'radio',
                    checked: currentLanguage === 'fa',
                    click: () => changeLanguage('fa')
                }
            ]
        },
        {
            label: translations.scales,
            submenu: [
                {
                    label: 'x1',
                    type: 'radio',
                    checked: currentScale === 1,
                    click: () => changeScale(1)
                },
                {
                    label: 'x2',
                    type: 'radio',
                    checked: currentScale === 2,
                    click: () => changeScale(2)
                },
                {
                    label: 'x3',
                    type: 'radio',
                    checked: currentScale === 3,
                    click: () => changeScale(3)
                },
                {
                    label: 'x4',
                    type: 'radio',
                    checked: currentScale === 4,
                    click: () => changeScale(4)
                },
                {
                    label: 'x6',
                    type: 'radio',
                    checked: currentScale === 6,
                    click: () => changeScale(6)
                },
                {
                    label: 'x8',
                    type: 'radio',
                    checked: currentScale === 8,
                    click: () => changeScale(8)
                }
            ]
        },
        {
            label: translations.newCharacter,
            submenu: newCharacterSubMenu
        },
        {
            label: translations.hide,
            type: 'checkbox',
            checked: currentHide,
            click: () => {
                currentHide = !currentHide;
                windows.forEach(win => {
                    currentHide ? win.hide() : win.show();
                    updateTray()
                });
            }
        },
        {
            label: translations.ghostMode,
            type: 'checkbox',
            checked: currentIgnore,
            click: () => {
                currentIgnore = !currentIgnore;
                windows.forEach(win => {
                    win.setIgnoreMouseEvents(currentIgnore);

                    characterStates[win.id].lastEvent.sender.send('setTransparency', currentIgnore ? inactiveTransparency : transparency);
                    updateTray()
                });
            }
        },
        {
            label: translations.settings,
            click: () => {
                if (settings) {
                    settings.focus();
                    return;
                }
                settings = createBrowserWindow();

                settings.setFullScreenable(false);
                settings.webContents.on('before-input-event', (e, input) => {
                    if ((input.control && input.shift && input.key === 'I') && !devMode) {
                        e.preventDefault(); // Disabled DevTools
                    }
                });

                settings.once('ready-to-show', () => {
                    settings.maximize();
                });

                settings.loadFile('manage.html');

                settings.on('resize', () => {
                    let size = settings.getSize();
                    settings.webContents.send('window-size', size);
                });

                settings.on('focus', () => {
                    settings.setTitleBarOverlay({ color: '#181818', symbolColor: '#ffffff' });
                });

                settings.on('blur', () => {
                    settings.setTitleBarOverlay({ color: '#1f1f1f', symbolColor: '#9d9d9d' });
                });

                settings.on('closed', () => {
                    settings = null;
                });
            }
        },
        {
            type: 'separator'
        },
        {
            label: translations.quit,
            click: () => {
                console.log('\x1b[31m%s\x1b[0m', 'Leaving Desktop ENA...');
                app.quit();
            }
        },
    ]);
    if (tray != null) tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
    createTray();
    updateTray();
});

/**
 * Change the language based on it's 2 letter shortening
 * @param {string} lang - Language
 */
function changeLanguage(lang) {
    currentLanguage = lang;
    translations = require(`./lang/menu_${currentLanguage}.json`);
    updateTray();
    windows.forEach(win => {
        characterStates[win.id].menu = null;
        buildMenu(win);
    });
    savePreferences();
}

/**
 * Change scale of the characters
 * @param {number} scale
 */
function changeScale(scale) { // fix this // fix WHAT tanya??
    currentScale = scale;
    for (const wins of windows) {
        let display = screen.getPrimaryDisplay();
        const shimejiStates = characterStates[wins.id];
        const characterSize = {
            "frameWidth": shimejiStates.width,
            "frameHeight": shimejiStates.height
        };
        wins.setContentSize((characterSize.frameWidth * scale) * (1 - (display.scaleFactor - 1)), (characterSize.frameHeight * scale) * (1 - (display.scaleFactor - 1)));
        shimejiStates.dy = 3 * scale;
        shimejiStates.dx = shimejiStates.dx === 0 ? 0 : shimejiStates.direction === 'right' ? (1 * currentScale) : (-1 * currentScale);

        shimejiStates.scale = currentScale;
        if (shimejiStates.lastEvent) {
            shimejiStates.lastEvent.sender.send('changeScale', currentScale, characterSize);
        }
    }
    savePreferences();
}

/**
 * Change a characters accessory
 * @param {string} name - Accessory name
 * @param {BrowserWindow} win - ENA window
 * @param {boolean} [imported=false] - If it should use the import path or not
 */
function changeAccessory(name, win, imported = false) {
    const shimejiStates = characterStates[win.id];
    shimejiStates.accessory = name;
    if (shimejiStates.lastEvent) {
        shimejiStates.lastEvent.sender.send('changeAccessory', name, imported, globalAccessoriesConfig);
    }
}

/**
 * Initialize function for ENA (if it exists)
 * @param {BrowserWindow | undefined} [win]
 */
function onInit(win) {
    if (win === undefined) { return; }
    let last = Date.now();
    intervals[win.id] = setInterval(() => {
        const now = Date.now();
        update((now - last) / 1000, win);
        last = now;
    }, 1000 / 60);
}

/**
 * Destroy function for ENA
 * @param {BrowserWindow} win - ENA window being destroyed
 */
function onDestroy(win) {
    const index = windows.findIndex(w => w.id === win.id);
    if (index !== -1) { windows.splice(index, 1); }
    clearInterval(intervals[win.id]);
    delete characterStates[win.id];
    delete intervals[win.id];
    if (Object.keys(characterStates).length == 0) {
        console.log('\x1b[31m%s\x1b[0m', 'There are no characters, leaving Desktop ENA...');
        app.quit();
    }
}

/**
 * Update ENA
 * @param {number} delta - Time between last update
 * @param {BrowserWindow} win - ENA to update
 */
async function update(delta, win) {
    if (characterStates[win.id] === undefined) { return; }

    setCollision(win);
    startGravity(win);

    if (win.isMinimized()) { win.restore(); win.focus(); }

    let [x, y] = win.getPosition();
    characterStates[win.id].dragPos.oldX = characterStates[win.id].dragPos.newX;
    characterStates[win.id].dragPos.oldY = characterStates[win.id].dragPos.newY;
    characterStates[win.id].dragPos.newX = x;
    characterStates[win.id].dragPos.newY = y;

    // Get active window title name
    const window = await activeWin();
    let display = screen.getPrimaryDisplay();
    let { width, height } = display.size;
    if (window != undefined) {
        if (!characterStates[win.id].isSitting && !characterStates[win.id].isPetting) {
            characterStates[win.id].state = characterStates[win.id].dx == 0 ? 'idle' : 'walk';
        } else {
            characterStates[win.id].state = 'sit';
        }
        if (window.title === 'Desktop ENA' || window.title === 'ENA' || window.title === '' || window.title === 'Program Manager') { return false; }
        if (window.bounds.width === width && window.bounds.height === height) {
            winIsFullscreen = true;
        } else {
            winIsFullscreen = false;
        }
    }
}

/**
 * Fetch a display at position
 * @param {number} xPosition
 * @param {number} yPosition
 */
function getDisplayForPosition(xPosition, yPosition) {
    const displays = screen.getAllDisplays();
    for (const display of displays) {
        const { bounds } = display;
        if (
            xPosition >= bounds.x &&
            xPosition <= bounds.x + bounds.width &&
            yPosition >= bounds.y &&
            yPosition <= bounds.y + bounds.height
        ) {
            return display;
        }
    }
    return null;
}

function getDisplaysWidth() {
    const displays = screen.getAllDisplays();
    let totalWidth = 0;

    for (const display of displays) {
        totalWidth += display.workAreaSize.width;
    }

    return totalWidth;
}


/**
 * floorSnapCheck - Check if ENA should snap to the floor
 * @param {number} y - ENA y-coord
 * @param {number} height - Height of ENA
 * @param {number} floor - ENA's floor
 * @returns {boolean}
 */

function floorSnapCheck(y, height, floor) {
    switch (floorSnap) {
        case 0: // Never
            return false;
        case 1: // Only close
            return Math.abs(y + height - floor) < floorSnapDistance || Math.abs(y + height) < floorSnapDistance
        case 2: // Only up
            return y > floor;
        case 3: // Only down
            return y + height < floor;
        case 4: // Always
            return true;
        default: // I guess
            return false;
    }
}

/**
 * Run a collision check on an ENA
 * @param {BrowserWindow | undefined} win - ENA to check collision on
 */

function setCollision(win) {
    floorSnapDone = false
    // Get displays
    const displays = screen.getAllDisplays();
    // Window position and size
    let [x, y] = win.getPosition();
    let [winWidth, winHeight] = win.getSize();
    // Current monitor position
    let bounds = getDisplayForPosition(x, y)
    let { width, height } = (bounds ?? displays[0]).workAreaSize;


    // Update bounds, important for out of bounds scenarios
    if (bounds) {
        // Not in the void, reset timer
        characterStates[win.id].voidTimer = -1
        if (!(monitorLock && !characterStates[win.id].isDragging && characterStates[win.id].lastFloorY != Infinity)) {
            characterStates[win.id].lastLeftWall = bounds.bounds.x + (monitorLock ? 3 : 1)
            characterStates[win.id].lastRightWall = bounds.bounds.x + bounds.bounds.width
            characterStates[win.id].lastFloorY = bounds.bounds.y + (!winIsFullscreen ? bounds.workAreaSize.height : bounds.size.height)
            characterStates[win.id].lastRoofY = bounds.bounds.y
        }
    }

    // If window is removed or being dragged, disable collision and unnecessary void detection
    if (win == undefined || (characterStates[win.id] && characterStates[win.id].isDragging)) { return; }

    // Increment void timer
    characterStates[win.id].voidTimer++

    if (displays.length > 1) {
        // Bouncing
        if (x + winWidth >= characterStates[win.id].lastRightWall && (!getDisplayForPosition(x + winWidth, y + winHeight) || monitorLock)) { // Right
            let check = false
            let newDispY = Infinity
            if (characterStates[win.id].direction == 'right')
                displays.forEach(disp => {
                    if (disp.bounds.x == characterStates[win.id].lastRightWall) {
                        check = true
                        newDispY = Math.min(!winIsFullscreen ? disp.workAreaSize.height : disp.size.height, newDispY)
                    }
                })
            if (check && !characterStates[win.id].isFalling && characterStates[win.id].lastFloorY >= newDispY && floorSnapCheck(y, winHeight, newDispY)) {
                win.setPosition(x + winWidth, newDispY - winHeight);
                floorSnapDone = true
            }
            else {
                characterStates[win.id].v_speed_x *= -(characterStates[win.id].isBouncing || !characterStates[win.id].isFalling) * (!characterStates[win.id].isFalling || bounciness);
                characterStates[win.id].direction = 'left';
                characterStates[win.id].dx = (-(characterStates[win.id].isBouncing || !characterStates[win.id].isFalling) * characterStates[win.id].scale * characterStates[win.id].speed * (!characterStates[win.id].isFalling || bounciness))
                win.setPosition(characterStates[win.id].lastRightWall - winWidth, Math.max(characterStates[win.id].lastRoofY, y));
                if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                    characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
                }
            }
        }
        if (x <= characterStates[win.id].lastLeftWall && (!bounds || monitorLock)) { // Left
            let check = false
            let newDispY = Infinity
            displays.forEach(disp => {
                if (disp.bounds.x + disp.bounds.width == characterStates[win.id].lastLeftWall) {
                    check = true
                    newDispY = Math.min(!winIsFullscreen ? disp.workAreaSize.height : disp.size.height, newDispY)
                }
            })
            if (check && !characterStates[win.id].isFalling && characterStates[win.id].lastFloorY >= newDispY && floorSnapCheck(y, winHeight, newDispY)) {
                win.setPosition(x, newDispY - winHeight);
                floorSnapDone = true
            }
            else {
                characterStates[win.id].v_speed_x = Math.abs(characterStates[win.id].v_speed_x) * (characterStates[win.id].isBouncing || !characterStates[win.id].isFalling) * (!characterStates[win.id].isFalling || bounciness);
                characterStates[win.id].direction = 'right';
                characterStates[win.id].dx = ((characterStates[win.id].isBouncing || !characterStates[win.id].isFalling) * characterStates[win.id].scale * characterStates[win.id].speed * (!characterStates[win.id].isFalling || bounciness));
                win.setPosition(characterStates[win.id].lastLeftWall, Math.max(characterStates[win.id].lastRoofY, y));
                if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                    characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
                }
            }
        }

        // Update position
        [x, y] = win.getPosition();


        if (characterStates[win.id].voidTimer >= 60) {
            console.log("Looks like this little ENA breached containment")
            characterStates[win.id].v_speed_y = 0;
            characterStates[win.id].v_speed_x = 0;

            win.setPosition(Math.round((characterStates[win.id].lastRightWall - characterStates[win.id].lastLeftWall) / 2 + characterStates[win.id].lastLeftWall), characterStates[win.id].lastFloorY)
            return;
        }

        if (y + winHeight > characterStates[win.id].lastFloorY) { // Bottom
            characterStates[win.id].v_speed_y = 0;
            win.setPosition(x, characterStates[win.id].lastFloorY);
            characterStates[win.id].isFalling = false;
        }

        if (y < characterStates[win.id].lastRoofY) { // Top
            characterStates[win.id].v_speed_y *= -1;
            win.setPosition(x, characterStates[win.id].lastRoofY);
        }
    } else {
        if (characterStates[win.id].isFalling && characterStates[win.id].isBouncing && bounciness > 0) {
            if (x + winWidth > width && characterStates[win.id].v_speed_x > 0) {
                characterStates[win.id].v_speed_x *= -bounciness;
            }
            if (x < 0) {
                characterStates[win.id].v_speed_x = Math.abs(characterStates[win.id].v_speed_x) * bounciness;
            }
            if (y < 0) {
                characterStates[win.id].v_speed_y *= -1;
            }
        }

        if (x + winWidth > width) { // Right
            characterStates[win.id].direction = 'left';
            characterStates[win.id].dx = (-1 * characterStates[win.id].scale * characterStates[win.id].speed);
            win.setPosition(width - winWidth, y);
            if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
            }
        }
        if (x < 0) { // Left
            characterStates[win.id].direction = 'right';
            characterStates[win.id].dx = (1 * characterStates[win.id].scale * characterStates[win.id].speed);
            win.setPosition(0, y);
            if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
            }
        }
        if (y + winHeight > (!winIsFullscreen ? height : displays[0].size.height)) { // Bottom
            win.setPosition(x, (!winIsFullscreen ? height : displays[0].size.height) - winHeight);
            characterStates[win.id].isFalling = false;
        }
        if (y < 0) { // Top
            characterStates[win.id].v_speed_y = 0;
            win.setPosition(x, 0);
        }
    }
}

/**
 * Run a gravity check on an ENA
 * @param {BrowserWindow | undefined} win - ENA to run check in
 */
function startGravity(win) {
    if (win == undefined) { return; }

    const shimejiStates = characterStates[win.id];

    const displays = screen.getAllDisplays()
    let [x, y] = win.getPosition();
    let [winWidth, winHeight] = win.getSize();

    if (!shimejiStates.isDragging) {
        const bounds = getDisplayForPosition(x, y);
        if (bounds) {
            // Aplica el efecto de gravedad
            if (y + winHeight < (!winIsFullscreen ? (bounds.workAreaSize.height + bounds.workArea.y) : (bounds.size.height + bounds.bounds.y))) {
                // If close to the ground (according to settings) while walking, snap to it to prevent walking reset
                if (
                    !shimejiStates.isFalling &&
                    floorSnapCheck(y, winHeight, bounds.workAreaSize.height) &&
                    !floorSnapDone
                ) {
                    win.setPosition(x, characterStates[win.id].lastFloorY - winHeight);
                }
                else {
                    win.setPosition(x, y + shimejiStates.dy);
                    shimejiStates.isFalling = true;
                }
            } else {
                shimejiStates.v_speed_x = 0;
                shimejiStates.v_speed_y = 0;
                // Si el personaje está en el suelo
                if (!floorSnapDone) // Prevent up-snaps from being reverted
                    win.setPosition(Math.floor(x + shimejiStates.dx), (characterStates[win.id].lastFloorY - winHeight));
                shimejiStates.isFalling = false;
                // Actualizamos la animación de dangling o falling a idle o walk
                if (!shimejiStates.isSitting && !shimejiStates.isPetting) {
                    if (shimejiStates.lastEvent && shimejiStates.state != 'view') {
                        shimejiStates.lastEvent.sender.send('channel1', (shimejiStates.state === 'idle' ? 'idle-' : 'walk-') + (shimejiStates.direction === 'right' ? 'r' : 'l'));
                    }
                    if (shimejiStates.lastEvent && shimejiStates.state == 'view') {
                        shimejiStates.lastEvent.sender.send('channel1', 'view-' + (x > Math.floor(bounds.workAreaSize.width / 2) ? 'r' : 'l'));
                    }
                    setActions(win);
                }
            }
        }
    }
    // Physics
    setPhysics(win);
    // Sitting Gravity
    if (shimejiStates.lastEvent && !shimejiStates.isFalling && (shimejiStates.isSitting || shimejiStates.isPetting) && !shimejiStates.isDragging) {
        shimejiStates.lastEvent.sender.send('channel1', 'sit-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
        shimejiStates.dx = 0;
    }
}

/**
 * Add a right click menu to an ENA
 * @param {BrowserWindow | undefined} win - ENA to add menu to
 */
function buildMenu(win) {
    if (win == undefined) { return; }
    if (characterStates[win.id] === undefined) { return; }

    let characterConfig,
        accessoriesConfig = {},
        importsAccessoriesConfig = {},
        importsCharacterConfig,
        newImportedCharacterSubMenu = [
            { label: 'No one\'s here...', type: 'normal', enabled: false }
        ],
        newImportedAccessoriesSubMenu = [
            { label: 'Nothing here...', type: 'normal', enabled: false }
        ],
        newAccessoriesSubMenu = [
            {
                label: 'Imported Accessories',
                type: 'submenu',
                submenu: newImportedAccessoriesSubMenu
            },
            {
                label: 'None',
                click: () => {
                    changeAccessory('none', win);
                }
            }
        ],
        newCharacterSubMenu = [
            {
                label: 'Imported characters',
                type: 'submenu',
                submenu: newImportedCharacterSubMenu
            },
            {
                label: 'Ena',
                icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/ena.png')),
                type: 'normal',
                click: () => createShimejiWindow({
                    characterName: 'Ena',
                    spriteImage: 'ena_default.png',
                    blinkImage: 'ena_blink.png',
                    isCustomCharacter: false,
                    isImportedCharacter: false,
                    primaryColor: '#2c5bf5',
                    secondaryColor: '#ffe308',
                    frameWidth: 36,
                    frameHeight: 52
                })
            }
        ];
    try {
        const characterPath = path.join(__dirname, 'character', 'config.json');
        characterConfig = JSON.parse(fs.readFileSync(characterPath, 'utf8'));
    } catch (err) {
        console.error('Error reading config file:', err);
    }

    try {
        const accessoryPath = path.join(__dirname, 'img/accessory', 'config.json');
        accessoriesConfig = JSON.parse(fs.readFileSync(accessoryPath, 'utf8'));
    } catch (err) {
        console.error('Error reading accessory file:', err);
    }

    try {
        const characterImportPath = path.join(__dirname, '../imports/characters', 'config.json');
        importsCharacterConfig = JSON.parse(fs.readFileSync(characterImportPath, 'utf8'));
        if (Object.keys(importsCharacterConfig).length) newImportedCharacterSubMenu = []
    } catch (err) {
        console.error('Error reading imports config file:', err);
    }

    try {
        const accessoryImportPath = path.join(__dirname, '../imports/accessories', 'config.json');
        if (!fs.existsSync(accessoryImportPath)) {
            fs.mkdirSync(path.join(__dirname, '../imports/accessories'), { recursive: true })
            fs.writeFileSync(accessoryImportPath, "{}", { recursive: true })
        }
        importsAccessoriesConfig = JSON.parse(fs.readFileSync(accessoryImportPath, 'utf8'));
        if (Object.keys(importsAccessoriesConfig).length) newImportedAccessoriesSubMenu = []
    } catch (err) {
        console.error('Error reading imports config file:', err);
    }

    globalAccessoriesConfig.defaults = accessoriesConfig
    globalAccessoriesConfig.imports = importsAccessoriesConfig


    characterConfig.forEach((/** @type {object} */ character) => {
        newCharacterSubMenu.push({
            label: character.name,
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/custom.png')),
            type: 'normal',
            click: () => createShimejiWindow({
                characterName: character.name,
                author: character.author,
                spriteImage: character.sprite_path,
                blinkImage: character.blink_path,
                isCustomCharacter: true,
                isImportedCharacter: false,
                primaryColor: character.primary_color ?? undefined,
                secondaryColor: character.secondary_color ?? undefined,
                hueShift: character.hueShift ?? [0, 0, 0],
                darknessOffset: character.darknessOffset ?? [0.85, 1.45, 1.60],
                frameWidth: character.width ?? 36,
                frameHeight: character.height ?? 52
            })
        });
    });

    for (let accessory in accessoriesConfig) {
        newAccessoriesSubMenu.push({
            label: accessoriesConfig[accessory].label || accessory,
            click: () => {
                changeAccessory(accessory, win);
            }
        });
    }
    for (let accessory in importsAccessoriesConfig) {
        newImportedAccessoriesSubMenu.push({
            label: importsAccessoriesConfig[accessory].label || accessory,
            click: () => {
                changeAccessory(accessory, win, true);
            }
        });
    }
    newAccessoriesSubMenu[0].submenu = newImportedAccessoriesSubMenu

    importsCharacterConfig.forEach((character, i) => {
        let icon = nativeImage.createFromPath(path.join(__dirname, character.icon ? '../imports/characters/' + character.icon : 'img/icons/custom.png'))
        icon = icon.resize({ width: 16, height: 16, quality: "best" })
        newImportedCharacterSubMenu.push({
            label: character.name,
            icon: icon,
            type: 'normal',
            click: () => createShimejiWindow({
                characterName: character.name,
                author: character.author,
                spriteImage: character.sprite_path,
                blinkImage: character.blink_path,
                isCustomCharacter: true,
                isImportedCharacter: true,
                primaryColor: character.primary_color ?? undefined,
                secondaryColor: character.secondary_color ?? undefined,
                hueShift: character.hueShift ?? [0, 0, 0],
                darknessOffset: character.darknessOffset ?? [0.85, 1.45, 1.60],
                frameWidth: character.width ?? 36,
                frameHeight: character.height ?? 52
            })
        });
        newCharacterSubMenu[0].submenu = newImportedCharacterSubMenu
    });


    characterStates[win.id].menu = Menu.buildFromTemplate([
        {
            label: characterStates[win.id].characterName,
            enabled: false,
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/' + (characterStates[win.id].custom ? 'custom' : characterStates[win.id].characterName.toLowerCase()) + '.png'))
        },
        { type: "separator" },
        {
            label: translations.duplicate,
            click: () => {
                createShimejiWindow({
                    characterName: characterStates[win.id].characterName,
                    spriteImage: characterStates[win.id].sprite,
                    blinkImage: characterStates[win.id].blink,
                    isCustomCharacter: characterStates[win.id].custom,
                    isImportedCharacter: characterStates[win.id].imported,
                    frameWidth: characterStates[win.id].width,
                    frameHeight: characterStates[win.id].height,
                    hueShift: characterStates[win.id].hueShift,
                    darknessOffset: characterStates[win.id].darknessOffset,
                    characterId: win.id
                })
            }
        },
        {
            label: translations.dismiss,
            click: () => {
                BrowserWindow.fromId(win.id).close();
            }
        },
        { type: "separator" },
        {
            label: translations.sit,
            type: 'checkbox',
            checked: characterStates[win.id].isSitting,
            click: () => {
                switch (characterStates[win.id].isSitting) {
                    case false:
                        characterStates[win.id].isSitting = true;
                        characterStates[win.id].dx = 0;
                        break;
                    case true:
                        characterStates[win.id].isSitting = false;
                        characterStates[win.id].dx = 0;
                        break;
                }
            }
        },
        {
            label: translations.bounce,
            type: 'checkbox',
            checked: characterStates[win.id].isBouncing,
            click: () => {
                characterStates[win.id].isBouncing = !characterStates[win.id].isBouncing;
            }
        },
        {
            label: translations.chaseCursor,
            type: 'checkbox',
            checked: characterStates[win.id].chaseCursor,
            click: () => {
                characterStates[win.id].chaseCursor = !characterStates[win.id].chaseCursor;
            }
        },
        { type: "separator" },
        {
            label: translations.walk,
            submenu: [
                {
                    label: translations.walk_1,
                    click: () => {
                        characterStates[win.id].speed = 1
                    }
                },
                {
                    label: translations.walk_2,
                    click: () => {
                        characterStates[win.id].speed = 2
                    }
                },
                {
                    label: translations.walk_3,
                    click: () => {
                        characterStates[win.id].speed = 4
                    }
                },
                {
                    label: translations.walk_4,
                    click: () => {
                        characterStates[win.id].speed = 8
                    }
                }
            ]
        },
        {
            label: translations.addAccessory,
            submenu: newAccessoriesSubMenu
        },
        {
            label: translations.newCharacter,
            submenu: newCharacterSubMenu
        },
        { type: "separator" },
        {
            label: translations.settings,
            click: () => {
                if (settings) {
                    settings.focus();
                    return;
                }
                settings = createBrowserWindow();

                settings.setFullScreenable(false);
                settings.webContents.on('before-input-event', (e, input) => {
                    if ((input.control && input.shift && input.key === 'I') && !devMode) {
                        e.preventDefault(); // Disabled DevTools
                    }
                });

                settings.once('ready-to-show', () => {
                    settings.maximize();
                });

                settings.loadFile('manage.html');

                settings.on('resize', () => {
                    let size = settings.getSize();
                    settings.webContents.send('window-size', size);
                });

                settings.on('focus', () => {
                    settings.setTitleBarOverlay({ color: '#181818', symbolColor: '#ffffff' });
                });

                settings.on('blur', () => {
                    settings.setTitleBarOverlay({ color: '#1f1f1f', symbolColor: '#9d9d9d' });
                });

                settings.on('closed', () => {
                    settings = null;
                });
            }
        }
    ]);
}

/**
 * Create a character based off options
 * @param {object} options
 */
function createCharacterState(options) {
    return {
        chaseCursor: false,
        scale: currentScale,
        accessory: options.characterId ? characterStates[options.characterId].accessory : (options.accessory ?? 'none'),
        dx: (getRandomNumber() === 1 ? (1 * currentScale) : (-1 * currentScale)),
        dy: 3 * currentScale,
        width: options.frameWidth ?? 36,
        height: options.frameHeight ?? 52,
        voidTimer: 0,
        lastRoofY: 0,
        lastFloorY: Infinity,
        lastLeftWall: 0,
        lastRightWall: Infinity,
        state: 'falling',
        direction: 'right',
        speed: 1,
        characterName: options.characterId ? characterStates[options.characterId].characterName : options.characterName,
        author: options.author || null,
        sprite: options.spriteImage,
        blink: options.blinkImage,
        custom: options.isCustomCharacter,
        imported: options.isImportedCharacter,
        isDragging: false,
        isReleased: true,
        isFalling: true,
        isBouncing: true,
        isSitting: false,
        isPetting: false,
        primary: options.characterId ? characterStates[options.characterId].primary : (options.primaryColor ?? '#2c5bf5'),
        secondary: options.characterId ? characterStates[options.characterId].secondary : (options.secondaryColor ?? '#ffe308'),
        tertiary: options.characterId ? characterStates[options.characterId].tertiary : (options.tertiaryColor ?? '#2c5bf5'),
        quaternary: options.characterId ? characterStates[options.characterId].quaternary : (options.quaternaryColor ?? '#ffe308'),
        hueShift: options.hueShift ?? [0, 0, 0],
        darknessOffset: options.darknessOffset ?? [0.85, 1.45, 1.60],
        v_speed_x: 0,
        v_speed_y: 0,
        dragPos: {
            newX: null,
            newY: null,
            oldX: null,
            oldY: null
        },
        lastEvent: null,
        menu: null
    };
}

/**
 * Load a save from a label
 * @param {string | null} [saveLabel=null] - Name of the save. If null, loads favorite or regular ENA
 * @param {boolean} [append=false] - If true, doesn't remove any ENAs on screen
 * @returns {Promise<void>}
 */
async function loadSave(saveLabel = null, append = false) {
    let saves = await getSaves()
    favoriteCheck:
    if (saveLabel === null) {
        for (let save in saves) {
            if (saves[save].favorite) {
                console.log(`Save "${save}" loaded`)
                saveLabel = save
                // Break the loop and skip the default load
                break favoriteCheck;
            }
        };
        // Load a basic Ena when there's no favorite
        console.log(`No favorite, loaded default`)
        createShimejiWindow({
            characterName: 'Ena',
            spriteImage: 'ena_default.png',
            blinkImage: 'ena_blink.png',
            isCustomCharacter: false,
            isImportedCharacter: false,
            primaryColor: '#2c5bf5',
            secondaryColor: '#ffe308',
            frameWidth: 36,
            frameHeight: 52
        });
        return
    }

    let oldIds = []

    if (!append) {
        for (let id in characterStates) {
            oldIds.push(Number(id))
        }
    }
    for (let character of saves[saveLabel].characters) {
        createShimejiWindow({ ...character });
    }
    for (let id of oldIds)
        BrowserWindow.fromId(id).close()
}

/**
 * Makes a new ENA window
 * @param {object} options - Options for the ENA
 */
function createShimejiWindow(options) {
    let display = screen.getPrimaryDisplay();
    const centerX = Math.floor(display.bounds.x + (display.bounds.width - (options.frameWidth * currentScale)) / 2);
    let win = createBrowserWindow({
        width: (options.frameWidth * currentScale),
        height: (options.frameHeight * currentScale),
        minWidth: (options.frameWidth * currentScale),
        minHeight: (options.frameHeight * currentScale),
        x: centerX + getRandomInteger(-100, 100),
        y: 0,
        show: !currentHide,
        titleBarOverlay: null,
        backgroundColor: null,
        fullscreenable: false,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            enableRemoteModule: true
        }
    });
    win.setMovable(false)
    win.setAlwaysOnTop(true, "screen-saver");
    win.setIgnoreMouseEvents(currentIgnore);

    let win_id = options.characterId ? options.characterId : win.id;

    characterStates[win.id] = createCharacterState(options);

    if(platform == "win32")
    win.hookWindowMessage(WM_INITMENU, () => {
        win.setEnabled(false);
        win.setEnabled(true);
        characterStates[win.id].menu.popup();
    });

    win.webContents.on('before-input-event', (e, input) => {
        if ((input.control && ((input.shift && input.key === 'I') || input.key === 'r')) && !devMode) {
            e.preventDefault(); // Disabled DevTools
        }
    });
    // Disabled Fullscreen
    win.setFullScreenable(false);

    buildMenu(win);


    win.loadFile('index.html').then(() => {
        const state = characterStates[win_id];
        const options = {
            name: state.name,
            accessory: state.accessory,
            primary: state.primary,
            secondary: state.secondary,
            tertiary: state.tertiary,
            quaternary: state.quaternary,
            hueShift: state.hueShift,
            darknessOffset: state.darknessOffset
        };

        characterStates[win.id].lastEvent.sender.send('setCharacterState', JSON.stringify(options));
    });

    windows.push(win);

    win.on('close', () => onDestroy(win));

    onInit(win);
    updateTray();
}
