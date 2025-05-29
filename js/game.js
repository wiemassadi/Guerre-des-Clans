import { DOM, gameState, resetGameState } from './dom.js';


import { clans } from './config.js';
import { generateGrid, generateWarehouses } from './units.js';
import { startBattlePhase, endPlayerTurn } from './combat.js';
import { showMessage, updateTurnIndicator } from './ui.js';


// Initialisation du jeu
export function initGame() {
    DOM.startButton.addEventListener('click', () => {
        DOM.startScreen.style.display = 'none';
        DOM.gameContainer.classList.remove('hidden');
        DOM.clanSelection.classList.remove('hidden');
        gameState.gamePhase = 'clan-selection';
    });
}

// Sélection des clans
export function setupClanSelection() {
    document.querySelectorAll('.clan').forEach(clan => {
        clan.addEventListener('click', () => {
            const selectedClan = clan.dataset.clan;

            if (!gameState.players[0].clan) {
                // Joueur 1 sélectionne son clan
                gameState.players[0].clan = selectedClan;
                showMessage('Joueur 1', `Vous avez choisi le clan ${selectedClan} !`, 'success');
                document.querySelectorAll('.clan').forEach(c => c.classList.remove('selected'));
                clan.classList.add('selected');
            }
            else if (!gameState.players[1].clan) {
                // Joueur 2 sélectionne son clan
                gameState.players[1].clan = selectedClan;
                showMessage('Joueur 2', `Vous avez choisi le clan ${selectedClan} !`, 'success')
                    .then(() => {
                        document.querySelectorAll('.clan').forEach(c => c.classList.remove('selected'));
                        clan.classList.add('selected');

                        Swal.fire({
                            title: 'Préparation du champ de bataille...',
                            html: '<div class="loading-bar"></div>',
                            timer: 1000,
                            timerProgressBar: true,
                            didOpen: () => Swal.showLoading()
                        }).then(() => startBattle());
                    });
            }
        });
    });
}


// Démarrer la bataille
function startBattle() {
    DOM.clanSelection.classList.add('hidden');
    DOM.battlefield.classList.remove('hidden');
    gameState.gamePhase = 'placement';
    generateGrid();
    generateWarehouses();
    startPlacementPhase();
}

// Démarrer la phase de placement
function startPlacementPhase() {
    DOM.gameContainer.classList.add('placement-phase');
    updateTurnIndicator();

    Swal.fire({
        title: 'Phase de Placement',
        html: `
            <div style="text-align:left">
                <p><b>Instructions :</b></p>
                <ol>
                    <li>Glissez vos unités depuis votre armurerie</li>
                    <li>Placez-les dans votre zone (3 premières lignes)</li>
                     <li>Placez toutes vos unités pour continuer</li>
                </ol>
               
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'Commencer'
    });

    // Activer les animations pour les zones valides
    document.querySelectorAll('.cell').forEach(cell => {
        const playerZone = gameState.currentPlayer === 0 ? 'zone-joueur1' : 'zone-joueur2';
        if (cell.classList.contains(playerZone)) {
            cell.classList.add('valid-drop');
        }
    });
}

// Terminer la phase de placement
function endPlacementPhase() {
    gameState.gamePhase = 'battle';
    DOM.gameContainer.classList.remove('placement-phase');

    // Retirer les animations des cellules
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('valid-drop', 'drag-over');
    });

    // Démarrer la phase de bataille
    startBattlePhase();
}

// Exporter les fonctions nécessaires
export { startPlacementPhase, endPlacementPhase, startBattle };
