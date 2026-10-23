
const $ = (id) => document.getElementById(id);

const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

let movimentacoes = [];
let metas = [];
let orcamento = 0;

try {
  movimentacoes = JSON.parse(localStorage.getItem("finedu_movimentacoes")) || [];
  metas = JSON.parse(localStorage.getItem("finedu_metas")) || [];
  orcamento = Number(localStorage.getItem("finedu_orcamento")) || 0;

  document.body.classList.toggle(
    "escuro",
    localStorage.getItem("finedu_tema") === "escuro"
  );
} catch (erro) {
  console.log("Não foi possível carregar os dados salvos.");
}

function salvarDados() {
  localStorage.setItem("finedu_movimentacoes", JSON.stringify(movimentacoes));
  localStorage.setItem("finedu_metas", JSON.stringify(metas));
  localStorage.setItem("finedu_orcamento", String(orcamento));
}

function totais() {
  const receitas = movimentacoes
    .filter((item) => item.tipo === "receita")
    .reduce((soma, item) => soma + item.valor, 0);

  const despesas = movimentacoes
    .filter((item) => item.tipo === "despesa")
    .reduce((soma, item) => soma + item.valor, 0);

  return { receitas, despesas, saldo: receitas - despesas };
}

function atualizarResumo() {
  const dados = totais();

  $("saldo").textContent = moeda(dados.saldo);
  $("receitas").textContent = moeda(dados.receitas);
  $("despesas").textContent = moeda(dados.despesas);

  atualizarOrcamento();
}

function atualizarMovimentacoes() {
  const lista = $("listaMovimentacoes");

  if (movimentacoes.length === 0) {
    lista.innerHTML =
      '<p class="vazio">Suas movimentações aparecerão aqui.</p>';
    return;
  }

  lista.innerHTML = [...movimentacoes].reverse().map((item) => `
    <div class="movimento">
      <div class="movimento-info">
        <strong>${escapar(item.descricao)}</strong>
        <small>${escapar(item.categoria)} · ${escapar(item.data)}</small>
      </div>
      <span class="valor-movimento ${item.tipo === "receita" ? "verde" : "vermelho"}">
        ${item.tipo === "receita" ? "+" : "−"} ${moeda(item.valor)}
      </span>
      <button class="excluir" data-excluir="${item.id}" aria-label="Excluir movimentação">×</button>
    </div>
  `).join("");
}

function atualizarOrcamento() {
  const despesas = totais().despesas;
  const porcentagem = orcamento > 0
    ? Math.round((despesas / orcamento) * 100)
    : 0;

  $("orcamento").value = orcamento || "";
  $("progresso").style.width = Math.min(porcentagem, 100) + "%";

  if (porcentagem >= 100) {
    $("progresso").style.background = "var(--vermelho)";
  } else if (porcentagem >= 80) {
    $("progresso").style.background = "#e5a33d";
  } else {
    $("progresso").style.background = "var(--verde)";
  }

  if (orcamento === 0) {
    $("mensagemOrcamento").textContent =
      "Defina seu limite para começar.";
  } else if (despesas > orcamento) {
    $("mensagemOrcamento").textContent =
      `Você ultrapassou seu limite em ${moeda(despesas - orcamento)}.`;
  } else {
    $("mensagemOrcamento").textContent =
      `${porcentagem}% utilizado. Restam ${moeda(orcamento - despesas)}.`;
  }
}

function atualizarMetas() {
  const lista = $("listaMetas");

  if (metas.length === 0) {
    lista.innerHTML = '<p class="vazio">Suas metas aparecerão aqui.</p>';
    return;
  }

  lista.innerHTML = metas.map((meta) => {
    const porcentagem = Math.min(
      100,
      Math.round((meta.guardado / meta.valor) * 100)
    );

    return `
      <div class="meta">
        <div class="meta-topo">
          <span>${escapar(meta.nome)}</span>
          <span>${porcentagem}%</span>
        </div>
        <div class="meta-barra">
          <div class="meta-progresso" style="width: ${porcentagem}%"></div>
        </div>
        <div class="meta-rodape">
          ${moeda(meta.guardado)} de ${moeda(meta.valor)}
        </div>
        ${
          meta.guardado < meta.valor
            ? `<form class="form-guardar" data-meta="${meta.id}">
                <label>Adicionar valor (R$)</label>
                <input type="number" name="valor" min="0.01" step="0.01" required placeholder="Ex.: 20">
                <button class="botao secundario" type="submit">Guardar para a meta</button>
              </form>`
            : "<p class='verde'>🎉 Meta alcançada!</p>"
        }
        <button class="excluir" data-excluir-meta="${meta.id}">Excluir meta</button>
      </div>
    `;
  }).join("");
}

