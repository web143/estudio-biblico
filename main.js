import { studyData } from './database.js';

class CaminoDelJustoGame {
    constructor() {
        this.currentPhaseIdx = 0;
        this.scores = { a: 0, b: 0 };
        this.maxPhases = studyData.length;

        // UI Elements
        this.cardBody = document.getElementById('card-body');
        this.cardFooter = document.getElementById('card-footer');
        this.verseLabel = document.getElementById('current-verses');
        this.rewardOverlay = document.getElementById('overlay');
        this.rewardContent = document.getElementById('reward-content');
        this.scoreA = document.getElementById('score-a');
        this.scoreB = document.getElementById('score-b');
        
        // Init
        this.init();
    }

    init() {
        document.getElementById('close-reward').onclick = () => this.nextPhase();
        document.getElementById('btn-reset').onclick = () => {
            if (confirm("¿Reiniciar el juego?")) window.location.reload();
        };
        this.render();
        this.updateProgressUI();
    }

    updateProgressUI() {
        const segments = document.querySelectorAll('.progress-segment');
        segments.forEach((seg, idx) => {
            seg.classList.remove('active', 'completed');
            if (idx === this.currentPhaseIdx) seg.classList.add('active');
            else if (idx < this.currentPhaseIdx) seg.classList.add('completed');
        });
    }

    render() {
        const phase = studyData[this.currentPhaseIdx];
        this.verseLabel.textContent = `Versículos ${phase.versiculos}`;
        this.cardBody.innerHTML = `<h2 id="current-question">${phase.pregunta}</h2>`;
        
        this.cardFooter.innerHTML = `
            <button class="btn-control btn-correct" id="action-correct">✅ Correcta</button>
            <button class="btn-control btn-incorrect" id="action-incorrect">❌ Incorrecta</button>
        `;

        document.getElementById('action-correct').onclick = () => this.showTeamSelection();
        document.getElementById('action-incorrect').onclick = () => this.showReward();
    }

    showTeamSelection() {
        this.cardFooter.innerHTML = `
            <button class="btn-control btn-correct" id="add-a">Punto para A</button>
            <button class="btn-control btn-correct" id="add-b">Punto para B</button>
        `;
        document.getElementById('add-a').onclick = () => this.addPoint('a');
        document.getElementById('add-b').onclick = () => this.addPoint('b');
    }

    addPoint(team) {
        this.scores[team]++;
        this.updateScoresUI();
        this.showReward();
    }

    updateScoresUI() {
        this.scoreA.textContent = this.scores.a;
        this.scoreB.textContent = this.scores.b;
    }

    showReward() {
        const phase = studyData[this.currentPhaseIdx];
        this.rewardContent.innerHTML = phase.explicacion;
        this.rewardOverlay.classList.remove('hidden');
    }

    nextPhase() {
        this.rewardOverlay.classList.add('hidden');
        if (this.currentPhaseIdx < this.maxPhases - 1) {
            this.currentPhaseIdx++;
            this.render();
            this.updateProgressUI();
        } else {
            this.finishGame();
        }
    }

    finishGame() {
        const winner = this.scores.a > this.scores.b ? 'Equipo A' : 
                       this.scores.b > this.scores.a ? 'Equipo B' : 'Empate';
        
        this.verseLabel.textContent = "FINAL DEL CAMINO";
        this.cardBody.innerHTML = `
            <h2 id="current-question">¡Estudio Completado!</h2>
            <div style="margin-top: 20px; text-align: center;">
                <p style="font-size: 1.5rem; color: var(--gold);">Ganador: ${winner}</p>
                <div style="display: flex; justify-content: space-around; margin-top: 30px;">
                    <div><h3>Equipo A</h3><p style="font-size: 2rem;">${this.scores.a}</p></div>
                    <div><h3>Equipo B</h3><p style="font-size: 2rem;">${this.scores.b}</p></div>
                </div>
            </div>
        `;
        this.cardFooter.innerHTML = `
            <button class="btn-control btn-correct" onclick="window.location.reload()">Reiniciar</button>
        `;
    }
}

new CaminoDelJustoGame();
