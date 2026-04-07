import { studyData } from './database.js';

class BibleStudyGame {
    constructor() {
        this.currentPhaseIdx = 0;
        this.gameState = 'bible-question'; // bible-question, commentary-upgrade, powerup
        this.humility = 100;
        this.inventory = { wood: 0, pitch: 0 };
        this.maxPhases = studyData.length;

        // UI Elements
        this.cardContent = document.getElementById('card-content');
        this.cardHeader = document.getElementById('phase-title');
        this.cardFooter = document.getElementById('controls');
        this.humilityBar = document.getElementById('humility-bar-inner');
        this.overlay = document.getElementById('overlay');
        
        // Init
        this.initEventListeners();
        this.render();
        this.updateProgress();
    }

    initEventListeners() {
        document.getElementById('btn-mala-conciencia').addEventListener('click', () => this.penalizeHumility());
        document.getElementById('close-powerup').addEventListener('click', () => this.nextPhase());
    }

    penalizeHumility() {
        this.humility = Math.max(0, this.humility - 10);
        this.updateHumilityUI();
        this.showToast('⚠️ Mala Conciencia: -10 Humildad');
    }

    updateHumilityUI() {
        this.humilityBar.style.width = `${this.humility}%`;
        if (this.humility < 30) {
            this.humilityBar.style.background = 'var(--danger)';
        } else if (this.humility < 60) {
            this.humilityBar.style.background = 'orange';
        } else {
            this.humilityBar.style.background = 'linear-gradient(to right, var(--danger), var(--success))';
        }
    }

    updateProgress() {
        const segments = document.querySelectorAll('.progress-segment');
        segments.forEach((seg, idx) => {
            seg.classList.remove('active', 'completed');
            if (idx === this.currentPhaseIdx) {
                seg.classList.add('active');
            } else if (idx < this.currentPhaseIdx) {
                seg.classList.add('completed');
            }
        });
    }

    render() {
        const phase = studyData[this.currentPhaseIdx];
        this.cardHeader.textContent = phase.titulo;

        if (this.gameState === 'bible-question') {
            this.renderBibleQuestion(phase);
        } else if (this.gameState === 'commentary-upgrade') {
            this.renderCommentaryUpgrade(phase);
        }
    }

    renderBibleQuestion(phase) {
        this.cardContent.innerHTML = `
            <p class="question-type" style="color: var(--primary); font-weight: 600; margin-bottom: 5px;">PREGUNTA BÍBLICA</p>
            <p class="question-text">${phase.pregunta_biblica}</p>
            <div class="hint-box" style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid var(--primary);">
                <small style="color: var(--text-muted); text-transform: uppercase;">Respuesta sugerida:</small>
                <p style="font-size: 0.9rem; margin-top: 5px;">${phase.respuesta_biblica}</p>
            </div>
        `;

        this.cardFooter.innerHTML = `
            <div class="manual-validation">
                <button class="btn-primary" id="btn-correct">✅ RESPUESTA CORRECTA</button>
                <button class="btn-primary" id="btn-incorrect" style="background: var(--danger);">❌ INCORRECTA</button>
            </div>
        `;

        document.getElementById('btn-correct').onclick = () => this.handleBibleAnswer(true);
        document.getElementById('btn-incorrect').onclick = () => this.handleBibleAnswer(false);
    }

    handleBibleAnswer(isCorrect) {
        if (isCorrect) {
            this.inventory.wood++;
            this.showToast('+1 Madera conseguida');
            this.gameState = 'commentary-upgrade';
            this.updateVisuals();
            this.render();
        } else {
            this.showToast('Próxima oportunidad...');
            this.nextPhase();
        }
    }

