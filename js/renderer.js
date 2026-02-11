const path = require('path');

ipcRenderer.on('window-size', (event, size) => {
    let element = document.querySelector('.desktop-ena');
    if (element) {
        // element.style.width = `${size[0]}px`;
        element.style.height = `${size[1]}px`;
    }
});

var paused = false;
var ponify = null;

const body = document.querySelector('body');
window.onblur = () => {
    document.querySelector('.desktop-ena .part.titlebar').style.backgroundColor = 'rgb(31, 31, 31)';
    document.querySelector('.desktop-ena .part.titlebar').style.color = 'rgb(157, 157, 157)';
};
window.onfocus = () => {
    document.querySelector('.desktop-ena .part.titlebar').style.backgroundColor = 'rgb(24, 24, 24)';
    document.querySelector('.desktop-ena .part.titlebar').style.color = 'rgb(204, 204, 204)';

};

let sprites = {
    tanyahastur: 'img/pony/pony-town-tanyahastur.png',
    temepest_shadow: 'img/pony/pony-town-tempest-shadow.png',
    main: 'img/fonts/main.png',
    tiny: 'img/fonts/tiny.png'
};

var tanyaHastur = new PonyUtils;
var tempestShadow = new PonyUtils;
var characterPreview = new AnimateUtils();

characterPreview.initCanvas('character-preview', 400, 400, "character-preview");

