import { DOM, gameState } from './dom.js';
import { unitStats } from './config.js';


import { applyGroupedDamage } from './events.js';

// Afficher un message
export function showMessage(title, text, icon) {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: true
    });
}

// Mettre à jour l'indicateur de tour
export function updateTurnIndicator() {

    if (!DOM.turnIndicator) return;

    if (gameState.gamePhase === 'placement') {
        DOM.turnIndicator.textContent = `JOUEUR ${gameState.currentPlayer + 1} - PHASE DE PLACEMENT`;
    } else if (gameState.gamePhase === 'battle') {
        DOM.turnIndicator.textContent = `JOUEUR ${gameState.currentPlayer + 1} - TOUR DE BATAILLE`;
    }

    DOM.turnIndicator.style.backgroundColor = gameState.currentPlayer === 0
        ? 'rgba(0, 100, 255, 0.7)'
        : 'rgba(255, 50, 50, 0.7)';
}

// Mettre à jour la santé globale en pourcentage
export function updateGlobalHealth() {
    // Calculer la santé totale de chaque joueur
    const p1Total = gameState.players[0].units.reduce((sum, unit) => sum + unit.health, 0);
    const p2Total = gameState.players[1].units.reduce((sum, unit) => sum + unit.health, 0);

    // Calculer la santé maximale possible (toutes unités à plein)
    const p1Max = gameState.players[0].units.reduce((sum, unit) => sum + unitStats[unit.type].health, 0);
    const p2Max = gameState.players[1].units.reduce((sum, unit) => sum + unitStats[unit.type].health, 0);

    // Calculer le pourcentage de santé (minimum 0% si aucune unité)
    const p1Percent = p1Max > 0 ? (p1Total / p1Max) * 100 : 0;
    const p2Percent = p2Max > 0 ? (p2Total / p2Max) * 100 : 0;

    // Mettre à jour les barres de vie
    DOM.player1HealthFill.style.width = `${p1Percent}%`;
    DOM.player2HealthFill.style.width = `${p2Percent}%`;

    // Mettre à jour aussi dans gameState
    gameState.players[0].health = p1Percent;
    gameState.players[1].health = p2Percent;
}

