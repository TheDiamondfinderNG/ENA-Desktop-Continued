class AnimateUtils {
    constructor() {
        this.version = '1.0.1';
        this.lastFps = performance.now();
        this.frames = 0;
        this.lastDraw = 0;
        this.frameDelay = (1000 / 45);
        this.drawFps = 0;
        this.animationTime = 0;
        this.scale = 2;
        this.interval = 0;
        this.canvas = null;
        this.context = null;
        this.characters = [];
        this.name = null;
        this.animations = [];
        this.store_characters = {};
        this.store_accessories = {};
        this.store_coords = {
            eye: {
                image: null,
                store: null,
                w: 11,
                h: 3,
                characters: []
            },
            accessory: {
                characters: []
            }
        };
        this.move_speed = 2;
        this.grv_speed = 0.25;
        this.grv_max_speed = 4;
        this.font = { image: null };
        this.tiny = { image: null };
        this.username = null;
        this.role = null;
        this.fixed = false;
        this.darkness = 50;
        this.angle = 0;
    };
    clamp = function(value, min = 0, max = 255) {
        return value > min ? (value < max ? value : max) : min;
    };
    repeat = function(count, ...values) {
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(...values);
        }
        return result;
    };
    createExtCanvas(w, h, info) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.info = info;
        return canvas;
    };
    initCanvas = function(element, w, h, id = undefined) {
        this.canvas = this.createExtCanvas(w, h, 'canvas');
        this.context = this.canvas.getContext('2d');
        document.querySelector(element).append(this.canvas);
    };
    setFontImage(image) {
        this.font.image = image;
    }
    setTinyImage(image) {
        this.tiny.image = image;
    }
    setUsername(name) {
        this.username = name;
    }
    setRole(name) {
        this.role = name;
    }
    setFixed(fixed) {
        this.fixed = fixed;
    }
    setDarkness(number) {
        this.darkness = number;
    }
    removeCharacter() {
        this.characters = [];
    }
    createCharacter = function(image, eyes, name, x, y, w, h, activeAnimation, options = {}, custom, subPath = '') {
        this.characters = [];
        this.name = name;
        this.characters.push({
            canvas: this.recolorImage(image, [options.primary || '#2c5bf5', options.secondary || '#ffe308']),
            canvas2: this.recolorImage(eyes, [options.primary || '#2c5bf5', options.secondary || '#ffe308']),
            name: name.toLowerCase(),
            x: x,
            y: y,
            w: w,
            h: h,
            hspd: options.hspd || 0,
            vspd: options.vspd || 0,
            recolor: options.recolor || false,
            blink: options.blink || true,
            accessory: options.accessory || 'none',
            c_primary: options.primary || '#2c5bf5',
            c_secondary: options.secondary || '#ffe308',
            c_tertiary: options.tertiary || '#2c5bf5',
            c_quaternary: options.quaternary || '#ffe308',
            hueShift: options.hueShift || [0, 0, 0],
            darknessOffset: options.darknessOffset || [1, 1.45, 1.60],
            direction: options.direction || 1,
            activeAnimation: activeAnimation,
            animationTime: options.animationTime || 0,
            state: {
                animationFrame: options.animationFrame || 0,
                blinkFrame: options.blinkFrame || 0,
                randomBlink: options.randomBlink || Math.floor(Math.random() * (42 - 0) + 0) / 10
            },
            clones: [{
                mirrored: false,
                color: 5,
                opacity: .8,
                data: null
            }, {
                mirrored: true,
                color: 10,
                opacity: .65,
                data: null
            }]
        });
        fetch(subPath + (custom ? 'custom' : name.toLowerCase()) + '.json') // 'db/' + name...
        .then(response => response.json())
        .then(data => {
            this.store_coords.eye.image = eyes;

            if (this.store_characters[name] == null) {
                this.store_characters[name] = {image: image};
            }

            const { w, h } = this.findCharacter(name);
            const diffW = (w - 36) / 2;
            const diffH = h - 52;

            // Ajustar coordenadas de los ojos
            if (this.store_coords.eye.characters[name] == null) {
                this.store_coords.eye.characters[name] = {
                    index: data.eyes_index,
                    coord: data.eyes.map(([x, y]) => [x + diffW, y + diffH])
                };
            }

            // Ajustar coordenadas de los accesorios
            if (this.store_coords.accessory.characters[name] == null) {
                this.store_coords.accessory.characters[name] = {
                    coord: data.accessory.map(([x, y, z], index) => [x + diffW + (w - 36) * (index % 10), y + diffH, z])
                };
            }

            if (this.findCharacter(this.name).accessory != 'none') {
                this.setAccessory(this.findCharacter(this.name).accessory);
            } else {
                this.setRecolor([
                    this.findCharacter(this.name).c_primary,
                    this.findCharacter(this.name).c_secondary
                ]);
            }
        }).catch(error => alert('An error occurred: ' + error));
    };
    findCharacter = function(name) {
        return this.characters.find(k => k.name == name);
    };
    saveAccessory = function(accessories) {
        const self = this;
        Object.keys(accessories).forEach(function(key) {
            self.store_accessories[key] = {image: accessories[key]};
        });
    }
    setAccessory = function(name) {
        if (name === 'none') {
            this.setRecolor([this.findCharacter(this.name).c_primary, this.findCharacter(this.name).c_secondary]);
        } else {
            let character = this.findCharacter(this.name);
            var c = document.createElement('canvas');
            var ctx = c.getContext("2d");
            var w = character.canvas.width;
            var h = character.canvas.height;
            c.width = w;
            c.height = h;
            let layer = this.store_accessories[name].image;
            let coord = this.store_coords.accessory.characters[character.name].coord;
            for (var i = 0; i < coord.length; i++) {
                ctx.drawImage(this.recolorImage(layer, [character.c_tertiary, character.c_quaternary]), coord[i][2] * (layer.width / 2), (layer.height / 2), (layer.width / 2), (layer.height / 2), ((i % 10) * 36) + coord[i][0], coord[i][1] + (Math.floor(i / 10) * character.h), (layer.width / 2), (layer.height / 2));
            }
            ctx.drawImage(this.recolorImage(this.store_characters[character.name].image, [character.c_primary, character.c_secondary]), 0, 0, w, h, 0, 0, w, h);
            for (var i = 0; i < coord.length; i++) {
                ctx.drawImage(this.recolorImage(layer, [character.c_tertiary, character.c_quaternary]), coord[i][2] * (layer.width / 2), (layer.height * 0), (layer.width / 2), (layer.height / 2), ((i % 10) * 36) + coord[i][0], coord[i][1] + (Math.floor(i / 10) * character.h), (layer.width / 2), (layer.height / 2));
            }
            character.accessory = name;
            character.canvas = c;
        }
    };
    setRecolor = function(colors) {
        const character = this.findCharacter(this.name);
        if (this.isHexColor(colors[0]) && this.isHexColor(colors[1])) {
            character.c_primary = colors[0];
            character.c_secondary = colors[1];
            character.canvas = this.recolorImage(this.store_characters[character.name].image, [character.c_primary, character.c_secondary]);
            character.canvas2 = this.recolorImage(this.store_coords.eye.image, [character.c_primary, character.c_secondary]);
        }
    };
    setRecolor2 = function(colors) {
        const character = this.findCharacter(this.name);
        if (this.isHexColor(colors[0]) && this.isHexColor(colors[1])) {
            character.c_tertiary = colors[0];
            character.c_quaternary = colors[1];
        }
    };
    createFrame = function([offsetX = 0, offsetY = 0]) {
        return {
            offsetX, offsetY
        };
    };
    createAnimation = function(name, fps, direction, loop, frames) {
        var result = { name, loop, fps, direction, frames: frames.map(this.createFrame) };
        this.animations.push(result);
        return result;
    };
    findAnimation = function(animation) {
        return this.animations.find(k => k.name == animation.toLowerCase());
    };
    changeAnimation = function(name, animation) {
        var character = this.characters.find(k => k.name === name);
        if ((character.activeAnimation != animation)) {
            character.activeAnimation = animation;
            character.animationTime = 0;
            character.state.animationFrame = 0;
        }
    };
    // hslToRgb = function(h, s, l) {
    //     let a = s * Math.min(l, 1 - l);
    //     let f = (n,k=(n + h / 30) % 12)=>l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    //     return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
    // };
    // drawClone = function(character, color = 0, opacity = 1, isMirrored = false) {
    //     const canvas = this.createExtCanvas(character.width, character.height, "(clone)");
    //     const context = canvas.getContext("2d");
    //     if (opacity != 1)
    //         context.globalAlpha = opacity;
    //     context.drawImage(character, 0, 0);
    //     context.globalCompositeOperation = "source-in";
    //     const rgb = this.hslToRgb(color, 1, .5);
    //     context.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;;
    //     context.fillRect(0, 0, canvas.width, canvas.height);
    //     context.globalCompositeOperation = "source-over";
    //     if (opacity != 1)
    //         context.globalAlpha = 1;
    //     return canvas
    // };
    // addClone = function(name) {
    //     var character = this.findCharacter(name);
    //     const isWalkingRight = character.activeAnimation === "walk-r";
    //     const isWalkingLeft = character.activeAnimation === "walk-l";
    //     const speed = isWalkingRight ? -4 : isWalkingLeft ? 4 : 0;
    
    //     character.clones[1].data = character.clones[0].data
    //         ? { ...character.clones[0].data, x: character.clones[0].data.x * 2 }
    //         : null;
        
    //     character.clones[0].data = speed === 0 ? null : {
    //         x: speed,
    //         y: 0
    //     };
    // };
    onInit = function() {
        if (this.interval >= 1) { return; }
        let last = Date.now();
        this.interval = setInterval(() => {
            const now = Date.now();
            this.update((now - last) / 1000);
            last = now;
        }, 1000 / 45);
    };
    onDestroy = function() {
        clearInterval(this.interval);
        this.interval = 0;
    };
    update = function(delta) {
        const rotationSpeed = Math.PI / 180;
        const now = performance.now();
        if ((now - this.lastDraw) < this.frameDelay) { return; }
        this.frames++;
        if ((now - this.lastFps) > 1000) {
            this.drawFps = Math.floor(this.frames * 1000 / (now - this.lastFps));
            this.frames = 0;
            this.lastFps = now;
        }
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.disableImageSmoothing(this.context);
        if (this.username != null && !this.fixed) {
            fontUtils.drawText(this.context, this.font.image, this.username, 100 - ((fontUtils.textSize(this.username) - 12) / 2), Math.floor(47 / this.scale), 2);
        }
        if (this.role != null && !this.fixed) {
            fontUtils.drawTiny(this.context, this.tiny.image, this.role, 100 - ((fontUtils.tinySize(this.role) - 9) / 2), Math.floor(47 / this.scale) + 11, 2);
        }
        this.characters.forEach((character) => {
            // Draw Clones
            // for (let i = character.clones.length - 1; i >= 0; i--) {
            //     let clone = character.clones[i];
            //     if (clone.data != null) {
            //         this.context.globalCompositeOperation = "lighter";
            //         this.context.drawImage(this.drawClone(character.canvas, ((clone.color)) % 255, clone.opacity, clone.mirrored), this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetX * character.w, this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetY * character.h, character.w, character.h, (character.x + clone.data.x) * this.scale, character.y * this.scale, character.w * this.scale, character.h * this.scale);
            //         this.context.globalCompositeOperation = "source-over"
            //         clone.color += 1;
            //     }
            // }
            // Update Clone Data
            // this.addClone(this.name);
            // Draw Character
            if (this.username != null) {
                this.drawOutline(character.canvas, this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetX * character.w, this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetY * character.h, character.w, character.h, (400 / 2) - ((character.w / 2) * this.scale), (400 / 2) - ((character.h / 2) * this.scale), character.w * this.scale, character.h * this.scale);
            } else {
                // this.context.rotate(delta % 180);
                this.context.drawImage(character.canvas, this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetX * character.w, this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetY * character.h, character.w, character.h, character.x * this.scale, character.y * this.scale, character.w * this.scale, character.h * this.scale);
            }
            if (document.querySelectorAll('#current-frame').length >= 1 && this.name != null) {
                document.querySelector('#current-frame').value = character.state.animationFrame;
            }
            // Draw blink in character
            if (character.canvas2 != null && character.blink && !character.activeAnimation.includes("init-fall-") && this.findAnimation('blinking').frames[character.state.blinkFrame].offsetX === 1) {
                if (this.username != null) {
                    // manage.html
                    this.context.drawImage(character.canvas2, this.store_coords.eye.characters[character.name].index * this.store_coords.eye.w, this.findAnimation(character.activeAnimation).direction ? this.store_coords.eye.h : 0, this.store_coords.eye.w, this.store_coords.eye.h, (400 / 2) - ((character.w / 2) * this.scale) + (this.store_coords.eye.characters[character.name].coord[this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetX + (this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetY * 10)][0] * this.scale), (400 / 2) - ((character.h / 2) * this.scale) + (this.store_coords.eye.characters[character.name].coord[this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetX + (this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetY * 10)][1] * this.scale), this.store_coords.eye.w * this.scale, this.store_coords.eye.h * this.scale);
                } else {
                    // index.html
                    this.context.drawImage(character.canvas2, this.store_coords.eye.characters[character.name].index * this.store_coords.eye.w, this.findAnimation(character.activeAnimation).direction ? this.store_coords.eye.h : 0, this.store_coords.eye.w, this.store_coords.eye.h, (character.x * this.scale) + (this.store_coords.eye.characters[character.name].coord[this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetX + (this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetY * 10)][0] * this.scale), (character.y * this.scale) + (this.store_coords.eye.characters[character.name].coord[this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetX + (this.findAnimation(character.activeAnimation).frames[character.state.animationFrame].offsetY * 10)][1] * this.scale), this.store_coords.eye.w * this.scale, this.store_coords.eye.h * this.scale);
                }
            }
            // This will animate the character
            character.animationTime += delta;
            if (character.blink) {
                character.state.blinkFrame = Math.floor((character.animationTime + character.state.randomBlink) * this.findAnimation('blinking').fps) % this.findAnimation('blinking').frames.length;
            }

            if (!(!this.findAnimation(character.activeAnimation).loop && character.state.animationFrame >= (this.findAnimation(character.activeAnimation).frames.length - 1))) {
                character.state.animationFrame = Math.floor(character.animationTime * this.findAnimation(character.activeAnimation).fps) % this.findAnimation(character.activeAnimation).frames.length;
            }
        });
    };
    hexToRgb = function(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return [
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16)
            ];
        } else {
            return null;
        }
    };
    rgbToHsv = function(r, g, b) {
        r /= 255, g /= 255, b /= 255;
    
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, v = max;
    
        let d = max - min;
        s = max == 0 ? 0 : d / max;
    
        if (max == min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
    
        return [h, s, v];
    };
    hsvToRgb = function(h, s, v) {
        let r, g, b;
    
        let i = Math.floor(h * 6);
        let f = h * 6 - i;
        let p = v * (1 - s);
        let q = v * (1 - f * s);
        let t = v * (1 - (1 - f) * s);
    
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
    
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };
    isHexColor = function(hex) {
        return /^[#]([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/i.test(hex);
    };
    adjustColors(colors, darkness, sFactor = 0.24, vFactor = 0.56, hShift = 0) {
        return colors.map(color => {
            let [r, g, b] = this.hexToRgb(color);
            
            // Color exclusivo para #f3e5be
            if (r === 243 && g === 229 && b === 190) {
                [r, g, b] = [194, 237, 255];
            }
    
            let [h, s, v] = this.rgbToHsv(r, g, b);
            
            // Ajustar saturación y brillo según el nivel de oscuridad
            h = this.clamp((h + (hShift / 360)) % 1, 0, 1); // use this.clamp for avoid NaN values
            s = this.clamp(s + ((darkness * 0.01) * sFactor), 0, 1);
            v = this.clamp(v - ((darkness * 0.01) * vFactor), 0, 1);
            
            return this.hsvToRgb(h, s, v);
        });
    };
    recolorImage = function(img, colors) {
        try {
            var c = document.createElement('canvas');
            var ctx = c.getContext("2d");
            var w = img.width;
            var h = img.height;
            c.width = w;
            c.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            var imageData = ctx.getImageData(0, 0, w, h);
            
            var character = this.findCharacter(this.name);
            console.log(character.darknessOffset[0]);
            let newColors1 = this.adjustColors(colors, this.darkness * character.darknessOffset[0], 0.30, 0.45, character.hueShift[0]);
            let newColors2 = this.adjustColors(colors, this.darkness * character.darknessOffset[1], 0.35, 0.60, character.hueShift[1]);
            let newColors3 = this.adjustColors(colors, this.darkness * character.darknessOffset[2], 0.40, 0.75, character.hueShift[2]);

            let finalColors = [
                [255, 0, 255, this.hexToRgb(colors[0])[0], this.hexToRgb(colors[0])[1], this.hexToRgb(colors[0])[2]],
                [220, 0, 220, newColors1[0][0], newColors1[0][1], newColors1[0][2]],
                [185, 0, 185, newColors2[0][0], newColors2[0][1], newColors2[0][2]],
                [150, 0, 150, newColors3[0][0], newColors3[0][1], newColors3[0][2]],
                [0, 255, 255, this.hexToRgb(colors[1])[0], this.hexToRgb(colors[1])[1], this.hexToRgb(colors[1])[2]],
                [0, 220, 220, newColors1[1][0], newColors1[1][1], newColors1[1][2]],
                [0, 185, 185, newColors2[1][0], newColors2[1][1], newColors2[1][2]],
                [0, 150, 150, newColors3[1][0], newColors3[1][1], newColors3[1][2]]
            ];
            let self = this;

            for (var i = 0; i < imageData.data.length; i += 4) {
                finalColors.forEach(function(color) {
                    if (imageData.data[i + 3] == 255 &&
                    self.clamp(color[0] + 2) >= imageData.data[i] && self.clamp(color[0] - 2) <= imageData.data[i] &&
                    self.clamp(color[1] + 2) >= imageData.data[i + 1] && self.clamp(color[1] - 2) <= imageData.data[i + 1] &&
                    self.clamp(color[2] + 2) >= imageData.data[i + 2] && self.clamp(color[2] - 2) <= imageData.data[i + 2]) {
                        imageData.data[i] = color[3];
                        imageData.data[i + 1] = color[4];
                        imageData.data[i + 2] = color[5];
                        imageData.data[i + 3] = 255;
                    }
                });
            }
            ctx.putImageData(imageData, 0, 0);
            return c;
        } catch (error) {
            // Module recolorImage: return original image without recolor...
            return img;
        }
    };
    copyCanvas(canvas) {
        if (!canvas)
            return undefined;
        const newCanvas = this.createExtCanvas(canvas.width, canvas.height, `${canvas.info} (copy)`);
        newCanvas.getContext('2d').drawImage(canvas, 0, 0);
        return newCanvas;
    };
    drawOutline(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (this.fixed) {
            const outlineOffset = [-1, 1];
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    this.context.drawImage(image, sx, sy, sw, sh, dx + (x == 0 ? outlineOffset[y] : 0) * this.scale, dy + (x == 1 ? outlineOffset[y] : 0) * this.scale, dw, dh);
                }
            }
            this.context.globalCompositeOperation = 'source-in';
            this.context.fillStyle = document.querySelectorAll('.character-preview-box').length >= 1 ? document.querySelector('.character-preview-box').style.backgroundColor : "#90ee90";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.globalCompositeOperation = 'source-over';
        }
        this.context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    };
    disableImageSmoothing(context) {
        if ('imageSmoothingEnabled' in context) {
            context.imageSmoothingEnabled = false;
        } else {
            context.webkitImageSmoothingEnabled = false;
            context.mozImageSmoothingEnabled = false;
            context.msImageSmoothingEnabled = false;
        }
    };
}
const animateUtils = new AnimateUtils();