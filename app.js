// Liste de base fixe (GitHub)
const initialNames = ["Aurélien","Aymeric","Djibril","Matteo","Giacomo","Jules","Theo 8","Julian","Loris","Louis","Lyam","Maxime","Robin","Thomas","Tiago","Yanis","Youssef","Zinedine"];
// Tableau dynamique qui contiendra aussi les joueurs ajoutés sur le terrain
let names = [...initialNames];

let data = {}, globalRunning = false, globalStart = 0, globalTotal = 0, goalsScored = 0, conceded = 0;
let timerInterval, activeReplacePlayer = null;

function save() {
    // On sauvegarde la liste des noms modifiée ainsi que toutes les stats du match
    localStorage.setItem('verlaine_v_modal', JSON.stringify({ names, data, globalRunning, globalStart, globalTotal, goalsScored, conceded }));
}

function init() {
    const saved = localStorage.getItem('verlaine_v_modal');
    if (saved) {
        try {
            const p = JSON.parse(saved);
            // Si des noms personnalisés ont été enregistrés, on les récupère
            if (p.names) names = p.names;
            
            data = p.data || {}; 
            globalRunning = p.globalRunning || false; 
            globalStart = p.globalStart || 0;
            globalTotal = p.globalTotal || 0; 
            goalsScored = p.goalsScored || 0; 
            conceded = p.conceded || 0;
            
            if(globalRunning) {
                document.getElementById("globalBtn").textContent = "Arreter le match";
                startTimerLoop();
            }
        } catch(e) {
            data = {};
            names = [...initialNames];
        }
    }
    
    // Initialisation sécurisée de tous les joueurs présents dans la liste actuelle
    names.forEach(n => {
        if (!data[n]) {
            data[n] = {playing:false, lastStart:0, total:0, goals:0, assists:0};
        }
    });
}

function fmt(sec){
    const m = Math.floor(sec/60);
    const s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
}

function render(){
    const div = document.getElementById("players");
    if (!div) return;
    div.innerHTML = "";
    const now = Math.floor(Date.now()/1000);
    document.getElementById("scoreGoals").textContent = goalsScored;
    document.getElementById("conceded").textContent = conceded;

    // Tri en temps réel du plus grand temps de jeu au plus petit
    const sortedNames = [...names].sort((a, b) => {
        const timeA = (data[a]?.total || 0) + (data[a]?.playing && globalRunning ? now - data[a].lastStart : 0);
        const timeB = (data[b]?.total || 0) + (data[b]?.playing && globalRunning ? now - data[b].lastStart : 0);
        return timeB - timeA;
    });

    sortedNames.forEach(n => {
        const p = data[n];
        if (!p) return;
        const t = p.total + (p.playing && globalRunning ? now - p.lastStart : 0);
        const card = document.createElement("div");
        card.className = "player";
        card.innerHTML = `
            <div class="row"><b>${n}</b><span id="t_${n}" style="font-family:monospace; font-weight:bold;">${fmt(t)}</span></div>
            <div class="action-row">
                <button class="btn-toggle" onclick="toggleP('${n}')" style="background:${p.playing?'#ffc107':'#2d6a4f'}">
                    ${p.playing ? "Sortir" : "Entrer"}
                </button>
                ${p.playing ? `<button class="btn-replace" onclick="openReplace('${n}')">🔄</button>` : ''}
            </div>
            <div class="statrow">
                <div class="statbox">⚽ ${p.goals} <div>
                    <button class="smallbtn" onclick="addGoal('${n}',1)">+</button>
                    <button class="smallbtn" onclick="addGoal('${n}',-1)">-</button>
                </div></div>
                <div class="statbox">👟 ${p.assists} <div>
                    <button class="smallbtn" onclick="addAssist('${n}',1)">+</button>
                    <button class="smallbtn" onclick="addAssist('${n}',-1)">-</button>
                </div></div>
            </div>
        `; 
        div.appendChild(card);
    });
}

// LOGIQUE D'AJOUT D'UN JOUEUR DEPUIS L'ECRAN
document.getElementById("addPlayerBtn").onclick = function() {
    const input = document.getElementById("newPlayerName");
    const name = input.value.trim();
    
    if (name === "") return; // Ne rien faire si le champ est vide
    
    // Si le joueur existe déjà, on prévient l'utilisateur
    if (names.includes(name)) {
        alert("Ce joueur est déjà dans la liste !");
        return;
    }
    
    // Ajout du joueur dans la liste et création de sa fiche de statistiques
    names.push(name);
    data[name] = {playing:false, lastStart:0, total:0, goals:0, assists:0};
    
    input.value = ""; // On vide le champ de texte
    save(); 
    render();
};