imageUtils.loadImages(sprites).then((imgs) => {
    tanyaHastur.initCanvas('.tanya-kofi-button .canvas-pony canvas-pony pony-preview', 180, 180, "tanyaHastur");
    tempestShadow.initCanvas('.tanya-kofi-button .tempest-pony canvas-pony pony-preview', 180, 180, "tempestPony");
    tanyaHastur.createAnimation('stand', 24, true, [
        ...tanyaHastur.repeat(78, [0, 0]),
        [1, 0], [3, 0], [3, 0], [2, 0], [1, 0]
    ]);
    tanyaHastur.createAnimation('boop', 24, false, [
        [0, 0], [0, 0], [0, 0], [0, 0],
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
        ...tanyaHastur.repeat(7, [6, 1]),
        [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1],
    ]);
    tanyaHastur.createAnimation('happy', 24, false, [
        [0, 0], [0, 0], [0, 0], [0, 0],
        [4, 0], [4, 0],
        ...tanyaHastur.repeat(30, [5, 0]),
        [1, 0], [3, 0], [3, 0], [2, 0], [1, 0]
    ]);
    tanyaHastur.createAnimation('tongue', 24, false, [
        [0, 0], [0, 0], [0, 0], [0, 0],
        [4, 0], [4, 0],
        ...tanyaHastur.repeat(30, [6, 0]),
        [1, 0], [3, 0], [3, 0], [2, 0], [1, 0]
    ]);
    tanyaHastur.createAnimation('derpy', 24, false, [
        [0, 0], [0, 0], [0, 0], [0, 0],
        [4, 0], [4, 0],
        ...tanyaHastur.repeat(30, [7, 0]),
        [1, 0], [3, 0], [3, 0], [2, 0], [1, 0]
    ]);
    tempestShadow.copyAnimations(tanyaHastur.animations);
    tempestShadow.createAnimation('trot', 24, true, [
        [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
        [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3]
    ]);
    tempestShadow.createAnimation('sit', 24, false, [
        [0, 4], [1, 4], [2, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
        [7, 4], [0, 5], [0, 0]
    ]);
    tempestShadow.createAnimation('kiss', 24, false, [
        [0, 0], [0, 5], [0, 0], [1, 5], [2, 5], [3, 5],
        ...tempestShadow.repeat(10, [4, 5]),
        [5, 5], [6, 5], [7, 5], [0, 5]
    ]);
    tempestShadow.createAnimation('laugh', 24, false, [
        [0, 0], [0, 0], [0, 0], [0, 0],
        [0, 0], [0, 0],
        ...tempestShadow.repeat(5, [7, 0], [7, 0], [7, 0], [7, 1], [7, 1], [7, 1]),
        [1, 0], [3, 0], [3, 0], [2, 0], [1, 0]
    ]);
    tanyaHastur.createCharacter(imgs.tanyahastur, "tanyaPony", 12, 9, 66, 72, 0);
    tempestShadow.createCharacter(imgs.temepest_shadow, "tempestPony", 12, 9, 66, 72, 0);

    async function getBackground() {
        let currentBackground = await ipcRenderer.invoke('get-background');
        document.querySelector('.character-preview-box').style.backgroundColor = currentBackground;
    }

    getBackground();

    characterPreview.setUsername('^0Select a Character');
    characterPreview.setFontImage(imgs.main);
    characterPreview.setTinyImage(imgs.tiny);
    tanyaHastur.onInit();
    tempestShadow.onInit();
    characterPreview.onInit();

    ponify = () => {
        var random = tanyaHastur.rand(1, (tanyaHastur.animations.length - 1));
        tanyaHastur.changeAnimation('tanyaPony', random);
        if (tempyStatus == 2) {
            if (random == 4) {
                tempestShadow.changeAnimation('tempestPony', 8);
            } else {
                tempestShadow.changeAnimation('tempestPony', random);
            }
        }
    }
}).catch((error) => {
    console.error(`Error al cargar las imágenes: ${error}`);
});

let tempyStatus = -1;

window.onresize = function () {
    if (tempyStatus == 2) {
        document.querySelector(".tempest-pony").style.left = (document.querySelector('.tanya-button.tanya-kofi-button').offsetWidth - 122) + "px";
    }
}

function tempy() {
    if (tempyStatus == 2)
        return false;
    tempestShadow.changeAnimation('tempestPony', 5);
    var interval = setInterval(function () {
        var left = document.querySelector(".tempest-pony").style.left;
        if (Number(left.replace("px", "")) < (document.querySelector('.tanya-button.tanya-kofi-button').offsetWidth - 122)) {
            document.querySelector(".tempest-pony").style.left = tanyaHastur.clamp(Number(left.replace("px", "")) + 4, -64, (document.querySelector('.tanya-button.tanya-kofi-button').offsetWidth - 122)) + "px";
        } else {
            if (tempestShadow.characters[0].activeAnimation == 5 && tempyStatus == 0) {
                tempyStatus = 1;
                tempestShadow.setCycles([6, 7]);
            }
            if (tempestShadow.characters[0].activeAnimation == 0 && tempyStatus == 1) {
                clearInterval(interval);
                tempyStatus = 2;
            }
        }
    }, 1000 / 45);
}

document.querySelector('.tanya-button').addEventListener("mouseenter", function () {
    ponify();
});

document.querySelector('.tanya-button').addEventListener("click", function () {
    if (tempyStatus == -1) {
        document.querySelector('.tanya-button.tanya-kofi-button').style.paddingRight = "72px";
        tempyStatus = 0;
        tempy();
    }
});

document.querySelector('.background-color').style.setProperty('--color', ipcRenderer.sendSync('get-background'));
document.querySelector('.background-color-value').value = ipcRenderer.sendSync('get-background');
handleDropdownSelect(dropdownMenu, Number(ipcRenderer.sendSync('get-scale')) - 1);

document.querySelector('.remove-button').addEventListener('click', (event) => {
    updateOptionCharacters();
    const selectElement = document.querySelector('#characters');
    const selectedOption = selectElement.options[selectElement.selectedIndex];

    if (selectElement.value != -1) {
        if (document.querySelector(".character-tab-none") === null) document.querySelector(".character-tab").classList.add("character-tab-none");
        document.querySelector("#duplicate-btn").disabled = true;
        document.querySelector("#save-btn").disabled = true;
        characterPreview.setUsername('^0Select a Character');
        characterPreview.setRole('');
        characterPreview.removeCharacter();
        ipcRenderer.send('close-window', Number(selectElement.value));
        // Remove the selected option
        selectedOption.remove();
        // Select the first option
        if (selectElement.options.length > 0) {
            selectElement.selectedIndex = 0;
        }
    }

});

function generateNumber(input) {
    if (typeof input !== 'number' || input < 1 || input > 9999) {
        throw new Error('Input must be a number between 1 and 9999');
    }

    const jump = input % 10 + 1;
    let newNumber = (input + jump * 500) % 10000 || 1; // use logical OR to simplify 0-check

    return newNumber.toString().padStart(4, '0');
}

function updateOptionCharacters() {
    const windows = ipcRenderer.sendSync('get-window-id');
    if (windows.length === (document.querySelector('#characters').length - 1)) { return; }
    characters.innerHTML = '<option value="-1" disabled selected>Select a Character</option>';

    windows.forEach(id => {
        var option = document.createElement('option');
        option.value = id;
        option.text = ipcRenderer.sendSync('get-character-state', id).characterName + `#${generateNumber(id)}`;
        characters.appendChild(option);
    });
}

characters.addEventListener('click', () => {
    updateOptionCharacters();
});

document.querySelector('#duplicate-btn').addEventListener('click', (event) => {
    event.target.disabled = true;
    setTimeout(() => {
        event.target.disabled = false;
    }, 1500);
    let id = characters.value;

    if (id != -1) {
        ipcRenderer.send('duplicate-character', id);
    }
});

document.querySelector('#save-btn').addEventListener('click', (event) => {
    event.target.disabled = true;
    let id = characters.value;

    if (id != -1) {
        ipcRenderer.send('update-character-state', id, {
            primary: document.querySelector('.primary-color-value').value,
            secondary: document.querySelector('.secondary-color-value').value,
            tertiary: document.querySelector('.tertiary-color-value').value,
            quaternary: document.querySelector('.quaternary-color-value').value,
            accessory: (document.querySelector('#accessory').value === -1) ? null : document.querySelector('#accessory').value
        });
        ipcRenderer.send('update-background', document.querySelector('.background-color-value').value);
        ipcRenderer.send('requestChangeColor', Number(id));
        ipcRenderer.send('requestAccessory', Number(id));
        ipcRenderer.send("save-settings")
    }
});

document.querySelector('#accessory').addEventListener('change', (event) => {
    document.querySelector("#save-btn").disabled = false;
    characterPreview.setAccessory(document.querySelector('#accessory').value, [document.querySelector('.tertiary-color-value').value, document.querySelector('.quaternary-color-value').value]);
});

let wakeLock = null;

const requestWakeLock = async () => {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            // console.log('Wake Lock was released');
        });
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
};

