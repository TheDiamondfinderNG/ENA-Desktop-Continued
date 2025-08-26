function addClass(element, className) {
    if (!element.classList.contains(className)) {
        element.classList.add(className);
    }
}
function removeClass(element, className) {
    if (element.classList.contains(className)) {
        element.classList.remove(className);
    }
}
function toggleClass(element, className) {
    element.classList.toggle(className);
}
function handleOutsideClick(event, selectBtn) {
    for (let button of selectBtn) {
        if (button.nextElementSibling.contains(event.target)) {
            continue;
        }
        if (event.target != button && button.classList.contains('show')) {
            removeClass(button, 'show');
        }
    }
}
function handleDropdownClick(dropdownMenu) {
    for (let i = 0; i < dropdownMenu.length; i++) {
        let children = dropdownMenu[i].children;
        for (let j = 0; j < children.length; j++) {
            children[j].onclick = function(event) {
                event.stopPropagation();
                for (let k = 0; k < children.length; k++) {
                    children[k].classList.remove('checked');
                }
                this.classList.add('checked');
                let text = this.innerHTML;
                this.parentNode.previousElementSibling.innerHTML = `${text}`;
                const scale = Number(text.replace(/x/g, ''));
                ipcRenderer.send('update-scale', scale);
                if (characterPreview != null) {
                    characterPreview.scale = characterPreview.clamp(scale, 1, 6);
                }
                removeClass(this.parentNode.previousElementSibling, 'show');
            };
        }
    }
}
function handleDropdownSelect(dropdownMenu, childIndex) {
    for (let i = 0; i < dropdownMenu.length; i++) {
        let children = dropdownMenu[i].children;
        if (childIndex >= 0 && childIndex < children.length) {
            for (let k = 0; k < children.length; k++) {
                children[k].classList.remove('checked');
            }
            children[childIndex].classList.add('checked');
            let text = children[childIndex].innerHTML;
            children[childIndex].parentNode.previousElementSibling.innerHTML = `${text}`;
        }
    }
}
function handleSelectButtonClick(selectBtn) {
    for (let button of selectBtn) {
        button.onclick = function(event) {
            event.stopPropagation();
            if (this.classList.contains('show')) {
                for (let btn of selectBtn) {
                    removeClass(btn, 'show')
                }
            } else {
                addClass(this, 'show');
            }
        }
    }
}
window.addEventListener('click', function(event){
    let selectBtn = document.getElementsByClassName('dropdown-toggles');
    handleOutsideClick(event, selectBtn);
});
let selectBtn = document.getElementsByClassName('dropdown-toggles');
handleSelectButtonClick(selectBtn);
let dropdownMenu = document.getElementsByClassName('dropdown-menu');
handleDropdownClick(dropdownMenu);