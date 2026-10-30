const initialState = {
  balance: 850,
  incomes: 1200,
  expenses: 350,
  transactions: [
    {id:1, type:"expense", desc:"Lanche", value:15, category:"Alimentação", date:"30/09/2026", icon:"🍔", cls:"food-bg"},
    {id:2, type:"expense", desc:"Passagem", value:8, category:"Transporte", date:"29/09/2026", icon:"🚌", cls:"transport-bg"},
    {id:3, type:"income", desc:"Mesada", value:200, category:"Entrada", date:"28/09/2026", icon:"💵", cls:"income-bg"},
    {id:4, type:"expense", desc:"Livro", value:45, category:"Estudos", date:"25/09/2026", icon:"📚", cls:"study-bg"},
    {id:5, type:"expense", desc:"Filme", value:25, category:"Lazer", date:"22/09/2026", icon:"🎮", cls:"leisure-bg"},
    {id:6, type:"expense", desc:"Roupa", value:100, category:"Compras", date:"20/09/2026", icon:"🛍️", cls:"shopping-bg"},
    {id:7, type:"expense", desc:"Mercado", value:120, category:"Alimentação", date:"18/09/2026", icon:"🛒", cls:"food-bg"},
    {id:8, type:"expense", desc:"Ônibus", value:72, category:"Transporte", date:"15/09/2026", icon:"🚌", cls:"transport-bg"}
  ],
  goals: [
    {id:1,name:"Novo celular",icon:"📱",saved:400,target:2000,deadline:"Dezembro"},
    {id:2,name:"Fone de ouvido",icon:"🎧",saved:150,target:300,deadline:"Novembro"}
  ]
};

let state = structuredClone(initialState);
let modalMode = "expense";
let balanceHidden = false;
let tipIndex = 0;

const $ = id => document.getElementById(id);
const money = n => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const iconMap = {
  Alimentação:["🍔","food-bg"],
  Transporte:["🚌","transport-bg"],
  Lazer:["🎮","leisure-bg"],
  Compras:["🛍️","shopping-bg"],
  Estudos:["📚","study-bg"],
  Outros:["📌","transport-bg"],
  Entrada:["💵","income-bg"]
};

const pageInfo = {
  inicio:["Olá, Lívia! 👋","Veja como está sua vida financeira hoje."],
  movimentacoes:["Movimentações","Controle suas entradas e gastos."],
  metas:["Minhas metas","Transforme planos em objetivos."],
  relatorios:["Relatórios","Entenda seus hábitos financeiros."],
  educacao:["Educação financeira","Aprenda conceitos para cuidar melhor do seu dinheiro."]
};

