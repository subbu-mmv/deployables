/**
 * scripts.js
 * Tambola Ledger Calculations & State Engine
 */

const DEFAULT_CATEGORIES = [
  { id: 'jaldi5', name: 'Jaldi 5', percent: 15, amount: 0, winners: [] },
  { id: 'firstLine', name: 'First Line', percent: 15, amount: 0, winners: [] },
  { id: 'secondLine', name: 'Second Line', percent: 15, amount: 0, winners: [] },
  { id: 'thirdLine', name: 'Third Line', percent: 15, amount: 0, winners: [] },
  { id: 'housie', name: 'Full House (1st)', percent: 30, amount: 0, winners: [] },
  { id: 'secondHousie', name: 'Second Full House', percent: 10, amount: 0, winners: [] }
];

const STORAGE_KEY = 'TAMBOLA_LEDGER_STORAGE_V3';

let state = {
  currency: '₹',
  roundNumber: 1,
  increment: 5,
  ticketPrice: 20,
  players: [],
  ticketsPerPlayer: {},
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  roundsHistory: []
};

// Set of selected round IDs for deletion
let selectedHistoryRoundIds = new Set();

// =============================================================================
// INITIALIZATION
// =============================================================================
window.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();

  if (!state.players || state.players.length === 0) {
    state.players = [
      { id: 'p1', name: 'Amit' },
      { id: 'p2', name: 'Ananya' },
      { id: 'p3', name: 'Deepak' },
      { id: 'p4', name: 'Pooja' },
      { id: 'p5', name: 'Rahul' },
      { id: 'p6', name: 'Sneha' }
    ];
    state.players.forEach(p => { state.ticketsPerPlayer[p.id] = 1; });
    saveToStorage();
  }

  // Ensure missing ticket counts default to 1
  state.players.forEach(p => {
    if (state.ticketsPerPlayer[p.id] === undefined) state.ticketsPerPlayer[p.id] = 1;
  });

  recalculateAmountsFromPercentages();
  renderAll();
});

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
      if (!state.categories || state.categories.length === 0) {
        state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
      }
    }
  } catch (e) {
    console.error('Storage load error:', e);
  }
}

// =============================================================================
// RENDER DISPATCHER
// =============================================================================
function renderAll() {
  document.getElementById('headerRoundBadge').textContent = `Round ${state.roundNumber}`;
  document.getElementById('headerSummaryText').textContent = 
    `${state.players.length} players • ${state.roundsHistory.length} rounds logged`;
  document.getElementById('desktopPlayerCount').textContent = state.players.length;
  document.getElementById('totalPlayersBadge').textContent = `${state.players.length} People`;

  document.getElementById('incrementInput').value = state.increment;
  document.getElementById('ticketPriceInput').value = state.ticketPrice;

  renderPlayerTicketRows();
  updatePoolCalculations();
  renderCategorySplitRows();
  renderWinAccordions();
  renderPeopleList();
  renderHistoryTab();
  renderSettlementsTab();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const activeEl = document.getElementById('tab-' + tabId);
  if (activeEl) activeEl.classList.remove('hidden');

  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.className = 'tab-button py-2.5 rounded-lg text-slate-400 hover:text-white';
  });
  const activeDesktopBtn = document.getElementById('desktopTabBtn-' + tabId);
  if (activeDesktopBtn) {
    activeDesktopBtn.className = 'tab-button active py-2.5 rounded-lg bg-amber-500 text-dark-950 font-bold shadow';
  }

  ['round', 'players', 'history', 'settlements'].forEach(t => {
    const mobBtn = document.getElementById('mobileTabBtn-' + t);
    if (mobBtn) {
      mobBtn.className = t === tabId 
        ? 'flex flex-col items-center py-1 px-3 text-amber-400 font-bold' 
        : 'flex flex-col items-center py-1 px-3 text-slate-400';
    }
  });

  if (tabId === 'history') renderHistoryTab();
  if (tabId === 'settlements') renderSettlementsTab();
}

// =============================================================================
// POOL, INCREMENTS & TICKETS
// =============================================================================
function adjustIncrement(delta) {
  const inc = Math.max(1, (parseInt(state.increment) || 5) + delta);
  handleIncrementChange(inc);
}

