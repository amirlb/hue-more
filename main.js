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

let DragAndDrop = {
    board: null,
    draggedElement: null,
    targetElement: null,
    origin: null,

    reset: function() {
        DragAndDrop.board = document.getElementById('board');
        DragAndDrop.board.removeEventListener('mousemove', DragAndDrop.movement);
        DragAndDrop.board.removeEventListener('touchmove', DragAndDrop.movement);
        DragAndDrop.board.removeEventListener('mouseup', DragAndDrop.end);
        DragAndDrop.board.removeEventListener('touchend', DragAndDrop.end);
        DragAndDrop.board.removeEventListener('mouseleave', DragAndDrop.reset);
        DragAndDrop.board.removeEventListener('touchcancel', DragAndDrop.reset);
        DragAndDrop.board.querySelectorAll('.hexagon').forEach(function(elt) {
            elt.classList.remove('draggedElement');
            elt.classList.remove('dropTarget');
            elt.transform.baseVal[0].setTranslate(0, 0);
            elt.transform.baseVal[3].setTranslate(hexagonLocations[elt.id].current[0], hexagonLocations[elt.id].current[1]);
        });
        DragAndDrop.draggedElement = null;
        DragAndDrop.targetElement = null;
        DragAndDrop.origin = null;
        DragAndDrop.board.addEventListener('mouseup', DragAndDrop.end);
        DragAndDrop.board.addEventListener('touchend', DragAndDrop.end);
        DragAndDrop.board.addEventListener('mouseleave', DragAndDrop.reset);
        DragAndDrop.board.addEventListener('touchcancel', DragAndDrop.reset);
    },

    start: function(event) {
        if (DragAndDrop.draggedElement) {
            // unexpected
            DragAndDrop.reset();
            return;
        }

        DragAndDrop.draggedElement = this;
        DragAndDrop.draggedElement.classList.add('draggedElement');
        // position this element on top
        DragAndDrop.board.removeChild(DragAndDrop.draggedElement);
        DragAndDrop.board.appendChild(DragAndDrop.draggedElement);
        let position = ('targetTouches' in event) ? event.targetTouches[0] : event;
        DragAndDrop.origin = {x: position.clientX, y: position.clientY};
        DragAndDrop.board.addEventListener('mousemove', DragAndDrop.movement);
        DragAndDrop.board.addEventListener('touchmove', DragAndDrop.movement);
        event.preventDefault();
    },

    movement: function(event) {
        if (!DragAndDrop.draggedElement) {
            // unexpected
            DragAndDrop.reset();
            return;
        }

        let position = ('targetTouches' in event) ? event.targetTouches[0] : event;
        let dx = position.clientX - DragAndDrop.origin.x,
            dy = position.clientY - DragAndDrop.origin.y;
        DragAndDrop.draggedElement.transform.baseVal[0].setTranslate(dx, dy);
        let underPointer = document.elementFromPoint(position.clientX, position.clientY).closest('[droppable]');
        if (underPointer) {
            if (DragAndDrop.targetElement) {
                if (DragAndDrop.targetElement.id === underPointer.id) {
                    // nothing changed
                    event.preventDefault();
                    return;
                } else {
                    // moved to new element
                    DragAndDrop.targetElement.classList.remove('dropTarget');
                    // fall through
                }
            }
            // switch / start hover
            DragAndDrop.targetElement = underPointer;
            DragAndDrop.targetElement.classList.add('dropTarget');
        } else {
            // not over anything
            if (DragAndDrop.targetElement) {
                // left last element
                DragAndDrop.targetElement.classList.remove('dropTarget');
                DragAndDrop.targetElement = null;
            }
        }
        event.preventDefault();
    },

    end: function(event) {
        if (DragAndDrop.draggedElement && DragAndDrop.targetElement) {
            let i1 = DragAndDrop.draggedElement.id,
                i2 = DragAndDrop.targetElement.id;
            [hexagonLocations[i1].current, hexagonLocations[i2].current] = [hexagonLocations[i2].current, hexagonLocations[i1].current];
        }
        DragAndDrop.reset();
        if (allCorrect()) {
            let win = document.getElementById('win');
            win.classList.remove('hidden');
            win.classList.add('appear');
        }
        event.preventDefault();
    }
}

let hexagonLocations = {};


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

    window.addEventListener('resize', setBoardCoordinates);
    DragAndDrop.reset();

    startGame();
}