const releaseWakeLock = async () => {
    if (!wakeLock) {
        return;
    }
    try {
        await wakeLock.release();
        wakeLock = null;
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
};

document.querySelector('#toggle-animation').onclick = function () {
    switch (paused) {
        case true:
            characterPreview.onInit();
            requestWakeLock();
            paused = false;
            document.querySelector('#toggle-animation fa-icon svg use').setAttribute("xlink:href", "#pause");
            break;
        case false:
            characterPreview.onDestroy();
            releaseWakeLock();
            paused = true;
            document.querySelector('#toggle-animation fa-icon svg use').setAttribute("xlink:href", "#play");
            break;
    }
}

var direction = true;

document.querySelector('#animations').addEventListener('change', (event) => {
    const charName = characterPreview.findCharacter(characterPreview.name);
    charName.animationTime = 0;
    charName.state.animationFrame = 0;
    charName.activeAnimation = document.querySelector('#animations').value + (direction ? '-l' : '-r');
});

document.querySelector('[title="Flip preview"]').addEventListener('click', (event) => {
    const charName = characterPreview.findCharacter(characterPreview.name);
    direction = !direction;
    if (Number(characters.value) != -1) charName.activeAnimation = document.querySelector('#animations').value + (direction ? '-l' : '-r');
});

let accessories = ipcRenderer.sendSync("requestAccessories")
let flatAccessories = accessories.flattened
for (let accessoryId in accessories.defaults) {
    let accOption = document.createElement('option');
    accOption.value = accessoryId;
    accOption.innerHTML = flatAccessories[accessoryId].label || accessoryId;
    document.querySelector("#accessory").options.add(accOption)
}
if (Object.keys(accessories.imports).length) {
    let accSep = document.createElement('option');
    accSep.disabled = true;
    accSep.style = "display: initial";
    accSep.innerHTML = "───── Imported Accessories ─────";
    document.querySelector("#accessory").options.add(accSep)
}
for (let accessoryId in accessories.imports) {
    let accOption = document.createElement('option');
    accOption.value = accessoryId;
    accOption.innerHTML = flatAccessories[accessoryId].label || accessoryId;
    document.querySelector("#accessory").options.add(accOption)
}


characters.addEventListener('change', (event) => {
    let id = Number(characters.value);
    let characterStates = ipcRenderer.sendSync('get-character-state', id)
    if (document.getElementsByClassName('character-tab-none').length > 0) {
        document.querySelector('.character-tab').classList.remove('character-tab-none');
        document.querySelector("#duplicate-btn").disabled = false;
    }

    // Update Settings
    document.querySelector('.background-color').style.setProperty('--color', ipcRenderer.sendSync('get-background'));
    document.querySelector('.primary-color').style.setProperty('--color', characterStates.primary);
    document.querySelector('.secondary-color').style.setProperty('--color', characterStates.secondary);
    document.querySelector('.tertiary-color').style.setProperty('--color', characterStates.tertiary);
    document.querySelector('.quaternary-color').style.setProperty('--color', characterStates.quaternary);
    document.querySelector('.background-color-value').value = ipcRenderer.sendSync('get-background');
    document.querySelector('.primary-color-value').value = characterStates.primary;
    document.querySelector('.secondary-color-value').value = characterStates.secondary;
    document.querySelector('.tertiary-color-value').value = characterStates.tertiary;
    document.querySelector('.quaternary-color-value').value = characterStates.quaternary;
    document.querySelector('#accessory').value = characterStates.accessory;

    if (characterPreview != null) {
        characterPreview.scale = characterPreview.clamp(Number(ipcRenderer.sendSync('get-scale')), 1, 6);
        characterPreview.setUsername('^0' + characterStates.characterName + `#${generateNumber(id)}`);

        characterPreview.setRole(characterStates.author ? "^" + (characterStates.author.color || 1) + "Made by:" + (characterStates.author.name || characterStates.author) : "");
        const imgPath = path.join(__dirname, 'character');
        let sprites = {
            character: ((characterStates.custom ? (characterStates.imported ? "../imports/characters/" : imgPath + '\\') : "img/character/") + characterStates.sprite),
            eyes: ((characterStates.custom ? (characterStates.imported ? "../imports/characters/" : imgPath + '\\') : "img/character/") + characterStates.blink),
        }
        for (let accessoryId in flatAccessories) {
            sprites[accessoryId] = flatAccessories[accessoryId].path || flatAccessories[accessoryId]
        }
        console.log(flatAccessories)
        const imageUtils_2 = new ImageUtils();
        imageUtils_2.loadImages(sprites).then((imgs) => {
            var acc = {}
            for (let accessoryId in flatAccessories) {
                acc[accessoryId] = imgs[accessoryId]
            }
            characterPreview.saveAccessory(acc);
            characterPreview.createAnimation('idle-l', 1, 0, true, [[0, 0], [0, 0], [0, 0]]);
            characterPreview.createAnimation('idle-r', 1, 1, true, [[1, 0], [1, 0], [1, 0]]);
            characterPreview.createAnimation('walk-l', 4, 0, true, [[2, 0], [3, 0], [4, 0], [3, 0]]);
            characterPreview.createAnimation('walk-r', 4, 1, true, [[5, 0], [6, 0], [7, 0], [6, 0]]);
            characterPreview.createAnimation('dangle-l', 4, 0, true, [[0, 1], [1, 1], [2, 1], [1, 1]]);
            characterPreview.createAnimation('dangle-r', 4, 1, true, [[3, 1], [4, 1], [5, 1], [4, 1]]);
            // drag animations have to use the opposite direction for the blink to work correctly
            characterPreview.createAnimation('drag-l', 4, 1, true, [[8, 1], [9, 1], [9, 1], [9, 1], [9, 1], [9, 1], [9, 1], [9, 1]]);
            characterPreview.createAnimation('drag-r', 4, 0, true, [[6, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1]]);
            characterPreview.createAnimation('sit-l', 4, 0, true, [[8, 0], [8, 0], [8, 0]]);
            characterPreview.createAnimation('sit-r', 4, 1, true, [[9, 0], [9, 0], [9, 0]]);
            characterPreview.createAnimation('init-fall-l', 6, 0, true, [[0, 2], [1, 2], [2, 2]]);
            characterPreview.createAnimation('init-fall-r', 6, 1, true, [[3, 2], [4, 2], [5, 2]]);
            characterPreview.createAnimation('blinking', 10, 0, true, [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [1, 0], [1, 0]]);
            const frameWidth = imgs.character.width / 10;
            const frameHeight = imgs.character.height / 4;

            characterPreview.createCharacter(imgs.character, imgs.eyes, characterStates.characterName.toLowerCase(), ((400 / 2) - (frameWidth * characterPreview.scale / 2)) / characterPreview.scale, ((400 / 2) - (frameHeight * characterPreview.scale / 2)) / characterPreview.scale, frameWidth, frameHeight, document.querySelector("#animations").value + (direction ? '-l' : '-r'), {
                accessory: characterStates.accessory,
                primary: characterStates.primary,
                secondary: characterStates.secondary,
                tertiary: characterStates.tertiary,
                quaternary: characterStates.quaternary,
                hueShift: characterStates.hueShift,
                darknessOffset: characterStates.darknessOffset,
            }, characterStates.custom, 'db/');
            paused = false;
        }).catch((error) => {
            console.error(`Error al cargar las imágenes: ${error}`);
        });
    };
});