function renderizar() {
  atualizarResumo();
  atualizarMovimentacoes();
  atualizarMetas();
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[caractere]);
}

$("formMovimentacao").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const descricao = $("descricao").value.trim();
  const valor = Number($("valor").value);

  if (!descricao || !Number.isFinite(valor) || valor <= 0) {
    alert("Confira a descrição e o valor.");
    return;
  }

  movimentacoes.push({
    id: Date.now(),
    descricao,
    valor,
    tipo: $("tipo").value,
    categoria: $("categoria").value,
    data: new Date().toLocaleDateString("pt-BR")
  });

  salvarDados();
  renderizar();
  evento.target.reset();
});

$("formOrcamento").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const valor = Number($("orcamento").value);

  if (!Number.isFinite(valor) || valor <= 0) {
    alert("Digite um limite válido.");
    return;
  }

  orcamento = valor;
  salvarDados();
  atualizarOrcamento();
  alert("Orçamento atualizado!");
});

$("calcular").addEventListener("click", () => {
  const renda = Number($("renda").value);

  if (!Number.isFinite(renda) || renda < 0 || $("renda").value === "") {
    alert("Digite sua renda mensal.");
    return;
  }

  $("necessidades").textContent = moeda(renda * 0.5);
  $("desejos").textContent = moeda(renda * 0.3);
  $("economia").textContent = moeda(renda * 0.2);
});

$("formMeta").addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nome = $("nomeMeta").value.trim();
  const valor = Number($("valorMeta").value);
  const guardado = Number($("guardado").value);

  if (!nome || !Number.isFinite(valor) || valor <= 0 ||
      !Number.isFinite(guardado) || guardado < 0) {
    alert("Confira os dados da meta.");
    return;
  }

  metas.push({
    id: Date.now(),
    nome,
    valor,
    guardado: Math.min(guardado, valor)
  });

  salvarDados();
  atualizarMetas();
  evento.target.reset();
  $("guardado").value = "0";
});

$("listaMovimentacoes").addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-excluir]");
  if (!botao) return;

  movimentacoes = movimentacoes.filter(
    (item) => item.id !== Number(botao.dataset.excluir)
  );

  salvarDados();
  renderizar();
});

$("listaMetas").addEventListener("submit", (evento) => {
  const formulario = evento.target.closest(".form-guardar");
  if (!formulario) return;

  evento.preventDefault();

  const id = Number(formulario.dataset.meta);
  const valor = Number(new FormData(formulario).get("valor"));
  const meta = metas.find((item) => item.id === id);

  if (!meta || !Number.isFinite(valor) || valor <= 0) return;

  meta.guardado = Math.min(meta.valor, meta.guardado + valor);
  salvarDados();
  atualizarMetas();
});

$("listaMetas").addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-excluir-meta]");
  if (!botao) return;

  metas = metas.filter(
    (meta) => meta.id !== Number(botao.dataset.excluirMeta)
  );

  salvarDados();
  atualizarMetas();
});

$("tema").addEventListener("click", () => {
  document.body.classList.toggle("escuro");

  const temaAtual = document.body.classList.contains("escuro")
    ? "escuro"
    : "claro";

  localStorage.setItem("finedu_tema", temaAtual);
  $("tema").textContent = temaAtual === "escuro" ? "☀️" : "🌙";
});

$("exportar").addEventListener("click", () => {
  if (movimentacoes.length === 0) {
    alert("Adicione uma movimentação antes de exportar.");
    return;
  }

  const linhas = [
    ["Descrição", "Tipo", "Categoria", "Valor", "Data"],
    ...movimentacoes.map((item) => [
      item.descricao,
      item.tipo,
      item.categoria,
      item.valor.toFixed(2).replace(".", ","),
      item.data
    ])
  ];

  const csv = "\uFEFF" + linhas
    .map((linha) => linha.map((campo) =>
      `"${String(campo).replace(/"/g, '""')}"`
    ).join(";"))
    .join("\r\n");

  const arquivo = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(arquivo);

  link.href = url;
  link.download = "FinEdu-movimentacoes.csv";
  link.click();

  URL.revokeObjectURL(url);
});

$("tema").textContent =
  document.body.classList.contains("escuro") ? "☀️" : "🌙";

renderizar();
