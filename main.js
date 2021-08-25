"use strict";

Math.TAU = Math.PI * 2;

if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/hue-more/sw.js', {scope: '/hue-more/'});
}

const Levels = {
    Easy: {
        name: 'Easy',
        board_size: 3,
        fixed_types: ['corner', 'side'],
        valid_color_diff: function(diff) {return diff >= 0.1;}
    },
    Medium: {
        name: 'Medium',
        board_size: 4,
        fixed_types: ['corner', 'side'],
        valid_color_diff: function(diff) {return diff >= 0.1;}
    },
    Hard: {
        name: 'Hard',
        board_size: 4,
        fixed_types: ['corner'],
        valid_color_diff: function(diff) {return diff >= 0.08;}
    },
    Extreme: {
        name: 'Extreme',
        board_size: 4,
        fixed_types: ['corner'],
        valid_color_diff: function(diff) {return 0.001 <= diff && diff < 0.015;}
    },
    Golden: {
        name: 'Golden',
        board_size: 5,
        fixed_types: ['corner'],
        valid_color_diff: function(diff) {return 0.001 <= diff && diff < 0.010;}
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
    },
    getTheme: function() {
        return localStorage.getItem('theme') || 'light';
    },
    setTheme: function(theme) {
        localStorage.setItem('theme', theme);
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
            elt.transform.baseVal.getItem(0).setTranslate(0, 0);
            let [x, y] = hexagonLocations[elt.id].current;
            elt.transform.baseVal.getItem(3).setTranslate(x, y);
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
        DragAndDrop.draggedElement.transform.baseVal.getItem(0).setTranslate(dx, dy);
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
        let win = allCorrect();
        DragAndDrop.reset();
        if (win) {
            document.getElementById('shimmer').classList.add('animate');
            document.getElementById('newGame').style.visibility = 'visible';
        } else {
            document.getElementById('shimmer').classList.remove('animate');
        }
        event.preventDefault();
    }
}

