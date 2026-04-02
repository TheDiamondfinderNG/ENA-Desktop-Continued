class ImageUtils {
    constructor() {
        this.images = {};
        this.loaded = 0;
        this.imgs = {};
    }
    loadImages(sources) {
        let loadedImages = 0
        return new Promise((resolve, reject) => {
            function logLoad(self, nb) {
                self.loaded++
                loadedImages++
                if (loadedImages === nb) {
                    resolve(self.imgs);
                }
            }
            const nb = Object.keys(sources).length;
            if (nb == 0) resolve({})
            for (let i in sources) {
                this.imgs[i] = new Image();
                this.imgs[i].src = sources[i];
                if (this.imgs[i].complete) logLoad(this, nb)
                else this.imgs[i].onload = ()=>{logLoad(this, nb)}
                this.imgs[i].onerror = () => {
                    reject(`Error al cargar la imagen: ${sources[i]}`);
                };
            }
        });
    }
}
const imageUtils = new ImageUtils();