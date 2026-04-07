import { gameNodes } from './database.js';

class SovereignDomainEngine {
    constructor() {
        this.nodes = [...gameNodes];
        this.scores = { a: 0, b: 0 };
        this.activeNodeIdx = null;
        this.currentMode = 'idle'; // idle, claiming, consolidating, hacking
        
        // UI Cache
        this.mapNodesGroup = document.getElementById('map-nodes');
        this.mapLinesGroup = document.getElementById('map-lines');
        this.scoreA = document.getElementById('score-a');
        this.scoreB = document.getElementById('score-b');
        this.powerA = document.getElementById('power-a');
        this.powerB = document.getElementById('power-b');
        this.overlay = document.getElementById('overlay');
        this.actionModal = document.getElementById('action-modal');
        this.readingMode = document.getElementById('reading-mode');
        this.modalQuestion = document.getElementById('modal-question');
        this.modalControls = document.getElementById('modal-controls');
        this.modalType = document.getElementById('modal-type-indicator');
        this.modalVerse = document.getElementById('modal-verse');
        this.actionLabel = document.getElementById('current-action-label');
        
        this.init();
    }

    init() {
        this.renderMap();
        document.getElementById('close-reading').onclick = () => this.closeOverlays();
        document.getElementById('btn-reset').onclick = () => window.location.reload();
        this.updateLeaderboard();
    }

    renderMap() {
        this.mapNodesGroup.innerHTML = '';
        this.mapLinesGroup.innerHTML = '';

        const nodePositions = [
            { x: 150, y: 150 }, { x: 400, y: 100 }, { x: 650, y: 150 },
            { x: 150, y: 350 }, { x: 400, y: 400 }, { x: 650, y: 350 }
        ];

        // Render Lines
        for(let i = 0; i < nodePositions.length - 1; i++) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", nodePositions[i].x);
            line.setAttribute("y1", nodePositions[i].y);
            line.setAttribute("x2", nodePositions[i+1].x);
            line.setAttribute("y2", nodePositions[i+1].y);
            line.setAttribute("class", "map-connection");
            this.mapLinesGroup.appendChild(line);
        }

