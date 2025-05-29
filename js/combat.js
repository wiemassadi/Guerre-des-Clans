import { DOM, gameState } from './dom.js';

import { unitStats, soundEffects } from './config.js';
import { showMessage, updateTurnIndicator, showDamagePopup, updateGlobalHealth, showBurnSummary } from './ui.js';
import { showActionOptions, cleanupEventListeners, endPlayerAction, updateSpecialUsesDisplay, destroyUnit, } from './events.js';

// Démarrer la phase de bataille
export function startBattlePhase() {
    updateTurnIndicator();

    Swal.fire({
        title: 'Phase de Bataille',
        html: `
            <div style="text-align:left">
                <p><b>Étapes d'un tour :</b></p>
                <ol>
                    <li>Chaque joueur lance son dé pour l'initiative</li>
                    <li>Le joueur avec le score le plus élevé commence</li>
                    <li>Phase de mouvement: déplacer vos unités (1 case par tour)</li>
                    <li>Phase d'action: attaquer, se défendre ou utiliser un pouvoir spécial</li>
                    <li>Résolution des attaques avec lancer de dés</li>
                    <li>Terminer votre tour</li>
                </ol>
                <p>Les unités dans la même case se défendent ensemble !</p>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Commencer'
    }).then(() => {
        rollDiceForInitiative().then(() => {
            showBattleStartMessage();
            startPlayerTurn();
        });
    });

}

// Lancer le dé pour l'initiative
function rollDiceForInitiative() {
    return new Promise(async (resolve) => {
        // Joueur 1 lance son dé
        await showDiceRollPrompt(0);
        gameState.player1DiceScore = gameState.diceRoll;

        // Joueur 2 lance son dé
        await showDiceRollPrompt(1);
        gameState.player2DiceScore = gameState.diceRoll;

        // Déterminer qui commence
        if (gameState.player1DiceScore > gameState.player2DiceScore) {
            gameState.currentPlayer = 0;
            showMessage('Joueur 1 commence!', 'Le Joueur 1 peut maintenant déplacer ses unités', 'success');
        }
        else if (gameState.player2DiceScore > gameState.player1DiceScore) {
            gameState.currentPlayer = 1;
            showMessage('Joueur 2 commence!', 'Le Joueur 2 peut maintenant déplacer ses unités', 'success');
        }
        else {
            // En cas d'égalité, on relance
            showMessage('Égalité', 'Les deux joueurs ont fait le même score! Nouveau lancer...', 'info');
            return rollDiceForInitiative().then(resolve);
        }

        resolve();
    });
}
// Démarrer le tour d'un joueur
let hasShownTurnMessage = [false, false];

export function startPlayerTurn() {
    gameState.players.forEach((player, index) => {
        player.isActive = index === gameState.currentPlayer;
    });

    updateTurnIndicator();
    updateUnitsInteractivity();

    // Réinitialiser les compteurs
    gameState.movesCount = 0;
    gameState.hasPerformedAction = false;
    gameState.actionInProgress = false;
    gameState.damageApplied = false;
    // Afficher le message seulement si le joueur ne l'a pas encore vu
    if (!hasShownTurnMessage[gameState.currentPlayer]) {
        showMessage(`Tour du Joueur ${gameState.currentPlayer + 1}`,
            `Vous pouvez déplacer une unité (1 case max) OU effectuer une action`, 'info');
        hasShownTurnMessage[gameState.currentPlayer] = true;
    }

    // Activer le double-clic pour les actions
    document.querySelectorAll('.unit').forEach(unit => {
        if (parseInt(unit.dataset.player) === gameState.currentPlayer + 1) {
            unit.addEventListener('dblclick', handleDoubleClick);
            updateSpecialUsesDisplay(unit);
        }
    });
}
// Gérer le double-clic pour les actions
function handleDoubleClick(e) {
    e.preventDefault();
    const unit = e.target.closest('.unit');
    if (!unit || gameState.hasPerformedAction) return;
    // Vérifier que c'est bien le tour du joueur actuel
    if (parseInt(unit.dataset.player) !== gameState.currentPlayer + 1) {
        return;
    }
    // Vérifier que l'unité n'est pas en train d'attaquer
    if (unit.classList.contains('attacking')) {
        return;
    }
    showActionOptions(unit);
}
// Terminer le tour courant
export function endPlayerTurn() {
    cleanupEventListeners();

    // Réinitialiser les états des unités
    document.querySelectorAll('.unit').forEach(unit => {
        unit.draggable = false;
        unit.style.opacity = '0.6';
        unit.style.cursor = 'default';
        unit.classList.remove('defending', 'empowered-attack', 'empowered-range', 'casting-heal', 'grouped');
    });

    // Réinitialiser les flags d'action
    gameState.hasPerformedAction = false;
    gameState.hasMovedThisTurn = false;
    gameState.movedUnitId = null;
    gameState.actionInProgress = false;

    // Passer au joueur suivant
    gameState.currentPlayer = (gameState.currentPlayer + 1) % 2;

    setTimeout(() => {
        startPlayerTurn();
    }, 1000);
}
// Afficher le prompt de lancer de dé pour un joueur
async function showDiceRollPrompt(playerIndex) {
    return new Promise((resolve) => {
        const playerColor = playerIndex === 0 ? '#0064ff' : '#ff3232';

        Swal.fire({
            title: `Joueur ${playerIndex + 1} - Lancez le dé`,
            html: `
                <div style="text-align:center; margin:1rem 0">
                    <div id="player-dice" 
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
                const diceElement = document.getElementById('player-dice');
                diceElement.addEventListener('click', () => {
                    gameState.diceRoll = Math.floor(Math.random() * 6) + 1;
                    diceElement.textContent = gameState.diceRoll;

                    // Animation
                    diceElement.style.animation = 'none';
                    void diceElement.offsetWidth; // Trigger reflow
                    diceElement.style.animation = 'diceRoll 0.5s';

                    // Fermer après un délai
                    setTimeout(() => {
                        Swal.close();
                        resolve();
                    }, 1000);
                });
            }
        });
    });
}
function showBattleStartMessage() {
    const clanBonus = {
        Montagnes: "Bonus Défense +1",
        Plaines: "Bonus Précision +1",
        Sages: "Bonus Magique +1"
    };

    Swal.fire({
        title: `Le Joueur ${gameState.currentPlayer + 1} commence !`,
        html: `
            <div style="text-align:left;margin:1rem 0">
                <p>Clan: <b>${gameState.players[gameState.currentPlayer].clan}</b></p>
                <p>Avantage: <b>${clanBonus[gameState.players[gameState.currentPlayer].clan]}</b></p>
                <p>Barre de vie globale visible en haut</p>
            </div>
        `,
        icon: 'success'
    });
}
// Mettre à jour l'interactivité des unités
function updateUnitsInteractivity() {
    document.querySelectorAll('.unit').forEach(unit => {
        const unitPlayer = parseInt(unit.dataset.player);

        // Activer seulement les unités du joueur actuel
        if (unitPlayer === gameState.currentPlayer + 1) {
            unit.draggable = true;
            unit.style.opacity = '1';
            unit.style.cursor = 'grab';
            unit.classList.add('active-unit');
            unit.classList.remove('inactive-unit');
        } else {
            // Désactiver les unités adverses
            unit.draggable = false;
            unit.style.opacity = '0.6';
            unit.style.cursor = 'not-allowed';
            unit.classList.add('inactive-unit');
            unit.classList.remove('active-unit');
        }
    });
}
//pouvoir spécial pour  l'Archer 
export function applyPiercingShot(targetUnit, damage, onComplete) {
    const unitId = targetUnit.dataset.id;
    const playerIdx = parseInt(targetUnit.dataset.player) - 1;
    const unit = gameState.players[playerIdx].units.find(u => u.id === unitId);
    const oldHealth = unit.health;

    // Animation spéciale
    targetUnit.classList.add('piercing-hit-animation');
    setTimeout(() => targetUnit.classList.remove('piercing-hit-animation'), 800);

    // Appliquer les dégâts
    unit.health = Math.max(0, oldHealth - damage);

    // Effet visuel des dégâts
    showDamagePopup(targetUnit, damage, 'piercing');

    // Message interactif avec résultats
    const resultMessage = document.createElement('div');
    resultMessage.className = 'piercing-result-message';
    resultMessage.innerHTML = `
        <h3>Tir Perçant Réussi!</h3>
        <p>${unit.type} a subi ${damage} dégâts</p>
        <div class="health-bar">
            <div class="health-lost" style="width:${(damage / oldHealth) * 100}%"></div>
            <span>${oldHealth} → ${unit.health} PV</span>
        </div>
    `;
    document.body.appendChild(resultMessage);
    setTimeout(() => resultMessage.remove(), 3000);

    // Vérifier si l'unité est morte
    setTimeout(() => {
        if (unit.health <= 0) {
            destroyUnit(targetUnit, playerIdx, unitId);
        }
        updateGlobalHealth();
        if (onComplete) onComplete();
    }, 600);
}

