import { DOM, gameState } from './dom.js';
import { unitStats, soundEffects } from './config.js';
import { showMessage, showDamagePopup, endGame, showAttackResult, updateGlobalHealth } from './ui.js';
import { attachDragEvents, showUnitStatsPopup } from './units.js';
import { startPlacementPhase, endPlacementPhase } from './game.js';
import { endPlayerTurn, burnEntireRow, applyPiercingShot, applyWarriorSpecialPower } from './combat.js';

export function handleDragStart(e) {
    gameState.draggedUnit = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.id);

    if (gameState.gamePhase === 'placement') {
        const unitPlayer = parseInt(e.target.dataset.player);
        if (unitPlayer !== gameState.currentPlayer + 1) {
            e.preventDefault();
            return;
        }
    }

    setTimeout(() => e.target.style.display = 'none', 0);
}

export function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    e.target.style.display = 'block';
}

export function handleDragOver(e) {
    e.preventDefault();
}

export function handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');

    if (!gameState.draggedUnit) return;

    const unitId = e.dataTransfer.getData('text/plain');
    const unitPlayer = parseInt(gameState.draggedUnit.dataset.player);

    if (unitPlayer - 1 !== gameState.currentPlayer) {
        showMessage('Action interdite', 'Ce n\'est pas votre tour de jouer!', 'error');
        playSound(soundEffects.specialDenied);
        gameState.draggedUnit.style.display = 'block';
        gameState.draggedUnit.classList.remove('dragging');
        return;
    }

    if (gameState.gamePhase === 'placement') {
        const validZone = gameState.currentPlayer === 0 ? 'zone-joueur1' : 'zone-joueur2';
        if (!e.target.classList.contains(validZone)) {
            showMessage('Zone invalide', 'Vous devez placer vos unités dans votre zone de départ', 'error');
            playSound(soundEffects.specialDenied);
            gameState.draggedUnit.style.display = 'block';
            gameState.draggedUnit.classList.remove('dragging');
            return;
        }
    }

    if (e.target.querySelector('.unit') && !e.target.classList.contains('allow-stacking')) {
        showMessage('Case occupée', 'Vous ne pouvez pas placer une unité sur une case déjà occupée', 'error');
        playSound(soundEffects.specialDenied);
        gameState.draggedUnit.style.display = 'block';
        gameState.draggedUnit.classList.remove('dragging');
        return;
    }

    const fromWarehouse = gameState.draggedUnit.parentElement.classList.contains('units');

    if (fromWarehouse && gameState.gamePhase === 'placement') {
        const unitCopy = gameState.draggedUnit.cloneNode(true);
        unitCopy.style.display = 'block';
        unitCopy.style.position = 'relative';
        unitCopy.style.opacity = '0';
        unitCopy.style.transform = 'scale(0.5)';
        unitCopy.classList.add('unit-placed');

        e.target.appendChild(unitCopy);
        e.target.classList.add('occupied');

        setTimeout(() => {
            unitCopy.style.transition = 'all 0.3s ease';
            unitCopy.style.opacity = '1';
            unitCopy.style.transform = 'scale(1)';
        }, 10);

        gameState.players[gameState.currentPlayer].placedUnits++;
        attachDragEvents();

        if (gameState.players[gameState.currentPlayer].placedUnits === gameState.players[gameState.currentPlayer].units.length) {
            if (gameState.currentPlayer === 0) {
                gameState.currentPlayer = 1;
                startPlacementPhase();
            } else {
                endPlacementPhase();
            }
        }
    }
    else if (!fromWarehouse && gameState.gamePhase === 'battle') {
        if (gameState.hasMovedThisTurn) {
            showMessage('Déplacement impossible', 'Vous avez déjà déplacé une unité ce tour!', 'error');
            playSound(soundEffects.specialDenied);
            gameState.draggedUnit.style.display = 'block';
            gameState.draggedUnit.classList.remove('dragging');
            return;
        }

        const fromCell = gameState.draggedUnit.parentElement;
        const fromIndex = parseInt(fromCell.dataset.index);
        const toIndex = parseInt(e.target.dataset.index);

        const fromRow = Math.floor(fromIndex / 10);
        const fromCol = fromIndex % 10;
        const toRow = Math.floor(toIndex / 10);
        const toCol = toIndex % 10;

        const distance = Math.max(Math.abs(toRow - fromRow), Math.abs(toCol - fromCol));

        if (distance > 1) {
            showMessage('Déplacement invalide', 'Vous ne pouvez vous déplacer que d\'une case à la fois', 'error');
            playSound(soundEffects.specialDenied);
            gameState.draggedUnit.style.display = 'block';
            gameState.draggedUnit.classList.remove('dragging');
            return;
        }

        e.target.appendChild(gameState.draggedUnit);
        e.target.classList.add('occupied');
        fromCell.classList.remove('occupied');
        updateCellGroupStatus(e.target);
        updateCellGroupStatus(fromCell);

        gameState.hasMovedThisTurn = true;
        gameState.movedUnitId = gameState.draggedUnit.dataset.id;

        document.querySelectorAll('.unit').forEach(unit => {
            if (parseInt(unit.dataset.player) === gameState.currentPlayer + 1) {
                unit.draggable = false;
                unit.style.cursor = 'not-allowed';
            }
        });

        gameState.draggedUnit.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            gameState.draggedUnit.style.transform = 'translate(0, 0)';
        }, 10);

        gameState.movesCount++;
        showActionOptions(gameState.draggedUnit);
    }

    if (fromWarehouse) gameState.draggedUnit.remove();
}