function handleIncrementChange(val) {
  state.increment = Math.max(1, parseInt(val) || 1);
  if (state.ticketPrice % state.increment !== 0) {
    state.ticketPrice = Math.max(state.increment, Math.round(state.ticketPrice / state.increment) * state.increment);
    document.getElementById('ticketPriceInput').value = state.ticketPrice;
  }
  recalculateAmountsFromPercentages();
  saveToStorage();
  renderAll();
}

function adjustTicketPrice(delta) {
  const step = parseInt(state.increment) || 5;
  const next = Math.max(step, (parseInt(state.ticketPrice) || 20) + (delta * step));
  handleTicketPriceChange(next);
}

function handleTicketPriceChange(val) {
  state.ticketPrice = Math.max(1, parseInt(val) || 1);
  recalculateAmountsFromPercentages();
  saveToStorage();
  updatePoolCalculations();
  renderCategorySplitRows();
}

function getTotalTicketsSold() {
  return state.players.reduce((acc, p) => acc + (parseInt(state.ticketsPerPlayer[p.id]) || 0), 0);
}

function getTotalPoolAmount() {
  return getTotalTicketsSold() * (parseInt(state.ticketPrice) || 0);
}

function updatePoolCalculations() {
  const totalTickets = getTotalTicketsSold();
  const pool = getTotalPoolAmount();

  document.getElementById('quickPoolDisplay').textContent = `${state.currency}${formatNumber(pool)}`;
  document.getElementById('bannerTotalTickets').textContent = totalTickets;
  document.getElementById('bannerTicketPrice').textContent = `${state.currency}${state.ticketPrice}`;
  document.getElementById('bannerPoolAmount').textContent = `${state.currency}${formatNumber(pool)}`;

  validatePrizeSumBalance();
}

