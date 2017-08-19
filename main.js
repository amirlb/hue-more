"use strict";

const Levels = {
    Easy: {
        name: 'Easy',
        board_size: 3,
        fixed_types: ['corner', 'side'],
        valid_color_diff: function(diff) {return diff >= 100;}
    },
    Medium: {
        name: 'Medium',
        board_size: 4,
        fixed_types: ['corner', 'side'],
        valid_color_diff: function(diff) {return diff >= 100;}
    },
    Hard: {
        name: 'Hard',
        board_size: 4,
        fixed_types: ['corner'],
        valid_color_diff: function(diff) {return diff >= 100;}
    },
    Extreme: {
        name: 'Extreme',
        board_size: 4,
        fixed_types: ['corner'],
        valid_color_diff: function(diff) {return 15 <= diff && diff < 30;}
    }
};

let Settings = {
    getLevel: function() {
        return Levels[localStorage.getItem('level') || 'Easy'];
    },
    setLevel: function(level) {
        if (!(level in Levels))
            throw ('Settings.setLevel called with ' + level);
        localStorage.setItem('level', level);
    },
    getMarkFixed: function() {
        return (localStorage.getItem('markFixed') || 'true') === 'true';
    },
    setMarkFixed: function(markFixed) {
        localStorage.setItem('markFixed', markFixed ? 'true' : 'false');
    }
};

const HEXAGON_SIZE = 100;
const MARGIN = 20;

let dragged_elt_id; // ugly hack: there's no way to detect "drag enter" only on other elements...


function init() {
    document.querySelectorAll('input[type="radio"][name="level"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            Settings.setLevel(this.value);
            startGame();
        });
    });

    document.querySelector('input[name="mark_fixed"]').addEventListener('change', function() {
        Settings.setMarkFixed(this.checked);
        updateCheckMarks();
    });

    startGame();
}

function startGame() {
    let level = Settings.getLevel();

    document.querySelectorAll('input[type="radio"][name="level"]').forEach(function(radio) {
        if (radio.value === level.name)
            radio.checked = true;
    });
    document.querySelector('input[name="mark_fixed"]').checked = Settings.getMarkFixed();

    let board = document.getElementById('board');
    while (board.firstChild) {
        board.removeChild(board.firstChild);
    }

    let locations = [];
    let colors = [];

    let max_x = (level.board_size - 1) * 4;
    let max_y = (level.board_size - 1) * 2;

    let colorScheme = randomColorScheme(level.valid_color_diff);

    for (let y = 0; y <= max_y; y++) {
        let min_x = Math.abs(y - (level.board_size - 1));
        for (let x = min_x; x <= max_x - min_x; x += 2) {
            let [r, g, b] = applyColorScheme(colorScheme, [x/max_x, y/max_y]);
            let color = 'rgb(' + r + ', ' + g + ', ' + b + ')';

            let position_type = 'middle';
            if ([0, level.board_size-1, max_y].includes(y) && [min_x, max_x-min_x].includes(x))
                position_type = 'corner';
            else if ([0, max_y].includes(y) || [min_x, max_x-min_x].includes(x))
                position_type = 'side';
            let is_fixed = level.fixed_types.includes(position_type);

            if (is_fixed) {
                board.appendChild(addHexagon(color, x, y, true));
            } else {
                locations.push([x, y]);
                colors.push(color);
            }
        }
    }

    let originalColors = colors.slice();
    shuffle(colors);

    for (let i = 0; i < locations.length; i++) {
        let elt = addHexagon(colors[i], locations[i][0], locations[i][1], false);
        board.appendChild(elt);
        elt.setAttribute('expectedColor', originalColors[i]);
    }

    updateCheckMarks();

    let win = document.getElementById('win');
    win.classList.add('hidden');
    win.classList.remove('appear');
    win.style.width = (2 * MARGIN + (level.board_size * 2 - 1) * HEXAGON_SIZE) + 'px';
    win.style.height = (2 * MARGIN + (level.board_size * 1.72 - 0.72) * HEXAGON_SIZE) + 'px';
}