let HelpAnimation = {
    isActive: false,

    start: function() {
        if (HelpAnimation.isActive)
            return;

        HelpAnimation.isActive = true;
        document.getElementById('helpModal').style.display = 'block';
        document.getElementById('menuToggle').checked = false;

        document.getElementById('thumb').animate([
            HelpAnimation.locationOf(document.getElementById('helpButton'))
        ], {
            fill: 'forwards'
        });

        if (allCorrect()) {
            HelpAnimation.moveToMenu();
        } else {
            HelpAnimation.solveGame();
        }
    },

    locationOf: function(elt) {
        let bb = document.body.getBoundingClientRect();
        let eb = elt.getBoundingClientRect();
        return {
            left: `${eb.left - bb.left + eb.width / 2}px`,
            top: `${eb.top - bb.top + eb.height / 2}px`
        };
    },

    boardLocationAt: function([x, y]) {
        let bb = document.body.getBoundingClientRect();
        let eb = document.getElementById('board').getBoundingClientRect();
        const s3 = Math.sqrt(3);
        let level = Settings.getLevel();
        let board = document.getElementById('board');
        let width = board.width.baseVal.value, height = board.height.baseVal.value;
        let hexagon_size = Math.min(width / (level.board_size * 4 - 2 + 0.2),
                                    height / (level.board_size * 2 * s3 - 2 / s3 + 0.2));
        return {
            left: `${eb.left - bb.left + width / 2 + x * hexagon_size}px`,
            top: `${eb.top - bb.top + height / 2 + y * hexagon_size * s3}px`
        };
    },

    moveToMenu: function() {
        setTimeout(function () {
            if (!HelpAnimation.isActive)
                return;

            if (allCorrect()) {
                document.getElementById('thumb').animate([
                    HelpAnimation.locationOf(document.getElementById('menuButton'))
                ], {
                    duration: 1200,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                }).onfinish = HelpAnimation.openMenu;
            } else {}
        }, 50);
    },

    openMenu: function() {
        if (!HelpAnimation.isActive)
            return;

        document.getElementById('menuToggle').checked = true;
        document.getElementById('thumb').animate([
            HelpAnimation.locationOf(document.getElementsByClassName('setLevel')[0])
        ], {
            duration: 800,
            easing: 'ease-in-out',
            fill: 'forwards'
        }).onfinish = HelpAnimation.startEasyGame;
    },

    startEasyGame: function() {
        if (!HelpAnimation.isActive)
            return;

        Settings.setLevel('Easy');
        document.getElementById('menuToggle').checked = false;
        startGame();
        HelpAnimation.solveGame();
    },

    solveGame: function() {
        setTimeout(function() {
            if (!HelpAnimation.isActive)
                return;

            let anyChange = false;

            for (let i in hexagonLocations) {
                if (anyChange) {
                    break;
                }
                if (hexagonLocations[i].current !== hexagonLocations[i].correct) {
                    anyChange = true;
                    HelpAnimation.fixPiece(i);
                }
            }

            if (!anyChange) {
                HelpAnimation.moveToRestart();
            }
        }, 200);
    },

    fixPiece: function(i) {
        document.getElementById('thumb').animate([
            HelpAnimation.boardLocationAt(hexagonLocations[i].current)
        ], {
            duration: 1000,
            easing: 'ease-in-out',
            fill: 'forwards'
        }).onfinish = function() {
            if (!HelpAnimation.isActive)
                return;

            let elt = document.getElementById(i);
            document.getElementById('board').removeChild(elt);
            document.getElementById('board').appendChild(elt);
            elt.querySelector('.innerWrapper').animate([
                {
                    transform: `translate(${hexagonLocations[i].correct[0] - hexagonLocations[i].current[0]}px, ${hexagonLocations[i].correct[1] - hexagonLocations[i].current[1]}px)`
                }
            ], {
                duration: 800,
                easing: 'ease-in-out'
            });

            document.getElementById('thumb').classList.add('pressed');
            document.getElementById('thumb').animate([
                HelpAnimation.boardLocationAt(hexagonLocations[i].correct)
            ], {
                duration: 800,
                easing: 'ease-in-out',
                fill: 'forwards'
            }).onfinish = function() {
                if (!HelpAnimation.isActive)
                    return;

                document.getElementById('thumb').classList.remove('pressed');
                for (let j in hexagonLocations) {
                    if (hexagonLocations[j].current === hexagonLocations[i].correct) {
                        hexagonLocations[j].current = hexagonLocations[i].current;
                        hexagonLocations[i].current = hexagonLocations[i].correct;
                        document.getElementById(i).transform.baseVal.getItem(3).setTranslate(hexagonLocations[i].current[0], hexagonLocations[i].current[1]);
                        document.getElementById(j).transform.baseVal.getItem(3).setTranslate(hexagonLocations[j].current[0], hexagonLocations[j].current[1]);
                    }
                }
                HelpAnimation.solveGame();
            };
        };
    },

    moveToRestart: function() {
        document.getElementById('newGame').style.visibility = 'visible';
        document.getElementById('shimmer').classList.add('animate');
        setTimeout(function () {
            if (!HelpAnimation.isActive)
                return;

            if (allCorrect()) {
                document.getElementById('thumb').animate([
                    HelpAnimation.locationOf(document.getElementById('newGame'))
                ], {
                    duration: 2500,
                    endDelay: 1500,
                    easing: 'ease-in-out',
                    fill: 'forwards'
                }).onfinish = HelpAnimation.end;
            } else {}
        }, 1500);
    },

    end: function() {
        if (!HelpAnimation.isActive)
            return;

        HelpAnimation.isActive = false;
        document.getElementById('helpModal').style.display = 'none';
        document.getElementById('thumb').classList.remove('pressed');
    }
}


let hexagonLocations = {};


function init() {
    document.querySelectorAll('.setLevel').forEach(function(elt) {
        elt.addEventListener('click', function() {
            Settings.setLevel(this.innerText);
            startGame();
        });
    });

    document.getElementById('menuToggle').checked = false;

    document.querySelector('input[name="mark_fixed"]').addEventListener('change', function() {
        Settings.setMarkFixed(this.checked);
        document.getElementById('board').setAttribute('mark_fixed_pieces', this.checked);
    });

    document.querySelector('input[name="light_mode"]').addEventListener('change', function() {
        let theme = this.checked ? 'light' : 'dark';
        Settings.setTheme(theme);
        document.documentElement.setAttribute('theme', theme);
    });

    window.addEventListener('resize', setBoardCoordinates);
    document.getElementById('newGame').addEventListener('click', function () {
        document.getElementById('helpButton').style.visibility = 'hidden';
        startGame();
    });

    document.getElementById('board').addEventListener('mousedown', function() {
        document.getElementById('menuToggle').checked = false;    
    });
    document.getElementById('board').addEventListener('touchstart', function() {
        document.getElementById('menuToggle').checked = false;    
    });

    document.getElementById('board').setAttribute('mark_fixed_pieces', Settings.getMarkFixed());
    document.documentElement.setAttribute('theme', Settings.getTheme());

    document.getElementById('helpButton').addEventListener('click', HelpAnimation.start);
    document.getElementById('helpMenu').addEventListener('click', HelpAnimation.start);
    document.getElementById('helpModal').addEventListener('click', HelpAnimation.end);

    window.addEventListener("beforeinstallprompt", function(installEvent) {
        installEvent.preventDefault();
        document.getElementById('installButton').style.display = 'block';
        document.getElementById('installButton').addEventListener('click', function() {
            installEvent.prompt();
        });
    });

    startGame();
}

