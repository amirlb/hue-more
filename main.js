"use strict";

const HEXAGON_SIZE = 100;
const MARGIN = 20;
const BOARD_SIZE = 4;

var dragged_elt_id; // ugly hack: there's no way to detect "drag enter" only on other elements...


function init() {
    document.getElementById('win').classList.add('hidden');

    let board = document.getElementById('board');
    while (board.firstChild) {
        board.removeChild(board.firstChild);
    }

    let locations = [];
    let colors = [];

    let max_x = (BOARD_SIZE - 1) * 4;
    let max_y = (BOARD_SIZE - 1) * 2;
    let r0, r1, g0, g1, b0, b1;
    [r0, r1] = randomRange(32, 96, 224, 256);
    [g0, g1] = randomRange( 0, 96,   0, 256);
    [b0, b1] = randomRange(32, 96, 224, 256);
    if ((r0 < r1) != (g0 < g1)) {
        // prevent green-pink-puke color scheme
        [g0, g1] = [g1, g0];
    }
    for (let y = 0; y <= max_y; y++) {
        let min_x = Math.abs(y - (BOARD_SIZE - 1));
        for (let x = min_x; x <= max_x - min_x; x += 2) {
            let r = Math.floor(r0 + x/max_x*(r1-r0));
            let g = Math.floor(g0 + x/max_x*(g1-g0));
            let b = Math.floor(b0 + y/max_y*(b1-b0));
            let color = 'rgb(' + r + ', ' + g + ', ' + b + ')';
            if (isCorner(x, y)) {
                let elt = addHexagon(color, x, y);
                board.appendChild(elt);
                elt.setAttribute('corner', true);
            } else {
                locations.push([x, y]);
                colors.push(color);
            }
        }
    }

    let originalColors = colors.slice();
    shuffle(colors);

    for (let i = 0; i < locations.length; i++) {
        let elt = addHexagon(colors[i], locations[i][0], locations[i][1]);
        board.appendChild(elt);
        elt.setAttribute('expectedColor', originalColors[i]);
    }
}

function isCorner(x, y) {
    if (y == 0 || y == (BOARD_SIZE - 1) * 2)
        return (x == BOARD_SIZE - 1 || x == (BOARD_SIZE - 1) * 3);
    if (y == BOARD_SIZE - 1)
        return (x == 0 || x == (BOARD_SIZE - 1) * 4);
    return false;
}

function randomRange(lo0, lo1, hi0, hi1)
{
    let lo = lo0 + Math.random() * (lo1 - lo0);
    let hi = hi0 + Math.random() * (hi1 - hi0);
    if (Math.random() < 0.5)
        return [lo, hi];
    else
        return [hi, lo];
}

function shuffle(a) {
    const easy = 0; // only this many swaps
    if (easy) {
        for (let i = 0; i < easy; i++) {
            let j1 = Math.floor(Math.random() * (a.length - 1));
            let j2 = Math.floor(Math.random() * (a.length - 1));
            [a[j1], a[j2]] = [a[j2], a[j1]];
        }
    } else {
        for (let i = a.length; i; i--) {
            let j = Math.floor(Math.random() * i);
            [a[i - 1], a[j]] = [a[j], a[i - 1]];
        }
    }
}

function rgb2hex(r, g, b) {
    r = (r<16 ? '0' : '') + r.toString(16);
    g = (g<16 ? '0' : '') + g.toString(16);
    b = (b<16 ? '0' : '') + b.toString(16);
    return '#' + r + g + b;
}

function addHexagon(color, x, y) {
    let elt = document.createElement('span');
    elt.style.color = color;
    elt.style.position = 'absolute'
    elt.style.left = (HEXAGON_SIZE * x * 0.5 + 20) + 'px';
    elt.style.top = (HEXAGON_SIZE * y * 0.86 + 20) + 'px';
    elt.classList.add('hexagon');
    elt.setAttribute('id', 'hex_'+x+'_'+y);
    elt.setAttribute('draggable', 'true');
    elt.addEventListener('mousedown', function(event) {
        if (this.getAttribute('corner'))
            event.preventDefault();
    });
    elt.addEventListener('dragstart', onDrag);
    elt.addEventListener('dragover', function(event) {
        if (this.getAttribute('corner') || !dragged_elt_id)
            return;

        if (dragged_elt_id != this.id) {
            this.setAttribute('drop-active', true);
            event.preventDefault();
        }
    });
    elt.addEventListener('dragleave', function(event) {
        this.removeAttribute('drop-active');
    });
    elt.addEventListener('dragend', function(event) {
        dragged_elt_id = undefined;
    });
    elt.addEventListener('drop', onDrop);

    return elt;
}

function onDrag(event) {
    if (this.getAttribute('corner'))
        return;

    dragged_elt_id = this.id;

    let canvas = document.getElementsByTagName('canvas')[0];
    canvas.width = HEXAGON_SIZE;
    canvas.height = HEXAGON_SIZE;
    let context = canvas.getContext('2d');
    context.beginPath();
    context.arc(HEXAGON_SIZE/2, HEXAGON_SIZE/2, HEXAGON_SIZE/2, 0, 2*Math.PI);
    context.fillStyle = this.style.color.toString().replace(' ', '');
    context.fill();
    let img = document.getElementsByTagName('img')[0];
    img.src = canvas.toDataURL('image/png');
    event.dataTransfer.setDragImage(img, HEXAGON_SIZE/2, HEXAGON_SIZE/2);
}

function onDrop(event) {
    if (this.getAttribute('corner') || !dragged_elt_id)
        return;

    this.removeAttribute('drop-active');
    let src = document.getElementById(dragged_elt_id);
    dragged_elt_id = undefined;
    [src.style.color, this.style.color] = [this.style.color, src.style.color];
    if (allCorrect()) {
        let win = document.getElementById('win');
        win.classList.remove('hidden');
        win.classList.add('appear');
        win.style.width = (2 * MARGIN + (BOARD_SIZE * 2 - 1) * HEXAGON_SIZE) + 'px';
        win.style.height = (2 * MARGIN + (BOARD_SIZE * 1.72 - 0.72) * HEXAGON_SIZE) + 'px';
    }
}

function allCorrect() {
    let hexagons = document.getElementsByClassName('hexagon');
    for (let i = 0; i < hexagons.length; i++) {
        let elt = hexagons[i];
        if (elt.getAttribute('corner'))
            continue;
        if (elt.getAttribute('expectedColor') != elt.style.color.toString())
            return false;
    }
    return true;
}