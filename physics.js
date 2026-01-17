const { characterStates } = require("./States.js");

let gravity = 2;
let friction = .9;

function setPhysics(win) {
    const shimejiStates = characterStates[win.id];

    if (shimejiStates && shimejiStates.isReleased && shimejiStates.isFalling) {
        if (shimejiStates.state != 'falling') {
            shimejiStates.state = 'falling';
            if (shimejiStates.lastEvent) {
                shimejiStates.lastEvent.sender.send('channel1', 'init-fall-' + (shimejiStates.v_speed_x > 0 ? 'r' : 'l'));
            }
        }
        shimejiStates.v_speed_x *= .98;
        shimejiStates.v_speed_y += gravity;
        shimejiStates.v_speed_y *= friction;
        shimejiStates.dx = 0;
        shimejiStates.dy = 0;
        if (Math.floor(shimejiStates.v_speed_y) === 0) {
            shimejiStates.v_speed_y = 0;
        }
        if (Math.floor(shimejiStates.v_speed_x) === 0) {
            shimejiStates.v_speed_x = 0;
        }
        let [x, y] = win.getPosition();
        // Prevent console from being flooded and ENA from being stuck
        if (Math.abs(shimejiStates.v_speed_x) >= 1e9) { 
            // Slow movement, send to the last left wall with wall detection
            // If you see this, yes the buginess is partially controlled. It would get your ENA stuck otherwise :(
            // If it makes you feel any better, the weird running thing isn't. she just does that and idk why
            shimejiStates.v_speed_x = Math.abs(shimejiStates.v_speed_x % 100 )+ 40
            x = 0
        }
        // If you wanna watch her get stuck from being too bouncy anyways, this if statement is the only thing stopping her
        win.setPosition(Math.floor(x + shimejiStates.v_speed_x), Math.floor(y + shimejiStates.v_speed_y));
    }
}

module.exports = {
    setPhysics: setPhysics
};