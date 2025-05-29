import { DOM, gameState } from './dom.js';
import { clans, unitStats } from './config.js';
import { handleDragStart, handleDragEnd, handleDragOver, handleDrop, handleDragEnter, handleDragLeave } from './events.js';
import { updateGlobalHealth } from './ui.js';


// Générer la grille de jeu
export function generateGrid() {
    DOM.grid.innerHTML = '';

    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.dataset.row = Math.floor(i / 10);
        cell.dataset.col = i % 10;

        // Définir les zones des joueurs
        if (i < 30) cell.classList.add('zone-joueur1');
        else if (i >= 70) cell.classList.add('zone-joueur2');
        else cell.classList.add('zone-neutre');

        // Ajouter les événements de drag and drop
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('drop', handleDrop);
        cell.addEventListener('dragenter', handleDragEnter);
        cell.addEventListener('dragleave', handleDragLeave);

        DOM.grid.appendChild(cell);
    }}


// Générer les entrepôts d'unités
export function generateWarehouses() {
    const player1Units = DOM.player1Warehouse;
    const player2Units = DOM.player2Warehouse;

    player1Units.innerHTML = '';
    player2Units.innerHTML = '';

    // Utilisez gameState.players au lieu de players
    gameState.players.forEach((player, playerIndex) => {
        player.units = []; // Réinitialiser les unités
        const unitsContainer = playerIndex === 0 ? player1Units : player2Units;
        const clanConfig = clans[player.clan];

        for (const [unitType, quantity] of Object.entries(clanConfig)) {
            if (unitType === 'advantage') continue;

            for (let i = 0; i < quantity; i++) {
                const unitId = `p${playerIndex + 1}-${unitType}-${i}`;
                const unit = {
                    type: unitType,
                    player: playerIndex + 1,
                    id: unitId,
                    ...unitStats[unitType]
                };

                player.units.push(unit);
                const unitElement = createUnitElement(unit);
                unitsContainer.appendChild(unitElement);
            }
        }
    });

    attachDragEvents();

}
// Créer un élément d'unité
function createUnitElement(unitData) {
    const unit = document.createElement('div');
    unit.className = 'unit';
    unit.dataset.type = unitData.type;
    unit.dataset.player = unitData.player;
    unit.dataset.id = unitData.id;
    unit.draggable = true;
    unit.classList.add(`player-${unitData.player}-unit`);

    // Ajouter une icône pour le type d'unité
    const typeIcon = document.createElement('span');
    typeIcon.className = 'unit-type';
    typeIcon.textContent = getUnitIcon(unitData.type);
    unit.appendChild(typeIcon);

    // Ajouter l'image de l'unité
    const img = document.createElement('img');
    img.src = `assets/images/${unitData.type.toLowerCase()}.png`;
    img.alt = unitData.type;
    unit.appendChild(img);

    // Ajout de l'événement clic droit
    unit.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showUnitStatsPopup(unitData);
    });
    // Animation d'apparition
    unit.style.opacity = '0';
    unit.style.transform = 'scale(0.5)';
    setTimeout(() => {
        unit.style.transition = 'all 0.3s ease';
        unit.style.opacity = '1';
        unit.style.transform = 'scale(1)';
    }, 50);
    return unit;
}
export function showUnitStatsPopup(unitData) {
    const popup = document.createElement('div');
    popup.className = 'unit-stats-popup';

    popup.innerHTML = `
        <div class="unit-stats-content">
            <div class="unit-stats-header">
                <img src="assets/images/${unitData.type.toLowerCase()}.png" alt="${unitData.type}">
                <h3>${unitData.type}</h3>
            </div>
            <div class="unit-stats-grid">
                <div class="stat-item">
                    <span class="stat-name">Vie:</span>
                    <span class="stat-value">${unitData.health}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Attaque:</span>
                    <span class="stat-value">${unitData.attack}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Défense:</span>
                    <span class="stat-value">${unitData.defense}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-name">Portée:</span>
                    <span class="stat-value">${unitData.range}</span>
                </div>
            </div>
            ${unitData.special ? `<div class="unit-special">${unitData.special}</div>` : ''}
        </div>
    `;

    // Positionnement près de la souris
    popup.style.position = 'absolute';
    popup.style.left = `${event.clientX}px`;
    popup.style.top = `${event.clientY}px`;

    document.body.appendChild(popup);

    // Fermer la popup quand on clique ailleurs
    const closePopup = () => {
        document.body.removeChild(popup);
        document.removeEventListener('click', closePopup);
    };

    setTimeout(() => {
        document.addEventListener('click', closePopup);
    }, 100);
}
// Obtenir l'icône de l'unité
function getUnitIcon(type) {
    const icons = {
        Guerrier: '⚔️',
        Archer: '🏹',
        Mage: '🔮'
    };
    return icons[type] || '❓';
}
// Attacher les événements de drag
function attachDragEvents() {
    document.querySelectorAll('.unit').forEach(unit => {
        unit.addEventListener('dragstart', handleDragStart);
        unit.addEventListener('dragend', handleDragEnd);
    });
}
// Exporter les fonctions nécessaires
export { createUnitElement, attachDragEvents, getUnitIcon };
