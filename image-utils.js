class ImageUtils {
    constructor() {
        this.images = {};
        this.loaded = 0;
        this.imgs = {};
    }
    loadImages(sources) {
        return new Promise((resolve, reject) => {
            const nb = Object.keys(sources).length;
            for (let i in sources) {
                this.imgs[i] = new Image();
                this.imgs[i].src = sources[i];
                this.imgs[i].onload = () => {
                    this.loaded++;
                    if (this.loaded === nb) {
                        resolve(this.imgs);
                    }
                };
                this.imgs[i].onerror = () => {
                    reject(`Error al cargar la imagen: ${sources[i]}`);
                };
            }
        });
    }
}
const imageUtils = new ImageUtils();