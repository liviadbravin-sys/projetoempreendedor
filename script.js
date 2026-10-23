const $ = (id) => document.getElementById(id);
const STORAGE = "finedu_dashboard_v2";

const money = value =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);

const defaultState = {
  transactions: [],
  budget: 0,
  goals: [],
  monthlyIncome: 0,
  dark: false,
  challenge: []
};

let state = loadState();

function loadState() {
  try {
    return {
      ...defaultState,
      ...JSON.parse(localStorage.getItem(STORAGE) || "{}")
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  } catch {
    toast("Não foi possível salvar os dados neste navegador.");
  }
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 2400);
}

function safe(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function totals() {
  const income = state.transactions
    .filter(t => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const expenses = state.transactions
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return {
    income,
    expenses,
    balance: income - expenses
  };
}

function renderSummary() {
  const t = totals();

  $("balanceValue").textContent = money(t.balance);
  $("incomeValue").textContent = money(t.income);
  $("expenseValue").textContent = money(t.expenses);

  const completed = state.goals.filter(
    g => g.saved >= g.target
  ).length;

  $("goalsValue").innerHTML =
    `${completed} <small>/ ${state.goals.length}</small>`;
}

function renderTransactions() {
  const list = $("transactionList");
  const filter = $("filterType").value;

  const items = [...state.transactions]
    .reverse()
    .filter(t => filter === "all" || t.type === filter)
    .slice(0, 30);

  if (!items.length) {
    list.innerHTML =
      '<p class="empty-state">Nenhuma movimentação encontrada.</p>';
    return;
  }

  list.innerHTML = items.map(t => `
    <div class="transaction-item">
      <div class="transaction-symbol">
        ${t.type === "income" ? "↗" : "↘"}
      </div>

      <div class="transaction-info">
        <strong>${safe(t.description)}</strong>
        <small>${safe(t.category)} · ${safe(t.date)}</small>
      </div>

      <span class="transaction-amount ${t.type}">
        ${t.type === "income" ? "+" : "−"} ${money(t.amount)}
      </span>

      <button
        class="delete-button"
        type="button"
        data-delete-transaction="${t.id}"
        aria-label="Excluir movimentação"
      >×</button>
    </div>
  `).join("");
}

function renderBudget() {
  const spent = totals().expenses;
  const limit = Number(state.budget) || 0;

  const percent = limit > 0
    ? Math.round(spent / limit * 100)
    : 0;

  $("budgetLimit").value = limit || "";
  $("budgetSpent").textContent = `${money(spent)} gastos`;
  $("budgetPercent").textContent = `${percent}%`;

  const bar = $("budgetProgress");

  bar.style.width = Math.min(percent, 100) + "%";

  bar.className = "progress-fill" +
    (percent >= 100 ? " over" :
      percent >= 80 ? " warning" : "");

  $("budgetMessage").textContent =
    limit <= 0
      ? "Defina um limite para acompanhar seu orçamento."
      : percent > 100
        ? `Você ultrapassou o limite em ${money(spent - limit)}.`
        : percent >= 80
          ? "Atenção: você está perto do limite definido."
          : `Você ainda tem ${money(limit - spent)} disponíveis.`;
}

function renderGoals() {
  const list = $("goalList");

  if (!state.goals.length) {
    list.innerHTML =
      '<p class="empty-state">Sua próxima conquista começa com uma meta.</p>';
    return;
  }

  list.innerHTML = state.goals.map(g => {
    const percent = Math.min(
      100,
      Math.round(g.saved / g.target * 100)
    );

    const remaining = Math.max(0, g.target - g.saved);

    return `
      <div class="goal-item">
        <div class="goal-title-row">
          <span>${safe(g.name)}</span>
          <small>${percent}%</small>
        </div>

        <div class="goal-track">
          <div class="goal-progress" style="width:${percent}%"></div>
        </div>

        <div class="goal-bottom">
          <span>${money(g.saved)} de ${money(g.target)}</span>
          <button
            class="delete-button"
            type="button"
            data-delete-goal="${g.id}"
          >Excluir</button>
        </div>

        ${
          remaining > 0
            ? `
              <form class="goal-add" data-add-goal="${g.id}">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Valor para guardar"
                  aria-label="Valor para adicionar"
                  required
                >
                <button class="button button-light" type="submit">
                  Guardar
                </button>
              </form>
            `
            : '<p class="budget-message">🎉 Meta alcançada! Parabéns!</p>'
        }
      </div>
    `;
  }).join("");
}

function renderRule() {
  const income = Number(state.monthlyIncome) || 0;

  $("monthlyIncome").value = income || "";
  $("needsValue").textContent = money(income * 0.5);
  $("wantsValue").textContent = money(income * 0.3);
  $("savingsValue").textContent = money(income * 0.2);
}

const challengeTasks = [
  "Anote todos os gastos de hoje",
  "Revise suas assinaturas e compras recorrentes",
  "Separe um valor, mesmo pequeno, para guardar",
  "Pense antes de fazer uma compra por impulso",
  "Confira seu limite de gastos",
  "Defina uma meta financeira para o mês",
  "Revise o que aprendeu nesta semana"
];

function renderChallenge() {
  const checked = new Set(state.challenge);

  $("challengeList").innerHTML = challengeTasks.map((task, i) => `
    <label class="challenge-item ${checked.has(i) ? "done" : ""}">
      <input
        type="checkbox"
        data-challenge="${i}"
        ${checked.has(i) ? "checked" : ""}
      >
      <span>${task}</span>
    </label>
  `).join("");

  const count = checked.size;
  const percent = Math.round(count / 7 * 100);

  $("challengeCount").textContent = `${count} de 7 concluídos`;
  $("challengePercent").textContent = `${percent}%`;
  $("challengeProgress").style.width = percent + "%";
}

function renderTheme() {
  document.body.classList.toggle("dark", !!state.dark);
  $("themeIcon").textContent = state.dark ? "☀" : "☾";
}

function render() {
  renderSummary();
  renderTransactions();
  renderBudget();
  renderGoals();
  renderRule();
  renderChallenge();
  renderTheme();
}

// Adicionar movimentação
$("transactionForm").addEventListener("submit", e => {
  e.preventDefault();

  const description = $("description").value.trim();
  const amount = Number($("amount").value);

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    toast("Confira a descrição e o valor.");
    return;
  }

  state.transactions.push({
    id: Date.now(),
    description,
    amount,
    type: $("type").value,
    category: $("category").value,
    date: new Date().toLocaleDateString("pt-BR")
  });

  saveState();
  render();
  e.target.reset();

  toast("Movimentação adicionada!");
});

// Filtrar movimentações
$("filterType").addEventListener("change", renderTransactions);

// Excluir movimentação
$("transactionList").addEventListener("click", e => {
  const b = e.target.closest("[data-delete-transaction]");

  if (!b) return;

  state.transactions = state.transactions.filter(
    t => String(t.id) !== b.dataset.deleteTransaction
  );

  saveState();
  render();

  toast("Movimentação excluída.");
});

// Salvar orçamento
$("budgetForm").addEventListener("submit", e => {
  e.preventDefault();

  const value = Number($("budgetLimit").value);

  if (!Number.isFinite(value) || value <= 0) {
    toast("Informe um limite maior que zero.");
    return;
  }

  state.budget = value;

  saveState();
  renderBudget();

  toast("Orçamento atualizado!");
});

// Calcular regra 50-30-20
$("calculateRule").addEventListener("click", () => {
  const input = $("monthlyIncome").value;
  const value = Number(input);

  if (input === "" || !Number.isFinite(value) || value < 0) {
    toast("Informe sua renda mensal.");
    return;
  }

  state.monthlyIncome = value;

  saveState();
  renderRule();

  toast("Divisão calculada!");
});

// Criar meta
$("goalForm").addEventListener("submit", e => {
  e.preventDefault();

  const name = $("goalName").value.trim();
  const target = Number($("goalTarget").value);
  const saved = Number($("goalSaved").value);

  if (
    !name ||
    !Number.isFinite(target) ||
    target <= 0 ||
    !Number.isFinite(saved) ||
    saved < 0
  ) {
    toast("Confira os dados da meta.");
    return;
  }

  state.goals.push({
    id: Date.now(),
    name,
    target,
    saved: Math.min(saved, target)
  });

  saveState();
  render();

  e.target.reset();
  $("goalSaved").value = "0";

  toast("Meta criada!");
});

// Adicionar dinheiro a uma meta
$("goalList").addEventListener("submit", e => {
  const form = e.target.closest("[data-add-goal]");

  if (!form) return;

  e.preventDefault();

  const id = Number(form.dataset.addGoal);
  const amount = Number(new FormData(form).get("amount"));

  const goal = state.goals.find(g => g.id === id);

  if (!goal || !Number.isFinite(amount) || amount <= 0) {
    toast("Informe um valor válido.");
    return;
  }

  goal.saved = Math.min(goal.target, goal.saved + amount);

  saveState();
  render();

  toast("Valor adicionado à meta!");
});

// Excluir meta
$("goalList").addEventListener("click", e => {
  const b = e.target.closest("[data-delete-goal]");

  if (!b) return;

  state.goals = state.goals.filter(
    g => String(g.id) !== b.dataset.deleteGoal
  );

  saveState();
  render();

  toast("Meta excluída.");
});

// Marcar tarefas do desafio
$("challengeList").addEventListener("change", e => {
  const box = e.target.closest("[data-challenge]");

  if (!box) return;

  const index = Number(box.dataset.challenge);
  const set = new Set(state.challenge);

  if (box.checked) {
    set.add(index);
  } else {
    set.delete(index);
  }

  state.challenge = [...set].sort((a, b) => a - b);

  saveState();
  renderChallenge();

  if (state.challenge.length === 7) {
    toast("Parabéns! Você concluiu o desafio de 7 dias!");
  }
});

// Reiniciar desafio
$("resetChallenge").addEventListener("click", () => {
  state.challenge = [];

  saveState();
  renderChallenge();

  toast("Desafio reiniciado.");
});

// Alternar tema claro/escuro
$("themeToggle").addEventListener("click", () => {
  state.dark = !state.dark;

  saveState();
  renderTheme();
});

// Exportar movimentações para CSV
$("exportButton").addEventListener("click", () => {
  if (!state.transactions.length) {
    toast("Adicione movimentações antes de exportar.");
    return;
  }

  const rows = [
    ["Descrição", "Tipo", "Categoria", "Valor (R$)", "Data"],
    ...state.transactions.map(t => [
      t.description,
      t.type === "income" ? "Receita" : "Despesa",
      t.category,
      t.amount.toFixed(2).replace(".", ","),
      t.date
    ])
  ];

  const csv = "\uFEFF" + rows
    .map(row =>
      row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")
    )
    .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );

  const a = document.createElement("a");
  a.href = url;
  a.download = "FinEdu-movimentacoes.csv";

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);

  toast("Arquivo CSV exportado!");
});

// Data atual e ano no rodapé
$("todayLabel").textContent =
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium"
  }).format(new Date());

$("year").textContent = new Date().getFullYear();

// Inicializar site
render();