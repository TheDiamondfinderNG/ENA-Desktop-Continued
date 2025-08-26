let PonyUtils = class PonyUtils {
    constructor() {
        this.lastFps = performance.now();
        this.frames = 0;
        this.lastDraw = 0;
        this.frameDelay = (1000 / 45);
        this.drawFps = 0;
        this.animationTime = 0;
        this.scale = 2;
        this.interval = undefined;
        this.canvas = undefined;
        this.context = undefined;
        this.cycle = 0;
        this.cycleList = [];
        this.store_characters = {};
        this.characters = [];
        this.animations = [];
        this.font = { image: null };
        this.background = null;
        this.username = null;
    }
    clamp = function(value, min, max) {
        return value > min ? (value < max ? value : max) : min;
    };
    rand = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    repeat = function(count, ...values) {
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(...values);
        }
        return result;
    };
    setCycles = function(cycles) {
        if (!cycles)
            return undefined;
        this.cycleList = cycles;
        this.characters[0].activeAnimation = this.cycleList[this.cycle];
        this.characters[0].state.animation = this.animations[this.characters[0].activeAnimation];
        this.animationTime = 0;
        this.characters[0].state.animationFrame = 0;
        this.cycle++;
    }
    copyAnimations = function(animations) {
        if (!animations)
            return undefined;
        const self = this;
        const newAnimations = animations;
        newAnimations.forEach(function(animation, i) {
            self.animations.push(animation);
        });
    };
    createExtCanvas = function(w, h, info) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.info = info;
        return canvas;
    };
    initCanvas = function(element, w, h) {
        this.canvas = this.createExtCanvas(w, h, "Pony Canvas");
        this.context = this.canvas.getContext('2d');
        document.querySelector(element).append(this.canvas);
    };
    setBGColor(color) {
        this.background = color;
    };
    setFontImage(image) {
        this.font.image = image;
    }
    setUsername(name) {
        this.username = name;
    }
    mirrorCanvas = function(enable) {
        if (enable) {
            this.context.translate(this.canvas.width, 0);
            this.context.scale(-1, 1);
            this.context.translate(0, 0);
        } else {
            this.context.translate(0, 0);
            this.context.scale(1, 1);
            this.context.translate(0, 0);
        }
    }
    createCharacter = function(image, name, x, y, w, h, activeAnimation) {
        this.characters.push({
            canvas: image,
            name: name,
            x: x,
            y: y,
            w: w,
            h: h,
            activeAnimation: activeAnimation,
            state: {
                animation: this.animations[activeAnimation],
                animationFrame: 0,
            }
        });
    };
    createFrame = function([offsetX = 0, offsetY = 0]) {
        return {
            offsetX, offsetY
        };
    };
    createAnimation = function(name, fps, loop, frames) {
        var result = { name, loop, fps, frames: frames.map(this.createFrame) };
        this.animations.push(result);
        return result;
    };
    onInit = function() {
        if (this.interval >= 1) {return;}
        let last = Date.now();
        this.interval = setInterval(() => {
            const now = Date.now();
            this.update((now - last) / 1000);
            last = now;
        }, 1000 / 24);
    };
    onDestroy = function() {
        clearInterval(this.interval);
        this.interval = 0;
    };
    changeAnimation = function(name, animation) {
        var character = this.characters.find(k => k.name === name);
        character.activeAnimation = animation;
        character.state.animation = this.animations[character.activeAnimation];
        this.animationTime = 0;
        character.state.animationFrame = 0;
    };
    update = function(delta) {
        this.animationTime += delta;
        const self = this;
        const now = performance.now();
        if ((now - this.lastDraw) < this.frameDelay) {
            return;
        }
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.disableImageSmoothing(this.context);
        this.characters.forEach(function(character, i) {
            let animation = self.animations[character.activeAnimation];
            character.state.animation = animation;
            
            if (!character.state.animation.loop && character.state.animationFrame >= character.state.animation.frames.length - 1) {
                if (self.cycleList.length >= 1 && self.cycle < self.cycleList.length) {
                    character.activeAnimation = self.cycleList[self.cycle];
                    character.state.animation = self.animations[character.activeAnimation];
                    self.cycle++;
                } else {
                    character.activeAnimation = 0;
                    character.state.animation = self.animations[character.activeAnimation];
                }
                self.animationTime = 0;
                character.state.animationFrame = 0;
            } else {
                // Get next frame
                var nextFrame = Math.floor(self.animationTime * animation.fps) % animation.frames.length;
                // Check for more frames and prevent reset frames non-loop
                if (!character.state.animation.loop) {
                    if (character.state.animationFrame > nextFrame) {
                        if (character.state.animationFrame < self.animations[character.activeAnimation].frames.length - 1) {
                            nextFrame = character.state.animationFrame + 1;
                        }
                    }
                }
                // Update Frame
                character.state.animationFrame = nextFrame;
            }
            self.context.drawImage(character.canvas, character.state.animation.frames[character.state.animationFrame].offsetX * character.w, character.state.animation.frames[character.state.animationFrame].offsetY * character.h, character.w, character.h, character.x * self.scale, character.y * self.scale, character.w * self.scale, character.h * self.scale);
        });
    };
    disableImageSmoothing = function(context) {
        if ('imageSmoothingEnabled' in context) {
            context.imageSmoothingEnabled = false;
        }
        else {
            context.webkitImageSmoothingEnabled = false;
            context.mozImageSmoothingEnabled = false;
            context.msImageSmoothingEnabled = false;
        }
    }
}