function updateCellGroupStatus(cell) {
    const unitsInCell = cell.querySelectorAll('.unit').length;

    if (unitsInCell > 1) {
        cell.classList.add('multiple-units');

        // Supprimer l'ancien badge s'il existe
        const oldBadge = cell.querySelector('.unit-count-badge');
        if (oldBadge) oldBadge.remove();

        // Ajouter un badge avec le nombre d'unités
        const badge = document.createElement('div');
        badge.className = 'unit-count-badge';
        badge.textContent = unitsInCell;
        cell.appendChild(badge);

        // Positionner les unités
        Array.from(cell.querySelectorAll('.unit')).forEach((unit, index) => {
            unit.classList.add('grouped');
            unit.style.zIndex = index + 1;
        });
    } else {
        cell.classList.remove('multiple-units');
        const badge = cell.querySelector('.unit-count-badge');
        if (badge) badge.remove();
        cell.querySelector('.unit')?.classList.remove('grouped');
    }
}

export function handleDragEnter(e) {
    if (gameState.gamePhase === 'placement') {
        const playerZone = gameState.currentPlayer === 0 ? 'zone-joueur1' : 'zone-joueur2';
        if (e.target.classList.contains(playerZone)) {
            e.target.classList.add('drag-over');
        }
    }
}

export function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function playSound(soundPath) {
    const audio = new Audio(soundPath);
    audio.play();
}

export function handleAttack(attackerCell, targetCell) {
    return new Promise((resolve) => {
        if (!isValidCell(attackerCell) || !isValidCell(targetCell)) {
            console.error("Unités non trouvées");
            resolve(false);
            return;
        }

        const attackerUnit = attackerCell.querySelector('.unit');
        if (!attackerUnit || parseInt(attackerUnit.dataset.player) !== gameState.currentPlayer + 1) {
            console.error("Tentative d'attaque par un joueur qui n'est pas son tour");
            resolve(false);
            return;
        }

        if (gameState.actionInProgress) {
            console.warn("Une action est déjà en cours, attaque ignorée");
            resolve(false);
            return;
        }

        gameState.actionInProgress = true;
        gameState.damageApplied = false;

        const attackers = Array.from(attackerCell.querySelectorAll('.unit'))
            .filter(u => parseInt(u.dataset.player) === gameState.currentPlayer + 1);
        const defenders = Array.from(targetCell.querySelectorAll('.unit'))
            .filter(u => parseInt(u.dataset.player) !== gameState.currentPlayer + 1);

        const totalAttack = calculateTotalPower(attackers, 'attack');
        const totalDefense = calculateTotalPower(defenders, 'defense');
        const damage = Math.max(1, totalAttack - totalDefense);

        playCombatAnimation(attackers, defenders);

        setTimeout(() => {
            const damageResults = {
                attackPower: totalAttack,
                defensePower: totalDefense,
                damage,
                attackersCount: attackers.length,
                defendersCount: defenders.length
            };
            applyGroupedDamage(defenders, damage);

            showAttackResult(attackers, defenders, damageResults);
            gameState.hasPerformedAction = true;
            gameState.actionInProgress = false;
            resolve(true);
        }, 1500);
    });
}