// NAVEGAÇÃO ENTRE AS PÁGINAS
function showPage(page, updateAddress=true){
  if(!pageInfo[page]) page="inicio";

  document.querySelectorAll(".page").forEach(section=>{
    const isActive=section.id===page;
    section.classList.toggle("active-page",isActive);
    section.setAttribute("aria-hidden",String(!isActive));
  });

  document.querySelectorAll(".nav-item[data-page]").forEach(button=>{
    const isActive=button.dataset.page===page;
    button.classList.toggle("active",isActive);

    if(isActive){
      button.setAttribute("aria-current","page");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  $("pageTitle").textContent=pageInfo[page][0];
  $("pageSubtitle").textContent=pageInfo[page][1];

  if(updateAddress && window.location.hash!==`#${page}`){
    window.history.pushState({page},"",`#${page}`);
  }

  window.scrollTo({top:0,behavior:"instant"});
}

document.querySelectorAll(".nav-item[data-page], [data-page-link]").forEach(el=>{
  el.addEventListener("click",()=>{
    showPage(el.dataset.page||el.dataset.pageLink);
  });
});

// Permite abrir diretamente uma seção pelo link
// e usar os botões voltar/avançar do navegador.
window.addEventListener("popstate",()=>{
  showPage(window.location.hash.slice(1)||"inicio",false);
});

window.addEventListener("hashchange",()=>{
  showPage(window.location.hash.slice(1)||"inicio",false);
});

// ATUALIZAÇÃO DOS DADOS
function render(){
  const computedBalance = state.incomes - state.expenses;
  state.balance = computedBalance;

  $("balanceValue").textContent =
    balanceHidden ? "R$ ••••••" : money(computedBalance);

  $("incomeValue").textContent = money(state.incomes);
  $("expenseValue").textContent = money(state.expenses);
  $("reportIncome").textContent = money(state.incomes);
  $("reportExpense").textContent = money(state.expenses);

  renderCategories();
  renderTransactions();
  renderGoals();
  renderReports();
}

// GRÁFICO DE CATEGORIAS
function renderCategories(){
  const cats = ["Alimentação","Transporte","Lazer","Compras","Estudos","Outros"];
  const values = Object.fromEntries(cats.map(c=>[c,0]));

  state.transactions
    .filter(t=>t.type==="expense")
    .forEach(t=>{
      if(values[t.category]!==undefined){
        values[t.category]+=t.value;
      }
    });

  const total = Object.values(values).reduce((a,b)=>a+b,0);

  $("donutTotal").textContent = money(total).replace(",00","");

  const series = ["#287d5e","#6da58d","#b7d6c8","#dfece6","#9fc3b3","#cbd9d3"];

  let current=0;
  const stops=[];

  cats.forEach((c,i)=>{
    const pct=total?values[c]/total*100:0;
    stops.push(`${series[i]} ${current}% ${current+pct}%`);
    current+=pct;
  });

  $("donut").style.background =
    `conic-gradient(${stops.join(",")})`;

  $("categoryLegend").innerHTML =
    cats.filter(c=>values[c]>0).map((c,i)=>`
      <div>
        <i class="dot" style="background:${series[i]}"></i>
        <span>${c}</span>
        <strong>${money(values[c])}</strong>
      </div>
    `).join("") ||
    `<p class="empty">Nenhum gasto registrado.</p>`;
}

// MOVIMENTAÇÕES
function txHTML(t){
  const meta = iconMap[t.category] || [t.icon||"📌","transport-bg"];
  const sign = t.type==="income"?"+":"−";

  return `
    <div class="transaction searchable" data-type="${t.type}">
      <div class="tx-icon ${meta[1]}">${meta[0]}</div>
      <div class="tx-name">
        <strong>${escapeHTML(t.desc)}</strong>
        <span>${escapeHTML(t.category)} • ${escapeHTML(t.date)}</span>
      </div>
      <strong class="${t.type==="income"?"positive":"negative"}">
        ${sign} ${money(t.value)}
      </strong>
    </div>
  `;
}

function renderTransactions(){
  $("recentTransactions").innerHTML =
    state.transactions.slice(0,4).map(txHTML).join("");

  applyFilters();
}

function applyFilters(){
  const q=($("searchTx")?.value||"").toLowerCase();
  const type=$("typeFilter")?.value||"all";

  if($("allTransactions")){
    $("allTransactions").innerHTML =
      state.transactions.map(txHTML).join("");

    document.querySelectorAll("#allTransactions .searchable").forEach(row=>{
      const okText=row.textContent.toLowerCase().includes(q);
      const okType=type==="all"||row.dataset.type===type;

      row.style.display=okText&&okType?"flex":"none";
    });
  }
}

function renderAllTransactions(){
  $("allTransactions").innerHTML =
    state.transactions.map(txHTML).join("");

  applyFilters();
}

// METAS
function renderGoals(){
  const sorted=[...state.goals].sort(
    (a,b)=>(b.saved/b.target)-(a.saved/a.target)
  );

  const main=sorted[0];

  if(main){
    const pct=Math.min(100,main.saved/main.target*100);

    $("mainGoal").innerHTML=`
      <div class="goal-card">
        <div class="goal-icon">${main.icon}</div>
        <div class="goal-info">
          <h3>${escapeHTML(main.name)}</h3>
          <p>${money(main.saved)} de ${money(main.target)}</p>
        </div>
        <strong>${Math.round(pct)}%</strong>
      </div>
      <div class="progress">
        <span style="width:${pct}%"></span>
      </div>
      <div class="goal-bottom">
        <span>Faltam ${money(Math.max(0,main.target-main.saved))}</span>
        <span>Meta: ${main.deadline}</span>
      </div>
    `;
  } else {
    $("mainGoal").innerHTML=`<p class="empty">Crie sua primeira meta.</p>`;
  }

  $("goalGrid").innerHTML=state.goals.map(g=>{
    const pct=Math.min(100,g.saved/g.target*100);

    return `
      <article class="panel big-goal">
        <div class="goal-icon">${g.icon}</div>
        <h3>${escapeHTML(g.name)}</h3>
        <p>${money(g.saved)} / ${money(g.target)}</p>
        <div class="progress">
          <span style="width:${pct}%"></span>
        </div>
        <div class="goal-bottom">
          <span>${Math.round(pct)}% concluído</span>
          <span>${g.deadline}</span>
        </div>
        <div class="goal-actions">
          <button class="small-btn" data-contribute="${g.id}">
            ＋ Adicionar valor
          </button>
          <button class="small-btn" data-delete-goal="${g.id}">
            Excluir
          </button>
        </div>
      </article>
    `;
  }).join("") + `
    <article class="panel new-goal" data-modal="goal">
      <div class="plus-circle">＋</div>
      <h3>Criar nova meta</h3>
      <p>Comece a planejar seu próximo objetivo.</p>
    </article>
  `;

  document.querySelectorAll("[data-contribute]").forEach(b=>{
    b.addEventListener("click",()=>{
      contribute(Number(b.dataset.contribute));
    });
  });

  document.querySelectorAll("[data-delete-goal]").forEach(b=>{
    b.addEventListener("click",()=>{
      deleteGoal(Number(b.dataset.deleteGoal));
    });
  });

  document.querySelectorAll("#goalGrid [data-modal]").forEach(b=>{
    b.addEventListener("click",()=>{
      openModal("goal");
    });
  });
}

// RELATÓRIOS
function renderReports(){
  const cats=["Alimentação","Transporte","Lazer","Compras","Estudos","Outros"];

  const vals=cats.map(c=>
    state.transactions
      .filter(t=>t.type==="expense"&&t.category===c)
      .reduce((s,t)=>s+t.value,0)
  );

  const max=Math.max(...vals,1);

  $("barChart").innerHTML=vals.map(v=>`
    <i title="${money(v)}" style="height:${Math.max(4,v/max*100)}%"></i>
  `).join("");

  const total=vals.reduce((a,b)=>a+b,0);
  const topIndex=vals.indexOf(Math.max(...vals));
  const topCat=cats[topIndex];

  $("insightTitle").textContent=total
    ?`Seu maior gasto está em ${topCat}.`
    :"Comece registrando seus gastos.";

  $("insightText").textContent=total
    ?`${topCat} representa ${Math.round(vals[topIndex]/total*100)}% dos seus gastos registrados. Use essa informação para planejar melhor suas próximas despesas.`
    :"Quando você registrar movimentações, o FinEdu vai gerar insights com base nos dados da demonstração.";

  $("reportCategories").innerHTML=cats.map((c,i)=>`
    <div class="report-category">
      <i class="dot" style="background:${["#287d5e","#6da58d","#b7d6c8","#dfece6","#9fc3b3","#cbd9d3"][i]}"></i>
      <span>${c}</span>
      <strong>${money(vals[i])}</strong>
    </div>
  `).join("");
}

// MODAIS
function openModal(mode){
  modalMode=mode;

  $("modal").classList.add("open");
  $("modal").setAttribute("aria-hidden","false");
  $("modalForm").reset();

  $("goalTargetLabel").classList.toggle("hidden",mode!=="goal");
  $("categoryLabel").classList.toggle("hidden",mode==="goal");

  if(mode==="income"){
    $("modalTitle").textContent="Adicionar entrada";
    $("modalSubtitle").textContent="Registre uma entrada na sua conta demonstrativa.";
    $("modalDesc").placeholder="Ex.: Mesada";
  } else if(mode==="goal"){
    $("modalTitle").textContent="Criar nova meta";
    $("modalSubtitle").textContent="Defina um objetivo e acompanhe seu progresso.";
    $("modalDesc").placeholder="Ex.: Viagem";
  } else {
    $("modalTitle").textContent="Adicionar gasto";
    $("modalSubtitle").textContent="Registre uma despesa na sua conta demonstrativa.";
    $("modalDesc").placeholder="Ex.: Lanche";
  }

  setTimeout(()=>$("modalDesc").focus(),50);
}

function closeModal(){
  $("modal").classList.remove("open");
  $("modal").setAttribute("aria-hidden","true");
}

$("modalForm").addEventListener("submit",e=>{
  e.preventDefault();

  const desc=$("modalDesc").value.trim();
  const value=Number($("modalValue").value);

  if(!desc||!Number.isFinite(value)||value<=0){
    showToast("Preencha os campos corretamente.");
    return;
  }

  if(modalMode==="goal"){
    const target=Number($("goalTarget").value);

    if(!Number.isFinite(target)||target<=0){
      showToast("Informe um valor válido para a meta.");
      return;
    }

    state.goals.push({
      id:Date.now(),
      name:desc,
      icon:"🎯",
      saved:0,
      target,
      deadline:"A definir"
    });

    closeModal();
    render();
    showToast("Meta criada com sucesso! ✓");
    showPage("metas");
    return;
  }

  const type=modalMode==="income"?"income":"expense";
  const date=new Date().toLocaleDateString("pt-BR");
  const category=type==="income"?"Entrada":$("modalCategory").value;

  state.transactions.unshift({
    id:Date.now(),
    type,
    desc,
    value,
    category,
    date
  });

  if(type==="income"){
    state.incomes+=value;
  } else {
    state.expenses+=value;
  }

  closeModal();
  render();

  showToast(
    type==="income"
      ?"Entrada adicionada! ✓"
      :"Gasto adicionado! ✓"
  );
});

// ADICIONAR VALOR À META
function contribute(id){
  const amount=Number(prompt("Quanto deseja adicionar à meta?"));

  if(!Number.isFinite(amount)||amount<=0)return;

  const goal=state.goals.find(g=>g.id===id);

  if(!goal)return;

  goal.saved=Math.min(goal.target,goal.saved+amount);

  render();
  showToast("Valor adicionado à meta! ✓");
}

// EXCLUIR META
function deleteGoal(id){
  if(!confirm("Excluir esta meta?"))return;

  state.goals=state.goals.filter(g=>g.id!==id);

  render();
  showToast("Meta excluída.");
}

// FUNÇÕES AUXILIARES
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g,m=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[m]));
}