// Pouvoir spécial pour Mage - Brûler une ligne entière
export function burnEntireRow(row) {
    const damage = 4;
    let affectedUnits = 0;
    const affectedDetails = [];

    console.log(`[BRÛLURE] Début sur ligne ${row}`);

    // Animation de la ligne en feu
    animateRowBurn(row);

    // Appliquer les dégâts après l'animation
    setTimeout(() => {
        for (let col = 0; col < 10; col++) {
            const index = row * 10 + col;
            const cell = DOM.grid.children[index];
            const unit = cell.querySelector('.unit');

            if (unit && parseInt(unit.dataset.player) !== gameState.currentPlayer + 1) {
                const unitId = unit.dataset.id;
                const playerIdx = parseInt(unit.dataset.player) - 1;
                const unitObj = gameState.players[playerIdx].units.find(u => u.id === unitId);

                if (unitObj) {
                    affectedUnits++;
                    const oldHealth = unitObj.health;
                    unitObj.health -= damage;

                    // Ajouter les détails pour l'affichage
                    affectedDetails.push({
                        type: unit.dataset.type,
                        player: playerIdx + 1,
                        oldHealth: oldHealth,
                        newHealth: unitObj.health
                    });

                    console.log(`[BRÛLURE] ${unit.dataset.type} (J${playerIdx + 1}): ${oldHealth} -> ${unitObj.health} PV`);

                    showDamagePopup(unit, damage);

                    if (unitObj.health <= 0) {
                        destroyUnit(unit, playerIdx, unitId);
                    }
                }
            }
        }

        updateGlobalHealth();

        // Afficher le résumé de l'action
        showBurnSummary(row, affectedUnits, affectedDetails);

        // Décrémenter les utilisations spéciales
        const mageUnits = document.querySelectorAll('.unit[data-type="Mage"]');
        mageUnits.forEach(mage => {
            if (parseInt(mage.dataset.player) === gameState.currentPlayer + 1) {
                const unitId = mage.dataset.id;
                const playerIndex = parseInt(mage.dataset.player) - 1;
                const unitObj = gameState.players[playerIndex].units.find(u => u.id === unitId);
                if (unitObj) {
                    unitObj.specialUses--;
                    updateSpecialUsesDisplay(mage);
                }
            }
        });

        cleanupEventListeners();
        // Nettoyer les styles et les écouteurs des lignes sélectionnables
        document.querySelectorAll('.line-selectable').forEach(cell => {
            cell.classList.remove('line-selectable');
            const newCell = cell.cloneNode(true); // Supprime tous les événements
            cell.parentNode.replaceChild(newCell, cell);
        });
        console.log("Vérification post-brûlure:");
        console.log("Unités J1:", gameState.players[0].units.map(u => `${u.type}:${u.health}`));
        console.log("Unités J2:", gameState.players[1].units.map(u => `${u.type}:${u.health}`));
        updateGlobalHealth();
        endPlayerAction();
    }, 1000);
}
// Animation de la ligne en feu
function animateRowBurn(row) {
    for (let col = 0; col < 10; col++) {
        const index = row * 10 + col;
        const cell = DOM.grid.children[index];

        const fireEffect = document.createElement('div');
        fireEffect.className = 'fire-effect';
        fireEffect.innerHTML = '🔥';
        cell.appendChild(fireEffect);

        setTimeout(() => {
            if (cell.contains(fireEffect)) {
                cell.removeChild(fireEffect);
            }
        }, 1000);
    }
}
//pouvoir spécial pour  geurrier 
export function applyWarriorSpecialPower(attacker, target) {

    const enemyPlayerIndex = parseInt(target.dataset.player) - 1;
    const enemyId = target.dataset.id;
    const enemyObj = gameState.players[enemyPlayerIndex].units.find(u => u.id === enemyId);

    if (enemyObj) {
        const oldHealth = enemyObj.health;
        const newHealth = Math.floor(oldHealth / 2);
        enemyObj.health = newHealth;

        showDamagePopup(target, oldHealth - newHealth);
        if (enemyObj.health <= 0) {
            destroyUnit(target, enemyPlayerIndex, enemyId);
        }



        // Affichage interactif du résultat
        setTimeout(() => {
            // Affichage interactif du résultat APRÈS l'animation de dégâts
            Swal.fire({
                icon: 'info',
                title: 'Coup fatal !',
                html: `
                    <div style="font-size:1.2em;">
                        <b>Unité :</b> ${target.dataset.type} <br>
                        <b>Joueur :</b> ${enemyPlayerIndex + 1} <br>
                        <b>Santé avant :</b> <span style="color:#f44336;font-size:1.3em;">${oldHealth}</span><br>
                        <b>Santé après :</b> <span style="color:#4caf50;font-size:1.3em;">${newHealth}</span>
                    </div>
                `,
                confirmButtonText: 'Continuer',
                customClass: {
                    popup: 'popup-warrior-special'
                }
            });
        }, 1600);
        updateGlobalHealth();
    }
}