function calculateTotalPower(units, stat) {
    return units.reduce((sum, unit) => sum + unitStats[unit.dataset.type][stat], 0);
}

function playCombatAnimation(attackers, defenders) {
    attackers.forEach(u => u.classList.add('attacking'));
    playSound('assets/audio/attack-sound.mp3');

    setTimeout(() => {
        attackers.forEach(u => u.classList.remove('attacking'));
        defenders.forEach(u => u.classList.add('taking-damage'));
    }, 1000);
}

export function applyGroupedDamage(defenders, totalDamage) {
    if (gameState.damageApplied) return;
    gameState.damageApplied = true;
    const damagePerUnit = Math.ceil(totalDamage / defenders.length);

    defenders.forEach(defender => {
        const unitId = defender.dataset.id;
        const playerIndex = parseInt(defender.dataset.player) - 1;
        const unit = gameState.players[playerIndex].units.find(u => u.id === unitId);
        if (!unit) return;

        unit.health = Math.max(0, unit.health - damagePerUnit);

        if (unit.health <= 0) {
            destroyUnit(defender, playerIndex, unitId);
        } else {
            showDamagePopup(defender, damagePerUnit);
        }
    });
    updateGlobalHealth();
}

export function destroyUnit(unitElement, playerIndex, unitId) {
    unitElement.classList.add('dying');
    playSound('assets/audio/death-sound.mp3');

    setTimeout(() => {
        unitElement.remove();
        gameState.players[playerIndex].units = gameState.players[playerIndex].units.filter(u => u.id !== unitId);

        if (gameState.players[playerIndex].units.length === 0) {
            endGame(playerIndex === 0 ? 1 : 0);
        }
    }, 1000);
}

function isValidCell(cell) {
    return cell && cell.querySelector('.unit');
}

export function showActionOptions(unit) {
    cleanupEventListeners();

    if (parseInt(unit.dataset.player) !== gameState.currentPlayer + 1) {
        console.error("Tentative d'afficher les actions pour une unité qui n'appartient pas au joueur actuel");
        return;
    }

    const actionsMenu = document.createElement('div');
    actionsMenu.className = 'actions-menu';
    let html = `
        <div class="action-title">Actions</div>
        <button class="action-option attack-btn">Attaquer</button>
        <button class="action-option defend-btn">Se défendre</button>
        <button class="action-option special-btn">Pouvoir spécial</button>
    `;
    if (!gameState.hasMovedThisTurn) {
        html += `<button class="action-option move-btn">Déplacer</button>`;
    }

    html += `<button class="action-option end-action-btn">Terminer</button>`;
    actionsMenu.innerHTML = html;

    const unitRect = unit.getBoundingClientRect();
    const gridRect = DOM.grid.getBoundingClientRect();

    actionsMenu.style.position = 'absolute';
    actionsMenu.style.left = `${unitRect.left - gridRect.left + unitRect.width}px`;
    actionsMenu.style.top = `${unitRect.top - gridRect.top + 150}px`;

    DOM.grid.appendChild(actionsMenu);

    actionsMenu.querySelector('.attack-btn').addEventListener('click', async () => {
        DOM.grid.removeChild(actionsMenu);
        const attackRoll = await rollDiceForAttack();
        if (attackRoll >= 4) {
            initAttackMode(unit);
            makeEnemyUnitsClickable(unit);
        } else {
            showMessage('Attaque échouée', `Le jet de dé (${attackRoll}) est trop faible!`, 'error');
            playSound(soundEffects.specialDenied);
            endPlayerAction();
        }
    });

    actionsMenu.querySelector('.defend-btn').addEventListener('click', async () => {
        DOM.grid.removeChild(actionsMenu);
        await rollDiceForAction('defend', unit);
        endPlayerAction();
    });

    actionsMenu.querySelector('.special-btn').addEventListener('click', () => {
        DOM.grid.removeChild(actionsMenu);
        activateSpecialPower(unit);
    });

    actionsMenu.querySelector('.move-btn')?.addEventListener('click', () => {
        DOM.grid.removeChild(actionsMenu);
        unit.draggable = true;
        unit.style.cursor = 'grab';
    });

    actionsMenu.querySelector('.end-action-btn').addEventListener('click', () => {
        DOM.grid.removeChild(actionsMenu);
        endPlayerAction();
    });
}