function showToast(msg){
  const t=$("toast");

  t.textContent=msg;
  t.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer=setTimeout(()=>{
    t.classList.remove("show");
  },2600);
}

// OCULTAR OU MOSTRAR SALDO
$("eyeBtn").addEventListener("click",()=>{
  balanceHidden=!balanceHidden;
  render();

  $("eyeBtn").setAttribute(
    "aria-label",
    balanceHidden?"Mostrar saldo":"Ocultar saldo"
  );
});

// FILTROS DE MOVIMENTAÇÕES
$("searchTx").addEventListener("input",applyFilters);
$("typeFilter").addEventListener("change",applyFilters);

// CLIQUES GERAIS
document.addEventListener("click",e=>{
  const modalTrigger=e.target.closest("[data-modal]");

  if(modalTrigger){
    openModal(modalTrigger.dataset.modal);
  }

  const lesson=e.target.closest("[data-lesson]");

  if(lesson){
    openLesson(lesson.dataset.lesson);
  }
});

$("closeModal").addEventListener("click",closeModal);

$("modal").addEventListener("click",e=>{
  if(e.target===$("modal"))closeModal();
});

// DICAS DO FINEDU
const tips=[
  "Pequenos gastos também fazem diferença. Registrar tudo ajuda você a enxergar seus hábitos.",
  "Antes de comprar, compare o preço e pense se a compra cabe no seu planejamento.",
  "Uma meta fica mais fácil quando você divide o valor em pequenas etapas.",
  "Conhecer seus gastos é o primeiro passo para tomar decisões financeiras mais conscientes."
];

