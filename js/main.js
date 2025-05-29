// Importez d'abord les modules nécessaires
import { initGame,setupClanSelection } from './game.js';


// Initialisez le jeu quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    setupClanSelection(); 
   
});