function renderPlayerTicketRows() {
  const container = document.getElementById('playerTicketsGrid');
  if (!container) return;

  container.innerHTML = getAlphabeticalPlayers().map(p => {
    const tCount = state.ticketsPerPlayer[p.id] !== undefined ? state.ticketsPerPlayer[p.id] : 1;
    const isPlaying = tCount > 0;
    return `
      <div class="flex items-center justify-between p-2 rounded-xl border ${isPlaying ? 'bg-dark-950 border-dark-800' : 'bg-dark-950/40 border-dark-800/40 opacity-60'}">
        <span class="text-xs font-semibold text-slate-200 truncate max-w-[120px] sm:max-w-none">
          ${escapeHtml(p.name)}
        </span>
        <div class="flex items-center space-x-1">
          <button type="button" onclick="adjustPlayerTickets('${p.id}', -1)" class="w-7 h-7 rounded bg-dark-850 hover:bg-dark-700 text-slate-300 font-bold text-xs border border-dark-700">−</button>
          <input type="number" min="0" value="${tCount}" onchange="setPlayerTicketExact('${p.id}', this.value)" class="w-10 bg-dark-900 border border-dark-700 rounded py-0.5 text-center font-mono font-bold text-xs text-amber-400">
          <button type="button" onclick="adjustPlayerTickets('${p.id}', 1)" class="w-7 h-7 rounded bg-dark-850 hover:bg-dark-700 text-slate-300 font-bold text-xs border border-dark-700">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function adjustPlayerTickets(pid, delta) {
  const cur = state.ticketsPerPlayer[pid] !== undefined ? state.ticketsPerPlayer[pid] : 1;
  state.ticketsPerPlayer[pid] = Math.max(0, cur + delta);
  afterTicketCountChanged();
}

function setPlayerTicketExact(pid, val) {
  state.ticketsPerPlayer[pid] = Math.max(0, parseInt(val) || 0);
  afterTicketCountChanged();
}

function setAllTickets(count) {
  state.players.forEach(p => { state.ticketsPerPlayer[p.id] = count; });
  afterTicketCountChanged();
  showToast(`All players set to ${count} tickets`);
}

function afterTicketCountChanged() {
  saveToStorage();
  renderPlayerTicketRows();
  recalculateAmountsFromPercentages();
  updatePoolCalculations();
  renderWinAccordions();
}

// =============================================================================
// PRIZE CATEGORIES & ALLOCATION
// =============================================================================
function recalculateAmountsFromPercentages() {
  const pool = getTotalPoolAmount();
  const inc = Math.max(1, parseInt(state.increment) || 5);

  if (pool === 0) {
    state.categories.forEach(c => { c.amount = 0; });
    renderCategorySplitRows();
    validatePrizeSumBalance();
    return;
  }

  let runningSum = 0;
  state.categories.forEach(cat => {
    const rawVal = (pool * (cat.percent || 0)) / 100;
    const rounded = Math.round(rawVal / inc) * inc;
    cat.amount = rounded;
    runningSum += rounded;
  });

  const diff = pool - runningSum;
  if (diff !== 0) {
    const target = state.categories.find(c => c.id === 'housie') || state.categories[0];
    if (target) target.amount = Math.max(0, target.amount + diff);
  }

  saveToStorage();
  renderCategorySplitRows();
  validatePrizeSumBalance();
}

function renderCategorySplitRows() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;

  container.innerHTML = state.categories.map(cat => `
    <div class="flex items-center justify-between p-2.5 bg-dark-950 rounded-xl border border-dark-800 text-xs">
      <input type="text" value="${escapeHtml(cat.name)}" onchange="updateCategoryName('${cat.id}', this.value)" class="bg-transparent font-semibold text-slate-200 border-b border-transparent hover:border-dark-700 focus:border-amber-400 focus:outline-none flex-1 max-w-[130px] sm:max-w-none">

      <div class="flex items-center space-x-2">
        <div class="flex items-center">
          <input type="number" min="0" max="100" value="${cat.percent}" onchange="updateCategoryPercent('${cat.id}', this.value)" class="w-10 bg-dark-900 border border-dark-700 rounded py-0.5 text-center font-mono text-slate-300">
          <span class="text-slate-400 ml-0.5">%</span>
        </div>

        <div class="flex items-center space-x-1">
          <button type="button" onclick="adjustCategoryAmount('${cat.id}', -1)" class="w-6 h-6 rounded bg-dark-850 hover:bg-dark-700 text-slate-300 font-bold border border-dark-700">−</button>
          <input type="number" value="${cat.amount}" onchange="setCategoryAmountExact('${cat.id}', this.value)" class="w-16 bg-dark-900 border border-dark-700 rounded py-0.5 text-right font-mono font-bold text-amber-400 pr-1">
          <button type="button" onclick="adjustCategoryAmount('${cat.id}', 1)" class="w-6 h-6 rounded bg-dark-850 hover:bg-dark-700 text-slate-300 font-bold border border-dark-700">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateCategoryName(catId, newName) {
  const cat = state.categories.find(c => c.id === catId);
  if (cat && newName.trim()) {
    cat.name = newName.trim();
    saveToStorage();
    renderWinAccordions();
  }
}

function updateCategoryPercent(catId, val) {
  const cat = state.categories.find(c => c.id === catId);
  if (cat) {
    cat.percent = Math.max(0, parseFloat(val) || 0);
    recalculateAmountsFromPercentages();
  }
}

function adjustCategoryAmount(catId, dir) {
  const cat = state.categories.find(c => c.id === catId);
  const inc = parseInt(state.increment) || 5;
  if (cat) {
    cat.amount = Math.max(0, (parseInt(cat.amount) || 0) + (dir * inc));
    const pool = getTotalPoolAmount();
    if (pool > 0) cat.percent = Math.round((cat.amount / pool) * 100);
    saveToStorage();
    renderCategorySplitRows();
    validatePrizeSumBalance();
    renderWinAccordions();
  }
}

function setCategoryAmountExact(catId, val) {
  const cat = state.categories.find(c => c.id === catId);
  const inc = parseInt(state.increment) || 5;
  if (cat) {
    cat.amount = Math.round(Math.max(0, parseInt(val) || 0) / inc) * inc;
    const pool = getTotalPoolAmount();
    if (pool > 0) cat.percent = Math.round((cat.amount / pool) * 100);
    saveToStorage();
    renderCategorySplitRows();
    validatePrizeSumBalance();
    renderWinAccordions();
  }
}

function validatePrizeSumBalance() {
  const pool = getTotalPoolAmount();
  const sumPrizes = state.categories.reduce((acc, c) => acc + (parseInt(c.amount) || 0), 0);
  const diff = pool - sumPrizes;

  const badge = document.getElementById('prizeBalanceBadge');
  const dot = document.getElementById('balanceIndicatorDot');
  const text = document.getElementById('balanceText');
  const finishBtn = document.getElementById('finishRoundBtn');

  if (pool === 0) {
    badge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-dark-800 text-slate-400 border border-dark-700';
    dot.className = 'w-2 h-2 rounded-full bg-slate-500';
    text.textContent = 'No tickets';
    if (finishBtn) finishBtn.disabled = true;
    return false;
  }

  if (diff === 0) {
    badge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40';
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
    text.textContent = `Balanced: ₹${formatNumber(sumPrizes)}`;
    if (finishBtn) finishBtn.disabled = false;
    return true;
  } else {
    badge.className = 'inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-500/40';
    dot.className = 'w-2 h-2 rounded-full bg-rose-400 animate-pulse';
    text.textContent = `Diff: ${diff > 0 ? '+' : ''}₹${diff}`;
    if (finishBtn) finishBtn.disabled = true;
    return false;
  }
}

// =============================================================================
// CLAIM WINNERS (Active Ticket Holders & >₹0 Categories Only)
// =============================================================================
function renderWinAccordions() {
  const container = document.getElementById('winCategoryAccordions');
  if (!container) return;

  const activeTicketHolders = getAlphabeticalPlayers().filter(p => (state.ticketsPerPlayer[p.id] || 0) > 0);
  document.getElementById('activeHoldersBadge').textContent = `${activeTicketHolders.length} playing`;

  const activeCategories = state.categories.filter(c => (c.amount || 0) > 0);

  if (activeCategories.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-dark-950 rounded-xl border border-dark-800 text-center text-xs text-slate-500">
        No prize categories currently allocated (> ₹0). Set up ticket price and ticket counts first.
      </div>
    `;
    return;
  }

  if (activeTicketHolders.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-dark-950 rounded-xl border border-dark-800 text-center text-xs text-slate-400">
        No active ticket holders. Add tickets to players above to select winners.
      </div>
    `;
    return;
  }

  container.innerHTML = activeCategories.map((cat, idx) => {
    cat.winners = (cat.winners || []).filter(wId => (state.ticketsPerPlayer[wId] || 0) > 0);

    const winnersCount = cat.winners.length;
    const share = winnersCount > 0 ? Math.floor(cat.amount / winnersCount) : cat.amount;
    const winnerNames = cat.winners.map(wId => state.players.find(x => x.id === wId)?.name || 'Unknown');
    const isOpen = idx === 0;

    return `
      <div class="bg-dark-950 border border-dark-800 rounded-xl overflow-hidden transition">
        <button type="button" onclick="toggleAccordion('${cat.id}')" class="w-full p-3 text-left flex items-center justify-between hover:bg-dark-850/60 transition gap-2">
          <div class="flex-1">
            <div class="flex items-center space-x-2">
              <span class="font-bold text-white text-xs sm:text-sm">${escapeHtml(cat.name)}</span>
              <span class="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                ${state.currency}${formatNumber(cat.amount)}
              </span>
              ${winnersCount > 1 ? `<span class="text-[10px] text-emerald-400 font-mono font-semibold">(${state.currency}${formatNumber(share)} each)</span>` : ''}
            </div>

            <div class="flex flex-wrap gap-1 mt-1">
              ${winnerNames.length > 0 ? winnerNames.map(n => `
                <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  🏆 ${escapeHtml(n)}
                </span>
              `).join('') : `<span class="text-[10px] text-slate-500 italic">No winners selected</span>`}
            </div>
          </div>

          <svg id="arrow-${cat.id}" class="w-4 h-4 text-slate-400 transform transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>

        <div id="content-${cat.id}" class="${isOpen ? '' : 'hidden'} p-3 bg-dark-900 border-t border-dark-800">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${activeTicketHolders.map(p => {
              const isChecked = cat.winners.includes(p.id);
              return `
                <label class="flex items-center space-x-2 p-2 rounded-lg border ${isChecked ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold' : 'bg-dark-950 border-dark-800 text-slate-300 hover:border-dark-700'} cursor-pointer text-xs transition">
                  <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCategoryWinner('${cat.id}', '${p.id}', this.checked)" class="w-3.5 h-3.5 rounded text-amber-500 bg-dark-850 border-dark-700">
                  <span class="truncate">${escapeHtml(p.name)}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleAccordion(catId) {
  const panel = document.getElementById('content-' + catId);
  const arrow = document.getElementById('arrow-' + catId);
  if (panel) {
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);
    if (arrow) arrow.classList.toggle('rotate-180', isHidden);
  }
}

function toggleCategoryWinner(catId, pid, isChecked) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;
  if (!cat.winners) cat.winners = [];

  if (isChecked) {
    if (!cat.winners.includes(pid)) cat.winners.push(pid);
  } else {
    cat.winners = cat.winners.filter(id => id !== pid);
  }
  saveToStorage();
  renderWinAccordions();
}

// =============================================================================
// FINISH ROUND & CELEBRATION (Idempotent update; no duplicate on dismiss)
// =============================================================================
function handleFinishRound() {
  if (!validatePrizeSumBalance()) {
    showToast('Prize sum does not match pool. Re-balance before finishing!');
    return;
  }

  const playerWins = {};
  state.players.forEach(p => {
    playerWins[p.id] = {
      player: p,
      categoriesWon: [],
      totalWon: 0,
      ticketsBought: state.ticketsPerPlayer[p.id] || 0,
      ticketExpense: (state.ticketsPerPlayer[p.id] || 0) * state.ticketPrice
    };
  });

  state.categories.forEach(cat => {
    if (cat.amount > 0 && cat.winners && cat.winners.length > 0) {
      const share = Math.floor(cat.amount / cat.winners.length);
      cat.winners.forEach(wId => {
        if (playerWins[wId]) {
          playerWins[wId].categoriesWon.push(cat.name);
          playerWins[wId].totalWon += share;
        }
      });
    }
  });

  const sortedStandings = Object.values(playerWins).sort((a, b) => {
    if (b.totalWon !== a.totalWon) return b.totalWon - a.totalWon;
    return a.player.name.localeCompare(b.player.name);
  });

  const roundSnapshot = {
    id: 'rnd_' + state.roundNumber,
    roundNumber: state.roundNumber,
    timestamp: Date.now(),
    ticketPrice: state.ticketPrice,
    increment: state.increment,
    pool: getTotalPoolAmount(),
    ticketsSnapshot: { ...state.ticketsPerPlayer },
    categories: JSON.parse(JSON.stringify(state.categories)),
    standings: sortedStandings
  };

  const existingIdx = state.roundsHistory.findIndex(r => r.roundNumber === state.roundNumber);
  if (existingIdx >= 0) {
    state.roundsHistory[existingIdx] = roundSnapshot;
    showToast(`Round ${state.roundNumber} updated!`);
  } else {
    state.roundsHistory.push(roundSnapshot);
    showToast(`Round ${state.roundNumber} saved!`);
  }

  saveToStorage();
  renderHistoryTab();
  renderSettlementsTab();

  document.getElementById('finishModalRoundTitle').textContent = `Round ${state.roundNumber} Complete`;
  const tableBody = document.getElementById('roundFinishedTableBody');
  tableBody.innerHTML = sortedStandings.map((s, i) => `
    <tr class="hover:bg-dark-850/50">
      <td class="py-2 px-3 font-semibold text-white">
        <span class="font-mono text-slate-500 mr-1.5">#${i + 1}</span>${escapeHtml(s.player.name)}
      </td>
      <td class="py-2 px-2">
        ${s.categoriesWon.length > 0 
          ? s.categoriesWon.map(c => `<span class="inline-block px-1.5 py-0.2 mr-1 rounded bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20">${escapeHtml(c)}</span>`).join('') 
          : `<span class="text-slate-500 text-[10px]">-</span>`}
      </td>
      <td class="py-2 px-3 text-right font-mono font-bold ${s.totalWon > 0 ? 'text-amber-400' : 'text-slate-500'}">
        ${s.totalWon > 0 ? `+${state.currency}${formatNumber(s.totalWon)}` : '₹0'}
      </td>
    </tr>
  `).join('');

  if (typeof confetti === 'function') {
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
  }

  document.getElementById('roundFinishedModal').classList.remove('hidden');
}

function closeFinishedModal() {
  document.getElementById('roundFinishedModal').classList.add('hidden');
}

function startNextRound() {
  closeFinishedModal();
  state.roundNumber += 1;

  state.categories.forEach(c => { c.winners = []; });

  recalculateAmountsFromPercentages();
  saveToStorage();
  renderAll();
  switchTab('round');
  showToast(`Round ${state.roundNumber} started! Ticket counts remembered.`);
}

// =============================================================================
// TAB 3: ROUND HISTORY & RESTORED WIN CARD DISPLAY
// =============================================================================
function renderHistoryTab() {
  const container = document.getElementById('roundsHistoryContainer');
  const emptyState = document.getElementById('emptyHistoryState');
  if (!container) return;

  if (state.roundsHistory.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    updateSelectedHistoryCount();
    return;
  }
  emptyState.classList.add('hidden');

  const reversed = [...state.roundsHistory].reverse();

  container.innerHTML = reversed.map(round => {
    const isChecked = selectedHistoryRoundIds.has(round.id);
    const timeStr = new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="bg-dark-900 border ${isChecked ? 'border-amber-500/60 bg-amber-950/10' : 'border-dark-700/80'} rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 transition">
        
        <!-- Round Header with Checkbox -->
        <div class="flex items-center justify-between border-b border-dark-800 pb-3">
          <div class="flex items-center space-x-2.5">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleSelectHistoryRound('${round.id}', this.checked)" class="w-4 h-4 rounded text-amber-500 bg-dark-950 border-dark-700 cursor-pointer">
            <span class="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
              Round ${round.roundNumber}
            </span>
            <span class="text-xs text-slate-400">• Logged at ${timeStr}</span>
          </div>
          <div class="text-xs font-mono font-bold text-slate-300">
            Pool: <strong class="text-amber-400 font-extrabold">${state.currency}${formatNumber(round.pool)}</strong>
          </div>
        </div>

        <!-- 2-Column Grid: Restored Player Cards with Wins Breakdown -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          ${(round.standings || []).map(s => {
            const hasWon = s.totalWon > 0;
            const categoriesText = s.categoriesWon && s.categoriesWon.length > 0 
              ? s.categoriesWon.join(', ') 
              : 'No prizes';

            return `
              <div class="flex flex-col justify-between p-3 rounded-xl bg-dark-950 border border-dark-800 hover:border-dark-700 transition">
                <!-- Top Row: Name and Amount -->
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-slate-100 text-sm truncate max-w-[150px] sm:max-w-none">
                    ${escapeHtml(s.player.name)}
                  </span>
                  <span class="font-mono text-sm font-bold ${hasWon ? 'text-amber-400' : 'text-slate-400'}">
                    ${hasWon ? '+' : ''}${state.currency}${formatNumber(s.totalWon)}
                  </span>
                </div>
                <!-- Bottom Row: Categories won and Tickets count -->
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="truncate max-w-[150px] sm:max-w-[190px] text-slate-400">
                    ${escapeHtml(categoriesText)}
                  </span>
                  <span class="text-[11px] text-slate-500 shrink-0 ml-2 font-mono">
                    Tickets: ${s.ticketsBought}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }).join('');

  updateSelectedHistoryCount();
}

function toggleSelectHistoryRound(roundId, isChecked) {
  if (isChecked) {
    selectedHistoryRoundIds.add(roundId);
  } else {
    selectedHistoryRoundIds.delete(roundId);
  }
  updateSelectedHistoryCount();
  renderHistoryTab();
}

function updateSelectedHistoryCount() {
  const count = selectedHistoryRoundIds.size;
  const countEl = document.getElementById('selectedRoundsCount');
  const btn = document.getElementById('deleteSelectedHistoryBtn');
  if (countEl) countEl.textContent = count;
  if (btn) btn.disabled = count === 0;
}

function deleteSelectedRounds() {
  if (selectedHistoryRoundIds.size === 0) return;
  if (!confirm(`Are you sure you want to delete ${selectedHistoryRoundIds.size} selected round(s)? This will recalculate all settlements.`)) {
    return;
  }

  state.roundsHistory = state.roundsHistory.filter(r => !selectedHistoryRoundIds.has(r.id));
  selectedHistoryRoundIds.clear();

  if (state.roundsHistory.length === 0) {
    state.roundNumber = 1;
  } else {
    const maxRound = Math.max(...state.roundsHistory.map(r => r.roundNumber));
    state.roundNumber = maxRound + 1;
  }

  saveToStorage();
  renderAll();
  showToast('Selected rounds deleted.');
}

function promptClearAllHistory() {
  if (state.roundsHistory.length === 0) {
    showToast('History is already empty.');
    return;
  }
  if (!confirm('Delete ALL recorded rounds? Your player list will be kept, but round history and settlements will reset.')) {
    return;
  }

  state.roundsHistory = [];
  selectedHistoryRoundIds.clear();
  state.roundNumber = 1;
  saveToStorage();
  renderAll();
  showToast('All round history cleared.');
}

// =============================================================================
// TAB 4: SETTLEMENTS (Explicit + / - Signs & Minimum Transfers)
// =============================================================================
function computeSettlements() {
  const netBalances = {};
  state.players.forEach(p => { netBalances[p.id] = 0; });

  state.roundsHistory.forEach(r => {
    const price = r.ticketPrice || 0;
    Object.entries(r.ticketsSnapshot || {}).forEach(([pId, tCount]) => {
      if (netBalances[pId] !== undefined) {
        netBalances[pId] -= (tCount * price);
      }
    });
    (r.standings || []).forEach(st => {
      if (netBalances[st.player.id] !== undefined) {
        netBalances[st.player.id] += st.totalWon;
      }
    });
  });

  const debtors = [];
  const creditors = [];

  Object.entries(netBalances).forEach(([pid, bal]) => {
    const val = Math.round(bal);
    if (val < 0) debtors.push({ id: pid, amount: Math.abs(val) });
    else if (val > 0) creditors.push({ id: pid, amount: val });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let d = 0, c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const settle = Math.min(debtor.amount, creditor.amount);

    if (settle > 0) {
      transfers.push({
        fromName: state.players.find(x => x.id === debtor.id)?.name || 'Unknown',
        toName: state.players.find(x => x.id === creditor.id)?.name || 'Unknown',
        amount: settle
      });
    }

    debtor.amount -= settle;
    creditor.amount -= settle;
    if (debtor.amount === 0) d++;
    if (creditor.amount === 0) c++;
  }

  return { transfers, netBalances };
}

function renderSettlementsTab() {
  const { transfers, netBalances } = computeSettlements();
  const container = document.getElementById('settlementTransfersContainer');
  const countEl = document.getElementById('settlementTransfersCount');
  const emptyBox = document.getElementById('noSettlementsBox');

  countEl.textContent = transfers.length;

  if (transfers.length === 0) {
    container.innerHTML = '';
    emptyBox.classList.remove('hidden');
  } else {
    emptyBox.classList.add('hidden');
    container.innerHTML = transfers.map(t => `
      <div class="bg-dark-900 border border-dark-700/80 rounded-xl p-3 shadow flex items-center justify-between">
        <div>
          <div class="text-xs text-slate-400 font-medium">
            <span class="text-white font-bold">${escapeHtml(t.fromName)}</span>
            <span class="text-rose-400 font-bold uppercase text-[10px] mx-1">pays</span>
            <span class="text-white font-bold">${escapeHtml(t.toName)}</span>
          </div>
          <div class="font-mono text-base font-black text-amber-400 mt-0.5">
            ${state.currency}${formatNumber(t.amount)}
          </div>
        </div>
        <button onclick="copySingleTransfer('${escapeHtml(t.fromName)}', '${escapeHtml(t.toName)}', ${t.amount})" class="px-2.5 py-1 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded text-xs border border-dark-700">
          Copy
        </button>
      </div>
    `).join('');
  }

  const grid = document.getElementById('cumulativePlayerBalancesGrid');
  if (grid) {
    grid.innerHTML = getAlphabeticalPlayers().map(p => {
      const bal = netBalances[p.id] || 0;
      let displayStr = `${state.currency}0`;
      let color = 'text-slate-400';

      if (bal > 0) {
        displayStr = `+${state.currency}${formatNumber(bal)}`;
        color = 'text-emerald-400 font-bold';
      } else if (bal < 0) {
        displayStr = `-${state.currency}${formatNumber(Math.abs(bal))}`;
        color = 'text-rose-400 font-bold';
      }

      return `
        <div class="p-2.5 bg-dark-950 rounded-xl border border-dark-800 flex flex-col justify-between">
          <span class="text-xs font-semibold text-slate-300 truncate">${escapeHtml(p.name)}</span>
          <span class="font-mono text-xs sm:text-sm ${color} mt-1">${displayStr}</span>
        </div>
      `;
    }).join('');
  }
}

function copySingleTransfer(from, to, amount) {
  const text = `${from} pays ${to} ${state.currency}${formatNumber(amount)}`;
  copyToClipboard(text);
  showToast(`Copied: "${text}"`);
}

function copySettlementSummaryToWhatsApp() {
  const { transfers, netBalances } = computeSettlements();

  let text = `🎟️ *Tambola Settlements Summary* 🎲\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `*📊 Cumulative Balances:*\n`;

  getAlphabeticalPlayers().forEach(p => {
    const bal = netBalances[p.id] || 0;
    const sign = bal > 0 ? '+' : (bal < 0 ? '-' : '');
    text += `• ${p.name}: ${sign}${state.currency}${formatNumber(Math.abs(bal))}\n`;
  });

  text += `\n*🤝 Direct Payouts:*\n`;
  if (transfers.length === 0) {
    text += `All settled! Everyone is square.\n`;
  } else {
    transfers.forEach((t, i) => {
      text += `${i + 1}. *${t.fromName}* ➔ pays *${t.toName}*: ${state.currency}${formatNumber(t.amount)}\n`;
    });
  }

  copyToClipboard(text);
  showToast('WhatsApp summary copied!');
}

// =============================================================================
// PEOPLE LIST
// =============================================================================
function getAlphabeticalPlayers() {
  return [...state.players].sort((a, b) => a.name.localeCompare(b.name));
}

function renderPeopleList() {
  const container = document.getElementById('peopleListContainer');
  if (!container) return;

  container.innerHTML = getAlphabeticalPlayers().map(p => `
    <div class="flex items-center justify-between p-2 bg-dark-950 rounded-xl border border-dark-800 text-xs">
      <input type="text" value="${escapeHtml(p.name)}" onchange="updatePlayerName('${p.id}', this.value)" class="bg-transparent font-semibold text-slate-200 border-b border-transparent hover:border-dark-700 focus:border-amber-400 focus:outline-none flex-1 py-0.5">
      <button type="button" onclick="removePlayer('${p.id}')" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Remove">✕</button>
    </div>
  `).join('');
}

function handleNewPlayerSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('newPlayerNameInput');
  const name = input.value.trim();
  if (!name) return;

  const newId = 'p_' + Date.now();
  state.players.push({ id: newId, name });
  state.ticketsPerPlayer[newId] = 1;

  input.value = '';
  saveToStorage();
  recalculateAmountsFromPercentages();
  renderAll();
  showToast(`Added ${name}`);
}

function updatePlayerName(pid, val) {
  const p = state.players.find(x => x.id === pid);
  if (p && val.trim()) {
    p.name = val.trim();
    saveToStorage();
    renderAll();
  }
}

function removePlayer(pid) {
  const p = state.players.find(x => x.id === pid);
  if (confirm(`Remove ${p ? p.name : 'this person'}? Past recorded rounds will keep their history.`)) {
    state.players = state.players.filter(x => x.id !== pid);
    delete state.ticketsPerPlayer[pid];
    saveToStorage();
    recalculateAmountsFromPercentages();
    renderAll();
  }
}

// =============================================================================
// BACKUP & UTILITIES
// =============================================================================
function openShareModal() {
  document.getElementById('jsonShareArea').value = JSON.stringify(state, null, 2);
  document.getElementById('shareModal').classList.remove('hidden');
}

function closeShareModal() {
  document.getElementById('shareModal').classList.add('hidden');
}

function exportDataJson() {
  copyToClipboard(JSON.stringify(state, null, 2));
  showToast('JSON copied to clipboard!');
}

function importDataJson() {
  const raw = document.getElementById('jsonShareArea').value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.players)) {
      state = { ...state, ...parsed };
      saveToStorage();
      renderAll();
      closeShareModal();
      showToast('State restored!');
    }
  } catch (err) {
    showToast('Failed to parse JSON');
  }
}

function showToast(message) {
  const toast = document.getElementById('toastNotification');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-3');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-3');
  }, 2200);
}

function copyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