        // Render Nodes
        this.nodes.forEach((node, i) => {
            const pos = nodePositions[i];
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("class", `map-node ${this.getNodeClasses(node)}`);
            group.setAttribute("data-idx", i);
            group.onclick = () => this.handleNodeClick(i);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", 20);
            
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", pos.x);
            label.setAttribute("y", pos.y);
            label.setAttribute("class", "node-label");
            label.textContent = i + 1;

            group.appendChild(circle);
            group.appendChild(label);
            this.mapNodesGroup.appendChild(group);
        });
    }

    getNodeClasses(node) {
        let classes = node.status;
        if (node.status.includes('TeamA')) classes += ' team-a';
        if (node.status.includes('TeamB')) classes += ' team-b';
        if (node.status.includes('unstable')) classes += ' unstable';
        if (node.status.includes('locked')) classes += ' locked';
        if (node.status.includes('vulnerable')) classes += ' vulnerable';
        return classes;
    }

    handleNodeClick(idx) {
        const node = this.nodes[idx];
        if (node.status === 'neutral') {
            this.startAssault(idx);
        } else if (node.status.includes('unstable')) {
            this.startConsolidation(idx);
        } else if (node.status.includes('vulnerable')) {
            this.startHack(idx);
        }
    }

    // --- GAME STATES ---

    startAssault(idx) {
        this.activeNodeIdx = idx;
        const node = this.nodes[idx];
        this.currentMode = 'claiming';
        this.showModal("THE ASSAULT", node.verse, node.clue, [
            { text: "ALPHA CLAIM", class: "btn-tech", callback: () => this.claimNode(idx, 'TeamA') },
            { text: "BRAVO CLAIM", class: "btn-tech", callback: () => this.claimNode(idx, 'TeamB') }
        ]);
        this.actionLabel.textContent = `Assaulting Node ${idx + 1}...`;
    }

    claimNode(idx, team) {
        const node = this.nodes[idx];
        node.status = `${team}_unstable`;
        this.renderMap();
        this.startConsolidation(idx);
    }

    startConsolidation(idx) {
        this.activeNodeIdx = idx;
        const node = this.nodes[idx];
        const team = node.status.split('_')[0];
        this.currentMode = 'consolidating';
        this.showModal("CONSOLIDATION", node.verse, node.lock_question, [
            { text: "LOCKED ACCESS", class: "btn-tech", callback: () => this.lockNode(idx, team, false) },
            { text: "GREEK MASTERY (SHIELD)", class: "btn-tech", callback: () => this.lockNode(idx, team, true) },
            { text: "FAIL / VULNERABLE", class: "btn-tech", callback: () => this.makeVulnerable(idx, team) }
        ]);
    }

    lockNode(idx, team, withShield) {
        const node = this.nodes[idx];
        node.status = `${team}_locked`;
        node.shield = withShield;
        this.scores[team === 'TeamA' ? 'a' : 'b'] += node.points + (withShield ? 50 : 0);
        this.showReadingMode(node.explanation + (withShield ? "<br><br><b>🛡️ ESCUDO DE CONCIENCIA ACTIVADO:</b> El término griego ha sido masterizado." : ""));
        this.renderMap();
        this.updateLeaderboard();
        this.actionLabel.textContent = `Node ${idx + 1} Secured by ${team}`;
    }

    makeVulnerable(idx, team) {
        const node = this.nodes[idx];
        node.status = `${team}_vulnerable`;
        this.renderMap();
        this.showReadingMode("Node integrity compromised. Opposite team can now attempt to HACK.");
        this.actionLabel.textContent = `Node ${idx + 1} Vulnerable!`;
    }

    startHack(idx) {
        this.activeNodeIdx = idx;
        const node = this.nodes[idx];
        const victimTeam = node.status.split('_')[0];
        const hackerTeam = victimTeam === 'TeamA' ? 'TeamB' : 'TeamA';
        
        this.currentMode = 'hacking';
        this.showModal("HACKING ATTEMPT", node.verse, `Hacker Team (${hackerTeam}): ${node.lock_question}`, [
            { text: "HACK SUCCESSFUL", class: "btn-tech", callback: () => this.lockNode(idx, hackerTeam) },
            { text: "HACK FAILED", class: "btn-tech", callback: () => this.closeOverlays() }
        ]);
    }

    // --- UI HELPERS ---

    showModal(type, verse, question, controls) {
        this.modalType.textContent = type;
        this.modalVerse.textContent = `NODE // ${verse}`;
        this.modalQuestion.textContent = question;
        this.modalControls.innerHTML = '';
        
        controls.forEach(ctrl => {
            const btn = document.createElement('button');
            btn.textContent = ctrl.text;
            btn.className = ctrl.class;
            btn.onclick = ctrl.callback;
            this.modalControls.appendChild(btn);
        });

        this.overlay.classList.remove('hidden');
        this.actionModal.classList.remove('hidden');
        this.readingMode.classList.add('hidden');
    }

    showReadingMode(content) {
        const node = this.nodes[this.activeNodeIdx];
        document.getElementById('reading-content').innerHTML = node ? node.explanation : content;
        this.overlay.classList.remove('hidden');
        this.actionModal.classList.add('hidden');
        this.readingMode.classList.remove('hidden');
    }

    closeOverlays() {
        this.overlay.classList.add('hidden');
        this.currentMode = 'idle';
    }

    updateLeaderboard() {
        this.scoreA.textContent = this.scores.a.toString().padStart(4, '0');
        this.scoreB.textContent = this.scores.b.toString().padStart(4, '0');
        
        const totalPoints = this.nodes.reduce((acc, n) => acc + n.points, 0);
        this.powerA.style.width = `${(this.scores.a / totalPoints) * 100}%`;
        this.powerB.style.width = `${(this.scores.b / totalPoints) * 100}%`;
        
        const captured = this.nodes.filter(n => n.status.includes('locked')).length;
        document.getElementById('node-stats').textContent = `${captured} / ${this.nodes.length}`;
    }
}

new SovereignDomainEngine();
