/* ==========================================================================
   Advanced D&D Game Engine v2.0 (script.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Player State ---
    const player = {
        name: "Hero",
        class: "rogue",
        level: 1,
        xp: 0,
        xpNext: 100,
        hp: 20,
        maxHp: 20,
        mp: 10,
        maxMp: 10,
        ac: 14,
        gold: 25,
        stats: { str: 10, dex: 16, int: 12, wis: 13 },
        inventory: [
            { id: 'potion', name: '🧪 Health Potion', hp: 10 },
            { id: 'elixir', name: '🧪 Mana Elixir', mp: 10 },
            { id: 'key', name: '🔑 Citadel Key', key: true }
        ]
    };

    let activeEnemy = null;
    let selectedDiceSides = 20;
    let turnCount = 1;

    // --- Story Nodes & Quests ---
    const storyNodes = {
        start: {
            title: "The Damp Crypts",
            sceneClass: "scene-crypt",
            text: "You step inside the Iron Citadel crypts. To the north sits a barred iron vault gate. To the west, ancient glyphs pulse upon a crumbling wall. A passage leads east toward a dimly lit guard room.",
            choices: [
                { text: "🗡️ Pick the Vault Gate Lock (DEX DC 12)", target: "check_lock" },
                { text: "🔮 Decipher Arcane Glyphs (INT DC 11)", target: "check_rune" },
                { text: "🚪 Explore the East Guard Room", target: "guard_room" }
            ]
        },
        guard_room: {
            title: "Guard Room",
            sceneClass: "scene-battle",
            text: "You open the creaky wooden door. A Skeletal Sentinel turns toward you, raising an obsidian blade!",
            enemy: { name: "Skeletal Sentinel", hp: 16, maxHp: 16, ac: 12, xp: 40, gold: 15 },
            choices: [
                { text: "⚔️ Attack with Weapon", action: "attack" },
                { text: "✨ Cast Magic Missile (Costs 4 MP)", action: "spell" },
                { text: "🛡️ Defend (Gain +2 AC this turn)", action: "defend" }
            ]
        },
        check_lock: {
            check: { stat: "dex", dc: 12 },
            successText: "Click! Your lockpicks align perfectly and unlock the heavy gate.",
            failText: "Snap! Your pick breaks and the loud noise echoes across the citadel!",
            successTarget: "vault",
            failTarget: "ambush"
        },
        check_rune: {
            check: { stat: "int", dc: 11 },
            successText: "You decipher the ward! Magic flows into your body, restoring 5 Mana and granting 25 XP.",
            failText: "The ward backfires with a sudden flash of heat!",
            successTarget: "rune_success",
            failTarget: "rune_fail"
        },
        rune_success: {
            title: "Arcane Sanctuary",
            sceneClass: "scene-vault",
            text: "The ancient rune leaves you feeling empowered and focused.",
            onEnter: () => {
                player.mp = Math.min(player.maxMp, player.mp + 5);
                addXp(25);
            },
            choices: [
                { text: "🚪 Head back to the Crypt Entrance", target: "start" }
            ]
        },
        rune_fail: {
            title: "Blast Ward",
            sceneClass: "scene-crypt",
            text: "You take 4 points of arcane flame damage.",
            onEnter: () => { takeDamage(4); },
            choices: [
                { text: "🚪 Step back safely", target: "start" }
            ]
        },
        ambush: {
            title: "Sentinel Ambush",
            sceneClass: "scene-battle",
            text: "Alerted by the noise, an Armor Sentinel charges at you!",
            enemy: { name: "Armor Sentinel", hp: 22, maxHp: 22, ac: 13, xp: 60, gold: 20 },
            choices: [
                { text: "⚔️ Fight Enemy", action: "attack" },
                { text: "✨ Cast Spell (4 MP)", action: "spell" }
            ]
        },
        vault: {
            title: "The Royal Treasury",
            sceneClass: "scene-vault",
            text: "Inside lies the radiant Sunstone Relic atop a glowing pedestal alongside chest full of gold!",
            onEnter: () => {
                player.gold += 50;
                addXp(50);
                addCombatLog("Found 50 Gold & Sunstone Relic!", "xp");
            },
            choices: [
                { text: "🏆 Complete Adventure & Restart", target: "start" }
            ]
        }
    };

    // --- DOM Elements ---
    const heroClassSelect = document.getElementById('heroClass');
    const playerClassBadge = document.getElementById('playerClassBadge');
    const playerLvlBadge = document.getElementById('playerLvlBadge');
    const xpText = document.getElementById('xpText');
    const hpBar = document.getElementById('hpBar');
    const hpText = document.getElementById('hpText');
    const mpBar = document.getElementById('mpBar');
    const mpText = document.getElementById('mpText');
    const acVal = document.getElementById('acVal');
    const goldVal = document.getElementById('goldVal');
    const strVal = document.getElementById('strVal');
    const dexVal = document.getElementById('dexVal');
    const intVal = document.getElementById('intVal');
    const wisVal = document.getElementById('wisVal');
    const inventoryList = document.getElementById('inventoryList');
    
    const sceneDisplay = document.getElementById('sceneDisplay');
    const sceneTitle = document.getElementById('sceneTitle');
    const enemyPanel = document.getElementById('enemyPanel');
    const enemyName = document.getElementById('enemyName');
    const enemyHpText = document.getElementById('enemyHpText');
    const enemyHpBar = document.getElementById('enemyHpBar');

    const storyLog = document.getElementById('storyLog');
    const choiceContainer = document.getElementById('choiceContainer');
    const combatLog = document.getElementById('combatLog');
    const diceVisual = document.getElementById('diceVisual');
    const manualRollBtn = document.getElementById('manualRollBtn');
    const turnCounter = document.getElementById('turnCounter');

    // --- Class Setup Function ---
    function updateClassStats() {
        const cls = heroClassSelect.value;
        player.class = cls;

        if (cls === 'rogue') {
            player.hp = 18; player.maxHp = 18; player.mp = 10; player.maxMp = 10; player.ac = 14;
            player.stats = { str: 10, dex: 16, int: 12, wis: 13 };
        } else if (cls === 'paladin') {
            player.hp = 26; player.maxHp = 26; player.mp = 12; player.maxMp = 12; player.ac = 17;
            player.stats = { str: 16, dex: 10, int: 9, wis: 14 };
        } else if (cls === 'wizard') {
            player.hp = 14; player.maxHp = 14; player.mp = 24; player.maxMp = 24; player.ac = 11;
            player.stats = { str: 8, dex: 14, int: 17, wis: 12 };
        } else if (cls === 'barbarian') {
            player.hp = 28; player.maxHp = 28; player.mp = 6; player.maxMp = 6; player.ac = 13;
            player.stats = { str: 17, dex: 13, int: 8, wis: 11 };
        }

        playerClassBadge.textContent = cls.toUpperCase();
        renderPlayerSheet();
    }

    function renderPlayerSheet() {
        hpBar.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
        hpText.textContent = `${player.hp} / ${player.maxHp}`;
        
        mpBar.style.width = `${Math.max(0, (player.mp / player.maxMp) * 100)}%`;
        mpText.textContent = `${player.mp} / ${player.maxMp}`;

        acVal.textContent = player.ac;
        goldVal.textContent = `🪙 ${player.gold}`;
        playerLvlBadge.textContent = `Lvl ${player.level}`;
        xpText.textContent = `XP: ${player.xp} / ${player.xpNext}`;

        strVal.textContent = `${player.stats.str} (${getModStr(player.stats.str)})`;
        dexVal.textContent = `${player.stats.dex} (${getModStr(player.stats.dex)})`;
        intVal.textContent = `${player.stats.int} (${getModStr(player.stats.int)})`;
        wisVal.textContent = `${player.stats.wis} (${getModStr(player.stats.wis)})`;

        // Render Inventory
        inventoryList.innerHTML = '';
        player.inventory.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${item.name}</span>`;
            if (item.hp || item.mp) {
                const btn = document.createElement('button');
                btn.className = 'btn-use';
                btn.textContent = 'Use';
                btn.addEventListener('click', () => useItem(index));
                li.appendChild(btn);
            }
            inventoryList.appendChild(li);
        });
    }

    function useItem(index) {
        const item = player.inventory[index];
        if (item.hp) {
            player.hp = Math.min(player.maxHp, player.hp + item.hp);
            addCombatLog(`Used ${item.name}: +${item.hp} HP`, 'success');
        } else if (item.mp) {
            player.mp = Math.min(player.maxMp, player.mp + item.mp);
            addCombatLog(`Used ${item.name}: +${item.mp} MP`, 'success');
        }
        player.inventory.splice(index, 1);
        renderPlayerSheet();
    }

    function takeDamage(amt) {
        player.hp = Math.max(0, player.hp - amt);
        renderPlayerSheet();
        if (player.hp <= 0) {
            addCombatLog("You have been defeated in battle!", "danger");
            alert("Game Over! Restarting your journey...");
            player.hp = player.maxHp;
            loadStoryNode('start');
        }
    }

    function addXp(amt) {
        player.xp += amt;
        if (player.xp >= player.xpNext) {
            player.level++;
            player.xp -= player.xpNext;
            player.xpNext = Math.floor(player.xpNext * 1.5);
            player.maxHp += 5;
            player.hp = player.maxHp;
            addCombatLog(`🎉 LEVEL UP! You reached Level ${player.level}! Max HP increased!`, 'xp');
        }
        renderPlayerSheet();
    }

    function getMod(val) { return Math.floor((val - 10) / 2); }
    function getModStr(val) {
        const mod = getMod(val);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    }

    // --- Dice Animation Engine ---
    function rollDice(sides = 20) {
        diceVisual.classList.add('rolling');
        const result = Math.floor(Math.random() * sides) + 1;
        
        setTimeout(() => {
            diceVisual.textContent = result;
            diceVisual.classList.remove('rolling');
        }, 300);
        
        return result;
    }

    function addCombatLog(msg, type = 'info') {
        const li = document.createElement('li');
        li.className = `log-entry ${type}`;
        li.textContent = msg;
        combatLog.prepend(li);
    }

    // --- Story & Battle Navigation ---
    function loadStoryNode(nodeKey) {
        const node = storyNodes[nodeKey];
        if (!node) return;

        turnCount++;
        turnCounter.textContent = `Turn: ${turnCount}`;
        choiceContainer.innerHTML = '';

        if (node.title) sceneTitle.textContent = node.title;
        if (node.sceneClass) sceneDisplay.className = `scene-banner ${node.sceneClass}`;

        if (node.onEnter) node.onEnter();

        if (node.enemy) {
            activeEnemy = { ...node.enemy };
            enemyPanel.classList.remove('hidden');
            renderEnemy();
        } else {
            activeEnemy = null;
            enemyPanel.classList.add('hidden');
        }

        if (node.check) {
            const roll = rollDice(20);
            const mod = getMod(player.stats[node.check.stat]);
            const total = roll + mod;
            const success = total >= node.check.dc;

            addCombatLog(`Check ${node.check.stat.toUpperCase()}: Roll (${roll}) + Mod (${mod}) = ${total} vs DC ${node.check.dc}`, success ? 'success' : 'danger');

            const p = document.createElement('p');
            p.className = 'story-p';
            p.textContent = success ? node.successText : node.failText;
            storyLog.appendChild(p);
            storyLog.scrollTop = storyLog.scrollHeight;

            loadStoryNode(success ? node.successTarget : node.failTarget);
            return;
        }

        const p = document.createElement('p');
        p.className = 'story-p';
        p.textContent = node.text;
        storyLog.appendChild(p);
        storyLog.scrollTop = storyLog.scrollHeight;

        if (node.choices) {
            node.choices.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.textContent = c.text;
                btn.addEventListener('click', () => {
                    if (c.action === 'attack') handleAttack();
                    else if (c.action === 'spell') handleSpell();
                    else if (c.action === 'defend') handleDefend();
                    else if (c.target) loadStoryNode(c.target);
                });
                choiceContainer.appendChild(btn);
            });
        }
    }

    function renderEnemy() {
        if (!activeEnemy) return;
        enemyName.textContent = activeEnemy.name;
        enemyHpText.textContent = `HP: ${activeEnemy.hp} / ${activeEnemy.maxHp}`;
        enemyHpBar.style.width = `${Math.max(0, (activeEnemy.hp / activeEnemy.maxHp) * 100)}%`;
    }

    function handleAttack() {
        if (!activeEnemy) return;
        const roll = rollDice(20);
        const mod = getMod(player.stats.str > player.stats.dex ? player.stats.str : player.stats.dex);
        const total = roll + mod;

        if (total >= activeEnemy.ac) {
            const dmg = Math.floor(Math.random() * 6) + 3 + mod;
            activeEnemy.hp -= dmg;
            addCombatLog(`⚔️ Attack HIT (${total} vs AC ${activeEnemy.ac})! Dealt ${dmg} damage to ${activeEnemy.name}.`, 'success');
        } else {
            addCombatLog(`⚔️ Attack MISSED (${total} vs AC ${activeEnemy.ac})!`, 'danger');
        }

        renderEnemy();
        checkEnemyState();
    }

    function handleSpell() {
        if (!activeEnemy) return;
        if (player.mp < 4) {
            addCombatLog("Not enough Mana!", "danger");
            return;
        }
        player.mp -= 4;
        renderPlayerSheet();
        const dmg = Math.floor(Math.random() * 8) + 6 + getMod(player.stats.int);
        activeEnemy.hp -= dmg;
        addCombatLog(`✨ Magic Missile HIT! Dealt ${dmg} arcane damage to ${activeEnemy.name}.`, 'success');
        
        renderEnemy();
        checkEnemyState();
    }

    function handleDefend() {
        addCombatLog("🛡️ You assume a defensive guard position (+2 AC).", "info");
        enemyRetaliate(true);
    }

    function checkEnemyState() {
        if (activeEnemy.hp <= 0) {
            addCombatLog(`☠️ Defeated ${activeEnemy.name}! Gained ${activeEnemy.xp} XP & 🪙 ${activeEnemy.gold} Gold.`, 'xp');
            player.gold += activeEnemy.gold;
            addXp(activeEnemy.xp);
            activeEnemy = null;
            enemyPanel.classList.add('hidden');
            loadStoryNode('vault');
        } else {
            enemyRetaliate(false);
        }
    }

    function enemyRetaliate(isGuarding) {
        setTimeout(() => {
            if (!activeEnemy) return;
            const roll = rollDice(20);
            const targetAc = player.ac + (isGuarding ? 2 : 0);
            
            if (roll >= targetAc) {
                const dmg = Math.floor(Math.random() * 5) + 2;
                addCombatLog(`👹 ${activeEnemy.name} attacks and HITS for ${dmg} damage!`, 'danger');
                takeDamage(dmg);
            } else {
                addCombatLog(`👹 ${activeEnemy.name} attacks and MISSES your armor!`, 'success');
            }
        }, 400);
    }

    // --- Controls ---
    heroClassSelect.addEventListener('change', updateClassStats);
    diceVisual.addEventListener('click', () => rollDice(selectedDiceSides));
    manualRollBtn.addEventListener('click', () => rollDice(selectedDiceSides));

    document.querySelectorAll('.btn-dice').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-dice').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDiceSides = parseInt(btn.getAttribute('data-sides'));
        });
    });

    // --- Initialize ---
    updateClassStats();
    loadStoryNode('start');
});
