import { initialGameState } from './config.js';


// Éléments DOM
export const DOM = {
    startButton: document.getElementById('start-button'),
    startScreen: document.getElementById('start-screen'),
    gameContainer: document.getElementById('game-container'),
    clanSelection: document.getElementById('clan-selection'),
    battlefield: document.getElementById('battlefield'),
    grid: document.getElementById('grid'),
    rollDiceButton: document.getElementById('roll-dice'),
    diceResult: document.getElementById('dice-result'),
    actionsDiv: document.getElementById('actions'),
    turnIndicator: document.getElementById('turn-indicator'),
    player1HealthFill: document.getElementById('player1-health-fill'),
    player2HealthFill: document.getElementById('player2-health-fill'),
    player1Warehouse: document.querySelector('#player1-warehouse .units'),
    player2Warehouse: document.querySelector('#player2-warehouse .units'),
    stackedUnitContainer: document.createElement('div'),
    GlobalHealthHbars: document.getElementsByClassName('global-health-bars')
};

// État du jeu
export let gameState = { ...initialGameState };

// Fonction pour réinitialiser l'état du jeu
export function resetGameState() {
    gameState = { ...initialGameState };
}