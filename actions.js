const { screen } = require('electron');
const { getRandomNumber, getRandomInteger } = require('./utils');
const { characterStates } = require('./States.js');

let timeout = {};
let time_walk = { min: 5, max: 10 };
let time_idle = { min: 4, max: 8 };

function setActions(win) {
    const shimejiStates = characterStates[win.id];
    let [x, y] = win.getPosition();
    let [w, h] = win.getSize();

    if (shimejiStates && !shimejiStates.isDragging) {
        if (!shimejiStates.isFalling) {
            if (!timeout[win.id] && (shimejiStates.state === 'idle' || shimejiStates.state === 'walk') && shimejiStates.state !== 'sit') {
                // Perseguir el cursor
                if (shimejiStates.chaseCursor) {
                    const cursorX = screen.getCursorScreenPoint().x; // Obtén la posición X actual del cursor
                    if (((x + (w / 2)) + (w / 2)) >= cursorX && ((x + (w / 2)) - (w / 2)) <= cursorX) {
                        shimejiStates.state = 'idle';
                        shimejiStates.dx = 0;
                        timeout[win.id] = true;
                        if (shimejiStates.lastEvent) {
                            shimejiStates.lastEvent.sender.send('channel1', shimejiStates.state + '-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
                        }
                        setTimeout(function () {
                            timeout[win.id] = false;
                        }, 1000 / 45);
                    } else {
                        shimejiStates.state = 'walk';
                        timeout[win.id] = true;
                        shimejiStates.direction = (cursorX > x + (w / 2)) ? 'right' : 'left';
                        shimejiStates.dx = (shimejiStates.direction === 'right') ? (shimejiStates.scale * shimejiStates.speed) : (-shimejiStates.scale * shimejiStates.speed);
                        if (shimejiStates.lastEvent) {
                            shimejiStates.lastEvent.sender.send('channel1', shimejiStates.state + '-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
                        }
                        setTimeout(function () {
                            timeout[win.id] = false;
                        }, 1000 / 45);
                    }
                } else if (!shimejiStates.isSitting) {
                    switch (shimejiStates.dx) { // aca utilizamos dx que seria la velocidad del personaje
                        case (1 * shimejiStates.scale * shimejiStates.speed):
                            shimejiStates.direction = 'right';
                            shimejiStates.state = 'idle';
                            timeout[win.id] = true;
                            shimejiStates.dx = 0;
                            if (shimejiStates.lastEvent) {
                                shimejiStates.lastEvent.sender.send('channel1', shimejiStates.state + '-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
                            }
                            setTimeout(function () {
                                timeout[win.id] = false;
                            }, getRandomInteger(time_idle.min, time_idle.max) * 1000);
                            break;
                        case (-1 * shimejiStates.scale * shimejiStates.speed):
                            shimejiStates.direction = 'left';
                            shimejiStates.state = 'idle';
                            timeout[win.id] = true;
                            shimejiStates.dx = 0;
                            if (shimejiStates.lastEvent) {
                                shimejiStates.lastEvent.sender.send('channel1', shimejiStates.state + '-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
                            }
                            setTimeout(function () {
                                timeout[win.id] = false;
                            }, getRandomInteger(time_idle.min, time_idle.max) * 1000);
                            break;
                        case 0:
                            shimejiStates.state = 'walk';
                            timeout[win.id] = true;
                            const directionFactor = shimejiStates.direction === "left" ? 1 : -1;
                            shimejiStates.dx = (getRandomNumber(directionFactor === 1 ? 0.35 : 0.65) * shimejiStates.scale) * shimejiStates.speed;
                            shimejiStates.direction = (shimejiStates.dx < 0 ? 'left' : 'right');
                            if (shimejiStates.lastEvent) {
                                shimejiStates.lastEvent.sender.send('channel1', shimejiStates.state + '-' + (shimejiStates.direction === 'right' ? 'r' : 'l'));
                            }
                            setTimeout(function () {
                                timeout[win.id] = false;
                            }, getRandomInteger(time_walk.min, time_walk.max) * 1000);
                            break;
                    }
                }
            }
        }
    }
}

module.exports = {
    setActions
};