$("nextTip").addEventListener("click",()=>{
  tipIndex=(tipIndex+1)%tips.length;
  $("dailyTip").textContent=tips[tipIndex];
});

// CONTEÚDOS DE EDUCAÇÃO FINANCEIRA
function openLesson(type){
  const lessons={
    orcamento:[
      "📊 Orçamento pessoal",
      "Um orçamento é uma forma de visualizar quanto entra e quanto sai. Comece registrando todas as entradas e despesas. Depois, agrupe os gastos por categorias e observe onde seu dinheiro está sendo usado."
    ],
    metas:[
      "🎯 Como criar uma meta",
      "Escolha algo que você quer alcançar, defina um valor e um prazo. Depois, divida o objetivo em pequenas etapas. O importante é acompanhar o progresso e ajustar o plano quando necessário."
    ],
    seguranca:[
      "🛡️ Segurança financeira",
      "Não compartilhe senhas, códigos de autenticação ou dados bancários por mensagens. Desconfie de pedidos urgentes e confira o endereço de sites antes de inserir informações."
    ],
    credito:[
      "💳 Cartão e crédito",
      "Comprar no crédito não significa que o gasto desapareceu: ele continua sendo um compromisso de pagamento. Antes de parcelar, considere o valor total e se as parcelas cabem no seu orçamento."
    ]
  };

  const [h,p]=lessons[type];

  $("lessonContent").innerHTML=`
    <h3>${h}</h3>
    <p>${p}</p>
    <button class="primary full" id="lessonOk">Fechar</button>
  `;

  $("lessonModal").classList.add("open");
  $("lessonModal").setAttribute("aria-hidden","false");

  $("lessonOk").addEventListener("click",closeLesson,{once:true});
}