function setBoardCoordinates() {
    const MARGIN = 10;

    let board = document.getElementById('board');
    let width = board.width.baseVal.value, height = board.height.baseVal.value;
    let level = Settings.getLevel();
    const s3 = Math.sqrt(3);
    let hexagon_size = Math.min((width - MARGIN * 2) / (level.board_size * 4 - 2),
                                (height - MARGIN * 2) / (level.board_size * 2 * s3 - 2 / s3));
    document.querySelectorAll('.hexagon').forEach(function(hexagon) {
        hexagon.transform.baseVal[1].setTranslate(width / 2, height / 2);
        hexagon.transform.baseVal[2].setScale(hexagon_size, hexagon_size * s3);
    });
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

    let colorScheme = randomColorScheme(level.valid_color_diff);

    let fixed = [], movable = [];
    
    let n_layers = level.board_size - 1;
    for (let y = -n_layers; y <= n_layers; y++) {
        let max_x = n_layers * 2 - Math.abs(y);
        for (let x = -max_x; x <= max_x; x += 2) {
            let [r, g, b] = applyColorScheme(colorScheme, [x/n_layers/4+0.5, y/n_layers/2+0.5]);
            let color = 'rgb(' + r + ', ' + g + ', ' + b + ')';

            let position_type = 'middle';
            if ([-n_layers, 0, n_layers].includes(y) && [-max_x, max_x].includes(x))
                position_type = 'corner';
            else if ([-n_layers, n_layers].includes(y) || [-max_x, max_x].includes(x))
                position_type = 'side';
            let is_fixed = level.fixed_types.includes(position_type);

            if (is_fixed)
                fixed.push({position: [x, y], color});
            else
                movable.push({position: [x, y], color});
        }
    }

    let original = fixed.concat(movable);
    let mixed = fixed.concat(shuffle(movable));

    hexagonLocations = {};

    for (let i = 0; i < original.length; i++) {
        let id = `hexagon_${original[i].position[0]}_${original[i].position[1]}`;
        hexagonLocations[id] = {current: mixed[i].position,
                                correct: original[i].position};
        board.appendChild(createHexagon({
            id,
            position: mixed[i].position,
            color: original[i].color,
            isMovable: (i >= fixed.length)
        }));
    }

    setTimeout(setBoardCoordinates, 0);
    
    updateCheckMarks();

    let win = document.getElementById('win');
    win.classList.add('hidden');
    win.classList.remove('appear');
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
    a = a.slice();
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
    return a;
}

function createHexagon(info) {
    let board = document.getElementById('board');
    let wrapper = document.createElementNS(board.namespaceURI, 'g');
    wrapper.setAttribute('id', info.id);
    wrapper.classList.add('hexagon');
    wrapper.transform.baseVal.clear();
    wrapper.transform.baseVal.appendItem(board.createSVGTransform());
    wrapper.transform.baseVal.appendItem(board.createSVGTransform());
    wrapper.transform.baseVal.appendItem(board.createSVGTransform());
    wrapper.transform.baseVal.appendItem(board.createSVGTransform());
    wrapper.transform.baseVal[3].setTranslate(info.position[0], info.position[1]);
    let polygon = document.createElementNS(board.namespaceURI, 'polygon');
    polygon.setAttribute('points', [
        0   , -2.02 / 3,
       -1.01, -1.01 / 3,
       -1.01,  1.01 / 3,
        0   ,  2.02 / 3,
        1.01,  1.01 / 3,
        1.01, -1.01 / 3
   ]);
   polygon.setAttribute('fill', info.color);
    wrapper.appendChild(polygon);
    if (info.isMovable) {
        wrapper.setAttribute('droppable', true);
        wrapper.addEventListener('mousedown', DragAndDrop.start);
        wrapper.addEventListener('touchstart', DragAndDrop.start);
    } else {
        const s3 = Math.sqrt(3);
        let fix_mark = document.createElementNS(board.namespaceURI, 'ellipse');
        fix_mark.classList.add('fix_mark');
        fix_mark.setAttribute('cx', 0);
        fix_mark.setAttribute('cy', 0);
        fix_mark.setAttribute('rx', 0.1);
        fix_mark.setAttribute('ry', 0.1 / s3);
        wrapper.appendChild(fix_mark);
    }

    return wrapper;
}

function setHexagonPosition(elt, position) {
    let [x, y] = position;
}

function allCorrect() {
    for (let i in hexagonLocations) {
        if (hexagonLocations[i].current !== hexagonLocations[i].correct)
            return false;
    }
    return true;
}