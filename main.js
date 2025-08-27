const { app, screen, ipcMain, Menu, Tray, nativeImage, BrowserWindow } = require('electron');
const { setActions } = require('./actions');
const { setPhysics } = require('./physics');
const { getRandomNumber } = require('./utils');
const { characterStates } = require('./States.js');
const activeWin = require('active-win');
const path = require('path');
const fs = require('fs');
const isSecondInstance = app.requestSingleInstanceLock();

if (!isSecondInstance) { // Close the new instance if one is already running
    app.quit();
}

// We enable the following commands to fix the DPI (Scaled Screen)
app.commandLine.appendSwitch('high-dpi-support', 'true');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

const configPath = path.join(__dirname, 'preferences.json');
let tray = null;
let currentBackground = '#90ee90' // manage.html Character Background
let currentLanguage = 'en';
let currentHide = false;
let currentIgnore = false;
let currentScale = 2;
let settingScale = 4; // manage.html Scale
let darkness = 50;
let allowCustoms = false;
let store_characters = {};
let translations = require(`./lang/menu_${currentLanguage}.json`);
let windows = [];
let lastRoofY = 0;
let lastLeftWall = 0;
let lastRightWall = 99999999;
let settings;
let intervals = {};
let winIsFullscreen = false;
let contextMenu = null;
// initMenu
const WM_INITMENU = 0x0116;
ipcMain.setMaxListeners(10);

async function savePreferences() {
    const preferences = {
        language: currentLanguage,
        scale: currentScale,
        background: currentBackground,
        allow_custom_shadows: allowCustoms,
        intensity: darkness
    };
    try {
        await fs.promises.writeFile(configPath, JSON.stringify(preferences), "utf-8");
    } catch (err) {
        console.error("Error saving preferences: ", err);
    }
}

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
            if (preferences.intensity) darkness = preferences.intensity;
        } catch (err) {
            console.error("Error loading preferences: ", err);
        }
    }
}

loadPreferences().then(() => {
    // We will use this to prevent the scale from using the default scale and not the one we have configured.
    changeScale(currentScale);
});

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
            characterStates[win.id].lastEvent.sender.send('setImagePath', path.join(__dirname, '..', 'character'));
            characterStates[win.id].lastEvent.sender.send('setIsCustom', characterStates[win.id].custom);
            characterStates[win.id].lastEvent.sender.send('changeSprite', characterStates[win.id].sprite, characterStates[win.id].blink);
            characterStates[win.id].lastEvent.sender.send('changeScale', currentScale);
            characterStates[win.id].lastEvent.sender.send('changeAccessory', characterStates[win.id].accessory);
        }
    }
});

ipcMain.on('duplicate-character', (event, id) => {
    createShimejiWindow({
        characterName: characterStates[id].characterName,
        spriteImage: characterStates[id].sprite,
        blinkImage: characterStates[id].blink,
        isCustomCharacter: characterStates[id].custom,
        frameWidth: characterStates[id].width,
        frameHeight: characterStates[id].height,
        hueShift: characterStates[id].hueShift,
        darknessOffset: characterStates[id].darknessOffset,
        characterId: id,
    });
});

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

ipcMain.on('update-darkness', (event, number) => {
    darkness = number;
    savePreferences();
});

ipcMain.on('get-darkness', (event) => {
    event.returnValue = darkness;
});

ipcMain.on('update-allow-customs', (event, bool) => {
    allowCustoms = bool;
    savePreferences();
});

ipcMain.on('get-allow-customs', (event) => {
    event.returnValue = allowCustoms;
});

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
            shimejiStates.lastEvent.sender.send('changeAccessory', shimejiStates.accessory, [shimejiStates.tertiary, shimejiStates.quaternary]);
        }
    }
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
    icon: nativeImage.createFromPath(path.join(__dirname, "img/icon.ico")),
    titleBarOverlay: { color: "#181818", symbolColor: "#fff", height: 34 },
    backgroundColor: "#181818",
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
    },
}

function createBrowserWindow(options) {
    const windowOptions = { ...win_config };
    if (options) Object.assign(windowOptions, options);
    return new BrowserWindow(windowOptions);
}

