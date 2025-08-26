const EventEmitter = require('events');
let FixToTop = class FixToTop {
    constructor(element) {
        this.element = element;
        this.fixToTopOffset = -10;
        this.fixToTop = new EventEmitter();
        this.fixed = false;
    }
    scroll() {
        const element = this.element;
        const { top } = element.getBoundingClientRect();
        if (this.fixed !== top < this.fixToTopOffset) {
            this.fixed = top < this.fixToTopOffset;
            this.fixToTop.emit('change', this.fixed);
        }
    }
};