function updateCheckMarks() {
    let display = Settings.getMarkFixed() ? 'initial' : 'none';
    document.querySelectorAll('.fix_mark').forEach(function(elt) {
        elt.style.display = display;
    });
}

function randomColorScheme(colorCondition) {
    let corners = [[0.25,0], [0.75,0], [0,0.5], [1,0.5], [0.25,1], [0.75,1]]
    while (true) {
        let colorScheme = [randomDimension(), randomDimension(), randomDimension()];
        // green-pink color scheme hurts my eye
        if (colorScheme[0][1] < -0.1 && colorScheme[1][1] > 0.1)
            continue;
        if (colorScheme[1][1] < -0.1 && colorScheme[0][1] > 0.1)
            continue;
        if (colorScheme[0][2] < -0.1 && colorScheme[1][2] > 0.1)
            continue;
        if (colorScheme[1][2] < -0.1 && colorScheme[0][2] > 0.1)
            continue;
        let cornerColors = corners.map(function(loc) {
            return applyColorScheme(colorScheme, loc);
        });
        let diff = 1e6;
        for (let i = 0; i < cornerColors.length; i++)
            for (let j = 0; j < i; j++)
                diff = Math.min(diff, colorDifference(cornerColors[i], cornerColors[j]));
        if (colorCondition(diff)) {
            return colorScheme;
        }
    }
}

function applyColorScheme(scheme, xy) {
    return scheme.map(function(channel) {
        let base = channel[0], dx = channel[1], dy = channel[2];
        return Math.floor(255 * (base + dx * xy[0] + dy * xy[1]));
    });
}

function randomDimension() {
    let low = Math.random(), high = Math.random();
    if (high < low) [low, high] = [high, low];
    let dx = Math.random() * (high - low);
    let dy = (high - low) - dx;
    if (Math.random() < 0.5)
        [low, dy] = [low + dy, -dy];
    if (Math.random() < 0.5)
        [low, dx] = [low + dx, -dx];
    return [low, dx, dy];
}

function colorDifference(c1, c2) {
    // TODO: find better difference function
    return Math.sqrt(0.5 * Math.pow(c1[0] - c2[0], 2) +
                     Math.pow(c1[1] - c2[1], 2) +
                     0.7 * Math.pow(c1[2] - c2[2], 2));
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

function addHexagon(color, x, y, is_fixed) {
    let elt = document.createElement('span');
    elt.style.color = color;
    elt.style.position = 'absolute'
    elt.style.left = (HEXAGON_SIZE * x * 0.5 + 20) + 'px';
    elt.style.top = (HEXAGON_SIZE * y * 0.86 + 20) + 'px';
    elt.classList.add('hexagon');
    elt.setAttribute('id', 'hex_'+x+'_'+y);
    if (is_fixed) {
        elt.setAttribute('unmovable', true);
        elt.innerHTML = '<span class="fix_mark"/>';
    } else {
        elt.setAttribute('draggable', true);
        elt.addEventListener('dragstart', onDrag);
    }
    elt.addEventListener('dragover', function(event) {
        if (this.getAttribute('unmovable') || !dragged_elt_id)
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
    dragged_elt_id = this.id;
    event.dataTransfer.setData('text/plain', null); // apparently, this is required for firefox to allow drag & drop?

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
    event.preventDefault();
    if (this.getAttribute('unmovable') || !dragged_elt_id)
        return;

    this.removeAttribute('drop-active');
    let src = document.getElementById(dragged_elt_id);
    dragged_elt_id = undefined;
    [src.style.color, this.style.color] = [this.style.color, src.style.color];
    if (allCorrect()) {
        let win = document.getElementById('win');
        win.classList.remove('hidden');
        win.classList.add('appear');
    }
}

function allCorrect() {
    let hexagons = document.getElementsByClassName('hexagon');
    for (let i = 0; i < hexagons.length; i++) {
        let elt = hexagons[i];
        if (elt.getAttribute('unmovable'))
            continue;
        if (elt.getAttribute('expectedColor') != elt.style.color.toString())
            return false;
    }
    return true;
}