function setBoardCoordinates() {
    let board = document.getElementById('board');
    let width = board.width.baseVal.value, height = board.height.baseVal.value;
    let level = Settings.getLevel();
    const s3 = Math.sqrt(3);
    let hexagon_size = Math.min(width / (level.board_size * 4 - 2 + 0.2),
                                height / (level.board_size * 2 * s3 - 2 / s3 + 0.2));
    document.querySelectorAll('.hexagon').forEach(function(hexagon) {
        hexagon.transform.baseVal.getItem(1).setTranslate(width / 2, height / 2);
        hexagon.transform.baseVal.getItem(2).setScale(hexagon_size, hexagon_size * s3);
    });
}

function startGame() {
    const s3 = Math.sqrt(3);
    let level = Settings.getLevel();

    document.querySelectorAll('.setLevel').forEach(function(elt) {
        if (elt.innerText === level.name)
            elt.classList.add('selectedMenuItem');
        else
            elt.classList.remove('selectedMenuItem');
    });
    document.querySelector('input[name="mark_fixed"]').checked = Settings.getMarkFixed();
    document.querySelector('input[name="light_mode"]').checked = Settings.getTheme() === 'light';
    document.getElementById('newGame').style.visibility = 'hidden';
    document.getElementById('menuToggle').checked = false;

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
            let [r, g, b] = applyColorScheme(colorScheme, [x/n_layers/2, s3*y/n_layers/2]);
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
    DragAndDrop.reset();
    document.getElementById('shimmer').classList.remove('animate');
}

function randomColorScheme(colorCondition) {
    while (true) {
        let colorScheme = [randomDimension(), randomDimension(), randomDimension()];
        let diff = colorSchemeScore(colorScheme);
        if (colorCondition(diff)) {
            return colorScheme;
        }
    }
}

function colorSchemeScore(colorScheme) {
    let scaleR = colorScheme[0].scale * (1.0 - colorScheme[0].offset);
    let scaleG = colorScheme[1].scale * (1.0 - colorScheme[1].offset);
    let scaleB = colorScheme[2].scale * (1.0 - colorScheme[2].offset);
    let diffRG = scaleR * scaleG * (1 - Math.pow(Math.cos(colorScheme[0].angle - colorScheme[1].angle), 2));
    let diffRB = scaleR * scaleB * (1 - Math.pow(Math.cos(colorScheme[0].angle - colorScheme[2].angle), 2));
    let diffGB = scaleG * scaleB * (1 - Math.pow(Math.cos(colorScheme[1].angle - colorScheme[2].angle), 2));
    return diffRG + diffRB + diffGB;
}

function applyColorScheme(scheme, [x, y]) {
    return scheme.map(function(channel) {
        let dx = channel.scale * Math.cos(channel.angle),
            dy = channel.scale * Math.sin(channel.angle);
        return Math.floor(255 * Math.sqrt(channel.offset + dx * x + dy * y));
    });
}

function randomDimension() {
    let offset = Math.sqrt(Math.random());
    let scale = 0.999 * Math.sqrt(Math.random()) * Math.min(offset, 1 - offset);
        // 0.999 to prevent color overflow & underflow if precision issues arise
        // sqrt to try to provide higher variation for most color schemes
        // min(offset, 1-offset) is the max allowed variation
    let angle = Math.random() * Math.TAU;
    return {offset, scale, angle};
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
    let innerWrapper = document.createElementNS(board.namespaceURI, 'g');
    innerWrapper.classList.add('innerWrapper');
    wrapper.appendChild(innerWrapper);
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
    innerWrapper.appendChild(polygon);
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

function allCorrect() {
    for (let i in hexagonLocations) {
        if (hexagonLocations[i].current !== hexagonLocations[i].correct)
            return false;
    }
    return true;
}