    renderCommentaryUpgrade(phase) {
        const upgrade = phase.upgrade_comentario;
        this.cardContent.innerHTML = `
            <p class="question-type" style="color: var(--success); font-weight: 600; margin-bottom: 5px;">UPGRADE DE COMENTARIO ⚡</p>
            <p class="question-text">${upgrade.pregunta}</p>
            <div class="options-container">
                ${upgrade.opciones.map((opt, i) => `
                    <button class="option-btn" data-idx="${i}">
                        <span class="option-label" style="font-weight: 800; margin-right: 10px;">${String.fromCharCode(65 + i)}</span>
                        ${opt}
                    </button>
                `).join('')}
            </div>
        `;

        this.cardFooter.innerHTML = ''; // Options handle themselves

        const btns = this.cardContent.querySelectorAll('.option-btn');
        btns.forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                this.handleCommentaryAnswer(idx, upgrade.correcta);
            };
        });
    }

    handleCommentaryAnswer(selectedIdx, correctIdx) {
        const phase = studyData[this.currentPhaseIdx];
        const isCorrect = selectedIdx === correctIdx;

        if (isCorrect) {
            this.inventory.pitch++;
            this.showToast('+1 Brea para impermeabilizar');
            this.updateVisuals();
            this.showPowerup(phase.termino_griego);
        } else {
            this.showToast('No se obtuvo el upgrade.');
            setTimeout(() => this.nextPhase(), 1500);
        }
    }

    showPowerup(term) {
        document.getElementById('powerup-word').textContent = term.palabra;
        document.getElementById('powerup-meaning').textContent = term.significado;
        this.overlay.classList.remove('hidden');
    }

    nextPhase() {
        this.overlay.classList.add('hidden');
        if (this.currentPhaseIdx < this.maxPhases - 1) {
            this.currentPhaseIdx++;
            this.gameState = 'bible-question';
            this.updateProgress();
            this.render();
        } else {
            this.finishGame();
        }
    }

    updateVisuals() {
        // Simple visual feedback for construction
        const altar = document.querySelector('.altar-base');
        const arca = document.querySelector('.arca-skeleton');

        if (this.currentPhaseIdx < 2) {
           altar.classList.add('active');
           // Inyectar "piezas de oro"
           const gold = document.createElement('div');
           gold.style.cssText = `position:absolute; width:10px; height:5px; background: gold; top: ${Math.random()*40}px; left: ${Math.random()*80}px; border-radius: 2px;`;
           altar.appendChild(gold);
        } else {
           arca.classList.add('active');
           // Inyectar "madera/brea"
           const wood = document.createElement('div');
           wood.style.cssText = `position:absolute; width:40px; height:4px; background: #6d4c41; bottom: ${this.inventory.wood * 10}px; left: 20px; transition: all 1s; transform: rotate(${Math.random()*5}deg)`;
           arca.appendChild(wood);
           
           if (this.inventory.pitch > 0) {
               arca.style.borderBottom = `${this.inventory.pitch * 3}px solid black`;
           }
        }
    }

    finishGame() {
        this.cardHeader.textContent = "¡ESTADO FINAL!";
        const hasPitch = this.inventory.pitch > 0;
        const saved = this.phase4Correct && hasPitch;

        this.cardContent.innerHTML = `
            <div style="text-align: center;">
                <p style="font-size: 1.8rem; margin-bottom: 20px; font-weight: 800; color: ${saved ? 'var(--success)' : 'var(--danger)'};">
                    ${saved ? '🚢 ¡HAN ENTRADO AL ARCA!' : '🌊 El Arca no pudo ser abordada.'}
                </p>
                <p style="margin-bottom: 30px; line-height: 1.5;">
                    ${saved 
                        ? 'Felicidades equipo. Han respondido con precisión en el momento crítico y el Arca está impermeabilizada.' 
                        : this.phase4Correct 
                            ? 'Construyeron bien, pero faltó la brea (comentario) para que el Arca flotara.' 
                            : 'El error en la Fase 4 fue fatal. No se pudo entrar al Arca.'}
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
                    <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                        <span style="font-size: 2rem;">🪵</span>
                        <h3>${this.inventory.wood}</h3>
                        <p>Madera (Bíblica)</p>
                    </div>
                    <div class="stat-card" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
                        <span style="font-size: 2rem;">🕳️</span>
                        <h3>${this.inventory.pitch}</h3>
                        <p>Brea (Comentario)</p>
                    </div>
                </div>
                <p style="margin-top: 30px; font-style: italic; color: var(--text-muted);">
                    Humildad Final: ${this.humility}%
                </p>
            </div>
        `;
        this.cardFooter.innerHTML = `<button class="btn-primary" onclick="window.location.reload()">REINICIAR</button>`;
    }

    showToast(msg) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: var(--primary); color: var(--bg);
            padding: 12px 24px; border-radius: 8px;
            font-weight: 700; z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }
}

// Custom CSS for toast and other dynamic bits
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
`;
document.head.appendChild(style);

new BibleStudyGame();