function closeLesson(){
  $("lessonModal").classList.remove("open");
  $("lessonModal").setAttribute("aria-hidden","true");
}

$("closeLesson").addEventListener("click",closeLesson);

$("lessonModal").addEventListener("click",e=>{
  if(e.target===$("lessonModal"))closeLesson();
});

// PREMIUM
$("premiumBtn").addEventListener("click",()=>{
  $("premiumModal").classList.add("open");
});

$("closePremium").addEventListener("click",()=>{
  $("premiumModal").classList.remove("open");
});

$("premiumCloseAction").addEventListener("click",()=>{
  $("premiumModal").classList.remove("open");
});

// PERFIL
$("profileBtn").addEventListener("click",()=>{
  $("profileModal").classList.add("open");
});

$("closeProfile").addEventListener("click",()=>{
  $("profileModal").classList.remove("open");
});

// RESTAURAR DADOS
$("resetData").addEventListener("click",()=>{
  state=structuredClone(initialState);

  $("profileModal").classList.remove("open");

  render();

  showToast("Dados de demonstração restaurados! ✓");
});

// NOTIFICAÇÕES E CONFIGURAÇÕES
$("notificationBtn").addEventListener("click",()=>{
  showToast("Você está em dia com o acompanhamento das suas finanças. ✓");
});

$("settingsBtn").addEventListener("click",()=>{
  showToast("Configurações: versão demonstrativa da feira.");
});

// INICIALIZAÇÃO
render();
renderAllTransactions();
showPage(window.location.hash.slice(1)||"inicio",false);