function toggleP(n) {
    const now = Math.floor(Date.now()/1000);
    if (data[n].playing) { 
        if (globalRunning) {
            data[n].total += now - data[n].lastStart;
        }
        data[n].playing = false; 
    } else { 
        data[n].lastStart = now; 
        data[n].playing = true; 
    }
    save(); render();
}

function addGoal(n, v) { 
    if(v < 0 && data[n].goals <= 0) return;
    data[n].goals += v; goalsScored += v; save(); render(); 
}

// Correction orthographe
function addAssist(n, v) { 
    if(v < 0 && data[n].assists <= 0) return;
    data[n].assists += v; save(); render(); 
}

function startTimerLoop() {
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now = Math.floor(Date.now()/1000);
        const totalSec = globalTotal + (globalRunning ? now - globalStart : 0);
        document.getElementById("globalTimer").textContent = "Temps : " + fmt(totalSec);
        render();
    }, 1000);
}

document.getElementById("globalBtn").onclick = function() {
    const now = Math.floor(Date.now()/1000);
    if(!globalRunning) {
        const activePlayersCount = names.filter(n => data[n].playing).length;
        if (activePlayersCount === 0) {
            if (confirm("Aucun joueur n'est sur le terrain. Voulez-vous faire entrer automatiquement les 10 premiers joueurs ?")) {
                for (let i = 0; i < 10; i++) {
                    if (names[i]) data[names[i]].playing = true;
                }
            }
        }

        globalStart = now;
        globalRunning = true;
        this.textContent = "Arreter le match";
        
        names.forEach(n => { if(data[n].playing) data[n].lastStart = now; });
        startTimerLoop();
    } else {
        globalTotal += now - globalStart;
        globalRunning = false;
        this.textContent = "Demarrer le match";
        clearInterval(timerInterval);
        
        names.forEach(n => { 
            if(data[n].playing) { 
                data[n].total += now - data[n].lastStart; 
            } 
        });
    }
    save(); render();
};

document.getElementById("plusC").onclick = function() { conceded++; save(); render(); };
document.getElementById("minusC").onclick = function() { if(conceded > 0) conceded--; save(); render(); };

function openReplace(outPlayer) {
    activeReplacePlayer = outPlayer;
    document.getElementById("outPlayerName").textContent = outPlayer;
    const subOptions = document.getElementById("subOptions");
    subOptions.innerHTML = "";
    
    names.forEach(n => {
        if(data[n] && !data[n].playing) {
            const btn = document.createElement("button");
            btn.className = "replace-option";
            btn.textContent = n;
            btn.onclick = function() { executeReplace(n); };
            subOptions.appendChild(btn);
        }
    });
    document.getElementById("replaceModal").style.display = "flex";
}

function closeModal() { document.getElementById("replaceModal").style.display = "none"; }

function executeReplace(inPlayer) {
    const now = Math.floor(Date.now()/1000);
    if (globalRunning) {
        data[activeReplacePlayer].total += now - data[activeReplacePlayer].lastStart;
        data[inPlayer].lastStart = now;
    }
           data[activeReplacePlayer].playing = false;
    data[inPlayer].playing = true;
    closeModal(); save(); render();
}

// EXPORT COMPATIBLE EXCEL (COLONNES NETTES ET TEMPS MM:SS)
document.getElementById("exportBtn").onclick = function() {
    // Le "sep=;" en première ligne force légalement Excel France à ouvrir en colonnes directes
    let csv = "sep=;\nJoueur;Temps de jeu;Buts;Assists\n";
    
    names.forEach(n => {
        const now = Math.floor(Date.now()/1000);
        const totalSec = data[n].total + (data[n].playing && globalRunning ? now - data[n].lastStart : 0);
        
        // CONVERSION : Secondes vers format Minute:Seconde
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        const tempsFormate = min + ":" + (sec < 10 ? "0" : "") + sec;
        
        // ÉCRITURE : Séparation stricte par points-virgules pour Excel
        csv += `${n};${tempsFormate};${data[n].goals};${data[n].assists}\n`;
    });
    
    // Ajout d'une clé UTF-8 (BOM) pour qu'Excel lise correctement les accents (Aurélien, etc.)
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "stats_match_rcs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

init();
render();