// Afficher les résultats d'attaque
export function showAttackResult(attackers, defenders, results) {
    //if (!results || !attackers || !defenders || attackers.length === 0 || defenders.length === 0) {
    //   return;
    //}

    showCombatSummary(attackers, defenders, results);
}
// Afficher un popup de dégâts
export function showDamagePopup(unitElement, damage) {
    const popup = document.createElement('div');
    popup.className = 'damage-popup';
    popup.textContent = `-${damage}`;

    popup.style.position = 'absolute';
    popup.style.color = '#ff0000';
    popup.style.fontWeight = 'bold';
    popup.style.fontSize = '1.2em';
    popup.style.animation = 'floatUp 1s forwards';

    unitElement.appendChild(popup);

    setTimeout(() => {
        unitElement.removeChild(popup);
    }, 1000);
}
function showCombatSummary(attackers, defenders, results) {
    let resultHtml = `
        <div style="text-align:left; margin:1rem 0">
            <div style="background:#333; padding:10px; border-radius:5px; margin-bottom:10px; text-align:center">
                <strong>Résultats du combat</strong>
                <div style="margin-top:5px; font-size:0.9em">
                    ${attackers.length} attaquant(s) vs ${defenders.length} défenseur(s)
                </div>
            </div>

            <div style="display:flex; justify-content:space-between; gap:20px; margin-bottom:15px">
                <!-- Section Attaquants -->
                <div style="flex:1; background:rgba(255,50,50,0.1); padding:10px; border-radius:5px">
                    <h4 style="color:#ff3232; margin-top:0">ATTAQUANTS</h4>
                    ${attackers.map(attacker => `
                        <p>
                            <strong>${attacker.dataset.type}</strong> 
                            (J${attacker.dataset.player}) - 
                            Att: ${unitStats[attacker.dataset.type].attack}
                        </p>
                    `).join('')}
                    <p style="margin-top:10px; border-top:1px solid #ff3232; padding-top:5px">
                        <strong>Total: ${results.attackPower}</strong>
                    </p>
                </div>

                <!-- Section Défenseurs -->
                <div style="flex:1; background:rgba(50,100,255,0.1); padding:10px; border-radius:5px">
                    <h4 style="color:#0064ff; margin-top:0">DÉFENSEURS</h4>
                    ${defenders.map(defender => {
        const playerIndex = parseInt(defender.dataset.player) - 1;
        const unit = gameState.players[playerIndex].units.find(u => u.id === defender.dataset.id);
        return `
                            <p>
                                <strong>${defender.dataset.type}</strong> 
                                (J${defender.dataset.player}) - 
                                Def: ${unitStats[defender.dataset.type].defense}
                                ${unit?.health ? `→ PV: ${unit.health}` : '→ ÉLIMINÉ'}
                            </p>`;
    }).join('')}
                    <p style="margin-top:10px; border-top:1px solid #0064ff; padding-top:5px">
                        <strong>Total: ${results.defensePower}</strong>
                    </p>
                </div>
            </div>

            <!-- Résultat final -->
            <div style="text-align:center; 
                        background:${results.damage > 3 ? 'rgba(255,50,50,0.2)' : 'rgba(255,255,50,0.2)'}; 
                        padding:10px; border-radius:5px">
                <strong style="font-size:1.2rem">DÉGÂTS INFLIGÉS: ${results.damage}</strong>
                ${defenders.length > 1 ? `
                    <div style="margin-top:5px">
                        (Répartis: ${Math.ceil(results.damage / defenders.length)} par unité)
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    Swal.fire({
        title: results.damage > 5 ? 'Attaque puissante!' : 'Résultats du combat',
        html: resultHtml,
        icon: results.damage > 5 ? 'warning' : 'info',
        background: '#1a1a1a',
        color: 'white',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
    });
}
// Fin du jeu - Version innovante et interactive
export function endGame(winnerIndex) {
    gameState.gamePhase = 'end';

    // Effet lumineux de victoire (spotlight)
    const spotlight = document.createElement('div');
    spotlight.className = 'victory-spotlight';
    document.body.appendChild(spotlight);

    // Effet radial lumineux
    const radialGlow = document.createElement('div');
    radialGlow.className = 'victory-radial-glow';
    document.body.appendChild(radialGlow);

    // Musique de victoire
    const audio = new Audio('assets/audio/victory.mp3');
    audio.volume = 0.6;
    audio.play();

    // Confettis dynamiques et colorés
    let confettiInterval = null;
    function launchConfettiBurst() {
        confetti({
            particleCount: 80 + Math.floor(Math.random() * 40),
            startVelocity: 40,
            spread: 360,
            origin: { x: 0.5, y: 0.45 + Math.random() * 0.08 },
            gravity: 0.8,
            colors: winnerIndex === 0 ? ['#0064ff', '#00aaff'] : ['#ff3232', '#ff8080'],
            shapes: ['circle', 'square'],
        });
    }
    launchConfettiBurst();
    confettiInterval = setInterval(launchConfettiBurst, 1200);

    // Statistiques du joueur gagnant (exemple dynamique)
    const winner = gameState.players[winnerIndex];
    const statsHtml = winner.stats ? `
        <div class="victory-stats">
            <h4>Statistiques du vainqueur</h4>
            <ul>
                <li>Unités restantes : <b>${winner.stats.unitsLeft}</b></li>
                <li>Dégâts infligés : <b>${winner.stats.damageDealt}</b></li>
                <li>Actions spéciales : <b>${winner.stats.specialsUsed}</b></li>
            </ul>
        </div>
    ` : '';

    // Animation moderne avec partage et replay
    setTimeout(() => {
        Swal.fire({
            title: `
                <img class="victory-emoji" src="assets/images/victory-pattern.png" alt="Victoire" >
                <span style="color: ${winnerIndex === 0 ? '#ffffff' : '#ffff'};">
                    Joueur ${winnerIndex + 1} a gagné !
                </span>
            `,
            html: `
                <div class="victory-popup-content">
                    <img src="assets/clan-icons/${winner.clan.toLowerCase()}.png"
                        alt="Clan ${winner.clan}"
                        style="width: 120px; margin: 10px 0; filter: drop-shadow(0 0 15px gold);">
                    <p style="font-size: 1.2rem; color: #333;">
                        Le clan <strong>${winner.clan}</strong> remporte la victoire !
                    </p>
                    ${statsHtml}
                    <button class="victory-share-btn" id="shareVictoryBtn">Partager </button>
                    <button class="victory-replay-btn" id="replayGameBtn">Rejouer </button>
                </div>
            `,
            showConfirmButton: false,
            background: winnerIndex === 0
                ? 'linear-gradient(120deg, #0064ff 60%, #00aaff 100%)'
                : 'linear-gradient(120deg, #ff3232 60%, #ff8080 100%)',
            customClass: {
                popup: 'victory-popup'
            },
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                // Partage du résultat (Web Share API ou fallback)
                document.getElementById('shareVictoryBtn').onclick = () => {
                    const shareData = {
                        title: 'Victoire !',
                        text: `Joueur ${winnerIndex + 1} et le clan ${winner.clan} viennent de gagner sur BattleGame ! Rejoins-moi pour jouer !`,
                        url: window.location.href
                    };
                    if (navigator.share) {
                        navigator.share(shareData).catch(() => { });
                    } else {
                        navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                        Swal.fire('Lien copié !', 'Le lien vers votre victoire a été copié dans le presse-papier.', 'success');
                    }
                };
                // Replay (rechargement fluide)
                document.getElementById('replayGameBtn').onclick = () => {
                    const fadeOut = document.createElement('div');
                    fadeOut.className = 'victory-fadeout';
                    document.body.appendChild(fadeOut);
                    setTimeout(() => location.reload(), 900);
                };
            },
            willClose: () => {
                if (confettiInterval) clearInterval(confettiInterval);
                [spotlight, radialGlow].forEach(e => e && e.parentNode && e.parentNode.removeChild(e));
            }
        });
    }, 400);
}

// Afficher le résumé de la brûlure
export function showBurnSummary(row, count, details) {
    let html = `
        <div style="text-align:left; margin:1rem 0">
            <p><b>Ligne ${row} brûlée !</b></p>
            <p>Unités affectées: ${count}</p>
    `;

    if (count > 0) {
        html += `<p>Détails des dégâts (4 points chacun):</p><ul>`;
        details.forEach(unit => {
            html += `<li>${unit.type} (J${unit.player}): ${unit.oldHealth} → ${unit.newHealth} PV</li>`;
        });
        html += `</ul>`;
    } else {
        html += `<p>Aucune unité ennemie touchée.</p>`;
    }

    html += `</div>`;

    Swal.fire({
        title: 'Sort de Brûlure Réussi',
        html: html,
        icon: 'success'
    });
}


