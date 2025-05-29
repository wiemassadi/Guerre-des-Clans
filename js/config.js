
// Configuration des clans
export const clans = {
    Montagnes: {
        Guerrier: 3,
        Archer: 2,
        Mage: 1,
    },
    Plaines: {
        Guerrier: 2,
        Archer: 3,
        Mage: 1,



    },
    Sages: {
        Guerrier: 1,
        Archer: 2,
        Mage: 3,

    }
};

// Statistiques des unités
export const unitStats = {
    Guerrier: {
        health: 10,
        attack: 4,
        defense: 3,
        range: 1,
        special: 'Furie Berserk',
        specialUses: 1
    },
    Archer: {
        health: 8,
        attack: 3,
        defense: 2,
        range: 3,
        special: 'Tir Perçant',
        specialUses: 1
    },
    Mage: {
        health: 6,
        attack: 5,
        defense: 1,
        range: 2,
        special: 'lineBurn',
        specialUses: 2
    }
};

// État initial du jeu
export const initialGameState = {
    players: [
        {
            clan: null,
            units: [],
            placedUnits: 0,
            health: 100,
            isActive: false
        },
        {
            clan: null,
            units: [],
            placedUnits: 0,
            health: 100,
            isActive: false
        }
    ],
    currentPlayer: 0,
    gamePhase: 'clan-selection', // 'clan-selection', 'placement', 'battle'
    draggedUnit: null,
    diceRoll: 0,
    attackMode: false,
    selectedAttacker: null,
    player1DiceScore: 0,
    player2DiceScore: 0,
    movesCount: 0,
    hasMovedThisTurn: false,
    movedUnitId: null,
};

export const soundEffects = {
    warriorBerserk: 'assets/audio/berserk.mp3',
    archerShot: 'assets/audio/piercing_arrow.mp3',
    mageBurn: 'assets/audio/fire_wave.mp3',
    specialDenied: 'assets/audio/denied.mp3'
};