
export class MiniQuery implements JsonViewer.IMiniQuery {

    public elem: HTMLElement; 

    constructor(input: string | HTMLElement) {
        if (typeof(input) == "string") {
            this.elem = document.createElement(input);
        }
        else {
            this.elem = input;
        }
    }

    attr(name: string, value: string) {
        this.elem.setAttribute(name, value);
        return this;
    }

    appendTo(target: MiniQuery) {
        target.elem.appendChild(this.elem);
        return this;
    }

    append(child: MiniQuery | MiniQuery[]) {
        if (Array.isArray(child)) {
            child.forEach(c => this.elem.appendChild(c.elem));
        }
        else {
            this.elem.appendChild(child.elem);
        }
        
        return this;
    }

    on(eventName: string, handler: (evt: Event) => void) {
        this.elem.addEventListener(eventName, handler);
        return this;
    }

    text(input: string) {
        this.elem.textContent = input;
        return this;
    }

    addClass(...input: string[]) {
        input.forEach(c => this.elem.classList.add(c));
        return this;
    }

    removeClass(input: string) {
        this.elem.classList.remove(input);
        return this;
    }

    hasClass(input: string): boolean {
        return this.elem.classList.contains(input);
    }

    empty() {
        this.elem.innerHTML = "";
        return this;
    }

    remove() {
        this.elem.parentElement?.removeChild(this.elem);
    }
}

export const $ = (input: string | HTMLElement) => new MiniQuery(input);