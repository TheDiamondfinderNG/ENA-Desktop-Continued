class FontUtils {
    constructor() {
        this.size = {w: 10, h: 10};
        this.size_2 = {w: 8, h: 9};
        this.colors = {
            white: {
                name: "white",
                canvas: null,
                colors: ["#ffffff"]
            },
            sup1: {
                name: "sup1",
                canvas: null,
                colors: ["#ffffff"]
            },
            sup2: {
                name: "sup2",
                canvas: null,
                colors: ["#f86754"]
            },
            sup3: {
                name: "sup3",
                canvas: null,
                colors: ["#f86754"]
            },
            sup4: {
                name: "sup4",
                canvas: null,
                colors: ["#f86754"]
            },
            mod: {
                name: "mod",
                canvas: null,
                colors: ["#b689ff"]
            },
            dev: {
                name: "dev",
                canvas: null,
                colors: ["#ff69b4"]
            },
            system: {
                name: "system",
                canvas: null,
                colors: ["#ffffff"]
            },
            gray: {
                name: "gray",
                canvas: null,
                colors: ["#555555"]
            }
        };
        this.letters = {32:4,33:2,34:5,37:8,38:8,39:3,40:4,41:4,42:5,44:2,46:2,58:2,59:2,60:5,62:5,64:7,73:4,74:5,76:5,79:7,81:7,91:4,93:4,96:3,102:5,105:2,106:5,107:5,108:3,116:4,123:5,124:2,125:5,126:7};
        this.tinys = {32:4,33:2,34:4,35:6,37:6,38:6,39:6,40:2,41:3,42:3,43:4,44:4,45:2,46:4,47:2,48:6,50:3,59:2,60:4,61:4,62:4,63:4,64:4,73:4,77:6,81:6,84:6,87:6,88:6,89:6,91:3,92:6,93:3,94:4,96:2,97:4,98:4,99:3,100:4,101:4,102:3,103:4,104:4,105:2,106:3,107:4,108:3,109:6,110:4,111:4,112:4,113:4,114:3,115:3,116:3,117:4,118:4,119:6,120:4,121:4,122:4,123:4,124:2,125:4,127:4};
    }
    getColorAt(d, i) {
        return ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
    };
    recolorCanvas(canvas, from, to) {
        const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        const length = imageData.width * imageData.height * 4;
        const data = imageData.data;
        for (let i = 0; i < length; i += 4) {
            if (data[i + 3] == 255) {
                data[i] = (to >> 24) & 0xff;
                data[i + 1] = (to >> 16) & 0xff;
                data[i + 2] = (to >> 8) & 0xff;
                data[i + 3] = 255;
            }
        }
        canvas.getContext('2d').putImageData(imageData, 0, 0);
        return canvas;
    };
    createExtCanvas(w, h, info) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.info = info;
        return canvas;
    };
    copyCanvas = function(canvas) {
        if (!canvas)
            return undefined;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        newCanvas.info = `${canvas.info} (copy)`;
        newCanvas.getContext('2d').drawImage(canvas, 0, 0);
        return newCanvas;
    };
    recolor(image, name) {
        if (this.colors[name].canvas == undefined) {
            let canvas = this.copyCanvas(image);
            canvas = this.recolorCanvas2(canvas, this.colors[name].colors);
            this.colors[name].canvas = canvas;
        }
        return this.colors[name].canvas;
    };
    recolorCanvas2(image, colors) {
        const canvas = this.createExtCanvas(image.width, image.height, '(copy)')
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = colors[0];
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';
        return canvas;
    };
    textSize(message) {
        var gap = 0;
        for (let i = 0; i < message.length; i++) {
            const regex = /[\^]([0-9])([^^]+)/g;
            let match, array = [], p = 0;
            while ((match = regex.exec(message))) {
                const n = Number(match[1]);
                const s = match[2];
                array.push([n, s, p]);
                p += s.length;
            }
            var self = this;
            array.forEach(function(m) {
                gap += self.letters[m[1].charCodeAt(i)] != undefined ? self.letters[m[1].charCodeAt(i)] : 6;
            });
        }
        return gap;
    };
    tinySize(message) {
        var gap = 0;
        for (let i = 0; i < message.length; i++) {
            const regex = /[\^]([0-9])([^^]+)/g;
            let match, array = [], p = 0;
            while ((match = regex.exec(message))) {
                const n = Number(match[1]);
                const s = match[2];
                array.push([n, s, p]);
                p += s.length;
            }
            var self = this;
            array.forEach(function(m) {
                gap += self.tinys[m[1].charCodeAt(i)] != undefined ? self.tinys[m[1].charCodeAt(i)] : 5;
            });
        }
        return gap;
    };
    drawText(context, image, message, dx = 0, dy = 0, scale = 2, outline = true) {
        message = message[0] == '^' ? message : '^0' + message;
        var canvas = image;
        var ascii;
        
        const regex = /[\^]([0-9])([^^]+)/g;
        let match, array = [], p = 0;
        while ((match = regex.exec(message))) {
            const n = Number(match[1]);
            const s = match[2];
            array.push([n, s, p]);
            p += s.length;
        }
        
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            var gap = 0;
            for (let i = 0; i < message.length; i++) {
                array.forEach(m => {
                    canvas = m[0] == 9 ? image : this.recolor(image, Object.values(this.colors)[m[0]].name, scale);
                    ascii = Number(m[1].charCodeAt(i) - 32);
                    
                    // Drawing outline
                    const copyCanvas = image;
                    if (outline) {
                        context.globalAlpha = 0.4;
                        for (let x = -1; x <= 1; x++) {
                            for (let y = -1; y <= 1; y++) {
                                context.drawImage(
                                    copyCanvas,
                                    (ascii % 32) * this.size.w,
                                    Math.floor(ascii / 32) * this.size.h,
                                    this.size.w,
                                    this.size.h,
                                    ((m[2] * this.size.w) + (dx + x) + gap) * scale,
                                    (dy + y) * scale,
                                    this.size.w * scale,
                                    this.size.h * scale
                                );
                            }
                        }
                        context.globalAlpha = 1;
                    }
                    
                    // Drawing text
                    context.drawImage(
                        canvas,
                        (ascii % 32) * this.size.w,
                        Math.floor(ascii / 32) * this.size.h,
                        this.size.w,
                        this.size.h,
                        ((m[2] * this.size.w) + dx + gap) * scale,
                        dy * scale,
                        this.size.w * scale,
                        this.size.h * scale
                    );
                    
                    gap += this.letters[m[1].charCodeAt(i)] != undefined ? this.letters[m[1].charCodeAt(i)] : 6;
                });
            }
        }
    };
    drawTiny(context, image, message, dx = 0, dy = 0, scale = 2, outline = true) {
        message = message[0] == '^' ? message : '^0' + message;
        var canvas = image;
        var ascii;
        
        const regex = /[\^]([0-9])([^^]+)/g;
        let match, array = [], p = 0;
        while ((match = regex.exec(message))) {
            const n = Number(match[1]);
            const s = match[2];
            array.push([n, s, p]);
            p += s.length;
        }
        
        if (canvas && canvas.width > 0 && canvas.height > 0) {
            var gap = 0;
            for (let i = 0; i < message.length; i++) {
                array.forEach(m => {
                    canvas = m[0] == 8 ? image : this.recolor(image, Object.values(this.colors)[m[0]].name, scale);
                    ascii = Number(m[1].charCodeAt(i) - 32);
                    
                    // Drawing outline
                    const copyCanvas = image;
                    if (outline) {
                        context.globalAlpha = 0.4;
                        for (let x = -1; x <= 1; x++) {
                            for (let y = -1; y <= 1; y++) {
                                context.drawImage(
                                    copyCanvas,
                                    (ascii % 32) * this.size_2.w,
                                    Math.floor(ascii / 32) * this.size_2.h,
                                    this.size_2.w,
                                    this.size_2.h,
                                    ((m[2] * this.size_2.w) + (dx + x) + gap) * scale,
                                    (dy + y) * scale,
                                    this.size_2.w * scale,
                                    this.size_2.h * scale
                                );
                            }
                        }
                        context.globalAlpha = 1;
                    }
                    
                    // Drawing text
                    context.drawImage(
                        canvas,
                        (ascii % 32) * this.size_2.w,
                        Math.floor(ascii / 32) * this.size_2.h,
                        this.size_2.w,
                        this.size_2.h,
                        ((m[2] * this.size_2.w) + dx + gap) * scale,
                        dy * scale,
                        this.size_2.w * scale,
                        this.size_2.h * scale
                    );
                    
                    gap += this.tinys[m[1].charCodeAt(i)] != undefined ? this.tinys[m[1].charCodeAt(i)] : 5;
                });
            }
        }
    };
}
const fontUtils = new FontUtils();