app.on('ready', () => {
    createShimejiWindow({
        characterName: 'Ena',
        spriteImage: 'ena_default.png',
        blinkImage: 'ena_blink.png',
        isCustomCharacter: false,
        primaryColor: '#2c5bf5',
        secondaryColor: '#ffe308',
        frameWidth: 36,
        frameHeight: 52
    });
    onInit();
});

app.on('window-all-closed', function (e) {
    e.preventDefault();
});

function createTray() {
    tray = new Tray(path.join(__dirname, 'img/icon.ico'));
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
            if ((input.control && input.shift && input.key === 'I')) {
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
    let config, newCharacterSubMenu = [
        {
            label: 'Ena',
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/ena.png')),
            type: 'normal',
            click: () => createShimejiWindow({
                characterName: 'Ena',
                spriteImage: 'ena_default.png',
                blinkImage: 'ena_blink.png',
                isCustomCharacter: false,
                primaryColor: '#2c5bf5',
                secondaryColor: '#ffe308',
                frameWidth: 36,
                frameHeight: 52
            })
        }
    ];

    try {
        const configPath = path.join(__dirname, '..', 'character', 'config.json');
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
        console.error('Error reading config file:', err);
    }

    config.forEach((character) => {
        newCharacterSubMenu.push({
            label: character.name,
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/custom.png')),
            type: 'normal',
            click: () => createShimejiWindow({
                characterName: character.name,
                spriteImage: character.sprite_path,
                blinkImage: character.blink_path,
                isCustomCharacter: true,
                primaryColor: character.primary_color ?? undefined,
                secondaryColor: character.secondary_color ?? undefined,
                hueShift: character.hueShift ?? [0, 0, 0],
                darknessOffset: character.darknessOffset ?? [0.85, 1.45, 1.60],
                frameWidth: character.width ?? 36,
                frameHeight: character.height ?? 52
            })
        });
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
                    if ((input.control && input.shift && input.key === 'I')) {
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

function changeScale(scale) { // fix this
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

function changeAccessory(name, win) {
    const shimejiStates = characterStates[win.id];
    shimejiStates.accessory = name;
    if (shimejiStates.lastEvent) {
        shimejiStates.lastEvent.sender.send('changeAccessory', name);
    }
}

function onInit(win) {
    if (win === undefined) { return; }
    let last = Date.now();
    intervals[win.id] = setInterval(() => {
        const now = Date.now();
        update((now - last) / 1000, win);
        last = now;
    }, 1000 / 60);
}

function onDestroy(win) {
    const index = windows.findIndex(w => w.id === win.id);
    if (index !== -1) { windows.splice(index, 1); }
    clearInterval(intervals[win.id]);
    delete characterStates[win.id];
    delete intervals[win.id];
}

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
        if (!characterStates[win.id].isSitting) {
            characterStates[win.id].state = characterStates[win.id].dx == 0 ? 'idle' : 'walk';
        } else if (characterStates[win.id].isSitting) {
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

function setCollision(win) {
    if (win == undefined || (characterStates[win.id] && characterStates[win.id].isDragging)) { return; }

    // let display = screen.getPrimaryDisplay(); // deprecated
    const displays = screen.getAllDisplays();
    let [x, y] = win.getPosition();
    const bounds = getDisplayForPosition(x, y)
    let [winWidth, winHeight] = win.getSize();
    let { width, height } = (bounds ?? displays[0]).workAreaSize;

    if (displays.length > 1) {

        const bounds = getDisplayForPosition(x, y);

        // Bouncing
        if (x + winWidth > lastRightWall && !bounds) { // Right
            characterStates[win.id].v_speed_x *= -1;
            characterStates[win.id].direction = 'left';
            characterStates[win.id].dx = (-1 * characterStates[win.id].scale * characterStates[win.id].speed);
            win.setPosition(lastRightWall - winWidth, y);
            if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
            }
        }
        if (x < lastLeftWall && !bounds) { // Left
            characterStates[win.id].v_speed_x = Math.abs(characterStates[win.id].v_speed_x);
            characterStates[win.id].direction = 'right';
            characterStates[win.id].dx = (1 * characterStates[win.id].scale * characterStates[win.id].speed);
            win.setPosition(lastLeftWall, y);
            if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
            }
        }

        if (bounds) {
            lastRoofY = bounds.bounds.y
            lastLeftWall = bounds.bounds.x
            lastRightWall = bounds.bounds.x + bounds.bounds.width

            if (y + winHeight > (!winIsFullscreen ? bounds.workAreaSize.height : bounds.size.height)) { // Bottom
                characterStates[win.id].v_speed_y = 0;
                win.setPosition(x, (!winIsFullscreen ? bounds.workAreaSize.height : bounds.size.height) - winHeight);
                characterStates[win.id].isFalling = false;
            }
        } else {
            if (y + winHeight > (!winIsFullscreen ? height : displays[0].size.height)) { // Bottom
                characterStates[win.id].v_speed_y = 0;
                win.setPosition(x, (!winIsFullscreen ? height : displays[0].size.height) - winHeight);
                characterStates[win.id].isFalling = false;
            }
            
        }

        if (y < lastRoofY) { // Top
            characterStates[win.id].v_speed_y *= -1;
            win.setPosition(x, lastRoofY);
        }
    } else {
        if (characterStates[win.id].isFalling && characterStates[win.id].isBouncing) {
            if (x + winWidth > width && characterStates[win.id].v_speed_x > 0) {
                characterStates[win.id].v_speed_x *= -1;
            }
            if (x < 0) {
                characterStates[win.id].v_speed_x = Math.abs(characterStates[win.id].v_speed_x);
            }
            if (y < 0) {
                characterStates[win.id].v_speed_y *= -1;
            }
        }

        if (characterStates[win.id].isFalling && characterStates[win.id].isBouncing) { return; }

        if (x + winWidth > width) { // Right
            characterStates[win.id].v_speed_x = 0;
            characterStates[win.id].direction = 'left';
            characterStates[win.id].dx = (-1 * characterStates[win.id].scale * characterStates[win.id].speed);
            win.setPosition(width - winWidth, y);
            if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
            }
        }
        if (x < 0) { // Left
            characterStates[win.id].v_speed_x = 0;
            characterStates[win.id].direction = 'right';
            characterStates[win.id].dx = (1 * characterStates[win.id].scale * characterStates[win.id].speed);
            win.setPosition(0, y);
            if (characterStates[win.id].lastEvent && characterStates[win.id].state != 'view' && !characterStates[win.id].isFalling && !characterStates[win.id].isReleased) {
                characterStates[win.id].lastEvent.sender.send('channel1', 'walk-' + (characterStates[win.id].direction === 'right' ? 'r' : 'l'));
            }
        }
        if (y + winHeight > (!winIsFullscreen ? height : displays.size.height)) { // Bottom
            characterStates[win.id].v_speed_y = 0;
            win.setPosition(x, (!winIsFullscreen ? height : displays.size.height) - winHeight);
            characterStates[win.id].isFalling = false;
        }
        if (y < 0) { // Top
            characterStates[win.id].v_speed_y = 0;
            win.setPosition(x, 0);
        }
    }
}

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
            if (y + winHeight < (!winIsFullscreen ? (bounds.workAreaSize.height+bounds.workArea.y) : (bounds.size.height + bounds.bounds.y))) {
                win.setPosition(x, y + shimejiStates.dy);
                
                shimejiStates.isFalling = true;
            } else {
                shimejiStates.v_speed_x = 0;
                shimejiStates.v_speed_y = 0;
                // Si el personaje está en el suelo
                win.setPosition(x + shimejiStates.dx, (!winIsFullscreen ? (displays[0].workAreaSize.height - winHeight) : (displays[0].size.height - winHeight)));
                shimejiStates.isFalling = false;
                // Actualizamos la animación de dangling o falling a idle o walk
                if (!shimejiStates.isSitting) {
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
    if (shimejiStates.lastEvent && !shimejiStates.isFalling && shimejiStates.isSitting && !shimejiStates.isDragging) {
        shimejiStates.lastEvent.sender.send('channel1', 'sit-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
        shimejiStates.dx = 0;
    }
}

function buildMenu(win) {
    if (win == undefined) { return; }
    if (characterStates[win.id] === undefined) { return; }

    let config, newCharacterSubMenu = [
        {
            label: 'Ena',
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/ena.png')),
            type: 'normal',
            click: () => createShimejiWindow({
                characterName: 'Ena',
                spriteImage: 'ena_default.png',
                blinkImage: 'ena_blink.png',
                isCustomCharacter: false,
                frameWidth: 36,
                frameHeight: 52,
            })
        }
    ];

    try {
        const configPath = path.join(__dirname, '..', 'character', 'config.json');
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
        console.error('Error reading config file:', err);
    }

    config.forEach((character) => {
        newCharacterSubMenu.push({
            label: character.name,
            icon: nativeImage.createFromPath(path.join(__dirname, 'img/icons/custom.png')),
            type: 'normal',
            click: () => createShimejiWindow({
                characterName: character.name,
                spriteImage: character.sprite_path,
                blinkImage: character.blink_path,
                isCustomCharacter: true,
                primaryColor: character.primary_color ?? undefined,
                secondaryColor: character.secondary_color ?? undefined,
                hueShift: character.hueShift ?? [0, 0, 0],
                darknessOffset: character.darknessOffset ?? [0.85, 1.45, 1.60],
                frameWidth: character.width ?? 36,
                frameHeight: character.height ?? 52
            })
        });
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
            submenu: [
                {
                    label: 'None',
                    click: () => {
                        changeAccessory('none', win);
                    }
                },
                {
                    label: 'Ena Plushie',
                    click: () => {
                        changeAccessory('ena', win);
                    }
                },
                {
                    label: 'BBQ Ena Plushie',
                    click: () => {
                        changeAccessory('bbq_ena', win);
                    }
                },
                {
                    label: 'Shepherd Plushie',
                    click: () => {
                        changeAccessory('shepherd', win);
                    }
                },
                {
                    label: 'Margo Plushie',
                    click: () => {
                        changeAccessory('margo', win);
                    }
                },
                {
                    label: 'Ula Plushie',
                    click: () => {
                        changeAccessory('ula', win);
                    }
                },
                {
                    label: 'Hourglass Dog Plushie',
                    click: () => {
                        changeAccessory('hg_dog', win);
                    }
                },
                {
                    label: 'Turrón',
                    click: () => {
                        changeAccessory('turron', win);
                    }
                },
                {
                    label: 'Pumpkin Basket',
                    click: () => {
                        changeAccessory('pumpkin', win);
                    }
                },
                {
                    label: 'Ena Bunny Plushie',
                    click: () => {
                        changeAccessory('ena_bunny', win);
                    }
                },
                {
                    label: 'Clown Dog Plushie',
                    click: () => {
                        changeAccessory('clown_dog', win);
                    }
                },
                {
                    label: 'DogGrim Plushie',
                    click: () => {
                        changeAccessory('dog_grim', win);
                    }
                },
                {
                    label: 'Margo Kitty Plushie',
                    click: () => {
                        changeAccessory('margo_kitty', win);
                    }
                },
                {
                    label: 'Lollipop',
                    click: () => {
                        changeAccessory('lollipop', win);
                    }
                },
                {
                    label: 'Eve Hat',
                    click: () => {
                        changeAccessory('eve_hat', win);
                    }
                },
                {
                    label: 'BBQ Ena Bunny Plushie',
                    click: () => {
                        changeAccessory('bbq_bunny', win);
                    }
                },
                {
                    label: 'Phone Accessory',
                    click: () => {
                        changeAccessory('phone', win);
                    }
                },
                {
                    label: 'Leek Accessory',
                    click: () => {
                        changeAccessory('leek', win);
                    }
                },
                {
                    label: 'Baguette Accessory',
                    click: () => {
                        changeAccessory('baguette', win);
                    }
                },
                {
                    label: 'Kasane Pearto',
                    click: () => {
                        changeAccessory('pearto', win);
                    }
                }
            ]
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
                    if ((input.control && input.shift && input.key === 'I')) {
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

function createCharacterState(options) {
    return {
        chaseCursor: false,
        scale: currentScale,
        accessory: options.characterId ? characterStates[options.characterId].accessory : 'none',
        dx: (getRandomNumber() === 1 ? (1 * currentScale) : (-1 * currentScale)),
        dy: 3 * currentScale,
        width: options.frameWidth ?? 36,
        height: options.frameHeight ?? 52,
        state: 'falling',
        direction: 'right',
        speed: 1,
        characterName: options.characterId ? characterStates[options.characterId].characterName : options.characterName,
        sprite: options.spriteImage,
        blink: options.blinkImage,
        custom: options.isCustomCharacter,
        isDragging: false,
        isReleased: true,
        isFalling: true,
        isBouncing: true,
        isSitting: false,
        primary: options.characterId ? characterStates[options.characterId].primary : (options.primaryColor ?? '#2c5bf5'),
        secondary: options.characterId ? characterStates[options.characterId].secondary : (options.secondaryColor ?? '#ffe308'),
        tertiary: options.characterId ? characterStates[options.characterId].tertiary : '#2c5bf5',
        quaternary: options.characterId ? characterStates[options.characterId].quaternary : '#ffe308',
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

function createShimejiWindow(options) {
    let display = screen.getPrimaryDisplay();
    const centerX = Math.floor(display.bounds.x + (display.bounds.width - (options.frameWidth * currentScale)) / 2);
    let win = createBrowserWindow({
        width: (options.frameWidth * currentScale),
        height: (options.frameHeight * currentScale),
        minWidth: (options.frameWidth * currentScale),
        minHeight: (options.frameHeight * currentScale),
        x: centerX,
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

    win.setAlwaysOnTop(true, "screen-saver");
    win.setIgnoreMouseEvents(currentIgnore);

    let win_id = options.characterId ? options.characterId : win.id;

    characterStates[win.id] = createCharacterState(options);

    win.hookWindowMessage(WM_INITMENU, () => {
        win.setEnabled(false);
        win.setEnabled(true);
        characterStates[win.id].menu.popup();
    });

    win.webContents.on('before-input-event', (e, input) => {
        if ((input.control && input.shift && input.key === 'I')) {
            e.preventDefault(); // Disabled DevTools
        }
    });
    // Disabled Fullscreen
    win.setFullScreenable(false);

    buildMenu(win);

    let move = {
        timeout: null,
        timeout2: null,
        state: 'stand'
    };

    win.on('will-move', () => {
        // Moving the Window!
        const shimejiStates = characterStates[win.id];
        shimejiStates.isDragging = true;
        const deltaX = shimejiStates.dragPos.newX - shimejiStates.dragPos.oldX;

        if (deltaX > 2) {
            if (shimejiStates.lastEvent) {
                move.state = 'drag-r';
                shimejiStates.lastEvent.sender.send('channel1', 'drag-r');
            }
        } else if (deltaX < -2) {
            if (shimejiStates.lastEvent) {
                move.state = 'drag-l';
                shimejiStates.lastEvent.sender.send('channel1', 'drag-l');
            }
        } else {
            if (shimejiStates.lastEvent) {
                if (move.state.includes('drag')) {
                    move.timeout2 = setTimeout(() => {
                        if (shimejiStates.lastEvent && !shimejiStates.isReleased && (deltaX <= 1 || deltaX >= -1)) {
                            shimejiStates.lastEvent.sender.send('channel1', 'dangle-' + (shimejiStates.direction == 'right' ? 'r' : 'l'));
                            move.timeout2 = null;
                            move.state = 'dangle';
                        }
                    }, 200);
                } else {
                    if (shimejiStates.lastEvent && !shimejiStates.isReleased) {
                        shimejiStates.lastEvent.sender.send('channel1', 'dangle-' + (shimejiStates.direction == 'right' ? 'r' : 'l'));
                        move.state = 'dangle';
                    }
                }
            }
        }
        shimejiStates.isReleased = false;

        clearTimeout(move.timeout);
        move.timeout = setTimeout(() => {
            if (shimejiStates.lastEvent && !shimejiStates.isReleased) {
                shimejiStates.lastEvent.sender.send('channel1', 'dangle-' + (shimejiStates.direction == 'right' ? 'r' : 'l'));
                move.state = 'dangle';
            }
        }, 200);
    });

    win.on('moved', () => {
        // the window has been released
        dragPosition();
    });

    function dragPosition() {
        const shimejiStates = characterStates[win.id];

        const deltaX = shimejiStates.dragPos.newX - shimejiStates.dragPos.oldX;
        const deltaY = shimejiStates.dragPos.newY - shimejiStates.dragPos.oldY;

        shimejiStates.v_speed_x = deltaX;
        shimejiStates.v_speed_y = deltaY;
        shimejiStates.isDragging = false;
        shimejiStates.isReleased = true;
    }

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