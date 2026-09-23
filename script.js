const state = { balance: 0, entries: [], futurePayments: [] };
const backdrop = document.getElementById('modalBackdrop');
const form = document.getElementById('entryForm');
const amountInput = document.getElementById('entryAmount');
const noteInput = document.getElementById('entryNote');
const dateInput = document.getElementById('entryDate');
const dateLabel = document.getElementById('dateLabel');
const displayName = document.getElementById('displayName');
const editName = document.getElementById('editName');
const modalTitle = document.getElementById('modalTitle');
const modalHint = document.getElementById('modalHint');
let currentMode = 'add';

document.querySelectorAll('[data-modal]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.modal)));
editName.addEventListener('click', () => {
  const name = window.prompt('What should PocketPal call you?', displayName.textContent);
  if (name && name.trim()) { displayName.textContent = name.trim(); document.querySelector('.avatar').textContent = name.trim().slice(0, 2).toUpperCase(); }
});
document.getElementById('closeModal').addEventListener('click', closeModal);
backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

function openModal(mode) {
  currentMode = mode;
  const copy = { add: ['Add money', 'What money came in?', 'e.g. Chores, gift, allowance'], spend: ['Log spending', 'What did you spend?', 'e.g. Snack, game, movie'], owe: ['Plan a future payment', 'What will you pay later?', 'e.g. Mom, Alex, library'] }[mode];
  modalTitle.textContent = copy[0]; modalHint.textContent = copy[1]; noteInput.placeholder = copy[2];
  document.getElementById('amountLabel').firstChild.textContent = mode === 'owe' ? 'Amount you will pay' : 'Amount';
  dateLabel.classList.toggle('show', mode === 'owe'); dateInput.required = false;
  amountInput.value = ''; noteInput.value = ''; dateInput.value = ''; backdrop.classList.add('open'); backdrop.setAttribute('aria-hidden', 'false'); amountInput.focus();
}
function closeModal() { backdrop.classList.remove('open'); backdrop.setAttribute('aria-hidden', 'true'); }
form.addEventListener('submit', event => {
  event.preventDefault();
  const amount = Number(amountInput.value); const note = noteInput.value.trim();
  if (!amount || !note) return;
  if (currentMode === 'add') state.balance += amount;
  if (currentMode === 'spend') state.balance -= amount;
  if (currentMode === 'owe') state.futurePayments.push({ note, amount, date: dateInput.value });
  const sign = currentMode === 'add' ? '+' : '−';
  state.entries.unshift({ note, amount, sign, mode: currentMode });
  updateDashboard(); closeModal();
});
function updateDashboard() {
  document.getElementById('balanceAmount').textContent = `$${state.balance.toFixed(2)}`;
  const totalFuturePayments = state.futurePayments.reduce((total, payment) => total + payment.amount, 0);
  document.getElementById('owedAmount').textContent = `$${totalFuturePayments.toFixed(2)}`;
  document.getElementById('owedCount').textContent = state.futurePayments.length ? `· ${state.futurePayments.length} ${state.futurePayments.length === 1 ? 'payment' : 'payments'}` : '';
  updateVisuals(totalFuturePayments);
  const list = document.getElementById('activityList');
  if (state.entries.length) list.innerHTML = '';
  state.entries.slice(0, 4).forEach(entry => {
    const row = document.createElement('div'); row.className = 'activity-row';
    const icon = entry.mode === 'add' ? '＋' : entry.mode === 'spend' ? '☻' : '♧';
    const color = entry.mode === 'add' ? 'icon-purple' : entry.mode === 'spend' ? 'icon-yellow' : 'icon-blue';
    row.innerHTML = `<span class="activity-icon ${color}">${icon}</span><div class="activity-name"><strong>${escapeHtml(entry.note)}</strong><small>Just now · ${entry.mode === 'owe' ? 'Owed' : entry.mode === 'add' ? 'Added' : 'Spent'}</small></div><b class="${entry.mode === 'add' ? 'positive' : ''}">${entry.sign}$${entry.amount.toFixed(2)}</b>`;
    list.prepend(row);
  });
  const oweList = document.getElementById('oweList');
  if (state.futurePayments.length) {
    oweList.innerHTML = state.futurePayments.map((payment, index) => `<div class="owe-detail"><span class="person-dot">$</span><div><strong>${escapeHtml(payment.note)}</strong><small>Planned payment${payment.date ? ` · ${formatDate(payment.date)}` : ''}</small></div><button class="check-owe" data-index="${index}" aria-label="Mark planned payment paid">✓</button></div>`).join('');
    oweList.querySelectorAll('.check-owe').forEach(button => button.addEventListener('click', () => { state.futurePayments.splice(Number(button.dataset.index), 1); updateDashboard(); }));
  } else oweList.innerHTML = '<div class="empty-state">No future payments yet. Add one when you make a promise.</div>';
}
function updateVisuals(totalFuturePayments) {
  const spending = state.entries.filter(entry => entry.mode === 'spend');
  const categories = { Fun: 0, Food: 0, Other: 0 };
  spending.forEach(entry => {
    const text = entry.note.toLowerCase();
    const category = /movie|game|toy|fun|ticket/.test(text) ? 'Fun' : /food|lunch|snack|drink/.test(text) ? 'Food' : 'Other';
    categories[category] += entry.amount;
  });
  const totalSpent = Object.values(categories).reduce((sum, value) => sum + value, 0);
  document.getElementById('spendTotal').textContent = `$${totalSpent.toFixed(2)} spent`;
  document.getElementById('donutCenter').textContent = `$${totalSpent.toFixed(0)}`;
  const colors = { Fun: 'var(--purple)', Food: 'var(--yellow)', Other: 'var(--coral)' };
  let cursor = 0;
  const stops = Object.entries(categories).map(([name, value]) => { const end = totalSpent ? cursor + (value / totalSpent) * 100 : 100; const stop = `${colors[name]} ${cursor}% ${end}%`; cursor = end; return stop; });
  document.getElementById('donutChart').style.background = `conic-gradient(${totalSpent ? stops.join(',') : 'var(--purple) 0 100%'})`;
  document.getElementById('spendLegend').innerHTML = totalSpent ? Object.entries(categories).filter(([, value]) => value > 0).map(([name, value]) => `<div class="legend-row"><i class="legend-dot" style="background:${colors[name]}"></i><span>${name}</span><strong>$${value.toFixed(2)}</strong></div>`).join('') : '<div class="empty-legend">Log spending to see your mix.</div>';
  const balance = Math.max(0, state.balance); const left = Math.max(0, balance - totalFuturePayments); const max = Math.max(balance, totalFuturePayments, left, 1);
  document.getElementById('planBalance').textContent = `$${balance.toFixed(2)}`;
  document.getElementById('planOwed').textContent = `$${totalFuturePayments.toFixed(2)}`;
  document.getElementById('planLeft').textContent = `$${left.toFixed(2)}`;
  document.getElementById('barHave').style.width = `${balance / max * 100}%`;
  document.getElementById('barOwed').style.width = `${totalFuturePayments / max * 100}%`;
  document.getElementById('barLeft').style.width = `${left / max * 100}%`;
  document.getElementById('planCaption').textContent = totalFuturePayments ? `${state.futurePayments.length} future ${state.futurePayments.length === 1 ? 'payment' : 'payments'}` : 'No plans yet';
  document.getElementById('planNote').textContent = totalFuturePayments ? `$${left.toFixed(2)} would be left after your planned payments.` : 'Add money or a future payment to build your plan.';
}
function formatDate(value) { return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character])); }
document.getElementById('viewAll').addEventListener('click', () => document.querySelector('.activity-panel').scrollIntoView({ behavior: 'smooth', block: 'center' }));
updateVisuals(0);