async function rollDiceForAttack() {
    return new Promise((resolve) => {
        const playerColor = gameState.currentPlayer === 0 ? '#0064ff' : '#ff3232';

        Swal.fire({
            title: 'Lancer le dé pour attaquer',
            html: `
                <div style="text-align:center; margin:1rem 0">
                    <div id="attack-dice" 
                         style="width:80px; height:80px; margin:0 auto; 
                                background:${playerColor}; color:white; 
                                border-radius:10px; display:flex; 
                                align-items:center; justify-content:center;
                                font-size:2rem; font-weight:bold; cursor:pointer;">
                        ?
                    </div>
                    <p style="margin-top:1rem">4-6 pour réussir l'attaque</p>
                </div>
            `,
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
                const diceElement = document.getElementById('attack-dice');
                diceElement.addEventListener('click', () => {
                    const diceRoll = Math.floor(Math.random() * 6) + 1;
                    diceElement.textContent = diceRoll;
                    diceElement.style.animation = 'none';
                    void diceElement.offsetWidth;
                    diceElement.style.animation = 'diceRoll 0.5s';
                    playSound('assets/audio/dice.mp3');

                    setTimeout(() => {
                        Swal.close();
                        resolve(diceRoll);
                    }, 1000);
                });
            }
        });
    });
}

