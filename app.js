const names = ["Aurélien","Aymeric","Djibril","Matteo","Giacomo","Jules","Theo 8","Julian","Loris","Louis","Lyam","Maxime","Robin","Thomas","Tiago","Yanis","Youssef","Zinedine"];
let data = {}, globalRunning = false, globalStart = 0, globalTotal = 0, goalsScored = 0, conceded = 0;
let timerInterval, activeReplacePlayer = null;

function save() {
    localStorage.setItem('verlaine_v_modal', JSON.stringify({ data, globalRunning, globalStart, globalTotal, goalsScored, conceded }));
}

function init() {
    const saved = localStorage.getItem('verlaine_v_modal');
    if (saved) {
        try {
            const p = JSON.parse(saved);
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
        }
    }
    
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

    const sortedNames = [...names].sort((a, b) => {
        const timeA = (data[a]?.total || 0) + (data[a]?.playing ? now - data[a].lastStart : 0);
        const timeB = (data[b]?.total || 0) + (data[b]?.playing ? now - data[b].lastStart : 0);
        return timeB - timeA;
    });

    sortedNames.forEach(n => {
        const p = data[n];
        if (!p) return;
        const t = p.total + (p.playing ? now - p.lastStart : 0);
        const diff = p.goals - conceded;
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
            <div class="goalcompare">Difference individuelle : ${diff > 0 ? '+'+diff : diff}</div>
        `;
        div.appendChild(card);
    });
}

function toggleP(n) {
    const now = Math.floor(Date.now()/1000);
    if (data[n].playing) { 
        data[n].total += now - data[n].lastStart; 
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
        names.forEach(n => {
            if(data[n] && data[n].playing) {
                const t = data[n].total + (now - data[n].lastStart);
                const el = document.getElementById(`t_${n}`);
                if(el) el.textContent = fmt(t);
            }
        });
    }, 1000);
}

document.getElementById("globalBtn").onclick = function() {
    const now = Math.floor(Date.now()/1000);
    if(!globalRunning) {
        globalStart = now;
        globalRunning = true;
        this.textContent = "Arreter le match";
        names.forEach(n => { if(data[n] && data[n].playing) data[n].lastStart = now; });
        startTimerLoop();
    } else {
        globalTotal += now - globalStart;
        globalRunning = false;
        this.textContent = "Demarrer le match";
        clearInterval(timerInterval);
        names.forEach(n => { if(data[n] && data[n].playing) { data[n].total += now - data[n].lastStart; data[n].playing = false; } });
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
    data[activeReplacePlayer].total += now - data[activeReplacePlayer].lastStart;
    data[activeReplacePlayer].playing = false;
    data[inPlayer].lastStart = now;
    data[inPlayer].playing = true;
    closeModal(); save(); render();
}

document.getElementById("exportBtn").onclick = function() {
    let csv = "Joueur,Temps de jeu (sec),Buts,Assists,Diff Individuelle\n";
    names.forEach(n => {
        const now = Math.floor(Date.now()/1000);
        const t = data[n].total + (data[n].playing ? now - data[n].lastStart : 0);
        csv += `${n},${t},${data[n].goals},${data[n].assists},${data[n].goals - conceded}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "stats_match.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

init();
render();