function rollDiceForAction(actionType, unit) {
    const playerColor = gameState.currentPlayer === 0 ? '#0064ff' : '#ff3232';

    return new Promise((resolve) => {
        Swal.fire({
            title: `Lancer le dé pour ${getActionName(actionType)}`,
            html: `
                <div style="text-align:center; margin:1rem 0">
                    <div id="action-dice" 
                         style="width:80px; height:80px; margin:0 auto; 
                                background:${playerColor}; color:white; 
                                border-radius:10px; display:flex; 
                                align-items:center; justify-content:center;
                                font-size:2rem; font-weight:bold; cursor:pointer;">
                        ?
                    </div>
                    <p style="margin-top:1rem">Cliquez sur le dé pour lancer</p>
                </div>
            `,
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
                const diceElement = document.getElementById('action-dice');
                diceElement.addEventListener('click', () => {
                    const diceRoll = Math.floor(Math.random() * 6) + 1;
                    diceElement.textContent = diceRoll;

                    diceElement.style.animation = 'none';
                    void diceElement.offsetWidth;
                    diceElement.style.animation = 'diceRoll 0.5s';
                    playSound('assets/audio/dice.mp3');

                    setTimeout(() => {
                        Swal.close();

                        if (actionType === 'defend') {
                            const playerIndex = parseInt(unit.dataset.player) - 1;
                            const unitId = unit.dataset.id;
                            const unitObj = gameState.players[playerIndex].units.find(u => u.id === unitId);

                            if (unitObj) {
                                const maxHealth = unitStats[unit.dataset.type].health;
                                const oldHealth = unitObj.health;

                                unitObj.health = Math.min(maxHealth, oldHealth + diceRoll);
                                updateGlobalHealth();
                                showDamagePopup(unit, -diceRoll);
                            }

                            unit.tempDefenseBonus = diceRoll;
                            unit.classList.add('defending');
                            showMessage(
                                'Défense réussie',
                                `Votre unité a récupéré ${diceRoll} PV `,
                                'success'
                            ).then(() => resolve(diceRoll));
                        } else if (actionType === 'special') {
                            activateSpecialPower(unit, diceRoll);
                            resolve(diceRoll);
                        }
                    }, 1000);
                });
            }
        });
    });
}
// Activer le mode attaque
function initAttackMode(unit = null) {
    gameState.attackMode = true;

    if (unit) {
        gameState.selectedAttacker = unit.parentElement;
        const attackerType = unit.dataset.type;
        const playerIndex = parseInt(unit.dataset.player) - 1;
        const unitObj = gameState.players[playerIndex].units.find(u => u.id === unit.dataset.id);
        const range = unitStats[attackerType].range + (unitObj?.tempRangeBonus || 0);
        highlightTargets(gameState.selectedAttacker, range);
    }
}
// Rendre les unités ennemies cliquables
function makeEnemyUnitsClickable(attackingUnit) {
    // Nettoyer les sélections précédentes
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('targetable', 'enemy-selectable');
        cell.style.cursor = 'default';
        cell.removeEventListener('click', handleEnemySelection);
    });

    document.querySelectorAll('.unit').forEach(unit => {
        unit.classList.remove('enemy-selectable');
        unit.style.cursor = 'default';
        unit.removeEventListener('click', handleEnemySelection);
    });

    // Calculer la portée de l'unité attaquante
    const attackerType = attackingUnit.dataset.type;
    const attackerPlayer = parseInt(attackingUnit.dataset.player);
    const unitObj = gameState.players[attackerPlayer - 1].units.find(u => u.id === attackingUnit.dataset.id);
    const range = unitStats[attackerType].range + (unitObj?.tempRangeBonus || 0);

    // Obtenir la position de l'unité attaquante
    const attackerCell = attackingUnit.parentElement;
    const attackerIndex = parseInt(attackerCell.dataset.index);
    const attackerRow = Math.floor(attackerIndex / 10);
    const attackerCol = attackerIndex % 10;

    // Rendre les unités ennemies à portée cliquables
    document.querySelectorAll('.unit').forEach(unit => {
        const unitPlayer = parseInt(unit.dataset.player);

        if (unitPlayer !== attackerPlayer) {
            // Vérifier si l'unité est à portée
            const unitCell = unit.parentElement;
            const unitIndex = parseInt(unitCell.dataset.index);
            const unitRow = Math.floor(unitIndex / 10);
            const unitCol = unitIndex % 10;

            const distance = Math.max(Math.abs(unitRow - attackerRow), Math.abs(unitCol - attackerCol));

            if (distance <= range) {
                unit.classList.add('enemy-selectable');
                unit.style.cursor = 'pointer';
                unit.addEventListener('click', () => handleEnemySelection(attackingUnit, unit));
            }
        }
    });

    if (document.querySelectorAll('.enemy-selectable').length === 0) {
        showMessage('Aucune cible', 'Aucune unité ennemie à portée d\'attaque', 'warning');
        endPlayerAction();
    } else {
        showMessage('Sélectionnez une cible', 'Cliquez sur une unité ennemie à portée pour attaquer', 'info');
    }
}
// Gérer la sélection d'un ennemi
function handleEnemySelection(attackingUnit, targetUnit) {
    // Nettoyer les sélections immédiatement
    document.querySelectorAll('.unit').forEach(unit => {
        unit.classList.remove('enemy-selectable');
        unit.style.cursor = 'default';
        unit.removeEventListener('click', handleEnemySelection);
    });

    executeAttack(attackingUnit.parentElement, targetUnit.parentElement)
        .catch(error => console.error("Erreur lors de l'attaque handleenemyselction:", error));
}
// Exécuter une attaque
function executeAttack(attackerCell, targetCell) {
    return new Promise((resolve) => {
        if (!isValidCell(attackerCell) || !isValidCell(targetCell)) {
            console.error("Cellule invalide dans executeAttack");
            resolve();
            return;
        }

        handleAttack(attackerCell, targetCell)
            .then(success => {
                cleanupEventListeners();
                if (success) {
                    endPlayerAction();
                }
                resolve(success);
            })
            .catch(err => {
                console.error("Erreur lors de l'attaque:", err);
                resolve(false);
            });



    });

}
export function cleanupEventListeners() {
    // Supprimer le menu d'actions s'il existe
    const existingMenu = document.querySelector('.actions-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    // Nettoyer les cellules
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('targetable', 'enemy-selectable');
        cell.style.cursor = 'default';
        cell.onclick = null;
    });

    // Nettoyer les unités
    document.querySelectorAll('.unit').forEach(unit => {
        unit.classList.remove('enemy-selectable');
        unit.style.cursor = 'default';
        unit.onclick = null;
    });
    // Réinitialiser l'état d'attaque
    gameState.attackMode = false;
    gameState.selectedAttacker = null;
    gameState.actionInProgress = false;
}
// Terminer l'action du joueur
export function endPlayerAction() {
    cleanupEventListeners();
    gameState.damageApplied = false;
    gameState.hasPerformedAction = true;

    console.log("Fin de l'action pour le joueur", gameState.currentPlayer + 1);
    setTimeout(() => {
        document.querySelectorAll('.unit').forEach(unit => {
            if (parseInt(unit.dataset.player) === gameState.currentPlayer + 1) {
                unit.style.pointerEvents = 'auto';
            }
        });
    }, 500);

    // Passer au tour suivant
    setTimeout(() => {
        endPlayerTurn();
    }, 100);
}
// Activer le pouvoir spécial
function activateSpecialPower(unit) {
    const unitType = unit.dataset.type;
    const unitId = unit.dataset.id;
    const playerIndex = parseInt(unit.dataset.player) - 1;
    const unitObj = gameState.players[playerIndex].units.find(u => u.id === unitId);

    if (!unitObj) return;
    console.log(`[POUVOIR SPECIAL] Activation pour ${unitType} (J${playerIndex + 1})`);
    switch (unitType) {

        case 'Guerrier':
            if (unitObj.specialUses > 0) {
                cleanupEventListeners();
                showMessage(
                    'POUVOIR SPÉCIAL : COUP FATAL',
                    "Cliquez sur une unité ennemie adjacente pour diviser sa santé par 2.",
                    "warning"
                );

                const myCell = unit.parentElement;
                const myIndex = parseInt(myCell.dataset.index);
                const myRow = Math.floor(myIndex / 10);
                const myCol = myIndex % 10;
                let found = false;

                document.querySelectorAll('.unit').forEach(enemyUnit => {
                    if (parseInt(enemyUnit.dataset.player) !== gameState.currentPlayer + 1) {
                        const enemyCell = enemyUnit.parentElement;
                        const enemyIndex = parseInt(enemyCell.dataset.index);
                        const enemyRow = Math.floor(enemyIndex / 10);
                        const enemyCol = enemyIndex % 10;
                        const dist = Math.max(Math.abs(myRow - enemyRow), Math.abs(myCol - enemyCol));
                        if (dist === 1) {
                            found = true;
                            enemyUnit.classList.add('enemy-selectable');
                            enemyUnit.style.cursor = 'pointer';

                            enemyUnit.addEventListener('click', function onClick() {
                                playSound(soundEffects.warriorBerserk);
                                unitObj.specialUses--;
                                updateSpecialUsesDisplay(unit);
                                cleanupEventListeners();
                                applyWarriorSpecialPower(unit, enemyUnit, () => {
                                    endPlayerAction();
                                });

                            }, { once: true });
                        }
                    }
                });

                if (!found) {
                    playSound(soundEffects.specialDenied);
                    showMessage("Aucun ennemi adjacent", "Il n'y a aucune unité ennemie à côté.", "error");
                    endPlayerAction();
                }
            } else {
                playSound(soundEffects.specialDenied);
                showMessage('Épuisé', 'Pouvoir utilisé 1/1 fois', 'error');
            }
            break;
        case 'Archer':
            if (unitObj.specialUses > 0) {
                if (gameState.specialInUse) {
                    playSound(soundEffects.specialDenied);
                    showMessage('Pouvoir en cours', 'Un pouvoir spécial est déjà actif.', 'error');
                    return;
                }

                playSound(soundEffects.archerSpecial);
                gameState.specialMode = 'piercingShot';
                gameState.specialInUse = true;
                unitObj.specialUses--;
                updateSpecialUsesDisplay(unit);

                showMessage(
                    'TIR PERÇANT ACTIVÉ',
                    'Cliquez sur une unité ennemie (portée illimitée)',
                    'info',
                    3000
                );

                unit.classList.add('archer-special-active');
                cleanupEventListeners(); // Nettoyage éventuel précédent

                // Cleanup à appeler à la fin
                const cleanUp = () => {
                    resetPiercingTargeting();
                    document.removeEventListener('click', onClickOutside);
                    gameState.specialInUse = false;
                    unit.classList.remove('archer-special-active');
                    endPlayerAction();
                };

                // Si clic à côté ou sur mauvaise cible
                const onClickOutside = (e) => {
                    if (!e.target.classList.contains('piercing-target')) {
                        cleanUp();
                    }
                };
                document.addEventListener('click', onClickOutside);

                // Marquer les unités ennemies comme ciblables
                const enemyUnits = document.querySelectorAll('.unit');
                enemyUnits.forEach(enemyUnit => {
                    const enemyPlayer = parseInt(enemyUnit.dataset.player);
                    if (enemyPlayer !== gameState.currentPlayer + 1) {
                        enemyUnit.classList.add('piercing-target');
                        enemyUnit.style.cursor = 'crosshair';

                        const onPiercingShot = (e) => {
                            e.stopPropagation();
                            applyPiercingShot(enemyUnit, 5, cleanUp); // Dégâts et fin de tour
                        };

                        // On évite de lier plusieurs fois
                        enemyUnit.addEventListener('click', onPiercingShot, { once: true });
                    }
                });

            } else {
                playSound(soundEffects.specialDenied);
                showMessage('POUVOIR ÉPUISÉ', 'Tir Perçant déjà utilisé', 'error');
                endPlayerAction();
            }
            break;


        case 'Mage':
            if (unitObj.specialUses > 0) {

                // Mode sélection de ligne
                cleanupEventListeners();
                gameState.specialMode = 'lineBurn';
                console.log(`[BRÛLURE] Prêt à incendier une ligne (${unitObj.specialUses} utilisations restantes)`);
                // Nettoyer d'abord toute ancienne sélection
                document.querySelectorAll('.line-selectable').forEach(cell => {
                    cell.classList.remove('line-selectable');
                    const cleanCell = cell.cloneNode(true); // Cloner pour supprimer les anciens événements
                    cell.parentNode.replaceChild(cleanCell, cell);
                });

                // Highlight les lignes sélectionnables
                for (let row = 0; row < 10; row++) {
                    for (let col = 0; col < 10; col++) {
                        const index = row * 10 + col;
                        const cell = DOM.grid.children[index];
                        if (col === 0) { // Juste la première cellule de chaque ligne
                            cell.classList.add('line-selectable');
                            cell.addEventListener('click', () => {
                                if (gameState.actionInProgress) return;
                                gameState.actionInProgress = true;
                                burnEntireRow(row);
                                playSound(soundEffects.mageBurn);
                            });
                        }
                    }
                }

                updateSpecialUsesDisplay(unit);
                showMessage('BRÛLURE DE LIGNE', 'Cliquez sur une ligne à incendier', 'warning', 3000);
            } else {
                playSound(soundEffects.specialDenied);
                showMessage('Épuisé', 'Sorts utilisés 2/2 fois', 'error');
            }
            break;
    }
}
function resetPiercingTargeting() {
    document.querySelectorAll('.unit').forEach(unit => {
        unit.classList.remove('piercing-target');
        unit.style.cursor = '';
    });
}




// Obtenir le nom d'une action
function getActionName(actionType) {
    const names = {
        'attack': 'attaque',
        'defend': 'défense',
        'special': 'pouvoir spécial'
    };
    return names[actionType] || 'action';
}
// Mettre en évidence les cibles potentielles
function highlightTargets(attackerCell, range) {
    if (!attackerCell) {
        console.error("AttackerCell est null dans highlightTargets");
        return;
    }
    // Nettoyer les anciennes cibles
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('targetable');
        cell.removeEventListener('click', () => executeAttack(attackerCell, cell));
    });

    const attackerIndex = parseInt(attackerCell.dataset.index);
    const attackerRow = Math.floor(attackerIndex / 10);
    const attackerCol = attackerIndex % 10;

    for (let i = 0; i < 100; i++) {
        const cell = DOM.grid.children[i];
        const row = Math.floor(i / 10);
        const col = i % 10;

        const distance = Math.max(Math.abs(row - attackerRow), Math.abs(col - attackerCol));

        if (distance <= range && i !== attackerIndex) {
            const unit = cell.querySelector('.unit');
            if (unit && parseInt(unit.dataset.player) !== gameState.currentPlayer + 1) {
                cell.classList.add('targetable');
                cell.addEventListener('click', () => executeAttack(attackerCell, cell));
            }
        }
    }

    showMessage('Ciblez un ennemi', `Sélectionnez une cible à portée (${range} cases)`, 'info');
}
export function updateSpecialUsesDisplay(unit) {
    const unitId = unit.dataset.id;
    const playerIndex = parseInt(unit.dataset.player) - 1;
    const unitObj = gameState.players[playerIndex].units.find(u => u.id === unitId);

    // Supprimer l'ancien affichage s'il existe
    const oldDisplay = unit.querySelector('.special-uses-display');
    if (oldDisplay) unit.removeChild(oldDisplay);

    if (unitObj.specialUses > 0) {
        const display = document.createElement('div');
        display.className = 'special-uses-display';
        display.textContent = `Pouvoir: ${unitObj.specialUses}/${unitStats[unit.dataset.type].specialUses}`;
        display.style.position = 'absolute';
        display.style.bottom = '0';
        display.style.right = '0';
        display.style.fontSize = '0.6em';
        display.style.color = '#ffcc00';
        unit.appendChild(display);
    }
}