/* Portal do Cliente — front-end (JS puro, sem dependências) */
(function () {
  "use strict";

  const root = document.getElementById("root");
  const modalRoot = document.getElementById("modal-root");
  let LANCAMENTO = {ativo:true,views:["receita-mensal","painel","documentos","certificado","guias","agenda","historico","obrigacoes","solicitacoes","empresas","acessos"]};
  const liberado = key => !LANCAMENTO.ativo || LANCAMENTO.views.includes(key);
  let ME = null;          // usuário logado
  let VIEW = "painel";    // aba atual
  let EMPRESAS = [];      // cache (escritório)
  let FILTRO_EMPRESA = ""; // empresa selecionada (escritório)

  // ---------- API ----------
  async function api(path, opts = {}) {
    const res = await fetch(path, Object.assign({ credentials: "same-origin" }, opts));
    let data = null;
    const ct = res.headers.get("Content-Type") || "";
    if (ct.includes("application/json")) data = await res.json();
    if (!res.ok) throw new Error((data && data.erro) || ("Erro " + res.status));
    return data;
  }
  const jpost = (path, body) => api(path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}),
  });

  // ---------- Helpers ----------
  const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("pt-BR");
  }
  function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function fmtSize(n) {
    if (!n) return "—";
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }
  const STATUS_OBR = {
    pendente: ["Pendente", "warn"], em_andamento: ["Em andamento", "info"],
    concluida: ["Concluída", "ok"], atrasada: ["Atrasada", "danger"],
  };
  const STATUS_SOL = {
    aberta: ["Aberta", "warn"], respondida: ["Respondida", "info"], fechada: ["Fechada", "muted"],
  };
  const isOffice = () => ME && ME.perfil === "escritorio";
  const empParam = () => (FILTRO_EMPRESA ? "?empresa_id=" + encodeURIComponent(FILTRO_EMPRESA) : "");

  const TODOS_DOCUMENTOS_ESSENCIAIS = [
    { categoria: "Contrato social", titulo: "Contrato social e alterações", grupo: "Documentos da empresa" },
    { categoria: "Certidões", titulo: "Certidões do cliente", grupo: "Documentos da empresa" },
    { categoria: "CNPJ", titulo: "Cartão CNPJ", grupo: "Documentos da empresa" },
    { categoria: "Inscrição municipal", titulo: "Inscrição municipal", grupo: "Documentos da empresa" },
    { categoria: "Inscrição estadual", titulo: "Inscrição estadual", grupo: "Documentos da empresa" },
    { categoria: "Certificado digital", titulo: "Certificado digital", grupo: "Documentos da empresa" },
    { categoria: "IRPF", titulo: "Imposto de renda dos sócios", grupo: "Documentos dos sócios" },
    { categoria: "Faturamento", titulo: "Relação de faturamento", grupo: "Faturamento" },
  ];
  // correção: antes era declarada dentro de documentosEssenciais() e quebrava Avisos e o modal de envio
  const docsEssenciais = () => TODOS_DOCUMENTOS_ESSENCIAIS.filter(item=>!LANCAMENTO.ativo || item.categoria!=="Faturamento");

  function documentosEssenciais(documentos, empresa, digital) {
    // Apenas arquivos publicados pelo escritório compõem os documentos oficiais.
    const publicados = documentos.filter(d => d.origem === "escritorio");
    const ultimo = categoria => publicados.filter(d => d.categoria === categoria)
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)) || b.id - a.id)[0];
    const disponiveis = docsEssenciais().filter(item => item.categoria === "Certificado digital" ? digital?.confirmacao_recente && ["valido","vence_em_breve"].includes(digital.status) : ultimo(item.categoria)).length;
    const area = el(`<section class="essential-area" aria-label="Documentos essenciais">
      <div class="client-welcome"><div><span class="eyebrow">SEU ESCRITÓRIO, MAIS PERTO</span>
      <h3>${esc(empresa.nome)}</h3><p>CNPJ ${esc(empresa.cnpj || "não informado")} · Documentos da sua empresa em um só lugar.</p></div>
      <span class="badge info">${disponiveis} de ${docsEssenciais().length} disponíveis</span></div>
      <p class="essential-note">Consulte a última versão publicada pelo escritório. Confira a competência e a data de publicação de cada arquivo.</p>
    </section>`);
    ["Documentos da empresa", "Documentos dos sócios", "Faturamento"].forEach(grupo => {
      const section = el(`<section class="document-group"><h3>${grupo}</h3><div class="essential-grid"></div></section>`);
      const grid = section.querySelector(".essential-grid");
      docsEssenciais().filter(item => item.grupo === grupo).forEach(item => {
        if (item.categoria === "Faturamento") {
          const card=el('<article class="essential-card"><div class="document-symbol">▥</div><h4>Faturamento fiscal · últimos 12 meses</h4><p>Valores confirmados no PGDAS-D para empresas do Simples Nacional.</p><button class="btn sm ghost">Ver faturamento</button></article>');card.querySelector('button').onclick=()=>{VIEW='faturamento';renderApp();};grid.appendChild(card);return;
        }
        if (item.categoria === "Certificado digital") {
          const estados = {valido:['Válido','ok'],vence_em_breve:['Vence em breve','warn'],vencido:['Vencido','danger'],validade_desconhecida:['Validade não informada','muted'],sem_certificado:['Sem certificado cadastrado','muted'],nao_confirmado:['Situação a confirmar','warn']};
          const [estado,cor] = !digital ? ['Aguardando sincronização','muted'] : !digital.confirmacao_recente ? ['Atualização pendente','warn'] : (estados[digital.status] || estados.nao_confirmado);
          const card = el(`<article class="essential-card"><div class="document-symbol" aria-hidden="true">◈</div><span class="badge ${cor}">${estado}</span><h4>Certificado digital</h4><p>Acompanhe a validade cadastrada pelo escritório.</p>${digital?.vencimento ? `<strong>Vencimento: ${fmtDate(digital.vencimento)}</strong>` : ''}${digital?.dias_restantes != null ? `<p>${digital.dias_restantes < 0 ? 'Vencido há '+Math.abs(digital.dias_restantes)+' dias' : digital.dias_restantes === 0 ? 'Vence hoje' : 'Faltam '+digital.dias_restantes+' dias'}</p>` : ''}${digital ? `<small>Portal interno · atualizado em ${fmtDateTime(digital.sincronizado_em)}</small>` : ''}</article>`);
          const acompanhar=el('<button class="btn sm ghost">Ver validade e solicitar atualização</button>');acompanhar.onclick=()=>{VIEW="certificado";renderApp();};card.appendChild(acompanhar);
          grid.appendChild(card); return;
        }
        if(item.categoria==='Contrato social'||item.categoria==='IRPF'){
          const arquivos=publicados.filter(d=>item.categoria==='IRPF'?d.categoria.startsWith('IRPF'):d.categoria==='Contrato social');
          const card=el(`<article class="essential-card"><div class="document-symbol">▤</div><span class="badge ${arquivos.length?'ok':'muted'}">${arquivos.length} arquivos</span><h4>${item.categoria==='IRPF'?'Imposto de renda dos sócios':'Contrato social e alterações'}</h4><p>${item.categoria==='IRPF'?'Declarações, recibos e documentos por sócio e exercício.':'Histórico da pasta de contratos da empresa, com os nomes originais dos arquivos.'}</p><button class="btn sm ghost">Ver histórico completo</button></article>`);
          card.querySelector('button').onclick=()=>{DOCUMENT_CATEGORY=item.categoria;VIEW='documentos';renderApp();};grid.appendChild(card);return;
        }
        const doc = ultimo(item.categoria);
        const certidoes = item.categoria === "Certidões" ? publicados.filter(d => d.categoria === "Certidões") : [];
        const card = el(`<article class="essential-card"><div class="document-symbol" aria-hidden="true">▤</div>
          <span class="badge ${doc ? "ok" : "muted"}">${doc ? "Disponível" : "Aguardando publicação"}</span>
          <h4>${esc(item.titulo)}</h4>
          <p>${doc ? esc(doc.titulo) : "O escritório ainda não publicou este documento."}</p>
          ${item.detalhe ? `<small>${esc(item.detalhe)}</small>` : ""}
          ${doc ? `<small>Competência: ${esc(doc.competencia || "não informada")}<br>${item.categoria === "CNPJ" ? (doc.consultado_em ? "Consulta informada: " + fmtDateTime(doc.consultado_em) : "Disponibilizado em " + fmtDateTime(doc.criado_em)) : "Publicado em " + fmtDate(doc.criado_em)}${doc.validade ? `<br>Válida até ${fmtDate(doc.validade)} · Portal interno` : ""}</small>
          <a class="btn sm ghost" href="/api/download?id=${encodeURIComponent(doc.id)}">Baixar documento ↓</a>` : `<button class="btn sm ghost" type="button">${isOffice() ? "Publicar documento" : "Solicitar ao escritório"}</button>`}
        </article>`);
        if (!doc) card.querySelector("button").addEventListener("click", () => {
          if (isOffice()) modalUpload(item.categoria);
          else modalNovaSolicitacao(item.titulo);
        });
        if (item.categoria === "CNPJ") {
          if (doc) {
            const link=card.querySelector('a');const preview=el('<button class="btn sm ghost">Pré-visualizar cartão CNPJ</button>');preview.onclick=()=>previewCertidao(doc);link.replaceWith(preview);
          }
          if(isOffice()) {
            const emitir=el('<a class="btn sm" style="margin-top:10px" href="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_S.aspx" target="_blank" rel="noopener noreferrer">Emitir na Receita Federal ↗</a>');
            const copyStatus=el('<small role="status" aria-live="polite" style="margin-top:8px"></small>');
            emitir.addEventListener('click',()=>{
              const cnpj=String(empresa.cnpj||'').replace(/\D/g,'');
              if(cnpj.length!==14){copyStatus.textContent='CNPJ incompleto: confira o cadastro da empresa.';return;}
              const fallback=()=>{
                const field=document.createElement('textarea');field.value=cnpj;field.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(field);field.select();
                let copied=false;try{copied=document.execCommand('copy');}catch(_){}field.remove();return copied;
              };
              // Iniciar a cópia no clique, antes de o link abrir a nova aba.
              if(navigator.clipboard?.writeText){navigator.clipboard.writeText(cnpj).then(()=>{copyStatus.textContent='CNPJ copiado! Cole no campo da Receita Federal.';}).catch(()=>{copyStatus.textContent=fallback()?'CNPJ copiado! Cole no campo da Receita Federal.':'Não foi possível copiar automaticamente. CNPJ: '+cnpj;});}
              else copyStatus.textContent=fallback()?'CNPJ copiado! Cole no campo da Receita Federal.':'Não foi possível copiar automaticamente. CNPJ: '+cnpj;
            });
            card.appendChild(emitir);
            card.appendChild(copyStatus);
            const anexar=el('<button class="btn sm ghost" style="margin-top:10px">Publicar comprovante oficial</button>');anexar.onclick=()=>modalUpload('CNPJ');card.appendChild(anexar);
          }
        }
        if (certidoes.length) {
          card.querySelector("a").remove();
          const links = el('<div class="certificate-links"></div>');
          certidoes.forEach(certidao => {
            const button = el(`<button class="btn sm ghost" type="button">Pré-visualizar · ${esc(certidao.titulo)} · ${certidao.validade ? "Válida até " + fmtDate(certidao.validade) : fmtDate(certidao.criado_em)}</button>`);
            button.onclick = () => previewCertidao(certidao);
            links.appendChild(button);
          });
          card.appendChild(links);
        }
        grid.appendChild(card);
      });
      area.appendChild(section);
    });
    return area;
  }

  async function previewCertidao(doc) {
    const previous = document.activeElement;
    const back = el(`<div class="modal-backdrop"><section class="modal pdf-preview" role="dialog" aria-modal="true" aria-labelledby="previewTitle"><div class="modal-head"><h3 id="previewTitle">${esc(doc.titulo)}</h3><button class="x" aria-label="Fechar pré-visualização">×</button></div><div class="preview-meta">${doc.validade ? 'Válida até '+fmtDate(doc.validade)+' · ' : ''}${esc(doc.nome_arquivo)}</div><div class="preview-body"><p role="status">Carregando PDF…</p></div><div class="modal-foot"><button class="btn ghost" type="button">Fechar</button><a class="btn" href="${esc(doc.downloadUrl||'/api/download?id='+encodeURIComponent(doc.id))}">${esc(doc.downloadLabel||'Baixar comprovante ↓')}</a>${doc.xmlUrl?'<a class="btn ghost" href="'+esc(doc.xmlUrl)+'">Baixar XML original</a>':''}</div></section></div>`);
    modalRoot.appendChild(back);
    let blobUrl = null; let closed = false; let pdfDocument = null;
    const controller = new AbortController();
    const close = () => { closed = true;controller.abort();if(pdfDocument)pdfDocument.destroy();if(blobUrl) URL.revokeObjectURL(blobUrl);back.remove();document.removeEventListener('keydown',keys);previous?.focus(); };
    const keys = e => {
      if(e.key === 'Escape') close();
      if(e.key === 'Tab') {
        const focusable = [...back.querySelectorAll('button,a,iframe')];
        const first = focusable[0], last = focusable[focusable.length-1];
        if(e.shiftKey && document.activeElement === first){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement === last){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown', keys);
    back.querySelector('.x').onclick=close;back.querySelector('.modal-foot button').onclick=close;
    back.onclick=e=>{if(e.target===back)close();};back.querySelector('.x').focus();
    try {
      const response = await fetch(doc.previewUrl||'/api/preview?id='+encodeURIComponent(doc.id),{credentials:'same-origin',signal:controller.signal});
      if(!response.ok){const error=await response.json();throw Error(error.erro||'Não foi possível abrir o PDF.');}
      const blob = await response.blob();
      if(closed) return;
      if(response.headers.get('Content-Type')?.includes('text/html')) {
        const body=back.querySelector('.preview-body');body.innerHTML='';
        const frame=document.createElement('iframe');frame.title='Comprovante oficial do CNPJ';frame.setAttribute('sandbox','');frame.src='/api/preview?id='+encodeURIComponent(doc.id);body.appendChild(frame);return;
      }
      const pdfjs = await import('/pdfjs/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      pdfDocument = await pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),cMapUrl:'/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/pdfjs/standard_fonts/',wasmUrl:'/pdfjs/wasm/',isEvalSupported:false}).promise;
      if(closed){pdfDocument.destroy();return;}
      const body=back.querySelector('.preview-body');body.innerHTML='';
      for(let pageNumber=1;pageNumber<=pdfDocument.numPages;pageNumber++){
        if(closed)return;
        const page=await pdfDocument.getPage(pageNumber);
        const natural=page.getViewport({scale:1});
        const scale=Math.min((body.clientWidth-24)/natural.width,1.5);
        const viewport=page.getViewport({scale});
        const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width*1.5);canvas.height=Math.ceil(viewport.height*1.5);
        canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('aria-label','Página '+pageNumber+' de '+pdfDocument.numPages);
        body.appendChild(canvas);
        await page.render({canvasContext:canvas.getContext('2d'),viewport,transform:[1.5,0,0,1.5,0,0]}).promise;
      }
      back.querySelector('.preview-meta').appendChild(el(`<small>${pdfDocument.numPages} página(s)</small>`));
    }catch(err){if(!closed){back.querySelector('.preview-body').innerHTML=`<div class="alert err" role="alert">${esc(err.message)}</div>`;}}
  }

  // ---------- Login ----------
  // ---------- Login v2 ----------
  // Em modo demonstração (versão publicada, window.CE_DEMO), os campos ficam travados e nenhuma senha é digitada.
  const DEMO = () => !!window.CE_DEMO;
  function demoEntrou() { try { return sessionStorage.getItem("ce-demo-entrou") === "1"; } catch (e) { return !!window.__ceDemoEntrou; } }
  function marcarDemoEntrou(v) { try { v ? sessionStorage.setItem("ce-demo-entrou", "1") : sessionStorage.removeItem("ce-demo-entrou"); } catch (e) { window.__ceDemoEntrou = v; } }
  const ICO_LOGIN = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.2 3.9M6.4 7.6A16 16 0 0 0 2.5 12S6 18 12 18c1.4 0 2.7-.3 3.8-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  };
  const icoL = k => `<svg class="ico-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO_LOGIN[k]}</svg>`;

  function renderLogin(erro) {
    root.innerHTML = "";
    const demo = DEMO();
    const wrap = el(`
      <div class="login-wrap login-v2">
        <div class="login-top"><span class="theme-switch"><span aria-hidden="true" class="ts-ico">☀</span><button type="button" class="neu-toggle" id="themeToggle" role="switch" aria-pressed="false" aria-checked="false" aria-label="Tema escuro"></button><span aria-hidden="true" class="ts-ico">☾</span></span></div>
        <form class="login-card" id="loginForm" novalidate>
          <div class="login-logo"><span class="logo-ce" role="img" aria-label="Contábil Empresarial"><img src="img/logo-toda-branca.png" alt="" width="506" height="200"></span></div>
          <h1>Portal do Cliente</h1>
          ${erro ? `<div class="alert err" role="alert">${esc(erro)}</div>` : ""}
          <div class="field">
            <label for="lgUser">Usuário</label>
            <div class="in-ico">${icoL("user")}<input id="lgUser" name="usuario" autocomplete="username" ${demo ? 'value="demonstração" readonly tabindex="-1"' : "autofocus required"} placeholder="Seu usuário"></div>
          </div>
          <div class="field">
            <label for="lgPass">Senha</label>
            <div class="in-ico">${icoL("lock")}<input id="lgPass" name="senha" type="password" autocomplete="current-password" ${demo ? 'value="demonstracao" readonly tabindex="-1"' : "required"} placeholder="Sua senha">
              ${demo ? "" : `<button type="button" class="pw-toggle" aria-label="Mostrar senha" aria-pressed="false">${icoL("eye")}</button>`}</div>
          </div>
          <button class="btn login-btn" type="submit">Entrar</button>
          <button type="button" class="link-btn forgot">Esqueci minha senha</button>
          <p class="forgot-msg" hidden>Peça ao escritório um novo acesso pelo canal de atendimento de costume. Por segurança, a senha nunca é enviada por e-mail.</p>
        </form>
        <p class="login-foot">Acesso exclusivo para clientes da Contábil Empresarial</p>
      </div>`);
    const f = wrap.querySelector("#loginForm");
    const tg = wrap.querySelector("#themeToggle");
    tg.onclick = () => { const t = temaAtual() === "dark" ? "light" : "dark"; try { localStorage.setItem("ce-tema", t); } catch (e) {} aplicarTema(t); };
    wrap.querySelector(".forgot").onclick = () => { const m = wrap.querySelector(".forgot-msg"); m.hidden = !m.hidden; };
    const pw = wrap.querySelector(".pw-toggle");
    if (pw) pw.onclick = () => { const i = f.senha, show = i.type === "password"; i.type = show ? "text" : "password"; pw.setAttribute("aria-pressed", String(show)); pw.setAttribute("aria-label", show ? "Ocultar senha" : "Mostrar senha"); pw.innerHTML = icoL(show ? "eyeOff" : "eye"); i.focus(); };
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!demo && !f.reportValidity()) return;
      const btn = f.querySelector(".login-btn");
      btn.disabled = true; btn.textContent = "Entrando…";
      try {
        // protótipo: entra como cliente; a visão do escritório fica num atalho escondido (dois cliques na logo)
        const perfilDemo = demo && window.CE_DEMO && window.CE_DEMO.perfil ? window.CE_DEMO.perfil() : "cliente";
        const usuario = demo ? perfilDemo : f.usuario.value;
        const r = await jpost("/api/login", { usuario, senha: demo ? "demonstracao" : f.senha.value });
        if (demo) marcarDemoEntrou(true);
        ME = r.usuario;
        EMPRESAS = []; FILTRO_EMPRESA = "";
        VIEW = "painel";
        renderApp();
      } catch (err) {
        renderLogin(err.message);
      }
    });
    root.appendChild(wrap);
    aplicarTema(temaAtual());
  }

  // ---------- Shell ----------
  const NAV = [
    { key: "painel", ico: "◧", label: "Início" },
    { key:"receita-mensal",ico:"▥",label:"Faturamento" },
    { key:"faturamento",ico:"▥",label:"Análise de faturamento" },
    { key:"parcelamentos",ico:"≡",label:"Parcelamentos" },
    { key:"atualizar-guias",ico:"↻",label:"Atualizar guias" },
    { key:"dp",ico:"♧",label:"Departamento Pessoal" },
    { key:"folha",ico:"◫",label:"Folha e custo de pessoal" },
    { key: "certificado", ico: "◇", label: "Certificado digital" },
    { key: "financeiro", ico: "＄", label: "Financeiro" },
    { key: "documentos", ico: "▤", label: "Documentos" },
    { key:"malotes",ico:"▣",label:"Malotes" },
    { key:"guias",ico:"＄",label:"Guias de impostos" },
    { key:"agenda",ico:"▦",label:"Calendário e prazos" },
    { key:"notas-servico",ico:"▦",label:"Notas de serviços" },
    { key:"notas-produtos",ico:"▦",label:"Compras · NF-e" },
    { key:"sefaz-go",ico:"▦",label:"SEFAZ · XML e consultas" },
    { key:"avisos",ico:"◉",label:"Avisos e pendências" },
    { key:"historico",ico:"↺",label:"Histórico" },
    { key: "obrigacoes", ico: "◔", label: "Status fiscal" },
    { key: "solicitacoes", ico: "✉", label: "Solicitações" },
  ];
  const NAV_OFFICE = [{key:"consultas-parcelamentos",ico:"◴",label:"Consultas de parcelamentos"},{key:"auditoria-faturamento",ico:"▦",label:"Atualização de faturamentos"},{ key: "empresas", ico: "⛋", label: "Empresas" }, {key:"acessos",ico:"♙",label:"Acessos e grupos"}];

  // ---------- Navegação v2 (abas no topo, agrupadas) ----------
  const NAV_GROUPS = [
    { key: "inicio", label: "Início", items: ["painel"] },
    { key: "impostos", label: "Impostos", items: ["guias", "atualizar-guias", "parcelamentos", "obrigacoes", "agenda", "sefaz-go"] },
    { key: "faturamento", label: "Faturamento e notas", items: ["receita-mensal", "faturamento", "notas-servico", "notas-produtos"] },
    { key: "pessoal", label: "Pessoal", items: ["dp", "folha"] },
    { key: "financeiro", label: "Financeiro", items: ["financeiro"] },
    { key: "documentos", label: "Documentos", items: ["documentos", "certificado", "malotes", "historico"] },
    { key: "escritorio", label: "Escritório", office: true, items: ["consultas-parcelamentos", "auditoria-faturamento", "empresas", "acessos"] },
  ];
  const NAV_ALL = () => NAV.concat(NAV_OFFICE);
  const navInfo = (key) => NAV_ALL().find((n) => n.key === key);
  function navDisponivel() {
    const keys = NAV.concat(isOffice() ? NAV_OFFICE.filter(n => n.key !== 'acessos' || ME.funcao === 'administrador') : [])
      .filter(n => liberado(n.key)).map(n => n.key);
    return NAV_GROUPS.filter(g => !g.office || isOffice())
      .map(g => Object.assign({}, g, { items: g.items.filter(k => keys.includes(k)) }))
      .filter(g => g.items.length);
  }
  const grupoDe = (key) => NAV_GROUPS.find(g => g.items.includes(key));
  // Troca de tela sem piscar: a tela atual fica parada até a nova estar pronta
  // (no máximo 0,7 s) e as duas se fundem com uma transição suave (View Transitions).
  // Sem suporte no navegador, ou com "reduzir movimento", troca direto como antes.
  let ULTIMA_VIEW = null;
  const menosMovimento = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  function trocarTela(fn) {
    if (EMERGIR && !menosMovimento() && !document.hidden) return transicaoEmergir(fn, "tela");
    if (!document.startViewTransition || menosMovimento() || document.hidden) return Promise.resolve(fn());
    const html = document.documentElement;
    html.classList.add("vt-ativa");
    const vt = document.startViewTransition(() => Promise.race([
      Promise.resolve().then(fn).catch(() => {}),
      new Promise(r => setTimeout(r, 700)),
    ]));
    vt.ready.catch(() => {});
    vt.finished.catch(() => {}).finally(() => html.classList.remove("vt-ativa"));
    return vt.updateCallbackDone.catch(() => {});
  }
  function irPara(key) {
    fecharJanela(true);
    VIEW = key;
    trocarTela(() => { const p = renderApp(); window.scrollTo({ top: 0, behavior: "instant" }); return p; });
  }

  // ---------- Tema claro/escuro ----------
  function temaAtual() {
    let t = null; try { t = localStorage.getItem("ce-tema"); } catch (e) {}
    if (t === "dark" || t === "light") return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    const b = document.getElementById("themeToggle");
    if (b) { b.setAttribute("aria-pressed", String(t === "dark")); b.setAttribute("aria-checked", String(t === "dark")); b.title = t === "dark" ? "Usar tema claro" : "Usar tema escuro"; }
  }
  aplicarTema(temaAtual());

  // ---------- Busca rápida (Ctrl+K) ----------
  function abrirBusca() {
    if (document.querySelector(".cmdk-back")) return;
    const grupos = navDisponivel();
    const itens = grupos.flatMap(g => g.items.map(k => ({ key: k, label: navInfo(k).label, grupo: g.label })))
      .concat(["solicitacoes", "avisos"].filter(liberado).map(k => ({ key: k, label: navInfo(k).label, grupo: "Atalhos do cabeçalho" })));
    const back = el(`<div class="cmdk-back" role="dialog" aria-modal="true" aria-label="Ir para uma tela"><div class="cmdk"><input type="search" placeholder="Para onde você quer ir? Ex.: guias, certificado, notas" aria-label="Buscar tela"><ul role="listbox"></ul><p class="cmdk-hint">↑ ↓ para escolher · Enter para abrir · Esc para fechar</p></div></div>`);
    const input = back.querySelector("input"), list = back.querySelector("ul");
    let sel = 0, vis = itens;
    const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function draw() {
      list.innerHTML = "";
      vis.forEach((it, i) => {
        const li = el(`<li role="option" aria-selected="${i === sel}" class="${i === sel ? "on" : ""}"><span>${esc(it.label)}</span><small>${esc(it.grupo)}</small></li>`);
        li.onclick = () => { fechar(); irPara(it.key); };
        list.appendChild(li);
      });
      if (!vis.length) list.appendChild(el(`<li class="cmdk-empty">Nenhuma tela encontrada</li>`));
    }
    function fechar() { back.remove(); document.removeEventListener("keydown", onKey, true); }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); fechar(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, vis.length - 1); draw(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
      else if (e.key === "Enter" && vis[sel]) { e.preventDefault(); const k = vis[sel].key; fechar(); irPara(k); }
    }
    input.oninput = () => { const q = norm(input.value.trim()); vis = itens.filter(it => norm(it.label + " " + it.grupo).includes(q)); sel = 0; draw(); };
    back.addEventListener("click", e => { if (e.target === back) fechar(); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(back); draw(); input.focus();
  }
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && ME) { e.preventDefault(); abrirBusca(); }
  });

  // ---------- Seletor de empresa no cabeçalho ----------
  function sincronizarEmpresaHeader() {
    const sel = document.getElementById("empHeader");
    if (!sel) return;
    const wrap = sel.closest(".emp-switch");
    if (!isOffice() && EMPRESAS.length < 2) {
      wrap.classList.add("static");
      sel.replaceWith(el(`<span class="emp-name">${esc(ME.empresa_nome || (EMPRESAS[0] && EMPRESAS[0].nome) || "")}</span>`));
      return;
    }
    sel.innerHTML = isOffice() ? `<option value="">Todas as empresas</option>` : "";
    EMPRESAS.forEach(e => {
      const o = document.createElement("option"); o.value = e.id; o.textContent = e.nome;
      if (String(e.id) === String(FILTRO_EMPRESA)) o.selected = true; sel.appendChild(o);
    });
    sel.onchange = () => { FILTRO_EMPRESA = sel.value; trocarTela(routeView); };
  }

  // ---------- Ícones (traço simples, herdam a cor do texto) ----------
  const ICO_PATHS = {
    inicio: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    impostos: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    faturamento: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    pessoal: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6"/>',
    financeiro: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M16.5 14.5h2"/>',
    documentos: '<path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2.5h6.5A2.5 2.5 0 0 1 21 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    escritorio: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10.5 21v-3h3v3"/>',
    guias: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9.5h4M7 13h7M16.5 13.5v.01"/><path d="M15 9.5h2"/>',
    "atualizar-guias": '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4.5V8h3.5"/><path d="M4 13a8 8 0 0 0 14.6 4.5M20 19.5V16h-3.5"/>',
    parcelamentos: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h2M12 13h2M16 13h2M8 16.5h2"/>',
    obrigacoes: '<path d="M12 3 4 6v5.5c0 4.6 3.4 8.4 8 9.5 4.6-1.1 8-4.9 8-9.5V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M12 14h2M8 17.5h2"/>',
    "sefaz-go": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M10 12.5 8 14.5l2 2M14 12.5l2 2-2 2"/>',
    "receita-mensal": '<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>',
    "notas-servico": '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    "notas-produtos": '<path d="M3 4h2.5l2.2 11h11l2-8H6.5"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    dp: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    folha: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    certificado: '<circle cx="12" cy="9" r="5"/><path d="m9 13.5-1.5 7.5 4.5-2.5 4.5 2.5-1.5-7.5"/>',
    malotes: '<path d="M3 8 12 3l9 5v8.5L12 21l-9-4.5z"/><path d="m3 8 9 4.5L21 8M12 12.5V21"/>',
    historico: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4v4h4"/><path d="M12 7.5V12l3 2"/>',
    solicitacoes: '<path d="M4 5h16v11H9l-5 4z"/>',
    avisos: '<path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>',
    "consultas-parcelamentos": '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    "auditoria-faturamento": '<path d="M4 20V10M10 20V4M16 20v-7"/><path d="m15 5 2 2 4-4"/>',
    empresas: '<path d="M3 21h18M5 21V8l7-4 7 4v13"/><path d="M9 12h2M13 12h2M9 16h2M13 16h2"/>',
    acessos: '<circle cx="8" cy="14" r="4"/><path d="m11 11 8.5-8.5M16 6l2.5 2.5M14 8l2 2"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8v3H8z"/><path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01"/>',
    saida: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    "arq": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    "arq-pdf": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    "arq-xml": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M10 12.5 8 14.5l2 2M14 12.5l2 2-2 2"/>',
    "arq-zip": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M11 6v1.5M11 10v1.5M10 14.5h2v3h-2z"/>',
    "arq-planilha": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8.5 12h7v6h-7zM8.5 15h7M12 12v6"/>',
    "arq-img": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><circle cx="10" cy="12" r="1.5"/><path d="m7.5 18 3-3 2 2 1.5-1.5 2.5 2.5"/>',
    enviar: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
    baixar: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alerta: '<path d="M10.3 4.2 2.6 17.6A2 2 0 0 0 4.3 20.6h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5M12 17.2v.01"/>',
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    menos: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
    pagamento: '<rect x="2.5" y="6" width="19" height="13" rx="2.5"/><path d="m8.5 12.5 2.5 2.5 4.5-4.5"/>',
    erro: '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    editar: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  };
  const icone = (k, cls = "ico-svg") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO_PATHS[k] || ICO_PATHS.documentos}</svg>`;

  // ---------- Faixa de avisos do escritório (topo do Início) ----------
  // Hoje fica aqui no front; o ideal é o escritório publicar pelo servidor (ver NOTAS-MARCIO.md).
  // "prazo" mostra a contagem; "ate" é o último dia em que o aviso aparece.
  const AVISOS_INFO = [
    {
      id: "13-salario-2026", tipo: "Lembrete", area: "Pessoal", icone: "dp",
      titulo: "13º salário: a 1ª parcela vence segunda, 30/11",
      texto: "A 2ª parcela vence em 20/12, que cai num domingo: pague até sexta, 18/12. Se tiver dúvida sobre os valores, fale com o DP do escritório.",
      prazo: "2026-11-30", ate: "2026-12-18",
      acao: { label: "Ver Departamento Pessoal", ir: "dp" },
    },
    {
      // Conteúdo: abre a série "Café com tributos" no Instagram (endereço fixo da série, sem o media_id de um episódio).
      id: "cafe-tributos-ep-novo", tipo: "Episódio novo", area: "Café com Tributos", icone: "play", estilo: "midia", imagem: "img/cafe-com-tributos.jpg",
      titulo: "Episódio novo no ar",
      texto: "Contabilidade e impostos explicados em poucos minutos, sem juridiquês.",
      ate: "2026-12-31",
      acao: { label: "Assistir no Instagram", link: "https://www.instagram.com/contabilempresarial/series/1147979751073876/" },
    },
    {
      id: "reforma-cbs-2027", tipo: "Novidade", area: "Reforma Tributária", icone: "impostos",
      titulo: "Em 1º de janeiro, a CBS substitui o PIS e a Cofins",
      texto: "É a primeira grande etapa da Reforma Tributária, e muda notas fiscais e preços. O escritório vai procurar você para revisar o que muda na sua empresa.",
      prazo: "2027-01-01", ate: "2027-01-31",
      acao: { label: "Tirar uma dúvida", pedido: { assunto: "Reforma Tributária: o que muda para a minha empresa em 2027?", corpo: "Gostaria de entender o que muda para a minha empresa com a CBS a partir de janeiro: " } },
    },
    {
      id: "malote-2026-11", tipo: "Lembrete", area: "Documentos", icone: "malotes",
      titulo: "Malote de novembro: envie até 10/12",
      texto: "Extratos, notas de compra e comprovantes do mês. Mandar cedo ajuda a fechar o ano sem correria.",
      prazo: "2026-12-10", ate: "2026-12-10",
      acao: { label: "Abrir malotes", ir: "malotes" },
    },
  ];
  const AVISOS_DISP_KEY = "ce-avisos-dispensados";
  const avisosDispensados = () => { try { return JSON.parse(localStorage.getItem(AVISOS_DISP_KEY) || "[]"); } catch (e) { return []; } };
  function contagem(iso) {
    const n = diasAte(iso);
    if (n == null || n < 0) return null;
    if (n === 0) return { num: "Hoje", txt: "é o prazo" };
    if (n === 1) return { num: "1", txt: "dia" };
    return { num: String(n), txt: "dias" };
  }
  function montarAvisosInfo(app) {
    const wrap = app.querySelector("#infoWrap");
    if (!wrap) return;
    const fora = avisosDispensados();
    const lista = AVISOS_INFO.filter(a => !fora.includes(a.id) && (diasAte(a.ate) ?? 0) >= 0);
    clearInterval(window.__ceAvisosTimer);
    if (!lista.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    let i = 0, pausado = false;
    const calmo = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function desenhar(dir) {
      const a = lista[i], c = a.prazo ? contagem(a.prazo) : null;
      const semLink = "link" in a.acao && !a.acao.link;
      const cta = a.acao.link
        ? `<a class="btn is-cta" href="${esc(a.acao.link)}" target="_blank" rel="noopener">${icone("play")}${esc(a.acao.label)}<span class="sr-only"> (abre em nova aba)</span></a>`
        : `<button class="btn is-cta">${semLink ? icone("play") : ""}${esc(a.acao.label)}</button>`;
      wrap.innerHTML = `
        <section class="info-strip" aria-roledescription="carrossel" aria-label="Avisos do escritório">
          <article class="is-card ${a.estilo ? "is-" + a.estilo : ""} ${a.imagem ? "tem-img" : ""} ${dir ? "is-" + dir : ""}" ${a.imagem ? `style="--is-img:url('${esc(a.imagem)}')"` : ""} aria-roledescription="aviso" aria-label="${i + 1} de ${lista.length}">
            <span class="is-ico">${icone(a.icone)}</span>
            <div class="is-body">
              <span class="is-tag"><b>${esc(a.tipo)}</b> · ${esc(a.area)}</span>
              <h3>${esc(a.titulo)}</h3>
              <p>${esc(a.texto)}</p>
            </div>
            <div class="is-side">
              ${c ? `<span class="is-count" title="Prazo: ${esc(a.prazo.split("-").reverse().join("/"))}"><b>${c.num}</b><small>${c.txt}</small></span>` : ""}
              ${cta}
            </div>
            <button class="is-close" aria-label="Dispensar este aviso" title="Dispensar">×</button>
          </article>
          ${lista.length > 1 ? `<div class="is-nav">
            <button class="is-arrow" data-d="-1" aria-label="Aviso anterior">‹</button>
            <span class="is-dots">${lista.map((_, k) => `<button class="is-dot ${k === i ? "on" : ""}" data-k="${k}" aria-label="Aviso ${k + 1}" ${k === i ? 'aria-current="true"' : ""}></button>`).join("")}</span>
            <button class="is-arrow" data-d="1" aria-label="Próximo aviso">›</button>
          </div>` : ""}
        </section>`;
      const ctaEl = wrap.querySelector(".is-cta");
      if (ctaEl.tagName === "BUTTON") ctaEl.onclick = () => {
        if (semLink) return openModal(a.area, `<p>Aqui abre o episódio numa nova aba. O endereço ainda não foi cadastrado no portal.</p>`, null, { somenteLeitura: true, okLabel: "Entendi" });
        if (a.acao.ir) irPara(a.acao.ir); else modalNovaSolicitacao(a.acao.pedido);
      };
      // banner inteiro clicável (exceto fechar e o próprio botão)
      const card = wrap.querySelector(".is-card");
      card.classList.add("clicavel");
      card.onclick = (e) => { if (e.target.closest(".is-close, .is-cta")) return; ctaEl.click(); };
      wrap.querySelector(".is-close").onclick = () => {
        try { localStorage.setItem(AVISOS_DISP_KEY, JSON.stringify(avisosDispensados().concat(a.id))); } catch (e) {}
        montarAvisosInfo(document);
      };
      wrap.querySelectorAll(".is-arrow").forEach(b => b.onclick = () => ir(+b.dataset.d));
      wrap.querySelectorAll(".is-dot").forEach(b => b.onclick = () => { const k = +b.dataset.k; if (k !== i) { const d = k > i ? "next" : "prev"; i = k; desenhar(d); } });
    }
    function ir(d) { i = (i + d + lista.length) % lista.length; desenhar(d > 0 ? "next" : "prev"); }
    wrap.onmouseenter = wrap.onfocusin = () => { pausado = true; };
    wrap.onmouseleave = wrap.onfocusout = () => { pausado = false; };
    desenhar();
    if (lista.length > 1 && !calmo) window.__ceAvisosTimer = setInterval(() => { if (!pausado && document.getElementById("infoWrap") === wrap && !document.hidden) ir(1); }, 9000);
  }

  // ---------- Menu em quadrados: opção → ferramentas abaixo ----------
  let MENU_ABERTO = null; // chave do grupo cujo painel de ferramentas está aberto
  function montarMenuQuadrados(app, grupos, ativo) {
    const navEl = app.querySelector("#nav");
    const painel = app.querySelector("#toolsPanel");
    // A opção aberta e o painel viram uma peça só: o painel entra na grade logo
    // depois da linha da opção (como pasta), e a opção "desce" até ele.
    function posicionarPainel() {
      const aberto = navEl.querySelector(".opt.open");
      navEl.appendChild(painel);
      navEl.querySelectorAll(".opt").forEach(o => o.classList.remove("edge-l", "edge-r"));
      painel.classList.remove("edge-l", "edge-r");
      if (!aberto) return;
      let ultimo = aberto;
      navEl.querySelectorAll(".opt").forEach(o => { if (Math.abs(o.offsetTop - aberto.offsetTop) < 2) ultimo = o; });
      ultimo.after(painel);
      const n = navEl.getBoundingClientRect(), r = aberto.getBoundingClientRect();
      const esq = r.left - n.left < 2, dir = n.right - r.right < 2;
      aberto.classList.toggle("edge-l", esq); aberto.classList.toggle("edge-r", dir);
      painel.classList.toggle("edge-l", esq); painel.classList.toggle("edge-r", dir);
      painel.style.setProperty("--ox", (r.left + r.width / 2 - n.left) + "px");
    }
    window.__cePosPainel = posicionarPainel;
    if (!window.__ceMenuResize) {
      window.__ceMenuResize = true;
      let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => window.__cePosPainel && window.__cePosPainel(), 80); });
    }
    // Abrir/fechar com a altura de verdade: o conteúdo de baixo desce junto, sem pulo.
    let animPainel = 0;
    const easeSoft = () => getComputedStyle(document.documentElement).getPropertyValue("--ease-soft").trim() || "cubic-bezier(.22,.8,.24,1)";
    function animarPainel(quadros, dur, easing, fim, fill) {
      const id = ++animPainel;
      painel.getAnimations().forEach(a => a.cancel());
      const acabou = () => { if (id !== animPainel) return; painel.style.overflow = ""; fim && fim(); };
      if (menosMovimento() || !painel.animate) return acabou();
      painel.style.overflow = "hidden";
      let an;
      try { an = painel.animate(quadros, { duration: dur, easing, fill: fill || "none" }); }
      catch (e) { an = painel.animate(quadros, { duration: dur, easing: "cubic-bezier(.22,.8,.24,1)", fill: fill || "none" }); }
      an.onfinish = acabou;
    }
    function marcarOpcoes(g) {
      navEl.querySelectorAll(".opt").forEach(b => { const on = g && b.dataset.key === g.key; b.setAttribute("aria-expanded", on ? "true" : "false"); b.classList.toggle("open", !!on); });
    }
    function desenharPainel(animar) {
      const g = grupos.find(x => x.key === MENU_ABERTO);
      const estavaAberto = !painel.hidden;
      const hAntes = estavaAberto ? painel.offsetHeight : 0;
      const vizinhoAntes = estavaAberto ? painel.previousElementSibling : null;
      if (!g) {
        marcarOpcoes(null);
        const fechar = () => { painel.hidden = true; painel.innerHTML = ""; painel.getAnimations().forEach(a => a.cancel()); posicionarPainel(); };
        if (animar && estavaAberto) {
          const cs = getComputedStyle(painel), vao = "-" + getComputedStyle(navEl).rowGap;
          animarPainel([
            { height: hAntes + "px", paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: "0px", opacity: 1 },
            { height: "0px", paddingTop: "0px", paddingBottom: "0px", marginTop: vao, opacity: 0 },
          ], 280, "cubic-bezier(.4,0,.2,1)", fechar, "forwards");
        } else { animPainel++; painel.getAnimations().forEach(a => a.cancel()); fechar(); }
        return;
      }
      painel.innerHTML = "";
      painel.hidden = false;
      marcarOpcoes(g);
      posicionarPainel();
      painel.setAttribute("aria-label", "Ferramentas de " + g.label);
      g.items.forEach(k => {
        const info = navInfo(k);
        const b = el(`<button class="tool ${k === VIEW ? "active" : ""}" ${k === VIEW ? 'aria-current="page"' : ""}>${icone(k)}<span>${esc(info.label)}</span></button>`);
        b.onclick = () => { MENU_ABERTO = null; irPara(k); };
        painel.appendChild(b);
      });
      if (!animar) return;
      const cs = getComputedStyle(painel), vao = "-" + getComputedStyle(navEl).rowGap;
      const h = painel.offsetHeight;
      const mesmaLinha = estavaAberto && painel.previousElementSibling === vizinhoAntes;
      // trocando de opção na mesma linha: só ajusta a altura; abrindo: cresce do zero
      animarPainel(mesmaLinha
        ? [{ height: hAntes + "px" }, { height: h + "px" }]
        : [{ height: "0px", paddingTop: "0px", paddingBottom: "0px", marginTop: vao, opacity: .4 },
           { height: h + "px", paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginTop: "0px", opacity: 1 }],
        mesmaLinha ? 360 : 480, easeSoft());
    }
    grupos.forEach(g => {
      const on = ativo && g.key === ativo.key;
      const b = el(`<button class="opt ${on ? "active" : ""}" data-key="${g.key}" ${g.items.length > 1 ? 'aria-haspopup="true" aria-expanded="false" aria-controls="toolsPanel"' : ""}>${icone(g.key, "ico-svg big")}<span>${esc(g.label)}</span>${g.items.length > 1 ? '<i class="chev" aria-hidden="true"></i>' : ""}</button>`);
      b.onclick = () => {
        if (g.items.length === 1) { MENU_ABERTO = null; irPara(g.items[0]); return; }
        MENU_ABERTO = MENU_ABERTO === g.key ? null : g.key;
        desenharPainel(true);
      };
      navEl.appendChild(b);
      navEl.style.setProperty("--n-opts", navEl.querySelectorAll(".opt").length);
    });
    desenharPainel();
    if (!window.__ceMenuEsc) {
      window.__ceMenuEsc = true;
      document.addEventListener("keydown", e => { if (e.key === "Escape" && MENU_ABERTO) { MENU_ABERTO = null; const p = document.getElementById("toolsPanel"); if (p) { p.hidden = true; document.querySelectorAll(".opt").forEach(b => { b.classList.remove("open"); b.setAttribute("aria-expanded", "false"); }); } } });
    }
  }

  function renderApp() {
    if (ME.trocar_senha) return renderTrocaSenha();
    root.innerHTML = "";
    if (!podeVer(VIEW)) VIEW = "painel";
    const grupos = navDisponivel();
    const ativo = grupoDe(VIEW) || grupos[0];
    const iniciais = String(ME.nome || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
    const app = el(`
      <div class="app app-v2">
        <a class="skip-link" href="#content">Pular para o conteúdo</a>
        <header class="hdr">
          <div class="hdr-row">
            <button class="hdr-brand" id="goHome" aria-label="Ir para o início">
              <span class="logo-ce" role="img" aria-label="Contábil Empresarial"><img src="img/logo-toda-branca.png" alt="" width="506" height="200"></span>
              <span class="brand-txt"><b>Portal do Cliente</b></span>
            </button>
            <label class="emp-switch"><span class="emp-label">Empresa</span><select id="empHeader" aria-label="Empresa selecionada"></select></label>
            <div class="hdr-actions">
              <button class="icon-btn search-btn" id="openSearch" aria-label="Buscar uma tela (Ctrl+K)">${icone("consultas-parcelamentos")}<em>Buscar</em><kbd>Ctrl K</kbd></button>
              ${liberado("solicitacoes") ? `<button class="icon-btn" id="goSol" title="Conversas" aria-label="Conversas" aria-haspopup="dialog" aria-expanded="false">${icone("solicitacoes")}<span class="hdr-badge" hidden aria-hidden="true"></span></button>` : ""}
              ${liberado("avisos") ? `<button class="icon-btn" id="goAvisos" title="Notificações" aria-label="Notificações" aria-haspopup="dialog" aria-expanded="false">${icone("avisos")}<span class="hdr-badge" hidden aria-hidden="true"></span></button>` : ""}
              <span class="theme-switch"><span aria-hidden="true" class="ts-ico">☀</span><button class="neu-toggle" id="themeToggle" role="switch" aria-checked="false" aria-pressed="false" aria-label="Tema escuro"></button><span aria-hidden="true" class="ts-ico">☾</span></span>
              <div class="user-menu">
                <button class="avatar" id="userBtn" aria-haspopup="true" aria-expanded="false" title="${esc(ME.nome)}">${esc(iniciais)}</button>
                <div class="user-pop" id="userPop" hidden>
                  <div class="user-id"><b>${esc(ME.nome)}</b><span>${isOffice() ? "Escritório" : esc(ME.empresa_nome || "Cliente")}</span></div>
                  <button class="pop-item" id="changePassword">Alterar minha senha</button>
                  <button class="pop-item" id="logout">Sair</button>
                </div>
              </div>
            </div>
          </div>
        </header>
        ${VIEW === "painel" ? '<div class="info-wrap" id="infoWrap" hidden></div>' : ""}
        <div class="menu-wrap"><nav class="opts" id="nav" aria-label="Seções do portal"><div class="tools" id="toolsPanel" role="region" hidden></div></nav></div>
        <div class="subnav-wrap" id="subnavWrap"><nav class="subnav" id="subnav" aria-label="${esc(ativo ? ativo.label : "")}"></nav></div>
        <main class="main">
          <div class="topbar">
            <div><h2 id="viewTitle"></h2><div class="ctx" id="viewCtx"></div></div>
            <div id="topActions"></div>
          </div>
          <div class="content" id="content" tabindex="-1"></div>
        </main>
      </div>`);
    montarMenuQuadrados(app, grupos, ativo);
    montarAvisosInfo(app);
    const sub = app.querySelector("#subnav");
    if (ativo && ativo.items.length > 1) {
      ativo.items.forEach(k => {
        const b = el(`<button class="pill ${k === VIEW ? "active" : ""}" ${k === VIEW ? 'aria-current="page"' : ""}>${esc(navInfo(k).label)}</button>`);
        b.onclick = () => irPara(k);
        sub.appendChild(b);
      });
    } else app.querySelector("#subnavWrap").classList.add("empty");
    app.querySelector("#goHome").onclick = () => irPara("painel");
    app.querySelector("#openSearch").onclick = abrirBusca;
    app.querySelector("#goSol")?.addEventListener("click", (e) => abrirJanela("sol", e.currentTarget));
    app.querySelector("#goAvisos")?.addEventListener("click", (e) => abrirJanela("avisos", e.currentTarget));
    setTimeout(() => aplicarTema(temaAtual()), 0);
    app.querySelector("#themeToggle").onclick = (ev) => {
      const t = temaAtual() === "dark" ? "light" : "dark";
      const fazer = () => { try { localStorage.setItem("ce-tema", t); } catch (e) {} aplicarTema(t); };
      if (!document.startViewTransition || menosMovimento() || document.hidden) return fazer();
      // o novo tema se espalha num círculo a partir do interruptor
      const r = ev.currentTarget.getBoundingClientRect(), html = document.documentElement;
      html.style.setProperty("--vt-x", (r.left + r.width / 2) + "px");
      html.style.setProperty("--vt-y", (r.top + r.height / 2) + "px");
      html.classList.add("vt-tema");
      const vt = document.startViewTransition(fazer);
      vt.ready.catch(() => {});
      vt.finished.catch(() => {}).finally(() => html.classList.remove("vt-tema"));
    };
    const userBtn = app.querySelector("#userBtn"), userPop = app.querySelector("#userPop");
    userBtn.onclick = (e) => { e.stopPropagation(); userPop.hidden = !userPop.hidden; userBtn.setAttribute("aria-expanded", !userPop.hidden); };
    if (!window.__ceUserPopClose) {
      window.__ceUserPopClose = true;
      document.addEventListener("click", (e) => {
        const pop = document.getElementById("userPop"), btn = document.getElementById("userBtn");
        if (pop && !pop.hidden && !pop.contains(e.target)) { pop.hidden = true; btn && btn.setAttribute("aria-expanded", "false"); }
      });
    }
    app.querySelector('#changePassword').onclick=()=>openModal('Alterar minha senha','<div class="field"><label>Senha atual</label><input name="atual" type="password" autocomplete="current-password" required></div><div class="field"><label>Nova senha</label><input name="nova" type="password" autocomplete="new-password" minlength="10" required></div><div class="field"><label>Confirme a nova senha</label><input name="confirma" type="password" autocomplete="new-password" required></div>',async(form,close,setErr)=>{if(!form.reportValidity())return;if(form.nova.value!==form.confirma.value)return setErr('As senhas não coincidem.');try{const r=await jpost('/api/senha',{atual:form.atual.value,nova:form.nova.value});ME=r.usuario;close();renderApp();}catch(e){setErr(e.message);}});
    app.querySelector("#logout").addEventListener("click", async () => {
      if (DEMO()) marcarDemoEntrou(false); await jpost("/api/logout"); ME = null; EMPRESAS = []; FILTRO_EMPRESA = ""; renderLogin();
    });
    // animações de entrada só quando a tela muda (não em filtros e redesenhos)
    if (VIEW !== ULTIMA_VIEW) { ULTIMA_VIEW = VIEW; app.classList.add("entrando"); setTimeout(() => app.classList.remove("entrando"), 1400); }
    root.appendChild(app);
    if (!window.__ceHdrScroll) {
      window.__ceHdrScroll = true;
      let pend = false;
      window.addEventListener("scroll", () => {
        if (pend) return; pend = true;
        requestAnimationFrame(() => { pend = false; document.querySelector(".app-v2 .hdr")?.classList.toggle("rolou", window.scrollY > 4); });
      }, { passive: true });
    }
    const rota = routeView();
    if (PRIMEIRA_EMERSAO) Promise.resolve(rota).then(emersaoInicial);
    return rota;
  }

  function setTitle(title, ctx) {
    document.getElementById("viewTitle").textContent = title;
    document.getElementById("viewCtx").textContent = ctx || "";
  }
  const content = () => document.getElementById("content");
  const topActions = () => document.getElementById("topActions");

  function officeFilterBar() {
    return null; // v2: o seletor de empresa fica no cabeçalho
    if (!isOffice() && EMPRESAS.length < 2) return null;
    const bar = el(`<div class="toolbar" style="margin-bottom:16px"></div>`);
    const sel = el(`<select id="empFiltro"><option value="">Todas as empresas</option></select>`);
    if (!isOffice()) sel.innerHTML = "";
    EMPRESAS.forEach((e) => {
      const o = el(`<option value="${e.id}">${esc(e.nome)}</option>`);
      if (String(e.id) === String(FILTRO_EMPRESA)) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => { FILTRO_EMPRESA = sel.value; trocarTela(routeView); });
    bar.appendChild(el(`<span style="color:var(--muted);font-size:13px">Empresa:</span>`));
    bar.appendChild(sel);
    return bar;
  }

  async function ensureEmpresas() {
    if (EMPRESAS.length) return;
    try { EMPRESAS = (await api("/api/empresas")).empresas; if (!isOffice() && EMPRESAS.length && !FILTRO_EMPRESA) FILTRO_EMPRESA = String(EMPRESAS[0].id); } catch (e) {}
  }

  // ---------- Router ----------
  // Telas da equipe: só escritório; Acessos e grupos só administrador (além do liberado do lançamento).
  const podeVer = key => liberado(key) && (!NAV_OFFICE.some(n => n.key === key) || (isOffice() && (key !== "acessos" || ME.funcao === "administrador")));
  async function routeView() {
    if(!podeVer(VIEW)) VIEW="painel";
    await ensureEmpresas();
    sincronizarEmpresaHeader();
    agendarContadores();
    topActions().innerHTML = "";
    EM_ROTA = true;
    try { return despacharView(); } finally { EM_ROTA = false; }
  }
  function despacharView() {
    if (VIEW === "folha") return viewFolha();
    if (VIEW === "dp") return viewDP();
    if (VIEW === "painel") return viewPainel();
    if (VIEW === "documentos") return viewDocumentos();
    if (VIEW === "receita-mensal") return viewReceitaMensal();
    if (VIEW === "faturamento") return viewFaturamento();
    if (VIEW === 'sefaz-go') return viewSefazGo();
    if (VIEW === "central-fiscal"||VIEW === "parcelamentos"||VIEW === "atualizar-guias") return viewCentralFiscal();
    if (VIEW === "obrigacoes") return viewObrigacoes();
    if (VIEW === "solicitacoes") return viewSolicitacoes();
    if (VIEW === "consultas-parcelamentos") return viewConsultasParcelamentos();
    if (VIEW === "auditoria-faturamento") return viewAuditoriaFaturamento();
    if (VIEW === "empresas") return viewEmpresas();
    if (VIEW === "acessos") return viewAcessos();
    if (VIEW === "financeiro") return viewFinanceiro();
    if (VIEW === "certificado") return viewCertificado();
    if (VIEW === "guias") return viewGuias();
    if (VIEW === "agenda") return viewAgenda();
    if (VIEW === "notas-servico") return viewNotasServico();
    if (VIEW === "notas-produtos") return viewNotasProdutos();
    if (VIEW === "avisos") return viewAvisos();
    if (VIEW === "historico") return viewHistorico();
    if (VIEW === "malotes") return viewMalotes();
  }
  // Redesenho dentro da mesma tela (filtros, abas, mês, "mostrar mais"): sem piscar.
  // A altura fica travada, a rolagem é mantida e, se veio de um clique, a tela atual fica
  // parada até a nova estar pronta e as duas se fundem num esmaecimento curto.
  let EM_ROTA = false;

  // ---------- Modo "emergir": o relevo sai do fundo e volta para ele ----------
  // Liga/desliga aqui. Desligado (false), volta a transição anterior (View Transitions).
  const EMERGIR = true;
  let EMERGINDO = false;
  if (EMERGIR) document.documentElement.classList.add("modo-emergir");
  // blocos com relevo que sobem e descem
  const RELEVO = ".hcard, .panel, .card, .kpi-card, .guia-card, .obr-hero, .dp2-tile, .quick-tile, .fin2-card, .act-list > li, .obr-list li, .sol2-item, .essential-grid > *, .fat-kpis > *, .guia-summary > *";
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const doisQuadros = () => Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), espera(60)]);
  const assinatura = e => e.className.replace(/\b(plano|emergindo|afundando)\b/g, "").trim() + "|" + e.textContent.replace(/\s+/g, " ").trim().slice(0, 240);
  const visivel = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // "folhas": blocos que não têm outro bloco dentro (linhas de lista, cartões simples)
  const folhas = raiz => [...raiz.querySelectorAll(RELEVO)].filter(e => visivel(e) && !e.querySelector(RELEVO));
  // "topo": blocos que não estão dentro de outro bloco (o cartão inteiro sobe com o que tem dentro)
  const topo = raiz => [...raiz.querySelectorAll(RELEVO)].filter(e => visivel(e) && !e.parentElement.closest(RELEVO));
  // cópia parada do conteúdo atual, por cima, para poder afundar o que sai enquanto o novo é montado
  function criarFantasma(c) {
    const r = c.getBoundingClientRect();
    const f = document.createElement("div");
    f.className = "app app-v2 ce-fantasma";
    f.setAttribute("aria-hidden", "true");
    Object.assign(f.style, { top: r.top + "px", left: r.left + "px", width: r.width + "px" });
    const dentro = document.createElement("div");
    dentro.className = "content";
    [...c.childNodes].forEach(n => dentro.appendChild(n.cloneNode(true)));
    f.appendChild(dentro);
    document.body.appendChild(f);
    return f;
  }
  function afundar(lista) {
    lista.forEach((e, i) => { e.style.setProperty("--d", Math.min(i * 25, 200) + "ms"); e.classList.add("afundando"); });
  }
  async function emergir(lista) {
    if (!lista.length) return;
    lista.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    lista.forEach(e => e.classList.add("plano"));
    await doisQuadros();
    lista.forEach((e, i) => { e.style.setProperty("--d", Math.min(i * 45, 420) + "ms"); e.classList.add("emergindo"); e.classList.remove("plano"); });
    await espera(1300);
    lista.forEach(e => { e.classList.remove("emergindo"); e.style.removeProperty("--d"); });
  }
  async function transicaoEmergir(fn, tipo) {
    const c0 = document.getElementById("content");
    if (!c0 || EMERGINDO) return fn();
    EMERGINDO = true;
    const y = window.scrollY;
    try {
      const antes = new Set(folhas(c0).map(assinatura));
      const fantasma = criarFantasma(c0);
      c0.style.visibility = "hidden";
      let pronto = false;
      let inicio; try { inicio = fn(); } catch (e) { inicio = null; }
      const rodando = Promise.resolve(inicio).catch(() => {}).finally(() => { pronto = true; });
      // a tela nova (ou a mesma, redesenhada) fica escondida até a hora de emergir
      const esconder = () => { const c = document.getElementById("content"); if (c) { c.style.visibility = "hidden"; if (tipo === "filtro") c.style.minHeight = (c0.isConnected ? c0 : c).offsetHeight + "px"; } return c; };
      esconder();
      if (tipo === "tela") {
        // tela nova: tudo o que está na tela desce e some
        afundar(topo(fantasma));
        await Promise.all([espera(380), Promise.race([rodando, espera(900)])]);
      } else {
        // filtro: espera a lista nova para saber o que muda
        await Promise.race([rodando, espera(900)]);
        const c = esconder();
        const depois = new Set(c ? folhas(c).map(assinatura) : []);
        const saem = folhas(fantasma).filter(e => !depois.has(assinatura(e)));
        afundar(saem);
        if (saem.length) await espera(380);
      }
      const c = document.getElementById("content");
      fantasma.remove();
      if (!c) return;
      const novos = tipo === "tela" ? topo(c) : folhas(c).filter(e => !antes.has(assinatura(e)));
      novos.forEach(e => e.classList.add("plano"));
      c.style.visibility = "";
      c.style.minHeight = "";
      if (tipo === "filtro" && Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: "instant" });
      if (!pronto) rodando.then(() => {}); // o resto que chegar depois aparece direto
      emergir(novos);
    } finally {
      EMERGINDO = false;
    }
  }
  // primeira abertura: o menu e o conteúdo emergem do fundo
  let PRIMEIRA_EMERSAO = EMERGIR;
  function emersaoInicial() {
    if (!PRIMEIRA_EMERSAO || menosMovimento()) return;
    PRIMEIRA_EMERSAO = false;
    const c = document.getElementById("content");
    emergir([...document.querySelectorAll(".app-v2 .opts > .opt, .app-v2 .info-wrap .is-card"), ...(c ? topo(c) : [])]);
  }

  function redesenhar(fn) {
    const c = document.getElementById("content"), y = window.scrollY, html = document.documentElement;
    if (c) c.style.minHeight = c.offsetHeight + "px";
    const fim = () => { if (c) c.style.minHeight = ""; if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, behavior: "instant" }); };
    const rodar = () => { let p; try { p = Promise.resolve(fn()); } catch (e) { fim(); throw e; } return p.finally(fim); };
    const ev = window.event && /^(click|change|input|submit|keydown|keyup|pointerup)$/.test(window.event.type);
    if (ev && EMERGIR && !menosMovimento() && !document.hidden && !EMERGINDO) { if (c) c.style.minHeight = ""; return transicaoEmergir(fn, "filtro"); }
    if (!ev || !document.startViewTransition || menosMovimento() || document.hidden || html.classList.contains("vt-ativa")) return rodar();
    html.classList.add("vt-redesenho");
    const vt = document.startViewTransition(() => Promise.race([rodar().catch(() => {}), new Promise(r => setTimeout(r, 700))]));
    vt.ready.catch(() => {});
    vt.finished.catch(() => {}).finally(() => html.classList.remove("vt-redesenho"));
    return vt.updateCallbackDone.catch(() => {});
  }
  // Toda tela chamada fora da navegação (por um filtro, por exemplo) passa pelo redesenho suave.
  const suave = original => function (...args) { return EM_ROTA ? original.apply(this, args) : redesenhar(() => original.apply(this, args)); };
  viewFolha = suave(viewFolha);
  viewDP = suave(viewDP);
  viewPainel = suave(viewPainel);
  viewDocumentos = suave(viewDocumentos);
  viewReceitaMensal = suave(viewReceitaMensal);
  viewFaturamento = suave(viewFaturamento);
  viewSefazGo = suave(viewSefazGo);
  viewCentralFiscal = suave(viewCentralFiscal);
  viewObrigacoes = suave(viewObrigacoes);
  viewSolicitacoes = suave(viewSolicitacoes);
  viewConsultasParcelamentos = suave(viewConsultasParcelamentos);
  viewAuditoriaFaturamento = suave(viewAuditoriaFaturamento);
  viewEmpresas = suave(viewEmpresas);
  viewAcessos = suave(viewAcessos);
  viewFinanceiro = suave(viewFinanceiro);
  viewCertificado = suave(viewCertificado);
  viewGuias = suave(viewGuias);
  viewAgenda = suave(viewAgenda);
  viewNotasServico = suave(viewNotasServico);
  viewNotasProdutos = suave(viewNotasProdutos);
  viewAvisos = suave(viewAvisos);
  viewHistorico = suave(viewHistorico);
  viewMalotes = suave(viewMalotes);


  // ---------- Painel ----------
  function painelDocumentos(documentos, empresa, digital, alerts = []) {
    const area=documentosEssenciais(documentos,empresa,digital);
    area.classList.add('dashboard-glass');
    const cards=[...area.querySelectorAll('.essential-card')];
    alerts.filter(a=>['DAS','Guia','Pendência'].includes(a.tipo)).forEach(a=>{const card=el(`<article class="essential-card"><span class="badge warn">Acompanhar</span><h4>${esc(a.tipo)}</h4><p>${esc(a.texto)}</p><button class="btn sm ghost">Ver detalhes</button></article>`);card.querySelector('button').onclick=()=>{VIEW=a.view;renderApp();};cards.push(card);});
    area.querySelectorAll('.document-group').forEach(g=>g.remove());
    area.querySelector('.essential-note')?.remove();
    const carousel=el(`<section class="client-carousel" aria-label="Situação dos documentos"><div class="carousel-heading"><div><span class="eyebrow">ACOMPANHE SEUS DOCUMENTOS</span><h3>Documentos e validade</h3></div><div class="carousel-controls"><button class="btn ghost sm" aria-label="Documento anterior">←</button><button class="btn ghost sm" aria-label="Pausar rotação">Pausar</button><button class="btn ghost sm" aria-label="Próximo documento">→</button></div></div><div class="carousel-stage"></div><div class="carousel-foot"><span class="carousel-count"></span><button class="btn ghost sm">Ver todos os documentos</button></div></section>`);
    const stage=carousel.querySelector('.carousel-stage');let index=0,paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches,timer;
    cards.forEach(card=>{card.hidden=true;stage.appendChild(card);});
    const controls=carousel.querySelectorAll('.carousel-controls button');
    function show(next){cards[index].hidden=true;index=(next+cards.length)%cards.length;cards[index].hidden=false;carousel.querySelector('.carousel-count').textContent=(index+1)+' de '+cards.length+' · Disponibilidade e validade';}
    function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(!carousel.isConnected)return;if(!paused&&!carousel.matches(':hover')&&!carousel.contains(document.activeElement)&&!document.hidden)show(index+1);schedule();},7000);}
    controls[0].onclick=()=>{show(index-1);schedule();};controls[2].onclick=()=>{show(index+1);schedule();};
    controls[1].textContent=paused?'Continuar':'Pausar';controls[1].setAttribute('aria-label',paused?'Continuar rotação':'Pausar rotação');controls[1].onclick=()=>{paused=!paused;controls[1].textContent=paused?'Continuar':'Pausar';controls[1].setAttribute('aria-label',paused?'Continuar rotação':'Pausar rotação');};
    carousel.querySelector('.carousel-foot button').onclick=()=>{VIEW='documentos';renderApp();};
    show(0);area.appendChild(carousel);schedule();return area;
  }
  async function resumoEntrada(c){
    const d=await api('/api/visao'+empParam());const m=d.latest;
    const box=el(`<section class="panel client-summary"><div class="panel-head"><h3>Sua empresa em números</h3><button class="btn ghost sm">Ver faturamento</button></div><div class="panel-body" style="padding:20px"><div class="finance-kpis"><article><small>Último faturamento confirmado · ${esc(m?.label||'—')}</small><strong>${m?Number(m.value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}</strong></article><article><small>Carga declarada do mês</small><strong>${m?.cargaTributaria!=null?m.cargaTributaria.toLocaleString('pt-BR')+'%':'—'}</strong></article><article><small>Alertas e pendências</small><strong>${d.alerts.length}</strong></article></div><p class="essential-note">Fonte: ${esc(d.source)} · Atualização ${fmtDateTime(d.updated)}. Meses pendentes não são zero.</p><div class="entry-alerts"></div></div></section>`);box.querySelector('button').onclick=()=>{VIEW='faturamento';renderApp();};c.appendChild(box);return d;
  }
  function acoesContexto(){
    if(!FILTRO_EMPRESA)return;
    const b=el('<button class="btn ghost">Falar com o escritório</button>');b.onclick=()=>modalNovaSolicitacao({assunto:'Dúvida sobre '+(document.querySelector('#viewTitle')?.textContent||VIEW),corpo:'Preciso de esclarecimentos sobre as informações desta tela.'});topActions().appendChild(b);
  }
  let competenciaFaturamento='';
  // Barra compacta "atualizar faturamento": status da última sincronização + pedido de consulta oficial.
  async function atualizacaoVisao(c,data){
    const simples=String(data.regime||'').toLowerCase().includes('simples nacional');
    const months=data.months||[];
    if(!months.some(m=>m.period===competenciaFaturamento))competenciaFaturamento=months.at(-1)?.period||'';
    const bar=el(`<section class="fat-sync" aria-label="Atualização do faturamento"><span class="fat-sync-ico" aria-hidden="true">${icone('atualizar-guias')}</span><span class="sync-label small muted" role="status" aria-live="polite">Conferindo atualização…</span><div class="fat-sync-acts"><div class="competencia-actions"></div><button class="btn ghost sm refresh-all">Atualizar 12 meses</button></div></section>`);c.appendChild(bar);
    const label=bar.querySelector('.sync-label'),full=bar.querySelector('.refresh-all'),company=FILTRO_EMPRESA,view=VIEW;let timer,waiting=false,select,target;
    if(simples&&months.length){
      const actions=bar.querySelector('.competencia-actions');
      select=el('<select aria-label="Competência do faturamento"></select>');
      [...months].reverse().forEach(m=>{const option=document.createElement('option');option.value=m.period;option.textContent=m.label;select.appendChild(option);});select.value=competenciaFaturamento;
      target=el('<button class="btn sm"></button>');const caption=()=>{competenciaFaturamento=select.value;const t=select.selectedOptions[0].textContent;target.textContent='Atualizar '+t;target.setAttribute('aria-label','Atualizar faturamento '+t);};select.onchange=caption;caption();actions.append(select,target);
    }
    const controls=()=>[full,select,target].filter(Boolean);
    const disable=busy=>controls().forEach(x=>x.disabled=busy||ME.funcao==='consulta');
    const recarregar=()=>(view==='faturamento'?viewFaturamento:viewReceitaMensal)();
    async function check(){
      if(!bar.isConnected){clearTimeout(timer);return;}
      try{const d=await api('/api/visao'+empParam());if(!bar.isConnected)return;
        label.textContent=d.job?d.job.message+' · '+d.job.status:'Última sincronização: '+fmtDateTime(d.updated);
        const busy=d.job?.status==='consultando';disable(busy);
        if(busy){waiting=true;timer=setTimeout(check,6000);}
        else if(waiting&&d.job?.status==='concluido'&&VIEW===view&&company===FILTRO_EMPRESA){waiting=false;setTimeout(()=>{if(bar.isConnected&&VIEW===view&&company===FILTRO_EMPRESA)recarregar();},0);}
        else waiting=false;
      }catch(e){label.textContent=e.message;disable(false);}
    }
    async function update(periodo){disable(true);waiting=true;label.textContent='Solicitando consulta oficial…';try{await jpost('/api/visao/atualizar',{empresa_id:company,...(periodo?{periodo}:{})});await check();}catch(e){waiting=false;label.textContent=e.message;disable(false);}}
    full.onclick=()=>update();if(target)target.onclick=()=>update(select.value);await check();
  }
  // ---------- Folha e custo de pessoal v2 ----------
  // Extratos mensais publicados pelo escritório (pasta interna). Parte do cliente: tabela recolhida.
  // Parte do escritório (monitor da pasta, verificar agora, conferir versões) vai para "Ferramentas do escritório".
  function painelFolhaArquivo(c,d,ferramentas){
    if(!d||(!d.habilitado&&!d.meses.length))return;
    const moeda=v=>v==null?'Não identificado':finBRL(v);const comp=p=>p.slice(4)+'/'+p.slice(0,4);const latest=d.meses.at(-1);
    const sec=el(`<details class="hcard consultas-oficiais fol-extratos"><summary><b>Extratos mensais publicados</b> <span class="muted small">${latest?`${d.meses.length} competência${d.meses.length===1?'':'s'} · ${esc(comp(latest.period))}: proventos ${moeda(latest.proventos)}, líquido ${moeda(latest.liquido)}`:'Aguardando um extrato mensal com identificação e totais válidos'}</span></summary><div class="fat-tabela-wrap"></div></details>`);
    if(d.meses.length){
      const table=el('<table class="fol-tab"><thead><tr><th>Competência</th><th>Proventos</th><th>Descontos</th><th>Líquido</th><th>FGTS mensal</th><th>Encargos patronais</th><th>Empregados / estagiários / contribuintes</th><th>Origem</th></tr></thead><tbody></tbody></table>');
      [...d.meses].reverse().forEach(m=>table.querySelector('tbody').appendChild(el(`<tr><td>${comp(m.period)}</td>${['proventos','descontos','liquido','fgts_mensal','encargos_patronais'].map(k=>`<td>${moeda(m[k])}</td>`).join('')}<td>${m.empregados??'—'} / ${m.estagiarios??'—'} / ${m.contribuintes??'—'}</td><td class="fol-origem"><small>${esc(m.arquivo)}<br>Leitura ${fmtDateTime(m.publicado_em)}<br>${m.conferido?'Conferência do escritório':'Leitura automática validada'}${m.atualizacao_pendente?'<br>Nova versão aguardando conferência':''}</small></td></tr>`)));
      sec.querySelector('.fat-tabela-wrap').appendChild(table);
    }
    sec.appendChild(el(`<p class="small muted">Proventos incluem rubricas e pró-labore do relatório; não são o custo completo nem comprovam pagamento. Campos não reconhecidos aparecem como "Não identificado".${d.competencias_aguardando?.length?' Sem extrato: '+d.competencias_aguardando.map(comp).join(', ')+' (ausência de dados não significa folha zerada).':''}</p>`));
    c.appendChild(sec);
    if(!isOffice()||!ferramentas)return;
    const mon=d.monitor||{};
    if(mon.resumo?.fontes_offline||mon.resumo?.erro)ferramentas.appendChild(el('<div class="alert">A pasta está indisponível ou a leitura não terminou. Os dados anteriores foram preservados.</div>'));
    const pasta=el(`<div class="fol-tool"><div><b>Pasta de extratos</b><small>Última verificação: ${mon.ultima_verificacao?fmtDateTime(mon.ultima_verificacao):'aguardando'}. ${mon.executando?'Leitura em andamento'+(mon.progresso?' ('+mon.progresso.concluidas+'/'+mon.progresso.total+' empresas).':'.'):'Verificada a cada 5 minutos enquanto o servidor e a unidade de rede estiverem disponíveis.'}</small></div></div>`);
    ferramentas.appendChild(pasta);
    if(ME.funcao==='administrador'){
      const refresh=el(`<button class="btn ghost sm" ${mon.executando?'disabled':''}>${mon.executando?'Lendo arquivos…':'Verificar pasta agora'}</button>`);
      refresh.onclick=async()=>{refresh.disabled=true;try{await jpost('/api/folha/arquivo/sincronizar',{empresa_id:FILTRO_EMPRESA});if(VIEW==='folha')viewFolha();}catch(e){refresh.disabled=false;refresh.textContent=e.message;}};pasta.appendChild(refresh);
      (d.pendencias||[]).forEach(p=>{
        const row=el(`<div class="fol-tool warn"><div><b><span aria-hidden="true">!</span> ${comp(p.period)} · ${esc(p.arquivo)}</b><small>${esc(p.erro||'Conferência necessária')}</small></div>${p.totais?'<button class="btn sm">Conferir esta versão</button>':''}</div>`);
        row.querySelector('button')?.addEventListener('click',()=>openModal('Conferir versão da folha',`<p>${esc(p.arquivo)} · ${comp(p.period)}</p><p>Proventos: ${moeda(p.totais.proventos)}<br>Descontos: ${moeda(p.totais.descontos)}<br>Líquido: ${moeda(p.totais.liquido)}</p><label><input type="checkbox" name="conferido" required> Conferi o relatório completo e esta é a versão que deve aparecer ao cliente.</label><p>A publicação mantém o histórico e substitui a versão exibida nesta competência.</p>`,async(f,close,error)=>{try{await jpost('/api/folha/arquivo/conferir',{empresa_id:FILTRO_EMPRESA,id:p.id,conferido:f.conferido.checked});close();viewFolha();}catch(e){error(e.message);}}));
        ferramentas.appendChild(row);
      });
    }
    if(mon.executando){const selected=FILTRO_EMPRESA;setTimeout(()=>{if(VIEW==='folha'&&FILTRO_EMPRESA===selected&&ferramentas.isConnected)viewFolha();},5000);}
  }
  function modalImportarFolha(){
    openModal('Conferir custo da folha',`<p>Importe evento mensal eSocial XML com recibo, da matriz selecionada. Os valores abaixo devem corresponder à folha completa conferida, incluindo rescisões. Retificações substituem a competência.</p><div class="field"><label>Evento XML com recibo</label><input type="file" name="arquivo" accept=".xml" required></div>${[['bruto','Remuneração bruta'],['encargos','Encargos patronais (sem INSS/IRRF do trabalhador e sem FGTS)'],['fgts','FGTS'],['beneficios','Benefícios pagos pelo empregador']].map(([key,label])=>`<div class="field"><label>${label} (R$)</label><input type="number" min="0" step="0.01" name="${key}"></div>`).join('')}<div class="field"><label>Trabalhadores remunerados</label><input type="number" name="trabalhadores" min="0" step="1"></div><label><input type="checkbox" name="conferido"> Conferi os totais da competência com o sistema de folha, sem duplicar encargos.</label>`,async(f,done,error)=>{try{const data={empresa_id:FILTRO_EMPRESA,arquivo:await base64Arquivo(f.arquivo.files[0]),conferido:f.conferido.checked,trabalhadores:f.trabalhadores.value};for(const k of ['bruto','encargos','fgts','beneficios'])data[k]=f[k].value;await jpost('/api/folha',data);done();renderApp();}catch(e){error(e.message);}});
  }
  const FOL_DESVIO=15; // % de desvio da média de 12 meses que gera alerta
  async function viewFolha(){
    const c=await inicioRecurso('Folha e custo de pessoal','Quanto a empresa gasta com pessoal, mês a mês');if(!c)return;acoesContexto();
    const company=FILTRO_EMPRESA;c.appendChild(el('<div class="empty">Carregando folha…</div>'));
    let arqErr=null;
    const [d,arq,dErr]=await Promise.all([api('/api/folha'+empParam()).then(x=>[x,null],e=>[null,e]),api('/api/folha/arquivo'+empParam()).catch(e=>{arqErr=e;return null;})]).then(([[x,e],a])=>[x,a,e]);
    if(VIEW!=='folha'||company!==FILTRO_EMPRESA)return;
    c.innerHTML='';
    // Ferramentas do escritório (recolhidas, no fim da tela)
    let ferr=null;
    if(isOffice()){
      const pend=ME.funcao==='administrador'?(arq?.pendencias||[]).length:0;
      ferr=el(`<details class="hcard consultas-oficiais fol-ferr"><summary><b>Ferramentas do escritório</b> <span class="muted small">importar e conferir folha · pasta de extratos</span>${pend?` <span class="status-chip warn"><span aria-hidden="true">!</span> ${pend} versão${pend===1?'':'ões'} para conferir</span>`:''}</summary></details>`);
      const imp=el(`<div class="fol-tool"><div><b>Importar e conferir folha</b><small>Evento mensal do eSocial (XML com recibo) e totais conferidos da competência.</small></div><button class="btn ghost sm" ${ME.funcao==='consulta'?'disabled':''}>Importar e conferir</button></div>`);
      imp.querySelector('button').onclick=modalImportarFolha;ferr.appendChild(imp);
    }
    if(dErr)c.appendChild(el(`<div class="alert err">${esc(dErr.message)}</div>`));
    if(d){
      const months=d.months||[],valid=months.filter(m=>m.folha),compl=valid.filter(m=>!m.parcial);
      const media=compl.length?compl.reduce((s,m)=>s+m.custo,0)/compl.length:null;
      const total=valid.reduce((s,m)=>s+m.custo,0);
      const desvio=m=>m.folha&&!m.parcial&&media?(m.custo/media-1)*100:null;
      const fora=valid.filter(m=>{const v=desvio(m);return v!==null&&Math.abs(v)>=FOL_DESVIO;});
      const last=valid.at(-1),li=last?months.indexOf(last):-1,prev=li>0?months[li-1]:null;
      const varUlt=last&&prev?.folha&&prev.custo>0&&last.base_comparacao===prev.base_comparacao?(last.custo/prev.custo-1)*100:null;
      if(!valid.length){
        c.appendChild(el(`<section class="hcard act-ok fat-vazio"><span aria-hidden="true">i</span><div><b>Ainda não há folha publicada</b><small>Quando o escritório publicar o extrato ou o eSocial de um mês, o custo aparece aqui. Mês sem dados não significa folha zerada.</small></div></section>`));
      }else{
        // 1) Situação: algum mês fugiu da média?
        const ultFora=fora.includes(last),dvU=desvio(last);
        const tom=ultFora?'warn':fora.length?'info':'ok';
        c.appendChild(el(`<section class="obr-hero ${tom}"><span class="obr-hero-ico" aria-hidden="true">${ultFora?'!':fora.length?'i':'✓'}</span><div><h3>${ultFora?`${esc(mesLongo(last.period))}: ${fatNum(Math.abs(dvU))}% ${dvU>0?'acima':'abaixo'} da média`:fora.length?`${fora.length} ${fora.length===1?'mês fugiu':'meses fugiram'} da média nos últimos 12 meses`:'Custo da folha dentro do esperado'}</h3><p>${media?`Média mensal de ${fatMoeda(media)} nos meses completos. Alertamos quando um mês fica ${FOL_DESVIO}% acima ou abaixo dela.`:'Ainda não há meses completos para calcular a média.'}</p></div></section>`));
        // 2) Números do último mês
        const pessoas=last.folha?.trabalhadores,pessoasAnt=prev?.folha?.trabalhadores;
        c.appendChild(el(`<div class="fat-kpis fol-kpis">
          <div class="hcard"><span class="kpi-label">Custo de <span class="cap">${esc(mesLongo(last.period))}</span></span><span class="kpi">${fatMoeda(last.custo)}</span>${fatDeltaHtml(varUlt,'mês anterior')}${last.parcial?`<small class="txt-warn"><span aria-hidden="true">!</span> Parcial: faltam ${esc(last.campos_ausentes.join(', '))}</small>`:''}${last.percentual!=null?`<small class="muted">${fatNum(last.percentual)}% do faturamento do mês</small>`:''}</div>
          <div class="hcard"><span class="kpi-label">Pessoas na folha</span><span class="kpi">${pessoas??'—'}</span><small class="muted">${pessoas!=null&&pessoasAnt!=null?(pessoas===pessoasAnt?'Mesmo número do mês anterior':(pessoas>pessoasAnt?'+':'')+(pessoas-pessoasAnt)+' em relação ao mês anterior'):'trabalhadores remunerados'}</small></div>
          <div class="hcard"><span class="kpi-label">Média mensal</span><span class="kpi">${fatMoeda(media)}</span><small class="muted">${compl.length} ${compl.length===1?'mês completo':'meses completos'}</small></div>
          <div class="hcard"><span class="kpi-label">Custo em 12 meses</span><span class="kpi">${fatMoeda(total)}</span><small class="muted">${valid.length} de ${months.length} meses com dados</small></div>
        </div>`));
        // 3) Meses que pedem atenção
        const avisos=[...fora].reverse().map(m=>{const v=desvio(m);return {tom:v>0?'warn':'info',ico:v>0?'▲':'▼',titulo:`${mesLongo(m.period).replace(/^./,x=>x.toUpperCase())}: ${fatMoeda(m.custo)} (${v>0?'+':''}${fatNum(v)}% da média)`,sub:/12$/.test(m.period)&&v>0?'Dezembro costuma incluir 13º salário e férias.':'Vale conferir admissões, rescisões, horas extras ou férias no mês.',p:m.period};});
        const parciais=valid.filter(m=>m.parcial),semDados=months.filter(m=>!m.folha);
        if(parciais.length)avisos.push({tom:'info',ico:'i',titulo:`${parciais.length} ${parciais.length===1?'mês com custo parcial':'meses com custo parcial'}`,sub:parciais.map(m=>m.label+': faltam '+m.campos_ausentes.join(', ')).join(' · '),p:parciais.at(-1).period});
        if(semDados.length)avisos.push({tom:'',ico:'–',titulo:`${semDados.length} ${semDados.length===1?'mês sem dados':'meses sem dados'}`,sub:semDados.map(m=>m.label).join(', ')+' · ausência de dados não significa folha zerada',p:semDados.at(-1).period});
        let selecionar=()=>{};
        if(avisos.length){const box=el('<section class="hcard fol-avisos"><header><h3>Para olhar com atenção</h3></header><ul class="act-list"></ul></section>');avisos.forEach(a=>box.querySelector('ul').appendChild(linhaAcao({tom:a.tom,ico:a.ico,titulo:a.titulo,sub:a.sub,acao:'Ver no gráfico',onClick:()=>{selecionar(a.p);graf.scrollIntoView({block:'nearest',behavior:'smooth'});}})));c.appendChild(box);}
        // 4) Gráfico de 12 meses com detalhe do mês selecionado
        const gm=months.map(m=>({period:m.period,label:m.label,confirmed:!!m.folha,value:m.custo}));
        let sel=last.period;
        const ch=el(`<section class="hcard fat-chart fol-chart"><header><h3>Custo da folha · 12 meses</h3><span class="muted small">Toque num mês para ver a composição</span></header><p class="fat-legend small muted"><span class="lg-bar">Custo do mês</span>${media?'<span class="lg-avg">Média mensal</span>':''}${semDados.length?'<span class="lg-pend">Sem dados</span>':''}</p></section>`);
        const det=el('<div class="fat-detalhe fol-det" aria-live="polite"></div>');
        function detalhe(){
          const m=months.find(x=>x.period===sel),f=m.folha;
          if(!f){det.innerHTML=`<h4><span class="cap">${esc(mesLongo(m.period))}</span></h4><p class="muted small">${esc(m.fonte||'Sem extrato publicado')}. Ausência de dados não significa folha zerada.</p>`;return;}
          const v=desvio(m),cel=(k,l)=>`<div><small>${l}</small><b>${f[k]!=null?fatMoeda(f[k]):k==='beneficios'&&f.beneficios_incluidos?'Nos proventos':'—'}</b></div>`;
          det.innerHTML=`<h4><span class="cap">${esc(mesLongo(m.period))}</span> <small>· ${fatMoeda(m.custo)}${m.parcial?' (parcial)':''}${v!==null?' · '+(v>=0?'+':'')+fatNum(v)+'% da média':''}</small></h4><div class="fat-det-grid">${cel('bruto','Salários (bruto)')}${cel('encargos','Encargos patronais')}${cel('fgts','FGTS')}${cel('beneficios','Benefícios')}<div><small>Pessoas</small><b>${f.trabalhadores??'—'}</b></div><div><small>Custo / faturamento</small><b>${m.percentual==null?'—':fatNum(m.percentual)+'%'}</b></div></div><p class="small muted">Fonte: ${esc(m.fonte||'—')}${m.parcial?' · faltam '+esc(m.campos_ausentes.join(', ')):''}</p>`;
        }
        const graf=fatGrafico(gm,{selected:sel,onSelect:m=>{sel=m.period;detalhe();}});
        selecionar=p=>{sel=p;graf.querySelectorAll('.fat-bar').forEach((b,i)=>b.setAttribute('aria-pressed',String(gm[i].period===p)));detalhe();};
        ch.appendChild(graf);ch.appendChild(det);detalhe();c.appendChild(ch);
        // 5) Tabela mês a mês (recolhida)
        const tb=el(`<details class="hcard consultas-oficiais fat-tabela"><summary><b>Tabela mês a mês</b> <span class="muted small">bruto, encargos, FGTS, benefícios e variação · exportar CSV</span></summary><div class="fat-tabela-acts"><button class="btn ghost sm">Baixar CSV</button></div><div class="fat-tabela-wrap"><table><thead><tr><th>Mês</th><th>Bruto</th><th>Encargos</th><th>FGTS</th><th>Benefícios</th><th>Custo</th><th>Variação</th><th>Custo / receita</th><th>Pessoas</th></tr></thead><tbody></tbody></table></div></details>`);
        const linhas=months.map((m,i)=>{const p=months[i-1];return {m,v:m.folha&&p?.custo>0&&m.base_comparacao===p.base_comparacao?(m.custo/p.custo-1)*100:null};});
        const val=(m,k)=>m.folha?.[k]!=null?fatMoeda(m.folha[k]):k==='beneficios'&&m.folha?.beneficios_incluidos?'Nos proventos':'—';
        [...linhas].reverse().forEach(({m,v})=>tb.querySelector('tbody').appendChild(el(`<tr><td>${esc(m.label)}</td>${['bruto','encargos','fgts','beneficios'].map(k=>'<td>'+val(m,k)+'</td>').join('')}<td>${m.folha?fatMoeda(m.custo)+(m.parcial?' *':''):'—'}</td><td>${v===null?'—':(v>=0?'▲ +':'▼ ')+fatNum(v)+'%'}</td><td>${m.percentual===null||m.percentual===undefined?'—':fatNum(m.percentual)+'%'}</td><td>${m.folha?.trabalhadores??'—'}</td></tr>`)));
        tb.appendChild(el('<p class="small muted">* Custo parcial: há componentes não identificados. A variação só compara meses com a mesma composição.</p>'));
        tb.querySelector('.fat-tabela-acts button').onclick=()=>baixarCsv('folha-12-meses.csv',[['Competência','Bruto (R$)','Encargos (R$)','FGTS (R$)','Benefícios (R$)','Custo (R$)','Parcial','Variação (%)','Custo / receita (%)','Pessoas','Fonte'],...linhas.map(({m,v})=>[periodoLabel(m.period),csvNum(m.folha?.bruto),csvNum(m.folha?.encargos),csvNum(m.folha?.fgts),m.folha?.beneficios_incluidos&&m.folha?.beneficios==null?'Nos proventos':csvNum(m.folha?.beneficios),m.folha?csvNum(m.custo):'',m.parcial?'Sim':'',csvNum(v,1),csvNum(m.percentual,1),m.folha?.trabalhadores??'',m.fonte||''])]);
        c.appendChild(tb);
      }
    }
    if(arqErr)c.appendChild(el(`<div class="alert err">Leitura da pasta: ${esc(arqErr.message)}</div>`));
    else painelFolhaArquivo(c,arq,ferr);
    c.appendChild(el('<p class="essential-note">Custo = salários + encargos patronais + FGTS + benefícios, sem provisões de 13º e férias. Vem do eSocial conferido ou dos extratos publicados e não comprova pagamento.</p>'));
    if(ferr)c.appendChild(ferr);
  }

  // ---------- Início v2: "o que eu preciso fazer?" ----------
  const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const hojeISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  // aceita AAAA-MM-DD, DD/MM/AAAA e AAAAMMDD (as fontes oficiais usam formatos diferentes)
  function isoData(v) {
    const t = String(v || "").trim();
    let m;
    if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
    if ((m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) return `${m[3]}-${m[2]}-${m[1]}`;
    if ((m = t.match(/^(\d{4})(\d{2})(\d{2})$/))) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
  }
  function diasAte(v) {
    const iso = isoData(v);
    if (!iso) return null;
    const d = new Date(iso + "T00:00:00"), h = new Date(hojeISO() + "T00:00:00");
    return Math.round((d - h) / 86400000);
  }
  function quando(iso) {
    const n = diasAte(iso);
    if (n == null) return "";
    if (n < 0) return `venceu há ${-n} dia${n === -1 ? "" : "s"}`;
    if (n === 0) return "vence hoje";
    if (n === 1) return "vence amanhã";
    return `vence em ${n} dias`;
  }
  const periodoLabel = (p) => { p = String(p || "").replace("-", ""); return p.length >= 6 ? p.slice(4, 6) + "/" + p.slice(0, 4) : p; };
  const pegar = async (path) => { try { return await api(path); } catch (e) { return null; } };

  function linhaAcao({ tom, ico, titulo, sub, valor, acao, view, onClick }) {
    const li = el(`<li class="act-row ${tom || ""}">
      <span class="act-ico" aria-hidden="true">${ico}</span>
      <div class="act-txt"><b>${esc(titulo)}</b><small>${esc(sub || "")}</small></div>
      ${valor ? `<span class="act-val">${esc(valor)}</span>` : ""}
      <button class="btn sm ${tom === "danger" ? "" : "ghost"}">${esc(acao || "Abrir")}</button>
    </li>`);
    li.querySelector("button").onclick = onClick || (() => irPara(view));
    return li;
  }

  async function painelEmpresaV2(c, d) {
    const q = empParam();
    const [das, obr, sol, cert, visao, ag] = await Promise.all([
      liberado("guias") ? pegar("/api/das" + q) : null,
      liberado("obrigacoes") ? pegar("/api/obrigacoes" + q) : null,
      liberado("solicitacoes") ? pegar("/api/solicitacoes" + q) : null,
      liberado("certificado") ? pegar("/api/certificado-digital" + q) : null,
      (liberado("receita-mensal") || liberado("faturamento")) && !LANCAMENTO.ativo ? pegar("/api/visao" + q) : null,
      liberado("agenda") ? pegar("/api/agenda/eventos" + q) : null,
    ]);
    const primeiroNome = String(ME.nome || "").split(" ")[0];
    c.appendChild(el(`<section class="hello"><div><h3>${isOffice() ? "Empresa selecionada" : "Olá, " + esc(primeiroNome)}</h3><p>${esc(d.empresa.nome)} · CNPJ ${esc(d.empresa.cnpj || "—")} · competência ${esc(d.competencia || "—")}</p></div></section>`));

    // 1) Lista única de ações, ordenada por urgência
    const acoes = [];
    (das?.guides || []).forEach(g => {
      const n = diasAte(g.limite);
      acoes.push({ ordem: n == null ? 99 : n, tom: n != null && n < 0 ? "danger" : n != null && n <= 5 ? "warn" : "", ico: "＄",
        titulo: `DAS ${periodoLabel(g.period)} em aberto`, sub: g.limite ? `${quando(g.limite)} · ${fmtDate(g.limite)}` : "Guia disponível",
        valor: brl(g.values?.total), acao: "Ver guia", view: "guias" });
    });
    (obr?.obrigacoes || []).filter(o => o.status === "atrasada" || o.status === "pendente").forEach(o => {
      const n = diasAte(o.vencimento);
      if (o.status !== "atrasada" && n != null && n > 30) return;
      acoes.push({ ordem: o.status === "atrasada" ? -100 + (n || 0) : n ?? 50, tom: o.status === "atrasada" ? "danger" : "warn", ico: "◔",
        titulo: o.titulo, sub: (o.status === "atrasada" ? "Atrasada" : "Pendente") + (o.vencimento ? ` · ${quando(o.vencimento)}` : "") + (o.observacao ? ` · ${o.observacao}` : ""),
        acao: "Ver status", view: "obrigacoes" });
    });
    (sol?.solicitacoes || []).filter(s => s.status === "respondida").forEach(s => {
      acoes.push({ ordem: 0, tom: "info", ico: "✉", titulo: isOffice() ? `Aguardando o cliente: ${s.assunto}` : `Resposta do escritório: ${s.assunto}`, sub: `${s.protocolo} · ${isOffice() ? "respondida pelo escritório" : "aguardando você"}`, acao: isOffice() ? "Abrir" : "Responder", view: "solicitacoes" });
    });
    const ct = cert?.certificado;
    if (ct && ct.dias_restantes != null && ct.dias_restantes <= 60) {
      acoes.push({ ordem: ct.dias_restantes, tom: ct.dias_restantes < 0 ? "danger" : ct.dias_restantes <= 15 ? "danger" : "warn", ico: "◇",
        titulo: ct.dias_restantes < 0 ? "Certificado digital vencido" : "Certificado digital perto do vencimento",
        sub: ct.dias_restantes < 0 ? `venceu em ${fmtDate(ct.vencimento)}` : `${quando(ct.vencimento)} · ${fmtDate(ct.vencimento)}`, acao: "Renovar", view: "certificado" });
    }
    acoes.sort((a, b) => a.ordem - b.ordem);

    const grid = el(`<div class="home-grid"></div>`);
    const todo = el(`<section class="hcard todo"><header><h3>O que precisa da sua atenção</h3><span class="count"></span></header><ul class="act-list"></ul></section>`);
    const ul = todo.querySelector("ul");
    if (acoes.length) { acoes.slice(0, 6).forEach(a => ul.appendChild(linhaAcao(a))); todo.querySelector(".count").textContent = acoes.length + (acoes.length === 1 ? " item" : " itens"); }
    else ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">✓</span><div><b>Tudo em dia</b><small>Nenhuma guia, prazo ou resposta pendente agora.</small></div></li>`));
    if (acoes.length > 6) { const more = el(`<button class="link-btn">Ver todos os ${acoes.length} itens</button>`); more.onclick = () => irPara("obrigacoes"); todo.appendChild(more); }
    grid.appendChild(todo);

    // 2) Coluna lateral: faturamento, certificado, próximos prazos
    const side = el(`<div class="home-side"></div>`);
    if (visao && visao.latest) {
      const months = (visao.months || []).slice(-6), max = Math.max(1, ...months.map(m => m.value || 0));
      const prev = (visao.months || []).filter(m => m.value != null).slice(-2, -1)[0];
      const delta = prev && prev.value ? ((visao.latest.value - prev.value) / prev.value * 100) : null;
      const fat = el(`<section class="hcard fat"><header><h3>Faturamento</h3><button class="link-btn">Detalhes</button></header>
        <p class="kpi-label">${esc(visao.latest.label || "")} · confirmado</p>
        <p class="kpi">${brl(visao.latest.value)}</p>
        ${delta != null ? `<p class="delta ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs. mês anterior</p>` : ""}
        <div class="spark" role="img" aria-label="Faturamento dos últimos 6 meses">${months.map(m => `<span title="${esc(m.label)}: ${m.value == null ? "sem dados" : brl(m.value)}" class="${m.value == null ? "nodata" : ""}" style="height:${m.value == null ? 6 : Math.max(6, m.value / max * 100)}%"></span>`).join("")}</div>
        <div class="spark-lbl">${months.map(m => `<span>${esc(String(m.label || "").slice(0, 3))}</span>`).join("")}</div></section>`);
      fat.querySelector(".link-btn").onclick = () => irPara(liberado("receita-mensal") ? "receita-mensal" : "faturamento");
      side.appendChild(fat);
    }
    if (ct) {
      const n = ct.dias_restantes, tom = n == null ? "" : n < 0 ? "danger" : n <= 15 ? "danger" : n <= 60 ? "warn" : "ok";
      const txt = n == null ? "Sem informação" : n < 0 ? "Vencido" : `Válido por ${n} dias`;
      const cc = el(`<section class="hcard cert ${tom}"><header><h3>Certificado digital</h3><span class="status-chip ${tom}">${n != null && n < 0 ? "✕" : n != null && n <= 60 ? "!" : "✓"} ${esc(txt)}</span></header><p class="muted">${ct.vencimento ? "Vencimento em " + fmtDate(ct.vencimento) : "Vencimento não informado"}</p><div class="meter" aria-hidden="true"><span style="width:${n == null ? 0 : Math.max(2, Math.min(100, n / 365 * 100))}%"></span></div></section>`);
      cc.onclick = () => irPara("certificado"); cc.classList.add("clickable"); cc.tabIndex = 0; cc.onkeydown = e => { if (e.key === "Enter") irPara("certificado"); };
      side.appendChild(cc);
    }
    const prox = [];
    (obr?.obrigacoes || []).filter(o => o.status !== "concluida" && o.status !== "atrasada").forEach(o => { const n = diasAte(o.vencimento); if (n != null && n >= 0 && n <= 30) prox.push({ data: o.vencimento, titulo: o.titulo, tipo: "Obrigação" }); });
    (ag?.eventos || []).forEach(e => { const n = diasAte(e.data); if (n != null && n >= 0 && n <= 30) prox.push({ data: e.data, titulo: e.titulo, tipo: e.tipo || "Evento" }); });
    prox.sort((a, b) => a.data.localeCompare(b.data));
    if (liberado("agenda")) {
      const pc = el(`<section class="hcard prazos"><header><h3>Próximos 30 dias</h3><button class="link-btn">Calendário</button></header><ol></ol></section>`);
      const ol = pc.querySelector("ol");
      if (prox.length) prox.slice(0, 4).forEach(p => { const dt = new Date(p.data + "T00:00:00"); ol.appendChild(el(`<li><span class="date"><b>${dt.getDate()}</b>${dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span><div><b>${esc(p.titulo)}</b><small>${esc(p.tipo)}</small></div></li>`)); });
      else ol.appendChild(el(`<li class="muted">Nenhum prazo nos próximos 30 dias.</li>`));
      pc.querySelector(".link-btn").onclick = () => irPara("agenda");
      side.appendChild(pc);
    }
    grid.appendChild(side);
    c.appendChild(grid);

    // 3) Acesso rápido
    const rapidos = [
      ["＄", "Guias e DAS", "guias"], ["▤", "Enviar documento", "documentos"], ["✉", "Falar com o escritório", "solicitacoes", () => modalNovaSolicitacao()],
      ["◇", "Certificado", "certificado"], ["▦", "Calendário", "agenda"], ["▥", "Faturamento", "receita-mensal"],
      ["🧾", "Notas fiscais", "notas-servico"], ["◫", "Folha", "folha"],
    ].filter(r => liberado(r[2]));
    const qa = el(`<section class="hcard quick"><header><h3>Acesso rápido</h3></header><div class="quick-row"></div></section>`);
    rapidos.forEach(([ico, label, view, fn]) => { const b = el(`<button class="quick-tile"><span class="qi" aria-hidden="true">${icone(view === "solicitacoes" ? "solicitacoes" : view === "documentos" && label.startsWith("Enviar") ? "malotes" : view)}</span><span>${esc(label)}</span></button>`); b.onclick = fn || (() => irPara(view)); qa.querySelector(".quick-row").appendChild(b); });
    c.appendChild(qa);
  }

  async function viewPainel() {
    setTitle("Início", "");
    const c = content(); c.innerHTML = "<div class='empty'>Carregando…</div>";
    try {
      const d = await api("/api/painel" + empParam());
      c.innerHTML = "";
      document.querySelector(".topbar")?.classList.add("hidden-title");
      if (d.escopo === "geral") {
        setTitle("Início", "Visão geral do escritório");
        c.appendChild(el(`<section class="hello"><div><h3>Olá, ${esc(String(ME.nome || "").split(" ")[0])}</h3><p>Visão geral do escritório · escolha uma empresa no topo para ver os detalhes dela</p></div></section>`));
        const kpis = [
          ["Empresas", d.cards.empresas, "", "empresas"],
          ["Solicitações abertas", d.cards.solicitacoes_abertas, d.cards.solicitacoes_abertas ? "warn" : "", "solicitacoes"],
          ["Documentos recebidos", d.cards.documentos_recebidos, "", "documentos"],
          ["Obrigações atrasadas", d.cards.obrigacoes_atrasadas, d.cards.obrigacoes_atrasadas ? "danger" : "", "obrigacoes"],
        ];
        const g = el(`<div class="kpi-grid"></div>`);
        kpis.forEach(([label, v, tom, view]) => { const b = el(`<button class="hcard kpi-card ${tom}"><span class="kpi-label">${esc(label)}</span><span class="kpi">${v}</span><span class="kpi-go">Ver ›</span></button>`); b.onclick = () => irPara(view); if (!liberado(view)) b.disabled = true; g.appendChild(b); });
        c.appendChild(g);
        if (EMPRESAS.length) {
          const lst = el(`<section class="hcard"><header><h3>Empresas</h3></header><ul class="emp-list"></ul></section>`);
          EMPRESAS.forEach(e => { const li = el(`<li><button><b>${esc(e.nome)}</b><small>${esc(e.cnpj || "")}</small><span aria-hidden="true">›</span></button></li>`); li.querySelector("button").onclick = () => { FILTRO_EMPRESA = String(e.id); routeView(); sincronizarEmpresaHeader(); }; lst.querySelector("ul").appendChild(li); });
          c.appendChild(lst);
        }
      } else {
        setTitle("Início", d.empresa.nome);
        await painelEmpresaV2(c, d);
      }
    } catch (e) { c.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  }

  function cardsGrid(items) {
    const g = el(`<div class="cards"></div>`);
    items.forEach(([label, value, cls]) => {
      g.appendChild(el(`<div class="card"><div class="label">${esc(label)}</div><div class="value ${cls || ""}">${value}</div></div>`));
    });
    return g;
  }

  async function base64Arquivo(file) {
    if(!file||file.size>12*1024*1024)throw new Error('Selecione um arquivo de até 12 MB.');
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(new Error('Falha ao ler arquivo.'));r.readAsDataURL(file);});
  }
  function importarEfd() {
    openModal('Importar EFD-Contribuições',`<p>A escrituração consolidada deve corresponder ao CNPJ da matriz selecionada. A conferência e o recibo são obrigatórios.</p><div class="field"><label>Arquivo EFD (.txt)</label><input type="file" name="efd" accept=".txt"></div>`,async(form,close,setErr)=>{
      try {const arquivo=await base64Arquivo(form.efd.files[0]);const info=await jpost('/api/faturamento/efd/analisar',{empresa_id:FILTRO_EMPRESA,arquivo});close();
        openModal('Conferir receita da EFD',`<p>${esc(info.nome)} · ${esc(info.cnpj)} · ${esc(info.period.slice(4)+'/'+info.period.slice(0,4))}</p><p>${esc(info.aviso)}</p><div class="field"><label>Receita bruta conferida (R$)</label><input name="valor" type="number" step="0.01" min="0" value="${info.candidato??''}"></div><div class="field"><label>Número do recibo de transmissão</label><input name="recibo"></div><label><input type="checkbox" name="conferido"> Conferi a receita e a transmissão. Uma retificação substituirá o valor desta competência.</label>`,async(f,done,error)=>{try{if(!f.valor.value)throw new Error('Informe a receita conferida.');await jpost('/api/faturamento/efd/publicar',{empresa_id:FILTRO_EMPRESA,arquivo,valor:f.valor.value,recibo:f.recibo.value,conferido:f.conferido.checked});done();renderApp();}catch(e){error(e.message);}});
      }catch(e){setErr(e.message);}
    });
  }
  function registrarTributo() {
    openModal('Registrar tributo ou pagamento',`<p>Informe cada tributo separadamente. A referência identifica o mesmo documento para evitar duplicação. Guia emitida deve ser registrada como apuração, sem confirmar pagamento.</p><div class="field"><label>Competência de apuração</label><input name="period" type="month"></div><div class="field"><label>Tributo</label><input name="tributo" placeholder="DAS, PIS, Cofins, IRPJ, CSLL, ICMS…"></div><div class="field"><label>Tipo</label><select name="tipo"><option value="apurado">Tributo apurado</option><option value="pago">Pagamento efetivamente confirmado</option></select></div><div class="field"><label>Valor (R$)</label><input name="valor" type="number" min="0" step="0.01"></div><div class="field"><label>Data do pagamento (somente pagamentos)</label><input name="pago_em" type="date"></div><div class="field"><label>Referência/número do documento oficial</label><input name="referencia"></div><div class="field"><label>Declaração, guia ou comprovante oficial PDF</label><input name="arquivo" type="file" accept=".pdf"></div>`,async(f,close,setErr)=>{try{if(!f.valor.value)throw new Error('Informe o valor.');await jpost('/api/faturamento/tributos',{empresa_id:FILTRO_EMPRESA,period:f.period.value,tributo:f.tributo.value,tipo:f.tipo.value,valor:f.valor.value,pago_em:f.pago_em.value,referencia:f.referencia.value,arquivo:await base64Arquivo(f.arquivo.files[0])});close();renderApp();}catch(e){setErr(e.message);}});
  }
  // ---------- Faturamento e Análise de faturamento v2 ----------
  const fatMoeda=n=>n===null||n===undefined||!isFinite(n)?'—':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fatNum=(n,d=1)=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:0});
  const fatPct=(n,d=1)=>n===null||n===undefined||!isFinite(n)?'—':fatNum(n,d)+'%';
  const fatCompact=n=>Number(n).toLocaleString('pt-BR',{notation:'compact',maximumFractionDigits:1});
  const fatSoma=(l,k='value')=>l.reduce((s,m)=>s+Number(m[k]||0),0);
  const perSomar=(p,n)=>{const d=new Date(Number(p.slice(0,4)),Number(p.slice(4,6))-1+n,1);return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0');};
  const mesLongo=p=>{p=String(p||'').replace('-','');return new Date(Number(p.slice(0,4)),Number(p.slice(4,6))-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});};
  const fatVariacao=(atual,anterior)=>atual===null||atual===undefined||anterior===null||anterior===undefined||!(anterior>0)?null:(atual/anterior-1)*100;
  function fatDeltaHtml(v,ref){
    if(v===null)return '<span class="fat-delta none">Sem base de comparação</span>';
    const up=v>=0;return `<span class="fat-delta ${up?'up':'down'}"><span aria-hidden="true">${up?'▲':'▼'}</span> ${up?'+':''}${fatNum(v)}%${ref?' vs. '+esc(ref):''}</span>`;
  }
  function baixarCsv(nome,linhas){
    const cel=v=>{const s=v===null||v===undefined?'':String(v);return /[";\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    const csv='﻿'+linhas.map(l=>l.map(cel).join(';')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=nome;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
  }
  const csvNum=(n,d=2)=>n===null||n===undefined||!isFinite(n)?'':Number(n).toFixed(d).replace('.',',');
  const SIMPLES_LIMITE=4800000,SIMPLES_SUBLIMITE=3600000;
  function situacaoLimite(total){
    if(total>SIMPLES_LIMITE)return ['danger','✕','Acima do limite do Simples'];
    if(total>SIMPLES_SUBLIMITE)return ['warn','!','Acima do sublimite de ICMS/ISS'];
    if(total>=SIMPLES_SUBLIMITE*.8)return ['warn','!','Perto do sublimite de ICMS/ISS'];
    return ['ok','✓','Dentro do limite'];
  }
  // Medidor da receita de 12 meses (base do RBT12) contra o teto do Simples (R$ 4,8 mi) e o sublimite (R$ 3,6 mi).
  function cardLimiteSimples(total,pendentes,ultimoPeriodo){
    const pct=total/SIMPLES_LIMITE*100,[tom,ico,txt]=situacaoLimite(total),folga=Math.max(0,SIMPLES_LIMITE-total);
    const proximo=ultimoPeriodo?periodoLabel(perSomar(ultimoPeriodo,1)):'';
    return el(`<section class="hcard fat-limite ${tom}"><header><h3>Limite do Simples Nacional</h3><span class="status-chip ${tom}"><span aria-hidden="true">${ico}</span> ${txt}</span></header>
      <p class="kpi-label">Receita bruta dos últimos 12 meses${proximo?' (base do RBT12 de '+esc(proximo)+')':''}</p>
      <p class="kpi">${fatMoeda(total)}</p>
      <div class="fat-meter" role="meter" aria-label="Receita de 12 meses em relação ao limite anual do Simples" aria-valuemin="0" aria-valuemax="${SIMPLES_LIMITE}" aria-valuenow="${Math.round(Math.min(total,SIMPLES_LIMITE))}" aria-valuetext="${fatNum(pct)}% do limite de R$ 4,8 milhões"><span class="fat-meter-fill ${tom}" style="width:${Math.min(100,Math.max(1,pct))}%"></span><span class="fat-meter-mark" style="left:${SIMPLES_SUBLIMITE/SIMPLES_LIMITE*100}%" title="Sublimite de ICMS/ISS: R$ 3,6 milhões"></span></div>
      <div class="fat-meter-scale" aria-hidden="true"><span>R$ 0</span><span class="mid">3,6 mi</span><span>4,8 mi</span></div>
      <p class="small"><b>${fatPct(pct)}</b> do limite anual · ${total>SIMPLES_LIMITE?'<span class="txt-danger">'+fatMoeda(total-SIMPLES_LIMITE)+' acima do limite</span>':'folga de <b>'+fatMoeda(folga)+'</b>'}</p>
      ${pendentes?`<p class="small muted"><span aria-hidden="true">!</span> ${pendentes} ${pendentes===1?'mês sem valor confirmado não entra':'meses sem valor confirmado não entram'} na soma; o valor real pode ser maior.</p>`:''}
      <p class="small muted">Acima de R$ 3,6 mi o ICMS e o ISS deixam de ser pagos no DAS. Estimativa com os meses confirmados; o RBT12 oficial é apurado no PGDAS-D.</p>
    </section>`);
  }
  // Gráfico de barras dos 12 meses (botões selecionáveis), com linha da média e, opcionalmente, composição e carga.
  function fatGrafico(months,{selected,onSelect,composicao=false,carga=false}={}){
    const conf=months.filter(m=>m.confirmed),max=Math.max(1,...conf.map(m=>Number(m.value)||0));
    const media=conf.length?fatSoma(conf)/conf.length:null;
    const wrap=el('<div class="fat-bars" role="group" aria-label="Faturamento mês a mês"></div>');
    months.forEach((m,i)=>{
      const h=m.confirmed?Math.max(2,m.value/max*100):14;let fill='',cls='';
      if(m.confirmed&&composicao){
        const cp=m.composition;
        if(cp&&m.value>0){cls='stack';fill=`<i class="seg com" style="height:${Math.max(0,cp.comercio)/m.value*100}%"></i><i class="seg srv" style="height:${Math.max(0,cp.servicos)/m.value*100}%"></i><i class="seg out" style="height:${Math.max(0,cp.outros)/m.value*100}%"></i>`;}
        else cls='nodet';
      }
      const b=el(`<button type="button" class="fat-bar ${m.confirmed?'':'pend'}" aria-pressed="${m.period===selected}" aria-label="${esc(m.label)}: ${m.confirmed?fatMoeda(m.value):'sem valor confirmado'}${carga&&m.cargaTributaria!==null&&m.cargaTributaria!==undefined?', carga '+fatPct(m.cargaTributaria,2):''}"><span class="fat-bar-val" aria-hidden="true">${m.confirmed?fatCompact(m.value):'Pendente'}</span><span class="fat-bar-track" aria-hidden="true">${media?`<i class="fat-avg" style="bottom:${media/max*100}%"></i>`:''}<span class="fat-bar-fill ${cls}" style="height:${h}%">${fill}</span></span><span class="fat-bar-lbl" aria-hidden="true">${esc(m.label)}</span>${carga?`<span class="fat-bar-carga" aria-hidden="true">${m.cargaTributaria===null||m.cargaTributaria===undefined?'—':fatPct(m.cargaTributaria,1)}</span>`:''}</button>`);
      b.onclick=()=>{wrap.querySelectorAll('.fat-bar').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');if(onSelect)onSelect(m,i);};
      wrap.appendChild(b);
    });
    return wrap;
  }

  let FAT_SEL='',FAT_SEL_EMP='';
  async function viewReceitaMensal() {
    setTitle("Faturamento", "Últimos 12 meses fechados");
    const c=content();c.innerHTML='<div class="empty">Carregando faturamento…</div>';
    try {
      const bar=officeFilterBar();
      if(!FILTRO_EMPRESA){c.innerHTML='';if(bar)c.appendChild(bar);c.appendChild(el('<div class="empty">Selecione uma empresa para acompanhar o faturamento.</div>'));return;}
      const company=FILTRO_EMPRESA;
      const [data,visao]=await Promise.all([api('/api/receita-mensal'+empParam()),!LANCAMENTO.ativo?pegar('/api/visao'+empParam()):null]);
      if(VIEW!=='receita-mensal'||company!==FILTRO_EMPRESA)return;
      c.innerHTML='';if(bar)c.appendChild(bar);acoesContexto();
      const simples=visao?.regime?/simples nacional/i.test(visao.regime):/PGDAS/i.test(data.fonte||'');
      setTitle('Faturamento',simples?'Últimos 12 meses fechados · Simples Nacional':'Últimos 12 meses fechados');
      const extra=new Map((visao?.months||[]).map(m=>[m.period,m]));
      const months=(data.months||[]).map(m=>{const x=extra.get(m.period);const ok=m.confirmed&&x?.confirmed;return {...m,cargaTributaria:ok?x.cargaTributaria??null:null,tributosApurados:ok?x.tributosApurados??null:null};});
      const conf=months.filter(m=>m.confirmed),temCarga=conf.some(m=>m.cargaTributaria!==null);
      const nota=()=>c.appendChild(el(`<p class="essential-note">Fonte: ${esc(data.fonte||'—')}. ${data.consultado_em?'Consulta de origem: '+esc(fmtDateTime(data.consultado_em))+'. ':''}${data.sincronizado_em?'Sincronizado em '+esc(fmtDateTime(data.sincronizado_em))+'. ':''}Valores declarados; meses sem confirmação não entram nos totais e não significam faturamento zero.${temCarga?' Carga = tributos declarados ÷ faturamento; não é a alíquota da tabela.':''}</p>`));
      if(visao)atualizacaoVisao(c,visao);
      if(!conf.length){c.appendChild(el('<section class="hcard act-ok fat-vazio"><span aria-hidden="true">i</span><div><b>Ainda não há faturamento confirmado</b><small>Assim que a declaração de um mês for consultada, o valor aparece aqui. Mês sem valor não significa faturamento zero.</small></div></section>'));nota();return;}
      if(FAT_SEL_EMP!==company||!months.some(m=>m.period===FAT_SEL))FAT_SEL=conf.at(-1).period;FAT_SEL_EMP=company;
      const ultimo=conf.at(-1),pendentes=months.length-conf.length;

      // 1) Mês em destaque + posição no limite do Simples
      const top=el('<div class="fat-top"></div>');c.appendChild(top);
      const hero=el('<section class="hcard fat-hero" aria-live="polite"></section>');top.appendChild(hero);
      if(simples)top.appendChild(cardLimiteSimples(data.total,pendentes,months.at(-1)?.period));
      else top.appendChild(el(`<section class="hcard fat-acum"><header><h3>Acumulado em 12 meses</h3></header><p class="kpi">${fatMoeda(data.total)}</p><p class="small muted">${data.confirmedMonths??conf.length} de ${months.length} meses confirmados · média mensal ${fatMoeda(data.total/conf.length)}</p></section>`));
      let graf;
      function selecionar(p){FAT_SEL=p;desenharHero();graf?.querySelectorAll('.fat-bar').forEach((b,i)=>b.setAttribute('aria-pressed',String(months[i].period===p)));}
      function desenharHero(){
        const i=months.findIndex(m=>m.period===FAT_SEL),m=months[i];
        const prevPer=perSomar(m.period,-1),anoPer=perSomar(m.period,-12);
        const prev=months.find(x=>x.period===prevPer),yoy=months.find(x=>x.period===anoPer);
        const comp=(titulo,x,per)=>{
          const rot=titulo+' · '+esc(x?x.label:new Date(Number(per.slice(0,4)),Number(per.slice(4,6))-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','').replace(' de ','/'));
          if(!x)return `<li><span class="kpi-label">${rot}</span><b class="muted">Fora dos 12 meses consultados</b></li>`;
          if(!x.confirmed)return `<li><span class="kpi-label">${rot}</span><b class="muted">Sem valor confirmado</b></li>`;
          return `<li><span class="kpi-label">${rot}</span><b>${fatMoeda(x.value)}</b>${m.confirmed?fatDeltaHtml(fatVariacao(m.value,x.value)):''}</li>`;
        };
        hero.innerHTML=`<header><div><p class="kpi-label">Faturamento de</p><h3 class="cap">${esc(mesLongo(m.period))}</h3></div><div class="fat-hero-nav"><button class="btn ghost sm" aria-label="Mês anterior" ${i<=0?'disabled':''}>←</button><button class="btn ghost sm" aria-label="Próximo mês" ${i>=months.length-1?'disabled':''}>→</button></div></header>
          ${m.confirmed?`<p class="kpi fat-big">${fatMoeda(m.value)}</p>`:'<p class="kpi fat-big pend">Ainda não disponível</p>'}
          <p class="fat-hero-sub small muted">${m.period===ultimo.period?'<span class="status-chip ok"><span aria-hidden="true">✓</span> Último mês fechado</span> ':''}${m.confirmed?'Receita bruta declarada na competência':'A declaração deste mês ainda não está disponível. Não significa faturamento zero.'}</p>
          <ul class="fat-compare">${comp('Mês anterior',prev,prevPer)}${comp('Mesmo mês de '+anoPer.slice(0,4),yoy,anoPer)}${temCarga?`<li><span class="kpi-label">Carga tributária</span><b>${m.cargaTributaria===null?'—':fatPct(m.cargaTributaria,2)}</b><small class="muted">${m.tributosApurados===null?'Tributos não informados':fatMoeda(m.tributosApurados)+' declarados'}</small></li>`:''}</ul>`;
        const [a,b]=hero.querySelectorAll('.fat-hero-nav button');a.onclick=()=>selecionar(months[i-1].period);b.onclick=()=>selecionar(months[i+1].period);
      }
      desenharHero();

      // 2) Gráfico de 12 meses (com carga por mês quando disponível)
      const media=data.total/conf.length;
      const ch=el(`<section class="hcard fat-chart"><header><h3>Últimos 12 meses</h3><span class="muted small">Média mensal ${fatMoeda(media)} · ${conf.length} de ${months.length} meses confirmados</span></header><p class="fat-legend small muted"><span class="lg-bar">Faturamento</span><span class="lg-avg">Média mensal</span>${pendentes?'<span class="lg-pend">Pendente</span>':''}${temCarga?'<span class="lg-carga">% abaixo do mês = carga tributária</span>':''}</p></section>`);
      graf=fatGrafico(months,{selected:FAT_SEL,carga:temCarga,onSelect:m=>selecionar(m.period)});ch.appendChild(graf);c.appendChild(ch);

      // 3) Tabela mês a mês (acessível e exportável)
      const tb=el(`<details class="hcard consultas-oficiais fat-tabela"><summary><b>Tabela mês a mês</b> <span class="muted small">valores, variação${temCarga?' e carga':''} · exportar CSV</span></summary><div class="fat-tabela-acts"><button class="btn ghost sm">Baixar CSV</button></div><div class="fat-tabela-wrap"><table><thead><tr><th>Mês</th><th>Faturamento</th><th>Variação</th>${temCarga?'<th>Carga</th><th>Tributos declarados</th>':''}</tr></thead><tbody></tbody></table></div></details>`);
      const linhas=months.map((m,i)=>{const p=months[i-1];return {m,v:m.confirmed&&p?.confirmed?fatVariacao(m.value,p.value):null};});
      [...linhas].reverse().forEach(({m,v})=>tb.querySelector('tbody').appendChild(el(`<tr><td>${esc(m.label)}</td><td>${m.confirmed?fatMoeda(m.value):'Pendente'}</td><td>${v===null?'—':(v>=0?'▲ +':'▼ ')+fatNum(v)+'%'}</td>${temCarga?`<td>${fatPct(m.cargaTributaria,2)}</td><td>${fatMoeda(m.tributosApurados)}</td>`:''}</tr>`)));
      tb.querySelector('.fat-tabela-acts button').onclick=()=>baixarCsv('faturamento-12-meses.csv',[['Competência','Faturamento (R$)','Variação vs. mês anterior (%)',...(temCarga?['Carga (%)','Tributos declarados (R$)']:[])],...linhas.map(({m,v})=>[periodoLabel(m.period),m.confirmed?csvNum(m.value):'Pendente',csvNum(v,1),...(temCarga?[csvNum(m.cargaTributaria),csvNum(m.tributosApurados)]:[])])]);
      c.appendChild(tb);
      nota();
    }catch(e){c.innerHTML='';c.appendChild(el('<div class="alert err">'+esc(e.message)+'</div>'));}
  }

  async function viewFaturamento() {
    setTitle('Análise de faturamento','Receita, carga tributária e comparações · últimos 12 meses fechados');
    const c=content();c.innerHTML='<div class="empty">Carregando…</div>';
    try {
      const bar=officeFilterBar();
      if(!FILTRO_EMPRESA){c.innerHTML='';if(bar)c.appendChild(bar);c.appendChild(el('<div class="empty">Selecione uma empresa para consultar o faturamento.</div>'));return;}
      const company=FILTRO_EMPRESA;const data=await api('/api/faturamento'+empParam());
      if(VIEW!=='faturamento'||company!==FILTRO_EMPRESA)return;
      c.innerHTML='';if(bar)c.appendChild(bar);
      if(!data.habilitado){c.appendChild(el(`<section class="hcard act-ok"><span aria-hidden="true">i</span><div><b>Análise indisponível para esta empresa</b><small>${esc(data.message||'')}</small></div></section>`));return;}
      acoesContexto();
      const pdf=el('<a class="btn ghost">Baixar relatório PDF</a>');pdf.href='/api/visao/pdf'+empParam();topActions().appendChild(pdf);
      atualizacaoVisao(c,data);
      const months=data.months||[],valid=months.filter(m=>m.confirmed),matched=valid.filter(m=>m.tributosApurados!==null&&m.tributosApurados!==undefined);
      const base=fatSoma(matched),tax=fatSoma(matched,'tributosApurados'),cargaMedia=base>0?tax/base*100:null;
      const simples=/simples nacional/i.test(data.regime||''),pendentes=months.length-valid.length;
      const pagosConf=matched.filter(m=>m.tributosPagos!==null&&m.tributosPagos!==undefined).length;
      const temComp=valid.some(m=>m.composition),temCarga=valid.some(m=>m.cargaTributaria!==null&&m.cargaTributaria!==undefined);

      // 1) Resumo
      c.appendChild(el(`<div class="fat-kpis">
        <div class="hcard"><span class="kpi-label">Faturamento em 12 meses</span><span class="kpi">${fatMoeda(data.total)}</span><small class="muted">${valid.length} de ${months.length} meses confirmados</small></div>
        <div class="hcard"><span class="kpi-label">Média mensal</span><span class="kpi">${valid.length?fatMoeda(data.total/valid.length):'—'}</span><small class="muted">Somente meses confirmados</small></div>
        <div class="hcard"><span class="kpi-label">Carga média</span><span class="kpi">${fatPct(cargaMedia,2)}</span><small class="muted">Tributos ÷ faturamento · ${matched.length} meses</small></div>
        <div class="hcard"><span class="kpi-label">Tributos declarados</span><span class="kpi">${matched.length?fatMoeda(tax):'—'}</span><small class="muted">${pagosConf} de ${matched.length} com pagamento confirmado</small></div>
      </div>`));

      // 2) Destaques (insights calculados dos dados do período)
      const ins=[];
      const ult=valid.at(-1),ant=ult?months[months.indexOf(ult)-1]:null;
      if(ult){const v=ant?.confirmed?fatVariacao(ult.value,ant.value):null;ins.push({tom:v===null?'':v>=0?'ok':'warn',ico:v===null?'•':v>=0?'▲':'▼',t:`${esc(ult.label)}: ${fatMoeda(ult.value)}`,s:v===null?'Sem mês anterior confirmado para comparar.':`${v>=0?'+':''}${fatNum(v)}% em relação a ${esc(ant.label)} (${fatMoeda(ant.value)}).`});}
      if(valid.length>=6){const a=valid.slice(-3),b=valid.slice(-6,-3),v=fatVariacao(fatSoma(a),fatSoma(b));if(v!==null)ins.push({tom:'',ico:v>=0?'▲':'▼',t:`Últimos 3 meses: ${fatMoeda(fatSoma(a))}`,s:`${v>=0?'+':''}${fatNum(v)}% em relação aos 3 meses anteriores (${esc(a[0].label)} a ${esc(a.at(-1).label)} vs. ${esc(b[0].label)} a ${esc(b.at(-1).label)}).`});}
      if(valid.length>=2){const mx=valid.reduce((x,y)=>y.value>x.value?y:x),mn=valid.reduce((x,y)=>y.value<x.value?y:x);ins.push({tom:'',ico:'↕',t:`Maior mês: ${esc(mx.label)} · ${fatMoeda(mx.value)}`,s:`Menor mês: ${esc(mn.label)} · ${fatMoeda(mn.value)}${mn.value>0?' (diferença de '+fatNum((mx.value/mn.value-1)*100)+'%)':''}.`});}
      if(ult&&ult.cargaTributaria!==null&&ult.cargaTributaria!==undefined&&cargaMedia!==null){const dp=ult.cargaTributaria-cargaMedia;ins.push({tom:'',ico:'%',t:`Carga de ${esc(ult.label)}: ${fatPct(ult.cargaTributaria,2)}`,s:`${Math.abs(dp)<.005?'Igual à':(dp>0?fatNum(dp,2)+' p.p. acima da':fatNum(-dp,2)+' p.p. abaixo da')} média do período (${fatPct(cargaMedia,2)}).`});}
      if(temComp){const cm=valid.filter(m=>m.composition),s=cm.reduce((t,m)=>t+m.composition.servicos,0),co=cm.reduce((t,m)=>t+m.composition.comercio,0),o=cm.reduce((t,m)=>t+Math.max(0,m.composition.outros),0),t=s+co+o;if(t>0)ins.push({tom:'',ico:'◧',t:'Composição da receita',s:`Serviços ${fatPct(s/t*100)} · Comércio ${fatPct(co/t*100)}${o>0?' · Outros '+fatPct(o/t*100):''} (${cm.length} ${cm.length===1?'mês detalhado':'meses detalhados'}).`});}
      if(simples){const[tom,ico,txt]=situacaoLimite(data.total);ins.push({tom,ico,t:`Limite do Simples: ${fatPct(data.total/SIMPLES_LIMITE*100)} usado`,s:`${txt} · ${fatMoeda(data.total)} em 12 meses de R$ 4,8 milhões.`,link:liberado('receita-mensal')?['Ver medidor','receita-mensal']:null});}
      if(pendentes)ins.push({tom:'warn',ico:'!',t:`${pendentes} ${pendentes===1?'mês sem faturamento confirmado':'meses sem faturamento confirmado'}`,s:'Não entram nos totais. Mês pendente não significa faturamento zero.'});
      const naoPagos=matched.length-pagosConf;
      if(naoPagos)ins.push({tom:'info',ico:'◔',t:`${naoPagos} ${naoPagos===1?'mês com tributo sem pagamento confirmado':'meses com tributo sem pagamento confirmado'}`,s:'Tributo declarado não comprova pagamento.',link:liberado('guias')?['Ver guias','guias']:null});
      if(ins.length){
        const sec=el('<section class="hcard fat-insights"><header><h3>Destaques do período</h3></header><ul></ul></section>');
        ins.forEach(x=>{const li=el(`<li class="fat-ins ${x.tom}"><span class="fat-ins-ico" aria-hidden="true">${x.ico}</span><div><b>${x.t}</b><small>${x.s}</small></div></li>`);if(x.link){const l=el(`<button class="link-btn">${esc(x.link[0])}</button>`);l.onclick=()=>irPara(x.link[1]);li.querySelector('div').appendChild(l);}sec.querySelector('ul').appendChild(li);});
        c.appendChild(sec);
      }

      // 3) Evolução mensal com detalhe do mês (comparativo com o mês anterior)
      const ch=el(`<section class="hcard fat-chart"><header><h3>Evolução mensal</h3><span class="muted small">Toque em um mês para ver o detalhe</span></header><p class="fat-legend small muted">${temComp?'<span class="lg-srv">Serviços</span><span class="lg-com">Comércio</span><span class="lg-out">Outros / sem detalhamento</span>':'<span class="lg-bar">Faturamento</span>'}<span class="lg-avg">Média mensal</span>${pendentes?'<span class="lg-pend">Pendente</span>':''}${temCarga?'<span class="lg-carga">% abaixo do mês = carga efetiva</span>':''}</p><div class="fat-detalhe" aria-live="polite"></div></section>`);
      const cmpLocal=(cur,old,rate)=>({atual:cur??null,anterior:old??null,diferenca:cur===null||cur===undefined||old===null||old===undefined?null:cur-old,percentual:rate?null:fatVariacao(cur,old)});
      function detalhe(m,i){
        const box=ch.querySelector('.fat-detalhe'),prev=months[i-1],r=m.comparativo,p=prev?.confirmed?prev:null;
        if(!m.confirmed){box.innerHTML=`<div class="act-ok"><span aria-hidden="true">i</span><div><b class="cap">${esc(mesLongo(m.period))}: sem faturamento confirmado</b><small>A declaração desta competência ainda não está disponível. Não significa faturamento zero.</small></div></div>`;return;}
        const cp=m.composition;
        const itens=[
          ['Faturamento',r?.faturamento||cmpLocal(m.value,p?.value)],
          ['Serviços',r?.servicos||cmpLocal(cp?cp.servicos:null,p?.composition?.servicos),'Não detalhado'],
          ['Comércio',r?.comercio||cmpLocal(cp?cp.comercio:null,p?.composition?.comercio),'Não detalhado'],
          ['Tributos declarados',r?.tributos||cmpLocal(m.tributosApurados,p?.tributosApurados)],
          ['Carga efetiva',r?.carga||cmpLocal(m.cargaTributaria,p?.cargaTributaria,true),'—',true],
          ['Após tributos informados',r?.aposTributos||cmpLocal(m.aposTributos,p?.aposTributos)],
        ];
        const fmt=(v,taxa)=>taxa?fatPct(v,2):fatMoeda(v);
        const chg=(v,taxa)=>{if(v.diferenca===null||v.diferenca===undefined)return 'Sem comparação';const d=v.diferenca,s=d>0?'▲ +':d<0?'▼ −':'= ';return taxa?s+fatNum(Math.abs(d),2)+' p.p.':s+fatMoeda(Math.abs(d)).replace(/^-/,'')+(v.percentual===null||v.percentual===undefined?'':' ('+(v.percentual>0?'+':'')+fatNum(v.percentual)+'%)');};
        box.innerHTML=`<h4><span class="cap">${esc(mesLongo(m.period))}</span> <small>comparado a ${esc(r?.anterior||prev?.label||'mês anterior indisponível')}</small></h4><div class="fat-det-grid">${itens.map(([nome,v,vazio,taxa])=>`<div><small>${nome}</small><b>${v.atual===null||v.atual===undefined?(vazio||'—'):fmt(v.atual,taxa)}</b><span class="fat-chg">${chg(v,taxa)}</span></div>`).join('')}</div><p class="small muted">Pagamento dos tributos: ${m.tributosPagos===null||m.tributosPagos===undefined?'não confirmado':fatMoeda(m.tributosPagos)+' confirmado'}${cp?.outros?' · Outras atividades: '+fatMoeda(cp.outros):''}. Aumento de receita não significa aumento da alíquota.</p>`;
      }
      const selIdx=Math.max(0,months.findLastIndex(m=>m.confirmed));
      const graf=fatGrafico(months,{selected:months[selIdx]?.period,composicao:temComp,carga:temCarga,onSelect:detalhe});
      ch.insertBefore(graf,ch.querySelector('.fat-detalhe'));c.appendChild(ch);if(months.length)detalhe(months[selIdx],selIdx);

      // 4) Números por competência (tabela + CSV)
      const table=el(`<details class="hcard consultas-oficiais fat-tabela"><summary><b>Números por competência</b> <span class="muted small">tabela completa · exportar CSV</span></summary><div class="fat-tabela-acts"><button class="btn ghost sm">Baixar CSV</button></div><div class="fat-tabela-wrap"><table><thead><tr><th>Mês</th><th>Receita total</th><th>Serviços</th><th>Comércio</th><th>Outros</th><th>Tributos declarados</th><th>Carga</th><th>Após tributos</th><th>Pagamento</th></tr></thead><tbody></tbody></table></div></details>`);
      [...months].reverse().forEach(m=>table.querySelector('tbody').appendChild(el(`<tr><td>${esc(m.label)}</td><td>${m.confirmed?fatMoeda(m.value):'Pendente'}</td><td>${fatMoeda(m.composition?.servicos)}</td><td>${fatMoeda(m.composition?.comercio)}</td><td>${fatMoeda(m.composition?.outros)}</td><td>${fatMoeda(m.tributosApurados)}</td><td>${fatPct(m.cargaTributaria,2)}</td><td>${fatMoeda(m.aposTributos)}</td><td>${m.tributosPagos===null||m.tributosPagos===undefined?'Não confirmado':fatMoeda(m.tributosPagos)}</td></tr>`)));
      table.querySelector('.fat-tabela-acts button').onclick=()=>baixarCsv('analise-faturamento.csv',[['Competência','Receita total (R$)','Serviços (R$)','Comércio (R$)','Outros (R$)','Tributos declarados (R$)','Carga (%)','Após tributos (R$)','Pagamento confirmado (R$)'],...months.map(m=>[periodoLabel(m.period),m.confirmed?csvNum(m.value):'Pendente',csvNum(m.composition?.servicos),csvNum(m.composition?.comercio),csvNum(m.composition?.outros),csvNum(m.tributosApurados),csvNum(m.cargaTributaria),csvNum(m.aposTributos),csvNum(m.tributosPagos)])]);
      c.appendChild(table);

      // 5) Fontes do arquivo digital
      const sources=months.filter(m=>m.documento_id);
      if(sources.length){
        const sec=el(`<section class="hcard obr-list fat-fontes"><header><h3>Fontes do arquivo digital</h3><span class="count">${sources.length} ${sources.length===1?'documento':'documentos'}</span></header><p class="small muted">Receitas identificadas por estabelecimento e competência nos documentos de origem. Outras receitas aparecem separadas.</p><ul></ul></section>`);
        [...sources].reverse().forEach(m=>{const li=el(`<li class="obr-row"><span class="status-chip"><span aria-hidden="true">▤</span> ${esc(m.label)}</span><div class="obr-main"><b>Faturamento publicado: ${fatMoeda(m.value)}${m.outrasReceitasSeparadas!=null?' · Outras receitas separadas: '+fatMoeda(m.outrasReceitasSeparadas):''}</b><small>${esc(m.criterio||'')}</small></div><span class="obr-prazo"></span><span class="obr-act"><button class="btn ghost sm">Ver documento</button></span></li>`);li.querySelector('button').onclick=()=>previewCertidao({id:m.documento_id,titulo:'Fonte do faturamento · '+m.label,nome_arquivo:'relatorio-fiscal.pdf'});sec.querySelector('ul').appendChild(li);});
        c.appendChild(sec);
      }

      // 6) Ferramentas do escritório (recolhidas)
      if(isOffice()){
        const pode=ME.funcao!=='consulta';
        const tools=el(`<details class="hcard consultas-oficiais fat-tools"><summary><b>Ferramentas do escritório</b> <span class="muted small">importar EFD, registrar tributos e pagamentos</span></summary><div class="fat-tools-list"><div><b>Importar EFD-Contribuições</b><small class="muted">Lê a receita bruta da escrituração para conferência antes de publicar.</small></div><button class="btn ghost sm efd">Importar EFD</button><div><b>Registrar tributo ou pagamento</b><small class="muted">Apuração ou pagamento confirmado, com documento oficial em PDF.</small></div><button class="btn ghost sm trib">Registrar tributo / pagamento</button></div>${pode?'':'<p class="small muted">Seu acesso é somente de consulta.</p>'}</details>`);
        const efd=tools.querySelector('.efd'),trib=tools.querySelector('.trib');efd.onclick=importarEfd;trib.onclick=registrarTributo;efd.disabled=trib.disabled=!pode;
        c.appendChild(tools);
      }
      c.appendChild(el(`<p class="essential-note">Fonte: ${esc(data.source||'—')} · Atualização: ${fmtDateTime(data.sincronizado_em)}. Serviços e comércio vêm das atividades da declaração e só aparecem quando conciliam com a receita total. Tributos declarados não comprovam pagamento; carga = tributos ÷ faturamento (não é a alíquota da tabela); valores após tributos não são lucro. Meses pendentes não são zero.</p>`));
    }catch(err){c.innerHTML='';c.appendChild(el(`<div class="alert err">${esc(err.message)}</div>`));}
  }

  // ---------- Documentos v2: o que falta enviar + biblioteca ----------
  let DOCUMENT_CATEGORY='';   // filtro da biblioteca (aceita os valores antigos 'Contrato social' e 'IRPF')
  let DOC_BUSCA='',DOC_LIMITE=30;
  const DOC_FAMILIAS=[
    ['contrato','Contrato social',d=>d.categoria==='Contrato social'],
    ['cadastro','CNPJ e inscrições',d=>['CNPJ','Inscrição municipal','Inscrição estadual'].includes(d.categoria)],
    ['certidoes','Certidões',d=>d.categoria==='Certidões'],
    ['guias','Guias',d=>d.categoria==='Guias'],
    ['folha','Folha',d=>d.categoria==='Folha'],
    ['contabil','Contábil',d=>['Balancetes','Contratos'].includes(d.categoria)],
    ['irpf','IR dos sócios',d=>String(d.categoria||'').startsWith('IRPF')],
  ];
  const docFamilia=d=>d.origem==='cliente'?'enviados':((DOC_FAMILIAS.find(f=>f[2](d))||['outros'])[0]);
  const docFiltroAtual=()=>({'Contrato social':'contrato','IRPF':'irpf'}[DOCUMENT_CATEGORY]||DOCUMENT_CATEGORY||'todos');
  function tipoArquivo(nome){
    const ext=String(nome||'').toLowerCase().split('.').pop();
    if(ext==='pdf')return ['arq-pdf','PDF'];
    if(ext==='xml')return ['arq-xml','XML'];
    if(['zip','rar','7z'].includes(ext))return ['arq-zip','Compactado'];
    if(['ofx','csv','xls','xlsx'].includes(ext))return ['arq-planilha','Planilha / extrato'];
    if(['jpg','jpeg','png','webp','heic'].includes(ext))return ['arq-img','Imagem'];
    return ['arq','Arquivo'];
  }
  const docPrevisualizavel=doc=>{const n=String(doc.nome_arquivo||'').toLowerCase();return n.endsWith('.pdf')||n.endsWith('.xml')||['Certidões','CNPJ'].includes(doc.categoria);};
  const docDownload=doc=>'/api/download?id='+encodeURIComponent(doc.id);
  // validade de certidões: [tom, texto]
  function docValidade(doc){
    if(!doc.validade)return null;const n=diasAte(doc.validade);if(n==null)return null;
    if(n<0)return ['danger','Vencida há '+(-n)+' dia'+(n===-1?'':'s')];
    if(n<=30)return ['warn',quando(doc.validade).replace(/^v/,'V')];
    return ['ok','Válida até '+fmtDate(isoData(doc.validade))];
  }
  const chipHtml=(tom,ico,txt)=>`<span class="status-chip ${tom||''}">${icone(ico,'ico-svg ico-xs')} ${esc(txt)}</span>`;
  // botão/link de ação: tipo 'primario' | 'ghost' | 'link'
  function addAcao(box,{txt,tipo='ghost',onClick,href,off,title}){
    const cls=tipo==='link'?'link-btn':'btn sm'+(tipo==='ghost'?' ghost':'');
    const b=href&&!off?el(`<a class="${cls}" href="${esc(href)}">${esc(txt)}</a>`):el(`<button type="button" class="${cls}">${esc(txt)}</button>`);
    if(onClick)b.onclick=onClick;if(off)b.disabled=true;if(title)b.title=title;
    box.appendChild(b);return b;
  }
  function linhaCheck({tom,ico,titulo,sub,chip,acoes}){
    const li=el(`<li class="act-row dv2-check ${tom||''}"><span class="act-ico" aria-hidden="true">${icone(ico)}</span><div class="act-txt"><b>${esc(titulo)}</b><small>${esc(sub||'')}</small></div>${chip?chipHtml(chip[0],chip[2]||'check',chip[1]):'<span></span>'}<span class="dv2-acts"></span></li>`);
    const box=li.querySelector('.dv2-acts');(acoes||[]).forEach(a=>addAcao(box,a));
    return li;
  }
  const ENVIOS_MENSAIS=[
    {titulo:'Extratos bancários',arquivo:'Extrato bancário',categoria:'Geral',teste:d=>/extrato/i.test(d.titulo+' '+d.nome_arquivo)},
    {titulo:'Notas fiscais de compra',arquivo:'Notas fiscais de compra',categoria:'Notas fiscais',teste:d=>d.categoria==='Notas fiscais'},
  ];
  const TOM_ORDEM={danger:0,warn:1,info:2,'':3,ok:4};
  // Itens do topo: o que falta enviar, o que vence e o que aguarda o escritório.
  function checklistDocumentos(docs,digital,sols,empresa){
    const itens=[],consulta=ME.funcao==='consulta',office=isOffice(),showEmp=office&&!FILTRO_EMPRESA;
    const publicados=docs.filter(d=>d.origem==='escritorio');
    const recarregar=()=>viewDocumentos();
    if(FILTRO_EMPRESA){
      const comp=mesSomar(hojeLocal().slice(0,7),-1),compLbl=periodoLabel(comp);
      ENVIOS_MENSAIS.forEach(m=>{
        const enviados=docs.filter(x=>x.origem==='cliente'&&String(x.competencia||'').replace('-','')===comp.replace('-','')&&m.teste(x)).sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em)));
        const titulo=m.titulo+' · '+compLbl,assunto='Não tenho este mês: '+m.titulo+' '+compLbl;
        const enviar=()=>modalUpload({categoria:m.categoria,titulo:m.arquivo+' '+compLbl,competencia:comp});
        const semMov=sols.find(s=>s.assunto===assunto);
        if(enviados.length){
          const conf=enviados.every(x=>x.conferido_em);
          if(office&&!conf)return; // aparece abaixo, em "Conferir"
          itens.push({tom:'ok',ico:'check',titulo,sub:plural(enviados.length,'arquivo enviado','arquivos enviados')+' em '+fmtDate(enviados[0].criado_em),chip:conf?['ok','Conferido','check']:['info','Aguardando conferência','relogio'],acoes:[{txt:'Enviar mais',tipo:'link',onClick:enviar,off:consulta}]});
        }else if(semMov){
          itens.push({tom:'',ico:'menos',titulo,sub:(office?'Cliente informou':'Você informou')+' que não houve neste mês · '+semMov.protocolo,chip:['','Não se aplica','menos'],acoes:[{txt:'Enviar mesmo assim',tipo:'link',onClick:enviar,off:consulta}]});
        }else{
          const acoes=[{txt:'Enviar',tipo:'primario',onClick:enviar,off:consulta}];
          if(!office)acoes.push({txt:'Não tenho este mês',tipo:'link',off:consulta,onClick:()=>modalNovaSolicitacao({assunto,corpo:`Informo que não houve ${m.titulo.toLowerCase()} na competência ${compLbl}.`,onCreated:recarregar})});
          itens.push({tom:'warn',ico:'enviar',titulo,sub:office?'O cliente ainda não enviou os arquivos desta competência':'Envie os arquivos da competência '+compLbl,chip:['warn','Pendente','relogio'],acoes});
        }
      });
    }
    if(office){
      docs.filter(x=>x.origem==='cliente'&&!x.conferido_em).forEach(x=>{
        const acoes=[{txt:'Marcar conferido',tipo:'primario',off:consulta,onClick:async e=>{const b=e.currentTarget;b.disabled=true;try{await jpost('/api/documentos/conferir',{id:x.id});recarregar();}catch(err){b.disabled=false;alert(err.message);}}}];
        acoes.push(docPrevisualizavel(x)?{txt:'Ver',tipo:'link',onClick:()=>previewCertidao(x)}:{txt:'Baixar',tipo:'link',href:docDownload(x)});
        itens.push({tom:'info',ico:tipoArquivo(x.nome_arquivo)[0],titulo:'Conferir: '+x.titulo,sub:(showEmp?(x.empresa||'')+' · ':'')+'Recebido em '+fmtDate(x.criado_em)+(x.competencia?' · competência '+periodoLabel(x.competencia):''),chip:['info','Aguardando conferência','relogio'],acoes});
      });
    }
    if(digital&&digital.confirmacao_recente&&digital.dias_restantes!=null&&digital.dias_restantes<=60){
      const n=digital.dias_restantes,venc=String(digital.vencimento||'').slice(0,10);
      itens.push({tom:n<=15?'danger':'warn',ico:'certificado',titulo:'Certificado digital',sub:'Vencimento '+fmtDate(venc)+' · '+quando(venc),chip:[n<=15?'danger':'warn',n<0?'Vencido':'Renovar','alerta'],acoes:[{txt:'Ver e renovar',tipo:n<=15?'primario':'ghost',onClick:()=>irPara('certificado')}]});
    }
    const ultimaCertidao=new Map();
    publicados.filter(x=>x.categoria==='Certidões'&&x.validade).sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em))).forEach(x=>{const k=x.empresa_id+'|'+x.titulo;if(!ultimaCertidao.has(k))ultimaCertidao.set(k,x);});
    ultimaCertidao.forEach(x=>{
      const n=diasAte(x.validade);if(n==null||n>30)return;
      const acoes=office?[{txt:'Publicar nova',tipo:'primario',off:consulta,onClick:()=>modalUpload({categoria:'Certidões',titulo:x.titulo,empresa_id:x.empresa_id})},{txt:'Ver atual',tipo:'link',onClick:()=>previewCertidao(x)}]
        :[{txt:'Ver',tipo:'ghost',onClick:()=>previewCertidao(x)},{txt:'Pedir nova',tipo:'link',off:consulta,onClick:()=>modalNovaSolicitacao({assunto:'Certidão: '+x.titulo,corpo:`A certidão "${x.titulo}" ${n<0?'venceu':'vence'} em ${fmtDate(isoData(x.validade))}. Solicito a emissão de uma nova.`,onCreated:recarregar})}];
      itens.push({tom:n<0?'danger':'warn',ico:'arq-pdf',titulo:x.titulo,sub:(showEmp?(x.empresa||'')+' · ':'')+'Válida até '+fmtDate(isoData(x.validade))+(office?'':' · o escritório renova as certidões'),chip:[n<0?'danger':'warn',docValidade(x)[1],n<0?'alerta':'relogio'],acoes});
    });
    if(FILTRO_EMPRESA){
      docsEssenciais().filter(i=>!['Certificado digital','Faturamento'].includes(i.categoria)).forEach(i=>{
        const tem=publicados.some(x=>i.categoria==='IRPF'?String(x.categoria).startsWith('IRPF'):x.categoria===i.categoria);if(tem)return;
        itens.push({tom:'',ico:'relogio',titulo:i.titulo,sub:office?'Ainda não publicado para esta empresa':'O escritório ainda não publicou este documento',chip:['','Aguardando publicação','relogio'],
          acoes:[office?{txt:'Publicar',tipo:'ghost',off:consulta,onClick:()=>modalUpload({categoria:i.categoria})}:{txt:'Pedir ao escritório',tipo:'ghost',off:consulta,onClick:()=>modalNovaSolicitacao({assunto:'Documento: '+i.titulo,corpo:'Solicito a disponibilização de: '+i.titulo+'.',onCreated:recarregar})}]});
      });
    }
    return itens.sort((a,b)=>(TOM_ORDEM[a.tom]??3)-(TOM_ORDEM[b.tom]??3));
  }
  // Emitir cartão CNPJ (escritório): copia o CNPJ e abre a Receita.
  function linkEmitirCnpj(empresa){
    const wrap=el('<span class="dv2-cnpj"><a class="link-btn" href="https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_S.aspx" target="_blank" rel="noopener noreferrer">Emitir cartão CNPJ na Receita ↗</a><small role="status" aria-live="polite"></small></span>');
    const st=wrap.querySelector('small');
    wrap.querySelector('a').addEventListener('click',()=>{
      const cnpj=String(empresa?.cnpj||'').replace(/\D/g,'');
      if(cnpj.length!==14){st.textContent='CNPJ incompleto: confira o cadastro da empresa.';return;}
      const fallback=()=>{const f=document.createElement('textarea');f.value=cnpj;f.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(f);f.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}f.remove();return ok;};
      const msg=ok=>{st.textContent=ok?'CNPJ copiado. Cole no campo da Receita.':'Copie o CNPJ: '+cnpj;};
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(cnpj).then(()=>msg(true)).catch(()=>msg(fallback()));else msg(fallback());
    });
    return wrap;
  }
  function linhaDocumento(doc,showEmp){
    const [ico]=tipoArquivo(doc.nome_arquivo),cliente=doc.origem==='cliente';
    const origem=cliente?(isOffice()?'Enviado pelo cliente':'Enviado por você'):'Publicado pelo escritório';
    const val=docValidade(doc),chips=[];
    if(val)chips.push(chipHtml(val[0],val[0]==='ok'?'check':val[0]==='warn'?'relogio':'alerta',val[1]));
    if(cliente)chips.push(doc.conferido_em?chipHtml('ok','check','Conferido em '+fmtDate(doc.conferido_em)):chipHtml('info','relogio','Aguardando conferência'));
    const li=el(`<li class="dv2-doc"><i class="dv2-fico t-${ico}" aria-hidden="true">${icone(ico)}</i><div class="dv2-main"><b>${esc(doc.titulo)}</b><small>${showEmp?esc(doc.empresa||'')+' · ':''}${esc(doc.categoria)}${doc.competencia?' · Competência '+esc(periodoLabel(doc.competencia)):''}</small><small>${origem} em ${fmtDate(doc.criado_em)} · ${esc(doc.nome_arquivo)} · ${fmtSize(doc.tamanho)}</small>${chips.length?`<span class="dv2-chips">${chips.join('')}</span>`:''}</div><span class="dv2-acts"></span></li>`);
    const box=li.querySelector('.dv2-acts');
    if(docPrevisualizavel(doc)){addAcao(box,{txt:'Ver',tipo:'primario',onClick:()=>previewCertidao(doc)});addAcao(box,{txt:'Baixar',tipo:'link',href:docDownload(doc)});}
    else addAcao(box,{txt:'Baixar',tipo:'primario',href:docDownload(doc)});
    if(isOffice()&&cliente&&!doc.conferido_em)addAcao(box,{txt:'Marcar conferido',tipo:'ghost',off:ME.funcao==='consulta',onClick:async e=>{const b=e.currentTarget;b.disabled=true;try{await jpost('/api/documentos/conferir',{id:doc.id});viewDocumentos();}catch(err){b.disabled=false;alert(err.message);}}});
    box.querySelectorAll('a,button').forEach(b=>b.setAttribute('aria-label',b.textContent+': '+doc.titulo));
    return li;
  }
  async function viewDocumentos() {
    setTitle("Documentos", isOffice() ? "Arquivos trocados com os clientes" : "O que falta enviar e tudo o que já está aqui");
    acoesContexto();
    const consulta=ME.funcao==='consulta';
    if (canScope()) {
      const btn = el(`<button class="btn">Enviar documento</button>`);
      if(consulta)btn.disabled=true;
      btn.addEventListener("click", ()=>modalUpload());
      topActions().appendChild(btn);
    }
    const c = content(); c.innerHTML = "<div class='empty'>Carregando…</div>";
    const company=FILTRO_EMPRESA;
    let d,digital=null,sols=[];
    try {
      [d,digital,sols]=await Promise.all([
        api("/api/documentos" + empParam()),
        FILTRO_EMPRESA?pegar('/api/certificado-digital'+empParam()).then(r=>r?.certificado||null):null,
        FILTRO_EMPRESA?pegar('/api/solicitacoes'+empParam()).then(r=>r?.solicitacoes||[]):[],
      ]);
    } catch (e) { c.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return; }
    if(VIEW!=='documentos'||company!==FILTRO_EMPRESA)return;
    c.innerHTML = "";
    const bar = officeFilterBar(); if (bar) c.appendChild(bar);
    const docs=d.documentos||[],office=isOffice(),showEmp=office&&!FILTRO_EMPRESA;
    const empresa=EMPRESAS.find(e=>String(e.id)===String(FILTRO_EMPRESA));

    // 1) Situação
    const itens=checklistDocumentos(docs,digital,sols||[],empresa);
    const urg=itens.filter(i=>i.tom==='danger').length,pend=itens.filter(i=>i.tom==='danger'||i.tom==='warn').length,conferir=itens.filter(i=>i.tom==='info').length;
    const tom=urg?'danger':pend?'warn':conferir?'info':'ok';
    const recentes=docs.filter(x=>x.origem==='escritorio'&&diasAte(x.criado_em)!=null&&diasAte(x.criado_em)>=-30).length;
    const titulo=pend?`${pend} ite${pend===1?'m pede':'ns pedem'} ${office?'ação':'sua atenção'}`:conferir?`${conferir} envio${conferir===1?'':'s'} para conferir`:'Tudo em dia por aqui';
    c.appendChild(el(`<section class="obr-hero dv2 ${tom}"><span class="obr-hero-ico" aria-hidden="true">${icone(tom==='ok'?'check':tom==='info'?'relogio':'alerta')}</span><div><h3>${esc(titulo)}</h3><p>${plural(docs.length,'documento','documentos')} na biblioteca · ${plural(recentes,'publicado','publicados')} pelo escritório nos últimos 30 dias</p></div></section>`));

    // 2) Checklist
    const ck=el(`<section class="hcard dv2 dv2-checklist"><header><h3>${office?(showEmp?'Pendências dos clientes':'Pendências desta empresa'):'O que falta e o que vence'}</h3><span class="count">${plural(itens.length,'item','itens')}</span></header><ul class="act-list"></ul></section>`);
    const ul=ck.querySelector('ul');
    if(!itens.length)ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">${icone('check')}</span><div><b>Nada pendente</b><small>${office?'Nenhum envio aguardando conferência.':'Quando o escritório pedir um documento, ele aparece aqui.'}</small></div></li>`));
    itens.forEach(i=>ul.appendChild(linhaCheck(i)));
    c.appendChild(ck);

    // 3) Biblioteca
    const lib=el(`<section class="hcard dv2 dv2-lib" id="docLib"><header><h3>Biblioteca</h3><span class="count"></span></header><div class="notas-filtros"><div class="chip-filter" role="group" aria-label="Filtrar por categoria"></div><input type="search" aria-label="Buscar documento" placeholder="Buscar por nome, categoria ou competência"></div><p class="essential-note dv2-lib-note" hidden></p><ul class="dv2-list"></ul><div class="dv2-more"></div></section>`);
    if(office&&FILTRO_EMPRESA)lib.querySelector('header').insertBefore(linkEmitirCnpj(empresa),lib.querySelector('.count'));
    const chips=lib.querySelector('.chip-filter'),list=lib.querySelector('.dv2-list'),busca=lib.querySelector('input'),more=lib.querySelector('.dv2-more'),nota=lib.querySelector('.dv2-lib-note');
    const cont=k=>k==='todos'?docs.length:docs.filter(x=>docFamilia(x)===k).length;
    const filtros=[['todos','Todos'],['enviados',office?'Enviados pelo cliente':'Enviados por você'],...DOC_FAMILIAS.map(f=>[f[0],f[1]]),['outros','Outros']];
    if(!filtros.some(f=>f[0]===docFiltroAtual())||(docFiltroAtual()!=='todos'&&!cont(docFiltroAtual())))DOCUMENT_CATEGORY='';
    filtros.filter(([k])=>k==='todos'||cont(k)).forEach(([k,l])=>{const b=el(`<button class="pill" data-k="${k}">${esc(l)} <span class="n">${cont(k)}</span></button>`);b.onclick=()=>{DOCUMENT_CATEGORY=k==='todos'?'':k;DOC_LIMITE=30;desenhar();};chips.appendChild(b);});
    busca.value=DOC_BUSCA;busca.oninput=()=>{DOC_BUSCA=busca.value;DOC_LIMITE=30;desenhar();};
    function desenhar(){
      const f=docFiltroAtual(),q=DOC_BUSCA.trim().toLowerCase();
      chips.querySelectorAll('.pill').forEach(b=>{const on=b.dataset.k===f;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
      let vis=docs.filter(x=>f==='todos'||docFamilia(x)===f).filter(x=>!q||[x.titulo,x.nome_arquivo,x.categoria,x.competencia,periodoLabel(x.competencia),x.empresa].some(v=>String(v||'').toLowerCase().includes(q)));
      vis=f==='contrato'||f==='irpf'?vis.sort((a,b)=>String(a.nome_arquivo).localeCompare(String(b.nome_arquivo),'pt-BR',{numeric:true})):vis.sort((a,b)=>String(b.criado_em).localeCompare(String(a.criado_em))||b.id-a.id);
      nota.hidden=f!=='contrato';nota.textContent='Nomes originais preservados. A data é a da importação no portal, não a ordem das alterações.';
      lib.querySelector('.count').textContent=vis.length===docs.length?plural(docs.length,'documento','documentos'):vis.length+' de '+docs.length;
      list.innerHTML='';more.innerHTML='';
      if(!vis.length){list.appendChild(el(`<li class="act-ok"><span aria-hidden="true">${icone('check')}</span><div><b>${docs.length?'Nenhum documento para este filtro':'Nenhum documento ainda'}</b><small>${docs.length?'Limpe a busca ou escolha “Todos”.':'Use “Enviar documento” para mandar o primeiro arquivo.'}</small></div></li>`));return;}
      vis.slice(0,DOC_LIMITE).forEach(x=>list.appendChild(linhaDocumento(x,showEmp)));
      if(vis.length>DOC_LIMITE){const b=el(`<button class="btn ghost sm">Mostrar mais ${Math.min(30,vis.length-DOC_LIMITE)} de ${vis.length-DOC_LIMITE}</button>`);b.onclick=()=>{DOC_LIMITE+=30;desenhar();};more.appendChild(b);}
    }
    desenhar();
    c.appendChild(lib);
    if(DOCUMENT_CATEGORY&&docFiltroAtual()!=='todos')lib.scrollIntoView({block:'start'});
  }

  // cliente sempre pode enviar; escritório precisa de empresa selecionada
  function canScope() { return !isOffice() || !!FILTRO_EMPRESA; }

  // modalUpload("Categoria") ou modalUpload({categoria, titulo, competencia, empresa_id})
  function modalUpload(arg) {
    const o = typeof arg === "string" ? { categoria: arg } : (arg && typeof arg === "object" && !(arg instanceof Event) ? arg : {});
    const categoriaInicial = o.categoria;
    const empAlvo = o.empresa_id != null ? String(o.empresa_id) : String(FILTRO_EMPRESA);
    const opcoes = docsEssenciais().map(item => item.categoria).concat(["Geral", "Guias", "Notas fiscais", "Folha", "Contratos", "Balancetes"]);
    if (categoriaInicial && !opcoes.includes(categoriaInicial)) opcoes.push(categoriaInicial);
    const empSel = isOffice()
      ? `<div class="field"><label>Empresa</label><select name="empresa_id" required>${
          EMPRESAS.map((e) => `<option value="${e.id}" ${String(e.id) === empAlvo ? "selected" : ""}>${esc(e.nome)}</option>`).join("")
        }</select></div>` : "";
    openModal("Enviar documento", `
      ${empSel}
      <div class="field"><label>Título</label><input name="titulo" placeholder="Ex.: Extrato bancário de outubro" value="${esc(o.titulo || "")}"></div>
      <div class="row">
        <div class="field"><label>Categoria</label>
          <select name="categoria">
            ${opcoes.map(cat => `<option ${cat === categoriaInicial ? "selected" : ""}>${esc(cat)}</option>`).join("")}
          </select></div>
        <div class="field"><label>Competência</label><input name="competencia" placeholder="AAAA-MM" value="${esc(o.competencia || new Date().toISOString().slice(0,7))}"></div>
      </div>
      ${isOffice() ? `<div class="field"><label>Vencimento (para guias)</label><input name="vencimento" type="date"></div>` : ""}
      <div class="field" id="cnpjConsulta" ${categoriaInicial === 'CNPJ' && isOffice() ? '' : 'hidden'}><label>Data e hora da consulta na Receita</label><input name="consultado_em" type="datetime-local"><small>Após emitir na Receita, salve o comprovante como PDF e anexe abaixo.</small></div>
      <div class="field"><label>Arquivo</label><input type="file" name="arquivo" required></div>
    `, async (form, close, setErr) => {
      const fd = new FormData();
      fd.append("empresa_id", isOffice() ? form.empresa_id.value : FILTRO_EMPRESA);
      fd.append("titulo", form.titulo.value);
      fd.append("categoria", form.categoria.value);
      if(isOffice() && form.categoria.value === 'CNPJ') {
        if(!form.consultado_em.value)return setErr('Informe a data e hora da consulta oficial.');
        fd.append('consultado_em',new Date(form.consultado_em.value).toISOString());
      }
      fd.append("competencia", form.competencia.value);
      if(isOffice())fd.append("vencimento",form.vencimento.value);
      if (!form.arquivo.files.length) return setErr("Selecione um arquivo.");
      fd.append("arquivo", form.arquivo.files[0]);
      try {
        await api("/api/documentos", { method: "POST", body: fd });
        close(); VIEW = "documentos"; renderApp();
      } catch (e) { setErr(e.message); }
    }, { okLabel: "Enviar" });
    const uploadModal=modalRoot.lastElementChild;
    uploadModal.querySelector('[name=categoria]').addEventListener('change',e=>{uploadModal.querySelector('#cnpjConsulta').hidden=!(isOffice() && e.target.value==='CNPJ');});
  }

  // ---------- Obrigações / status fiscal ----------
  async function painelEquipeEmpresa(c,company){
    if(!company)return;
    const sec=el('<section class="panel"><div class="panel-head"><div><h3>Sua equipe responsável</h3><p>Responsáveis cadastrados no portal interno por departamento</p></div></div><div class="panel-body" style="padding:20px"><div class="essential-grid team-cards"></div><p class="team-status essential-note"></p></div></section>');c.appendChild(sec);
    try{const d=await api('/api/equipe-empresa?empresa_id='+encodeURIComponent(company));if(company!==FILTRO_EMPRESA)return;
      const rows=d.responsaveis.filter(r=>['FEDERAL','FISCAL','CONTÁBIL','PESSOAL','Atendimento'].includes(r.departamento));
      for(const dep of ['FEDERAL','FISCAL','CONTÁBIL','PESSOAL','Atendimento']){const people=rows.filter(r=>r.departamento===dep);sec.querySelector('.team-cards').appendChild(el(`<article class="essential-card"><small>${esc(dep)}</small><h3>${people.length?people.map(r=>esc(r.nome)).join('<br>'):'Responsável não informado'}</h3><small>${people.length?'Atualizado em '+fmtDateTime(people[0].sincronizado):'Vínculo pendente no portal interno'}</small></article>`));}
      if(!LANCAMENTO.ativo) sec.querySelector('.team-status').textContent='Mensagens pelo chat: integração adiada, aguardando API/projeto do chat atual.';
      else sec.querySelector('.team-status').hidden=true;
    }catch(e){sec.querySelector('.team-status').textContent=e.message;}
  }
  async function painelDeclaracoesFiscais(c,company){
    if(LANCAMENTO.ativo)return;
    const sec=el('<section class="panel"><div class="panel-head"><div><h3>MIT e DCTFWeb</h3><p>Consultar dados já declarados na Receita Federal</p></div></div><div class="panel-body" style="padding:20px"><label>Competência <select aria-label="Competência MIT e DCTFWeb"></select></label> <button class="btn ghost consultar-declaracao">Consultar MIT</button> <button class="btn ghost consultar-declaracao">Consultar DCTFWeb</button><p class="declaration-status" role="status"></p><div class="declaration-items"></div></div></section>');c.appendChild(sec);
    try{let d=await api('/api/central-fiscal?empresa_id='+encodeURIComponent(company));if(company!==FILTRO_EMPRESA)return;const sel=sec.querySelector('select');[...d.competencias].reverse().forEach(p=>{const o=document.createElement('option');o.value=p;o.textContent=p.slice(4)+'/'+p.slice(0,4);sel.appendChild(o);});
      function show(){const target=sec.querySelector('.declaration-items');target.innerHTML='';for(const module of ['mit','dctfweb']){const r=d.consultas.find(r=>r.modulo===module&&r.periodo===sel.value);const box=el(`<article style="padding:16px 0;border-top:1px solid #e2e8f0"><h4>${module==='mit'?'MIT':'DCTFWeb'}</h4><p>${esc(r?r.dados.mensagem||'Retorno disponível; consulte o documento.':'Ainda não consultado nesta competência.')}</p>${r?'<small>Data da consulta: '+fmtDateTime(r.consultado)+'</small>':''}</article>`);target.appendChild(box);if(!r)continue;
        const doc=d.documentos.find(x=>x.tipo===module&&x.referencia===r.periodo);const url=doc?'/api/central-fiscal/pdf?empresa_id='+encodeURIComponent(company)+'&id='+doc.id:'/api/central-fiscal/consulta-pdf?empresa_id='+encodeURIComponent(company)+'&modulo='+module+'&periodo='+r.periodo;
        box.appendChild(el('<p>'+ (doc?'PDF oficial disponível.':module==='mit'?'Apurações retornadas: '+(r.dados.apuracoes?.length??0)+'. Retorno vazio não confirma ausência de tributos.':'PDF oficial indisponível nesta consulta.')+'</p>'));const b=el('<button class="btn ghost sm">Pré-visualizar '+(doc?'PDF oficial':'retorno em PDF')+'</button>');b.onclick=()=>previewCertidao({titulo:module.toUpperCase(),nome_arquivo:doc?'Documento oficial':'Relatório da consulta',previewUrl:url,downloadUrl:url+'&download=1'});box.appendChild(b);}}
      sel.onchange=show;show();sec.querySelectorAll('.consultar-declaracao').forEach((b,i)=>{b.disabled=ME.funcao==='consulta';b.onclick=async()=>{const controls=sec.querySelectorAll('.consultar-declaracao');controls.forEach(b=>b.disabled=true);sec.querySelector('.declaration-status').textContent='Consultando fonte oficial…';try{await jpost('/api/central-fiscal/consultar',{empresa_id:company,modulo:i===0?'mit':'dctfweb',periodo:sel.value});d=await api('/api/central-fiscal?empresa_id='+encodeURIComponent(company));show();sec.querySelector('.declaration-status').textContent='Retorno recebido.';}catch(e){sec.querySelector('.declaration-status').textContent=e.message;}finally{sec.querySelectorAll('.consultar-declaracao').forEach(b=>b.disabled=ME.funcao==='consulta');}};});
    }catch(e){sec.querySelector('.declaration-status').textContent=e.message;}
  }
  async function painelRelatoriosFiscais(c,company){
    const section=el('<section class="panel"><div class="panel-head"><div><h3>Relatórios fiscais e débitos</h3><p>Documentos sincronizados do portal interno</p></div></div><div class="panel-body" style="padding:24px"><div class="fiscal-reports"></div></div></section>');c.appendChild(section);const body=section.querySelector('.fiscal-reports');
    try{const d=await api('/api/relatorios-fiscais?empresa_id='+encodeURIComponent(company));if(company!==FILTRO_EMPRESA)return;
      body.appendChild(el('<p class="essential-note">'+esc(d.nota)+'</p>'));
      if(!d.relatorios.length){body.appendChild(el('<p>Nenhum relatório fiscal disponível para esta empresa. A ausência de relatório não indica ausência de débitos.</p>'));return;}
      const seen=new Set();d.relatorios.forEach(r=>{const previous=!r.atual||seen.has(r.tipo);seen.add(r.tipo);const row=el(`<article style="padding:18px 0;border-top:1px solid #e2e8f0"><h4>${esc(r.titulo)} ${previous?'<span class="badge muted">Histórico</span>':''}</h4><p>${r.tipo==='oficial'?'Documento oficial da Receita Federal / SITFIS. Consulte os débitos, omissões e demais apontamentos no PDF.':'Leitura gerencial preparada pelo escritório para facilitar a análise das pendências.'}</p><small>Relatório oficial anexado no interno: ${esc(r.data_origem||'data não informada; confira o PDF')}<br>Última sincronização: ${fmtDateTime(r.sincronizado)}<br>CNPJ de origem / matriz: ${esc(r.matriz)}</small><p><button class="btn ghost sm">Pré-visualizar PDF</button> <a class="btn ghost sm" href="/api/download?id=${r.documento_id}">Baixar relatório</a></p></article>`);row.querySelector('button').onclick=()=>previewCertidao({id:r.documento_id,titulo:r.titulo,nome_arquivo:r.nome_arquivo});body.appendChild(row);});
    }catch(e){body.appendChild(el('<p class="alert err">'+esc(e.message)+'</p>'));}
  }
  // ---------- Status fiscal v2: situação primeiro, filtros por status ----------
  const OBR_ORDEM = { atrasada: 0, pendente: 1, em_andamento: 2, concluida: 3 };
  const OBR_ICO = { atrasada: "!", pendente: "○", em_andamento: "◐", concluida: "✓" };
  const OBR_TOM = { atrasada: "danger", pendente: "warn", em_andamento: "info", concluida: "ok" };
  let OBR_FILTRO = "abertas";
  async function viewObrigacoes() {
    setTitle("Status fiscal", "Obrigações acompanhadas pelo escritório");
    topActions().innerHTML = "";
    if (isOffice() && FILTRO_EMPRESA) {
      const btn = el(`<button class="btn">＋ Nova obrigação</button>`);
      btn.addEventListener("click", () => modalObrigacao(null));
      topActions().appendChild(btn);
    }
    const c = content(); c.innerHTML = "<div class='empty'>Carregando…</div>";
    try {
      const d = await api("/api/obrigacoes" + empParam());
      c.innerHTML = "";
      const lista = d.obrigacoes.slice();
      const cont = s => lista.filter(o => o.status === s).length;
      const atras = cont("atrasada"), pend = cont("pendente"), and = cont("em_andamento"), conc = cont("concluida");
      const tom = atras ? "danger" : pend ? "warn" : "ok";
      c.appendChild(el(`<section class="obr-hero ${tom}"><span class="obr-hero-ico" aria-hidden="true">${atras ? "!" : pend ? "○" : "✓"}</span><div><h3>${atras ? `${atras} obrigaç${atras === 1 ? "ão atrasada" : "ões atrasadas"}` : pend ? `${pend} pendente${pend === 1 ? "" : "s"}, nenhuma atrasada` : "Tudo em dia"}</h3><p>${and} em andamento com o escritório · ${conc} concluída${conc === 1 ? "" : "s"}</p></div></section>`));

      const filtros = [["abertas", "Em aberto", atras + pend + and], ["atrasada", "Atrasadas", atras], ["pendente", "Pendentes", pend], ["em_andamento", "Em andamento", and], ["concluida", "Concluídas", conc], ["todas", "Todas", lista.length]];
      const fbar = el(`<div class="chip-filter" role="group" aria-label="Filtrar por situação"></div>`);
      filtros.forEach(([k, label, n]) => { const b = el(`<button class="pill ${OBR_FILTRO === k ? "active" : ""}" aria-pressed="${OBR_FILTRO === k}">${label} <span class="n">${n}</span></button>`); b.onclick = () => { OBR_FILTRO = k; viewObrigacoes(); }; fbar.appendChild(b); });
      c.appendChild(fbar);

      const vis = lista.filter(o => OBR_FILTRO === "todas" ? true : OBR_FILTRO === "abertas" ? o.status !== "concluida" : o.status === OBR_FILTRO)
        .sort((a, b) => (OBR_ORDEM[a.status] ?? 9) - (OBR_ORDEM[b.status] ?? 9) || (isoData(a.vencimento) || "9").localeCompare(isoData(b.vencimento) || "9"));
      const showEmp = isOffice() && !FILTRO_EMPRESA, canEdit = isOffice() && FILTRO_EMPRESA;
      const box = el(`<section class="hcard obr-list"><ul></ul></section>`);
      const ul = box.querySelector("ul");
      if (!vis.length) ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">✓</span><div><b>Nada por aqui</b><small>${lista.length ? "Nenhuma obrigação nesta situação." : "Nenhuma obrigação cadastrada."}</small></div></li>`));
      vis.forEach(o => {
        const [txt] = STATUS_OBR[o.status] || [o.status];
        const t = OBR_TOM[o.status] || "";
        const n = o.vencimento ? diasAte(o.vencimento) : null;
        const prazo = o.vencimento ? `${fmtDate(o.vencimento)}${o.status !== "concluida" && n != null ? " · " + quando(o.vencimento) : ""}` : "Sem vencimento";
        const li = el(`<li class="obr-row ${t}">
          <span class="status-chip ${t}"><span aria-hidden="true">${OBR_ICO[o.status] || "•"}</span> ${esc(txt)}</span>
          <div class="obr-main"><b>${esc(o.titulo)}</b><small>${showEmp ? esc(o.empresa || "") + " · " : ""}Competência ${esc(periodoLabel(o.competencia))}${o.observacao ? " · " + esc(o.observacao) : ""}</small></div>
          <span class="obr-prazo ${o.status === "atrasada" ? "txt-danger" : ""}">${esc(prazo)}</span>
          <span class="obr-act"></span>
        </li>`);
        const act = li.querySelector(".obr-act");
        if (canEdit) { const b = el(`<button class="btn sm ghost">Editar</button>`); b.onclick = () => modalObrigacao(o); act.appendChild(b); }
        else if (!isOffice() && (o.status === "atrasada" || o.status === "pendente")) { const b = el(`<button class="btn sm ghost">Perguntar</button>`); b.onclick = () => modalNovaSolicitacao({ assunto: "Dúvida: " + o.titulo, corpo: `Gostaria de entender a situação de "${o.titulo}" (competência ${periodoLabel(o.competencia)}).`, onCreated: () => viewObrigacoes() }); act.appendChild(b); }
        ul.appendChild(li);
      });
      c.appendChild(box);
      if (FILTRO_EMPRESA) {
        const extra = el(`<div class="obr-extra"><h3 class="sec-title">Relatórios e declarações</h3></div>`);
        c.appendChild(extra);
        await painelEquipeEmpresa(extra, FILTRO_EMPRESA); await painelRelatoriosFiscais(extra, FILTRO_EMPRESA); await painelDeclaracoesFiscais(extra, FILTRO_EMPRESA);
        if (extra.children.length === 1) extra.remove();
      }
    } catch (e) { c.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  }

  function modalObrigacao(o) {
    const st = (v) => (o && o.status === v ? "selected" : "");
    openModal(o ? "Editar obrigação" : "Nova obrigação", `
      <div class="field"><label>Título</label><input name="titulo" value="${o ? esc(o.titulo) : ""}" placeholder="Ex.: Apuração DAS"></div>
      <div class="row">
        <div class="field"><label>Competência</label><input name="competencia" value="${o ? esc(o.competencia) : new Date().toISOString().slice(0,7)}"></div>
        <div class="field"><label>Vencimento</label><input type="date" name="vencimento" value="${o && o.vencimento ? esc(o.vencimento) : ""}"></div>
      </div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="pendente" ${st("pendente")}>Pendente</option>
          <option value="em_andamento" ${st("em_andamento")}>Em andamento</option>
          <option value="concluida" ${st("concluida")}>Concluída</option>
          <option value="atrasada" ${st("atrasada")}>Atrasada</option>
        </select></div>
      <div class="field"><label>Observação</label><textarea name="observacao">${o ? esc(o.observacao || "") : ""}</textarea></div>
    `, async (form, close, setErr) => {
      try {
        await jpost("/api/obrigacoes", {
          id: o ? o.id : null, empresa_id: FILTRO_EMPRESA,
          titulo: form.titulo.value, competencia: form.competencia.value,
          vencimento: form.vencimento.value, status: form.status.value, observacao: form.observacao.value,
        });
        close(); viewObrigacoes();
      } catch (e) { setErr(e.message); }
    });
  }

  // ---------- Solicitações v2: lista + conversa em painel lateral (Intercom / Linear) ----------
  // O cliente vê 4 estados (Enviada · Em atendimento · Aguardando você · Concluída).
  // O escritório continua com os estados da API (aberta/respondida/fechada) e ganha a fila de triagem ("Novas").
  const SOL_FECHADAS = ["fechada", "concluida", "resolvida", "cancelada"];
  const SOL_AGUARDANDO = ["respondida", "aguardando_cliente", "pendente_cliente"];
  const SOL_ESTADO = {
    enviada: { txt: "Enviada", tom: "", ico: "enviar" },
    atendimento: { txt: "Em atendimento", tom: "info", ico: "relogio" },
    aguardando: { txt: "Aguardando você", tom: "warn", ico: "alerta" },
    concluida: { txt: "Concluída", tom: "", ico: "check" },
  };
  const SOL_FILA = {
    nova: { txt: "Nova", tom: "warn", ico: "alerta" },
    atendimento: { txt: "Em atendimento", tom: "info", ico: "relogio" },
    aguardando: { txt: "Aguardando cliente", tom: "", ico: "relogio" },
    concluida: { txt: "Concluída", tom: "", ico: "check" },
  };
  const SOL_PRIO = { alta: 0, normal: 1, baixa: 2 };
  const solTemEscritorio = s => (s.mensagens || []).some(m => m.autor_perfil === "escritorio");
  function solEstado(s) { // visão do cliente
    const st = String(s.status || "");
    if (SOL_FECHADAS.includes(st)) return "concluida";
    if (SOL_AGUARDANDO.includes(st)) return "aguardando";
    if (st === "aberta" && !s.responsavel && !solTemEscritorio(s)) return "enviada";
    return "atendimento";
  }
  function solFila(s) { // visão do escritório
    const st = String(s.status || "");
    if (SOL_FECHADAS.includes(st)) return "concluida";
    if (SOL_AGUARDANDO.includes(st)) return "aguardando";
    return s.responsavel ? "atendimento" : "nova";
  }
  const solInfo = s => isOffice() ? SOL_FILA[solFila(s)] : SOL_ESTADO[solEstado(s)];
  const solChip = s => { const e = solInfo(s); return chipHtml(e.tom, e.ico, e.txt); };
  function solHora(iso) {
    if (!iso) return "";
    const d = new Date(iso); if (isNaN(d)) return "";
    const hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return "ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  const solMobile = () => window.matchMedia && window.matchMedia("(max-width: 860px)").matches;
  const solUrl = s => isOffice() && s && s.empresa_id != null ? "/api/solicitacoes?empresa_id=" + encodeURIComponent(s.empresa_id) : "/api/solicitacoes" + empParam();
  let SOL_FILTRO = "", SOL_BUSCA = "", SOL_SEL = null, SOL_EMP = null;
  const SOL_RASCUNHO = {};

  // Conversa de uma solicitação (usada no painel lateral e na janela modalSolicitacao)
  function threadSolicitacao(s, { onMudou, onVoltar } = {}) {
    const office = isOffice(), consulta = ME.funcao === "consulta";
    const fechada = SOL_FECHADAS.includes(String(s.status || ""));
    const showEmp = office && s.empresa;
    const n = s.prazo ? diasAte(s.prazo) : null;
    const prazoTxt = s.prazo ? `${fmtDate(s.prazo)}${!fechada && n != null ? " · " + quando(s.prazo) : ""}` : "A definir";
    const [stInterno] = STATUS_SOL[s.status] || [s.status];
    const prio = s.prioridade === "alta" ? chipHtml("danger", "alerta", "Prioridade alta") : office && s.prioridade === "baixa" ? chipHtml("", "menos", "Prioridade baixa") : "";
    const box = el(`<div class="sol2-th">
      <header class="sol2-th-head">
        ${onVoltar ? `<button type="button" class="btn ghost sm sol2-voltar" aria-label="Voltar para a lista">‹ Voltar</button>` : ""}
        <div class="sol2-th-tit"><h3>${esc(s.assunto || "Sem assunto")}</h3><small>${esc(s.protocolo || "")}${showEmp ? " · " + esc(s.empresa) : ""} · aberta em ${fmtDateTime(s.criada_em)}</small></div>
        <div class="sol2-th-chips">${solChip(s)}${prio}</div>
      </header>
      <dl class="sol2-meta">
        <div><dt>Responsável</dt><dd>${esc(s.responsavel || (office ? "Sem responsável" : "A definir"))}</dd></div>
        <div><dt>Prazo</dt><dd class="${!fechada && n != null && n < 0 ? "txt-danger" : ""}">${esc(prazoTxt)}</dd></div>
        ${office ? `<div><dt>Status interno</dt><dd>${esc(stInterno)}</dd></div>` : ""}
        ${office ? `<div class="sol2-meta-acts"></div>` : ""}
      </dl>
      <ol class="sol2-msgs" aria-label="Mensagens"></ol>
      <div class="sol2-foot"></div>
    </div>`);
    const ol = box.querySelector(".sol2-msgs");
    (s.mensagens || []).forEach(m => {
      const eu = office ? m.autor_perfil === "escritorio" : m.autor_perfil !== "escritorio";
      ol.appendChild(el(`<li class="sol2-msg ${eu ? "eu" : "outro"} ${m.autor_perfil === "escritorio" ? "esc" : "cli"}"><div class="sol2-bolha"><span class="sol2-quem">${esc(m.autor_nome || "")} · ${m.autor_perfil === "escritorio" ? "Escritório" : "Cliente"}</span><p>${esc(m.corpo).replace(/\n/g, "<br>")}</p><time datetime="${esc(m.criada_em || "")}">${fmtDateTime(m.criada_em)}</time></div></li>`));
    });
    if (!ol.children.length) ol.appendChild(el(`<li class="muted small">Nenhuma mensagem ainda.</li>`));
    const voltar = box.querySelector(".sol2-voltar"); if (voltar) voltar.onclick = onVoltar;
    const mudou = async () => { invalidarContadores(); if (onMudou) await onMudou(s.id); };

    // Escritório: triagem (assumir, responsável e prazo)
    const mActs = box.querySelector(".sol2-meta-acts");
    if (mActs) {
      if (!s.responsavel && !fechada) {
        const a = addAcao(mActs, { txt: "Assumir", tipo: "ghost", off: consulta, title: consulta ? "Perfil somente consulta" : "Definir você como responsável" });
        a.onclick = async () => { a.disabled = true; try { await jpost("/api/solicitacoes/atribuicao", { id: s.id, responsavel: ME.nome, prazo: s.prazo || "" }); await mudou(); } catch (e) { a.disabled = false; erro(e.message); } };
      }
      const at = addAcao(mActs, { txt: "Definir responsável e prazo", tipo: "link", off: consulta });
      at.onclick = () => openModal("Responsável e prazo", `<div class="field"><label>Responsável</label><input name="responsavel" value="${esc(s.responsavel || "")}"></div><div class="field"><label>Prazo</label><input type="date" name="prazo" value="${esc(s.prazo || "")}"></div>`,
        async (form, close, setErr) => { try { await jpost("/api/solicitacoes/atribuicao", { id: s.id, responsavel: form.responsavel.value, prazo: form.prazo.value }); close(); await mudou(); } catch (e) { setErr(e.message); } });
    }

    const foot = box.querySelector(".sol2-foot");
    function erro(msg) { let p = foot.querySelector(".sol2-err"); if (!p) { p = el(`<p class="sol2-err txt-danger small" role="alert"></p>`); foot.prepend(p); } p.textContent = msg; }
    if (fechada) {
      foot.appendChild(el(`<div class="sol2-fim"><span aria-hidden="true">${icone("check")}</span><div><b>Solicitação concluída</b><small>${office ? "O cliente pode abrir uma nova solicitação se precisar." : "Precisa de mais alguma coisa? Abra uma nova solicitação."}</small></div></div>`));
      if (!office && canScope()) { const b = addAcao(foot.querySelector(".sol2-fim"), { txt: "Nova solicitação", tipo: "ghost", off: consulta }); b.onclick = () => modalNovaSolicitacao({ assunto: "Continuação: " + (s.assunto || ""), corpo: `Referente à solicitação ${s.protocolo || ""}: ` }); }
    } else {
      const dica = !office && solEstado(s) === "aguardando" ? `<p class="sol2-dica">${icone("alerta", "ico-svg ico-xs")} O escritório respondeu. Responda aqui ou marque como resolvida.</p>` : "";
      const f = el(`<form class="sol2-resp">${dica}<textarea name="corpo" rows="3" placeholder="${office ? "Responder ao cliente…" : "Escreva sua resposta…"}" aria-label="Responder"></textarea>
        <div class="sol2-resp-acts"><small class="muted sol2-atalho">Ctrl + Enter envia</small><button type="button" class="btn ghost sm sol2-resolver">${icone("check", "ico-svg ico-xs")} Marcar como resolvida</button><button type="submit" class="btn sm">${icone("enviar", "ico-svg ico-xs")} Enviar</button></div></form>`);
      const ta = f.querySelector("textarea"), enviar = f.querySelector("button[type=submit]"), resolver = f.querySelector(".sol2-resolver");
      ta.value = SOL_RASCUNHO[s.id] || "";
      ta.oninput = () => { SOL_RASCUNHO[s.id] = ta.value; };
      ta.onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); f.requestSubmit ? f.requestSubmit() : enviar.click(); } };
      if (consulta) { [ta, enviar, resolver].forEach(x => { x.disabled = true; x.title = "Perfil somente consulta"; }); }
      f.onsubmit = async e => {
        e.preventDefault();
        const corpo = ta.value.trim();
        if (!corpo) { erro("Escreva uma mensagem."); ta.focus(); return; }
        enviar.disabled = resolver.disabled = true;
        try { await jpost("/api/mensagens", { solicitacao_id: s.id, corpo }); delete SOL_RASCUNHO[s.id]; await mudou(); }
        catch (err) { erro(err.message); enviar.disabled = resolver.disabled = false; }
      };
      resolver.onclick = async () => {
        enviar.disabled = resolver.disabled = true;
        try { await jpost("/api/solicitacoes/status", { id: s.id, status: "fechada" }); await mudou(); }
        catch (err) { erro(err.message); enviar.disabled = resolver.disabled = false; }
      };
      foot.appendChild(f);
    }
    // mostra a mensagem mais recente
    setTimeout(() => { ol.scrollTop = ol.scrollHeight; }, 0);
    return box;
  }

  async function viewSolicitacoes() {
    const office = isOffice(), consulta = ME.funcao === "consulta";
    setTitle("Solicitações", office ? "Atendimento aos clientes" : "Converse com o escritório");
    topActions().innerHTML = "";
    if (canScope()) {
      const btn = el(`<button class="btn">＋ Nova solicitação</button>`);
      if (consulta) { btn.disabled = true; btn.title = "Perfil somente consulta"; }
      btn.addEventListener("click", () => modalNovaSolicitacao());
      topActions().appendChild(btn);
    }
    const c = content(); c.innerHTML = "<div class='empty'>Carregando…</div>";
    const company = FILTRO_EMPRESA;
    let lista;
    try { lista = (await api("/api/solicitacoes" + empParam())).solicitacoes || []; }
    catch (e) { if (VIEW === "solicitacoes") c.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return; }
    if (VIEW !== "solicitacoes" || company !== FILTRO_EMPRESA) return;
    c.innerHTML = "";
    const showEmp = office && !FILTRO_EMPRESA;
    if (SOL_EMP !== FILTRO_EMPRESA) { if (SOL_EMP !== null) { SOL_FILTRO = ""; SOL_BUSCA = ""; } SOL_EMP = FILTRO_EMPRESA; } // outra empresa: volta ao filtro padrão
    const hero = el(`<section class="obr-hero dv2 sol2-hero"></section>`);
    const wrap = el(`<div class="sol2">
      <section class="hcard sol2-lista" aria-label="Lista de solicitações">
        <div class="sol2-busca"><input type="search" placeholder="Buscar por assunto, protocolo ou mensagem" aria-label="Buscar solicitações"></div>
        <div class="chip-filter" role="group" aria-label="Filtrar solicitações"></div>
        <ul class="sol2-itens"></ul>
      </section>
      <section class="hcard sol2-painel" aria-label="Conversa"></section>
    </div>`);
    c.appendChild(hero); c.appendChild(wrap);
    const busca = wrap.querySelector("input[type=search]"), fbar = wrap.querySelector(".chip-filter"), ul = wrap.querySelector(".sol2-itens"), painel = wrap.querySelector(".sol2-painel");
    busca.value = SOL_BUSCA;
    const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    async function recarregar(id) {
      try { const d = await api("/api/solicitacoes" + empParam()); if (VIEW !== "solicitacoes" || company !== FILTRO_EMPRESA) return; lista = d.solicitacoes || []; }
      catch (e) { painel.prepend(el(`<p class="sol2-err txt-danger small" role="alert">${esc(e.message)}</p>`)); return; }
      if (id != null) SOL_SEL = id;
      desenhar(true);
    }
    function chave(s) { return office ? solFila(s) : solEstado(s); }
    function filtros() {
      const cont = k => lista.filter(s => chave(s) === k).length;
      if (office) {
        const minhas = lista.filter(s => s.responsavel && s.responsavel === ME.nome && chave(s) !== "concluida").length;
        return [["nova", "Novas", cont("nova")], ["atendimento", "Em atendimento", cont("atendimento")], ["aguardando", "Aguardando cliente", cont("aguardando")], ["minhas", "Minhas", minhas], ["concluida", "Concluídas", cont("concluida")], ["todas", "Todas", lista.length]];
      }
      return [["abertas", "Em aberto", lista.filter(s => chave(s) !== "concluida").length], ["aguardando", "Aguardando você", cont("aguardando")], ["concluida", "Concluídas", cont("concluida")], ["todas", "Todas", lista.length]];
    }
    function passa(s) {
      const k = chave(s);
      if (SOL_FILTRO === "todas") return true;
      if (SOL_FILTRO === "abertas") return k !== "concluida";
      if (SOL_FILTRO === "minhas") return s.responsavel === ME.nome && k !== "concluida";
      return k === SOL_FILTRO;
    }
    const ORD_CLI = { aguardando: 0, enviada: 1, atendimento: 1, concluida: 3 }, ORD_ESC = { nova: 0, atendimento: 1, aguardando: 2, concluida: 3 };
    function ordenar(a, b) {
      const ka = chave(a), kb = chave(b);
      if (office) {
        const r = (ORD_ESC[ka] ?? 9) - (ORD_ESC[kb] ?? 9) || (SOL_PRIO[a.prioridade] ?? 1) - (SOL_PRIO[b.prioridade] ?? 1);
        if (r) return r;
        if (ka === "nova") return String(a.criada_em || "").localeCompare(String(b.criada_em || "")); // fila: mais antiga primeiro
        const pa = isoData(a.prazo) || "9", pb = isoData(b.prazo) || "9";
        return ka !== "concluida" && pa !== pb ? pa.localeCompare(pb) : String(b.atualizada_em || "").localeCompare(String(a.atualizada_em || ""));
      }
      return (ORD_CLI[ka] ?? 9) - (ORD_CLI[kb] ?? 9) || String(b.atualizada_em || "").localeCompare(String(a.atualizada_em || ""));
    }
    function desenharHero() {
      const cont = k => lista.filter(s => chave(s) === k).length;
      let tom, ico, h, p;
      if (office) {
        const novas = cont("nova"), atend = cont("atendimento"), venc = lista.filter(s => chave(s) !== "concluida" && s.prazo && diasAte(s.prazo) < 0).length;
        tom = venc ? "danger" : novas ? "warn" : atend ? "info" : "ok"; ico = tom === "ok" ? "check" : tom === "info" ? "relogio" : "alerta";
        h = venc ? `${plural(venc, "solicitação com prazo vencido", "solicitações com prazo vencido")}` : novas ? `${plural(novas, "nova solicitação aguardando triagem", "novas solicitações aguardando triagem")}` : atend ? `${plural(atend, "solicitação em atendimento", "solicitações em atendimento")}` : "Nada pendente com o escritório";
        p = `${novas ? plural(novas, "nova", "novas") + " sem responsável · " : ""}${plural(atend, "em atendimento", "em atendimento")} · ${plural(cont("aguardando"), "aguardando o cliente", "aguardando o cliente")}`;
      } else {
        const ag = cont("aguardando"), abertas = lista.filter(s => chave(s) !== "concluida").length;
        tom = ag ? "warn" : abertas ? "info" : "ok"; ico = ag ? "alerta" : abertas ? "relogio" : "check";
        h = ag ? (ag === 1 ? "1 solicitação aguardando você" : `${ag} solicitações aguardando você`) : abertas ? `${plural(abertas, "solicitação em atendimento", "solicitações em atendimento")}` : "Nenhuma solicitação em aberto";
        p = ag ? "O escritório respondeu. Abra a conversa para responder ou marcar como resolvida." : abertas ? "O escritório está cuidando. Você recebe a resposta aqui." : "Precisa de algo? Use “Nova solicitação” para falar com o escritório.";
      }
      hero.className = `obr-hero dv2 sol2-hero ${tom}`;
      hero.innerHTML = `<span class="obr-hero-ico" aria-hidden="true">${icone(ico)}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`;
    }
    function desenhar(manter) {
      const fs = filtros();
      if (!fs.some(f => f[0] === SOL_FILTRO)) SOL_FILTRO = office ? (fs[0][2] ? "nova" : fs[1][2] ? "atendimento" : "todas") : "abertas";
      desenharHero();
      fbar.innerHTML = "";
      fs.forEach(([k, label, n]) => { const b = el(`<button type="button" class="pill ${SOL_FILTRO === k ? "active" : ""}" aria-pressed="${SOL_FILTRO === k}">${label} <span class="n">${n}</span></button>`); b.onclick = () => { SOL_FILTRO = k; desenhar(); }; fbar.appendChild(b); });
      const q = norm(SOL_BUSCA.trim());
      const vis = lista.filter(passa).filter(s => !q || norm([s.protocolo, s.assunto, s.empresa, s.responsavel, ...(s.mensagens || []).map(m => m.corpo)].join(" ")).includes(q)).sort(ordenar);
      if (SOL_SEL != null && !lista.some(s => s.id === SOL_SEL)) SOL_SEL = null;
      // no computador sempre há uma conversa aberta: a selecionada, se ainda visível (ou se acabou de mudar), senão a primeira
      if (!solMobile() && (SOL_SEL == null || (!manter && !vis.some(s => s.id === SOL_SEL)))) SOL_SEL = vis.length ? vis[0].id : null;
      ul.innerHTML = "";
      if (!vis.length) ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">${icone("check")}</span><div><b>${q ? "Nada encontrado" : "Nada por aqui"}</b><small>${q ? "Tente outro termo de busca." : lista.length ? "Nenhuma solicitação nesta situação." : office ? "Nenhuma solicitação recebida." : "Quando você falar com o escritório, a conversa aparece aqui."}</small></div></li>`));
      vis.forEach(s => {
        const ult = (s.mensagens || [])[s.mensagens.length - 1];
        const k = chave(s), sel = s.id === SOL_SEL;
        const destaque = office ? k === "nova" : k === "aguardando";
        const n = s.prazo && k !== "concluida" ? diasAte(s.prazo) : null;
        const extra = office ? `${s.responsavel ? esc(s.responsavel) : "Sem responsável"}${n != null ? ` · <span class="${n < 0 ? "txt-danger" : ""}">prazo ${esc(quando(s.prazo).replace(/^vence /, "").replace(/^venceu /, "vencido "))}</span>` : ""}` : "";
        const li = el(`<li><button type="button" class="sol2-item ${sel ? "sel" : ""} ${destaque ? "novo" : ""}" ${sel ? 'aria-current="true"' : ""}>
          <span class="sol2-item-top"><b>${destaque ? '<i class="sol2-dot" aria-hidden="true"></i>' : ""}${esc(s.assunto || "Sem assunto")}</b><time>${esc(solHora(s.atualizada_em))}</time></span>
          <small class="sol2-item-sub">${esc(s.protocolo || "")}${showEmp ? " · " + esc(s.empresa || "") : ""}</small>
          ${ult ? `<span class="sol2-item-prev">${ult.autor_perfil === "escritorio" ? (office ? "Você: " : "Escritório: ") : (office ? "" : "Você: ")}${esc(String(ult.corpo || "").slice(0, 140))}</span>` : ""}
          <span class="sol2-item-chips">${solChip(s)}${s.prioridade === "alta" ? chipHtml("danger", "alerta", "Alta") : ""}${extra ? `<small class="sol2-item-extra">${extra}</small>` : ""}</span>
        </button></li>`);
        li.querySelector("button").onclick = () => { SOL_SEL = s.id; desenhar(); if (solMobile()) painel.querySelector(".sol2-voltar")?.focus(); else painel.querySelector("textarea")?.focus({ preventScroll: true }); };
        ul.appendChild(li);
      });
      const s = lista.find(x => x.id === SOL_SEL);
      wrap.classList.toggle("aberto", !!s);
      painel.innerHTML = "";
      if (s) painel.appendChild(threadSolicitacao(s, { onMudou: id => recarregar(id), onVoltar: () => { SOL_SEL = null; desenhar(); } }));
      else painel.appendChild(el(`<div class="sol2-vazio"><span aria-hidden="true">${icone("solicitacoes")}</span><b>Selecione uma solicitação</b><small>A conversa com o escritório aparece aqui.</small></div>`));
    }
    busca.oninput = () => { SOL_BUSCA = busca.value; desenhar(); };
    const onKey = e => { if (!wrap.isConnected) { document.removeEventListener("keydown", onKey); return; } if (e.key === "Escape" && solMobile() && wrap.classList.contains("aberto") && !modalRoot.children.length) { SOL_SEL = null; desenhar(); } };
    document.addEventListener("keydown", onKey);
    desenhar();
    definirContador("sol", contarSol(lista));
  }

  function modalNovaSolicitacao(documento) {
    const pedido = typeof documento === "string" ? documento : "";
    const contexto = documento && typeof documento.assunto === "string" ? documento : null;
    const empSel = isOffice()
      ? `<div class="field"><label>Empresa</label><select name="empresa_id" required>${
          EMPRESAS.map((e) => `<option value="${e.id}" ${String(e.id) === String(FILTRO_EMPRESA) ? "selected" : ""}>${esc(e.nome)}</option>`).join("")
        }</select></div>` : "";
    openModal("Nova solicitação", `
      ${empSel}
      <div class="field"><label>Assunto</label><input name="assunto" required placeholder="Resumo do pedido" value="${esc(contexto ? contexto.assunto : pedido ? "Documento: " + pedido : "")}"></div>
      <div class="field"><label>Prioridade</label>
        <select name="prioridade"><option value="normal">Normal</option><option value="baixa">Baixa</option><option value="alta">Alta</option></select></div>
      <div class="field"><label>Mensagem</label><textarea name="corpo" required placeholder="Descreva sua dúvida ou solicitação">${esc(contexto ? contexto.corpo : pedido ? "Solicito a disponibilização de: " + pedido + "." : "")}</textarea></div>
    `, async (form, close, setErr) => {
      try {
        const body = { assunto: form.assunto.value, corpo: form.corpo.value, prioridade: form.prioridade.value };
        body.empresa_id = isOffice() ? form.empresa_id.value : FILTRO_EMPRESA;
        const r = await jpost("/api/solicitacoes", body);
        close(); invalidarContadores();
        if (contexto?.onCreated) await contexto.onCreated();
        else {
          // abre a conversa recém-criada (antes: redesenhava Solicitações dentro da tela atual)
          if (r && r.id != null) { SOL_SEL = r.id; SOL_FILTRO = ""; SOL_BUSCA = ""; }
          if (VIEW === "solicitacoes") viewSolicitacoes(); else if (liberado("solicitacoes")) irPara("solicitacoes"); else routeView();
        }
      } catch (e) { setErr(e.message); }
    }, { okLabel: "Enviar solicitação" });
  }

  // Conversa em janela (chamada de outras telas: Certificado, Histórico)
  function modalSolicitacao(s) {
    const back = el(`<div class="modal-backdrop"></div>`);
    const modal = el(`<div class="modal sol2-modal" role="dialog" aria-modal="true" aria-label="Solicitação ${esc(s.protocolo || "")}">
      <div class="modal-head"><h3>${esc(s.protocolo || "Solicitação")}</h3><button class="x" aria-label="Fechar">×</button></div>
      <div class="modal-body"></div>
    </div>`);
    back.appendChild(modal);
    const body = modal.querySelector(".modal-body");
    const fechar = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = e => { if (e.key === "Escape" && back.isConnected && modalRoot.lastElementChild === back) fechar(); };
    document.addEventListener("keydown", onKey);
    back.addEventListener("click", e => { if (e.target === back) fechar(); });
    modal.querySelector(".x").addEventListener("click", fechar);
    const desenhar = atual => { body.innerHTML = ""; body.appendChild(threadSolicitacao(atual, { onMudou: async id => {
      const d = await pegar(solUrl(atual));
      const novo = d && (d.solicitacoes || []).find(x => x.id === id);
      if (novo && back.isConnected) desenhar(novo); else fechar();
      routeView();
    } })); };
    desenhar(s);
    modalRoot.appendChild(back);
    modal.querySelector(".x").focus();
  }
  // ---------- Escritório v2: utilitários das telas da equipe ----------
  const escChip = (tom, ico, txt, title) => `<span class="status-chip ${tom || ""}"${title ? ` title="${esc(title)}"` : ""}>${icone(ico, "ico-svg ico-xs")} ${esc(txt)}</span>`;
  const escNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const soDigitos = (v) => String(v || "").replace(/\D/g, "");
  const escBate = (q, ...campos) => { const t = escNorm(q).trim(); if (!t) return true; const alvo = escNorm(campos.join(" ")); const d = soDigitos(t); return alvo.includes(t) || (/^[\d./-]+$/.test(t) && d && campos.some(c => soDigitos(c).includes(d))); };
  function escCsv(nome, rows) {
    const quote = v => '"' + String(v ?? "").replace(/^[=+@-]/, "' $&").replaceAll('"', '""') + '"';
    const url = URL.createObjectURL(new Blob(["﻿" + rows.map(r => r.map(quote).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Seleciona a empresa no cabeçalho e abre a tela pedida (com o mesmo filtro do seletor do topo).
  function escAbrirEmpresa(id, view) {
    FILTRO_EMPRESA = String(id);
    sincronizarEmpresaHeader();
    irPara(liberado(view) ? view : "painel");
  }
  // KPIs que também filtram a lista: [chave, rótulo, valor, tom, detalhe]
  function escKpis(itens, ativo, onPick) {
    const g = el(`<div class="kpi-grid esc2-kpis"></div>`);
    itens.forEach(([k, label, v, tom, sub]) => {
      const b = el(`<button class="hcard kpi-card ${tom || ""} ${ativo === k ? "active" : ""}" aria-pressed="${ativo === k}"><span class="kpi-label">${esc(label)}</span><span class="kpi">${v}</span>${sub ? `<span class="small muted">${esc(sub)}</span>` : ""}</button>`);
      if (v === "—") b.disabled = true;
      b.onclick = () => onPick(k);
      g.appendChild(b);
    });
    return g;
  }
  function escPills(filtros, ativo, onPick, rotulo) {
    const bar = el(`<div class="chip-filter" role="group" aria-label="${esc(rotulo || "Filtrar")}"></div>`);
    filtros.filter(([k, , n]) => n || k === "todas" || k === "todos" || k === ativo).forEach(([k, label, n]) => {
      const b = el(`<button class="pill ${ativo === k ? "active" : ""}" aria-pressed="${ativo === k}">${esc(label)} <span class="n">${n}</span></button>`);
      b.onclick = () => onPick(k);
      bar.appendChild(b);
    });
    return bar;
  }
  const escVazio = (titulo, sub, ico = "check") => `<li class="act-ok"><span aria-hidden="true">${icone(ico)}</span><div><b>${esc(titulo)}</b><small>${esc(sub)}</small></div></li>`;

  // ---------- Consultas de parcelamentos (escritório) v2 ----------
  const CPL = { filtro: "todas", busca: "", fonte: "", token: 0 };
  const CPL_LABELS = { fila: "Na fila", consultando: "Consultando", concluido: "Concluída", parcial: "Parcial", erro: "Erro", nao_coberto: "Não coberta", cadastro_invalido: "Cadastro inválido", aguardando_acesso: "Aguardando acesso oficial" };
  const CPL_TOM = { concluido: ["ok", "check"], parcial: ["warn", "alerta"], erro: ["danger", "erro"], fila: ["info", "relogio"], consultando: ["info", "relogio"], nao_coberto: ["", "menos"], cadastro_invalido: ["warn", "alerta"], aguardando_acesso: ["warn", "relogio"] };
  const cplFonte = f => f === "pgfn" ? "PGFN" : f === "ecac" ? "e-CAC · certificado" : "Receita";
  const cplNegociado = e => !!(e.acordos || e.inscricoesNegociadas);
  const CPL_FILTROS = {
    todas: () => true,
    atraso: e => e.situacao === "pendente",
    erro: e => e.consultas.some(x => x.status === "erro"),
    fonte: e => e.consultas.some(x => ["parcial", "nao_coberto", "cadastro_invalido", "aguardando_acesso"].includes(x.status)),
    andamento: e => e.consultas.some(x => x.status === "fila" || x.status === "consultando"),
    negociados: e => cplNegociado(e),
    sem: e => !cplNegociado(e) && e.situacao !== "pendente",
  };
  // Situação da empresa no lote (a mais urgente define o chip)
  function cplSituacao(e) {
    if (e.situacao === "pendente") return { tom: "danger", ico: "alerta", txt: plural(Number(e.parcelasVencidas) || 0, "parcela vencida", "parcelas vencidas"), ordem: 0 };
    if (CPL_FILTROS.erro(e)) return { tom: "danger", ico: "erro", txt: "Erro na consulta", ordem: 1 };
    if (cplNegociado(e) && e.situacao !== "em_dia") return { tom: "info", ico: "relogio", txt: "Pagamentos a confirmar", ordem: 2 };
    if (CPL_FILTROS.andamento(e)) return { tom: "info", ico: "relogio", txt: "Em consulta", ordem: 3 };
    if (cplNegociado(e)) return { tom: "ok", ico: "check", txt: "Acordo em dia", ordem: 4 };
    return { tom: "", ico: "menos", txt: "Sem parcelamento identificado", ordem: 5 };
  }
  async function viewConsultasParcelamentos() {
    setTitle("Consultas de parcelamentos", "Acompanhamento do escritório · Receita Federal e PGFN");
    const c = content(); const token = ++CPL.token;
    const ativa = () => token === CPL.token && VIEW === "consultas-parcelamentos" && c.isConnected;
    c.innerHTML = `<div class="esc2">
      <div class="esc2-alerta"></div>
      <section class="hcard esc2-lote" aria-labelledby="cplLoteTit">
        <header><div><h3 id="cplLoteTit">Consulta em lote</h3><p class="small muted esc2-lote-sub">Carregando…</p></div><span class="esc2-lote-chip"></span></header>
        <div class="esc2-lote-prog"></div>
        <div class="esc2-acts"><button class="btn" id="parcel-batch-start">${icone("atualizar-guias", "ico-svg ico-xs")} Consultar todas as empresas</button><button class="btn ghost" id="parcel-batch-retry">Reprocessar falhas e parciais</button><button class="link-btn" id="parcel-batch-refresh">Atualizar painel</button><button class="link-btn" id="parcel-batch-csv">Exportar acompanhamento</button></div>
        <p class="small esc2-msg" id="parcel-batch-msg" role="status" aria-live="polite"></p>
      </section>
      <div class="esc2-kpis-host"></div>
      <section class="hcard esc2-lista-card">
        <div class="esc2-barra"><div class="esc2-pills"></div><div class="esc2-busca"><input type="search" id="parcel-batch-search" aria-label="Buscar empresa ou CNPJ" placeholder="Buscar empresa ou CNPJ"><select id="parcel-batch-source" aria-label="Fonte da consulta"><option value="">Todas as fontes</option><option value="pgfn">PGFN</option><option value="parcelamentos">Receita Federal · API</option><option value="ecac">e-CAC · certificado</option></select></div></div>
        <p class="small muted esc2-soma" aria-live="polite"></p>
        <ul class="esc2-list" id="parcel-batch-table"></ul>
      </section>
      <details class="hcard consultas-oficiais esc2-hist"><summary><b>Últimas execuções</b></summary><div id="parcel-batch-history"></div></details>
      <p class="essential-note">O progresso inclui fontes não cobertas e cadastros inválidos, apresentados separadamente. Conclusão da consulta não significa regularidade fiscal. Inscrições negociadas na PGFN não equivalem à quantidade de acordos. O detalhamento de parcelas e pagamentos depende da cobertura de cada fonte.</p>
    </div>`;
    const $ = s => c.querySelector(s);
    const busca = $("#parcel-batch-search"), fonte = $("#parcel-batch-source"), msg = $("#parcel-batch-msg");
    busca.value = CPL.busca; fonte.value = CPL.fonte;
    let data = null, loading = false;
    const abertos = new Set();
    const setFiltro = k => { CPL.filtro = k; draw(); };
    const draw = () => {
      if (!data) return;
      // KPIs do lote (sempre sobre o lote inteiro)
      const emp = data.empresas, conta = fn => emp.filter(fn).length;
      const consultadas = emp.filter(e => !CPL_FILTROS.andamento(e)).length;
      const nAtraso = conta(CPL_FILTROS.atraso), nSem = conta(CPL_FILTROS.sem), nErro = conta(CPL_FILTROS.erro), nFonte = conta(CPL_FILTROS.fonte);
      const kh = $(".esc2-kpis-host"); kh.innerHTML = "";
      kh.appendChild(escKpis([
        ["todas", "Empresas consultadas", `${consultadas}<small class="esc2-de"> de ${emp.length}</small>`, "", "no lote atual"],
        ["atraso", "Com parcelas em atraso", nAtraso, nAtraso ? "danger" : "", nAtraso ? "risco de rescisão: priorize" : "nenhuma identificada"],
        ["sem", "Sem parcelamento", nSem, "", "nas fontes disponíveis"],
        ["erro", "Com erro na consulta", nErro, nErro ? "danger" : "", nFonte ? plural(nFonte, "outra com pendência de fonte", "outras com pendência de fonte") : "reprocesse no topo"],
      ], CPL.filtro, setFiltro));
      // Linhas (filtro de fonte aplicado às consultas, como antes)
      const base = emp.map(e => ({ ...e, consultas: e.consultas.filter(x => !CPL.fonte || x.fonte === CPL.fonte) })).filter(e => e.consultas.length);
      const filtros = [["todas", "Todas", base.length], ["atraso", "Com atraso", base.filter(CPL_FILTROS.atraso).length], ["erro", "Com erro", base.filter(CPL_FILTROS.erro).length], ["fonte", "Pendência de fonte", base.filter(CPL_FILTROS.fonte).length], ["andamento", "Em consulta", base.filter(CPL_FILTROS.andamento).length], ["negociados", "Com acordo ou inscrição", base.filter(CPL_FILTROS.negociados).length], ["sem", "Sem parcelamento", base.filter(CPL_FILTROS.sem).length]];
      if (!CPL_FILTROS[CPL.filtro]) CPL.filtro = "todas";
      const ph = $(".esc2-pills"); ph.innerHTML = ""; ph.appendChild(escPills(filtros, CPL.filtro, setFiltro, "Filtrar por situação"));
      const rows = base.filter(e => CPL_FILTROS[CPL.filtro](e) && escBate(CPL.busca, e.nome, e.cnpj))
        .map(e => ({ e, s: cplSituacao(e) })).sort((a, b) => a.s.ordem - b.s.ordem || (Number(b.e.parcelasVencidas) || 0) - (Number(a.e.parcelasVencidas) || 0) || a.e.nome.localeCompare(b.e.nome));
      $(".esc2-soma").textContent = rows.length ? `${plural(rows.length, "empresa", "empresas")} · ordenadas por urgência` : "";
      const ul = $("#parcel-batch-table"); ul.innerHTML = "";
      if (!rows.length) { ul.innerHTML = escVazio("Nenhuma empresa nesta seleção", base.length ? "Troque o filtro ou limpe a busca." : "Inicie uma consulta em lote no topo da página.", "menos"); return; }
      rows.forEach(({ e, s }) => {
        const ultima = e.consultas.map(x => x.atualizado).sort().at(-1);
        const receita = e.fontesDisponiveis.some(x => ["parcelamentos", "parcelamentos-gerais"].includes(x)), pgfn = e.fontesDisponiveis.includes("pgfn");
        const resultado = `${receita ? Number(e.acordos) : "—"} acordo(s) Receita · ${pgfn ? Number(e.inscricoesNegociadas) : "—"} inscrição(ões) PGFN`;
        const pag = e.situacao === "pendente" ? "Pagamentos com parcela vencida" : "Pagamentos: " + (e.situacao === "em_dia" ? "em dia" : "a confirmar");
        const li = el(`<li class="esc2-row cpl ${s.tom}">
          <div class="esc2-main"><b>${esc(e.nome)}</b><small>${esc(e.cnpj || "CNPJ não informado")} · atualizado ${esc(fmtDateTime(ultima))}</small></div>
          <div class="esc2-res">${escChip(s.tom, s.ico, s.txt)}<small>${esc(resultado)}<br>${esc(pag)}</small></div>
          <div class="esc2-fontes" aria-label="Andamento por fonte">${e.consultas.map(x => { const [t, i] = CPL_TOM[x.status] || ["", "menos"]; return escChip(t, i, cplFonte(x.fonte) + " · " + (CPL_LABELS[x.status] || x.status), x.mensagem); }).join("")}</div>
          <div class="esc2-act"><button class="btn sm" data-ver>Ver empresa</button><button class="link-btn" data-det aria-expanded="false">Detalhes</button></div>
          <div class="esc2-det" hidden><ul>${e.consultas.map(x => `<li><b>${esc(cplFonte(x.fonte))} · ${esc(CPL_LABELS[x.status] || x.status)}</b><span>${esc(x.mensagem)}</span><small class="muted">Tentativas: ${Number(x.tentativas)} · ${esc(fmtDateTime(x.atualizado))}</small></li>`).join("")}</ul></div>
        </li>`);
        li.querySelector("[data-ver]").onclick = () => escAbrirEmpresa(e.id, "parcelamentos");
        const det = li.querySelector(".esc2-det"), bd = li.querySelector("[data-det]");
        const abrir = v => { det.hidden = !v; bd.setAttribute("aria-expanded", String(v)); bd.textContent = v ? "Ocultar detalhes" : "Detalhes"; v ? abertos.add(e.id) : abertos.delete(e.id); };
        bd.onclick = () => abrir(det.hidden);
        if (abertos.has(e.id)) abrir(true);
        ul.appendChild(li);
      });
    };
    const drawLote = () => {
      const k = data.contagens, active = (k.fila || 0) + (k.consultando || 0) + (k.aguardando_acesso || 0);
      $(".esc2-alerta").innerHTML = k.aguardando_acesso ? `<section class="obr-hero warn esc2-hero"><span class="obr-hero-ico" aria-hidden="true">${icone("alerta")}</span><div><h3>Coleta pelo certificado suspensa</h3><p>O e-CAC identificou o acesso como automatizado e bloqueou a troca de empresa. A fila aguarda o restabelecimento do acesso oficial; nenhuma nova tentativa está sendo feita.</p></div></section>` : "";
      if (data.lote) {
        const estado = k.aguardando_acesso ? ["warn", "relogio", "Aguardando acesso oficial"] : active ? ["info", "relogio", "Lote em andamento"] : ["ok", "check", "Lote finalizado"];
        $("#cplLoteTit").textContent = `Execução #${data.lote.id}`;
        $(".esc2-lote-sub").textContent = `Início: ${fmtDateTime(data.lote.criado)}${data.lote.finalizado ? " · Fim: " + fmtDateTime(data.lote.finalizado) : ""} · Painel atualizado às ${new Date().toLocaleTimeString("pt-BR")}`;
        $(".esc2-lote-chip").innerHTML = escChip(...estado);
        const pct = Math.max(0, Math.min(100, Number(data.percentual) || 0));
        $(".esc2-lote-prog").innerHTML = `<div class="esc2-progress" role="progressbar" aria-label="Progresso das consultas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
          <p class="esc2-progress-txt"><b>${pct}% processado</b> · ${Number(data.processadas)} de ${Number(data.total)} consultas · ${plural(data.empresas.length, "empresa", "empresas")}</p>
          <div class="esc2-counts">${Object.entries(k).map(([s, v]) => { const [t, i] = CPL_TOM[s] || ["", "menos"]; return escChip(t, i, `${CPL_LABELS[s] || s}: ${v}`); }).join("")}</div>`;
      } else {
        $("#cplLoteTit").textContent = "Consulta em lote";
        $(".esc2-lote-sub").textContent = "Nenhuma execução iniciada.";
        $(".esc2-lote-chip").innerHTML = ""; $(".esc2-lote-prog").innerHTML = "";
      }
      const consulta = ME.funcao === "consulta";
      $("#parcel-batch-start").disabled = !!active || consulta;
      $("#parcel-batch-retry").disabled = !!active || consulta || !(k.erro || k.parcial);
      $("#parcel-batch-start").title = consulta ? "Perfil somente consulta" : active ? "Aguarde o lote atual terminar" : "";
      $("#parcel-batch-history").innerHTML = data.historico.length ? `<ul class="esc2-hist-list">${data.historico.map(x => `<li><b>Execução #${x.id}</b><span>${esc(fmtDateTime(x.criado))}</span><span class="muted">${x.finalizado ? "Finalizada em " + esc(fmtDateTime(x.finalizado)) : data.lote && x.id === data.lote.id && k.aguardando_acesso ? "Aguardando acesso oficial" : "Em andamento"}</span></li>`).join("")}</ul>` : '<p class="muted">Sem histórico.</p>';
    };
    const refresh = async () => {
      if (loading || !ativa()) return; loading = true;
      try { data = await api("/api/parcelamentos/lote"); if (!ativa()) return; drawLote(); draw(); }
      catch (e) { msg.textContent = e.message; }
      finally { loading = false; }
    };
    const start = async acao => { msg.textContent = "Preparando fila…"; try { await jpost("/api/parcelamentos/lote", { acao }); msg.textContent = "Consultas executadas em segundo plano. Você pode navegar pelo portal."; await refresh(); } catch (e) { msg.textContent = e.message; } };
    $("#parcel-batch-start").onclick = () => start("iniciar");
    $("#parcel-batch-retry").onclick = () => start("reprocessar");
    $("#parcel-batch-refresh").onclick = refresh;
    busca.oninput = () => { CPL.busca = busca.value; draw(); };
    fonte.onchange = () => { CPL.fonte = fonte.value; draw(); };
    $("#parcel-batch-csv").onclick = () => { if (!data) return; escCsv("consultas-parcelamentos.csv", [["Empresa", "CNPJ", "Fonte", "Situação", "Motivo", "Tentativas", "Atualização"], ...data.empresas.flatMap(e => e.consultas.map(x => [e.nome, e.cnpj, x.fonte, CPL_LABELS[x.status], x.mensagem, x.tentativas, x.atualizado]))]); };
    await refresh();
    const tick = async () => { if (!ativa()) return; await refresh(); setTimeout(tick, 8000); };
    setTimeout(tick, 8000);
  }

  // ---------- Atualização de faturamentos (escritório) v2 ----------
  const AUD = { filtro: null, busca: "", ordem: "urgencia" };
  const AUD_LABELS = { atualizado: "Atualizado", sem_pasta: "Sem pasta", sem_documento: "Sem documento", conferencia: "Conferir fonte", divergencia: "Divergência", erro: "Erro", nao_consultado: "Não consultado" };
  const AUD_TOM = { atualizado: ["ok", "check"], sem_pasta: ["warn", "alerta"], sem_documento: ["warn", "alerta"], conferencia: ["warn", "alerta"], nao_consultado: ["info", "relogio"], divergencia: ["danger", "alerta"], erro: ["danger", "erro"] };
  const audCritico = m => m.status === "erro" || m.status === "divergencia";
  async function viewAuditoriaFaturamento() {
    setTitle("Atualização de faturamentos", "Lucro Real · últimos 12 meses encerrados · controle do escritório");
    const c = content(); c.innerHTML = '<div class="empty">Carregando conferência…</div>';
    try {
      const d = await api("/api/faturamento/auditoria");
      if (VIEW !== "auditoria-faturamento") return;
      const ta = topActions(); ta.innerHTML = "";
      const bExp = el(`<button class="btn ghost" id="revenue-audit-export">${icone("baixar", "ico-svg ico-xs")} Exportar base CSV</button>`);
      bExp.onclick = () => escCsv("faturamentos-lucro-real.csv", [["Empresa", "CNPJ", "Regime", "Competência", "Situação", "Motivo", "Verificado em"], ...d.empresas.flatMap(e => e.meses.map(m => [e.nome, e.cnpj, e.regime, m.period, AUD_LABELS[m.status] || m.status, m.motivo, m.verificado_em || ""]))]);
      ta.appendChild(bExp);
      const lista = d.empresas.map(e => {
        const pend = e.meses.filter(m => m.status !== "atualizado"), crit = pend.filter(audCritico);
        const emp = EMPRESAS.find(x => soDigitos(x.cnpj) && soDigitos(x.cnpj) === soDigitos(e.cnpj));
        return { e, pend, crit, emp, faltam: 12 - Number(e.atualizados || 0) };
      });
      const F = { todas: () => true, pendentes: x => x.faltam > 0, criticas: x => x.crit.length > 0, completas: x => x.faltam <= 0 };
      if (!AUD.filtro || !F[AUD.filtro]) AUD.filtro = lista.some(F.pendentes) ? "pendentes" : "todas";
      const nPend = lista.filter(F.pendentes).length, nCrit = lista.filter(F.criticas).length, nComp = lista.filter(F.completas).length;
      const mesesPend = lista.reduce((s, x) => s + x.pend.length, 0);
      const tom = nCrit ? "danger" : nPend ? "warn" : "ok";
      c.innerHTML = "";
      const box = el(`<div class="esc2"></div>`); c.appendChild(box);
      box.appendChild(el(`<section class="obr-hero ${tom} esc2-hero"><span class="obr-hero-ico" aria-hidden="true">${icone(tom === "ok" ? "check" : "alerta")}</span><div><h3>${Number(d.completas)} de ${Number(d.totalEmpresas)} empresas com 12 meses conferidos</h3><p>${nPend ? `${plural(nPend, "empresa com pendência", "empresas com pendências")} · ${plural(mesesPend, "mês a atualizar", "meses a atualizar")}${nCrit ? ` · ${plural(nCrit, "com erro ou divergência", "com erro ou divergência")}` : ""}` : "Nenhum mês pendente."}</p></div></section>`));
      const kh = el(`<div></div>`); box.appendChild(kh);
      const card = el(`<section class="hcard esc2-lista-card">
        <div class="esc2-barra"><div class="esc2-pills"></div><div class="esc2-busca"><input type="search" id="revenue-audit-search" aria-label="Buscar empresa ou CNPJ" placeholder="Buscar empresa ou CNPJ"><select id="revenue-audit-sort" aria-label="Ordenar"><option value="urgencia">Mais urgentes primeiro</option><option value="faltam">Mais meses pendentes</option><option value="nome">Nome (A–Z)</option></select></div></div>
        <p class="small muted esc2-soma" aria-live="polite"></p>
        <ul class="esc2-list" id="revenue-audit-results"></ul>
        <p class="small muted esc2-legenda"><span><i class="esc2-leg ok"></i> Atualizado</span><span><i class="esc2-leg warn"></i> Sem pasta, sem documento ou a conferir</span><span><i class="esc2-leg danger"></i> Erro ou divergência</span><span><i class="esc2-leg info"></i> Não consultado</span></p>
      </section>`);
      box.appendChild(card);
      box.appendChild(el(`<p class="essential-note">Documentos ausentes não são tratados como faturamento zero. Fontes que exigem conferência permanecem pendentes. Publicações anteriores são preservadas.</p>`));
      const busca = card.querySelector("#revenue-audit-search"), ordem = card.querySelector("#revenue-audit-sort");
      busca.value = AUD.busca; ordem.value = AUD.ordem;
      const abertos = new Set();
      const setFiltro = k => { AUD.filtro = k; draw(); };
      function draw() {
        kh.innerHTML = "";
        kh.appendChild(escKpis([
          ["pendentes", "Empresas com pendências", nPend, nPend ? "warn" : "", plural(mesesPend, "mês a atualizar", "meses a atualizar")],
          ["criticas", "Com erro ou divergência", nCrit, nCrit ? "danger" : "", "conferir antes de publicar"],
          ["completas", "12 meses atualizados", nComp, "", "sem ação necessária"],
          ["todas", "Empresas acompanhadas", lista.length, "", "Lucro Real"],
        ], AUD.filtro, setFiltro));
        const ph = card.querySelector(".esc2-pills"); ph.innerHTML = "";
        ph.appendChild(escPills([["todas", "Todas", lista.length], ["pendentes", "Com pendências", nPend], ["criticas", "Erros ou divergências", nCrit], ["completas", "12 meses atualizados", nComp]], AUD.filtro, setFiltro, "Filtrar por situação"));
        const ord = { urgencia: (a, b) => b.crit.length - a.crit.length || b.faltam - a.faltam || a.e.nome.localeCompare(b.e.nome), faltam: (a, b) => b.faltam - a.faltam || a.e.nome.localeCompare(b.e.nome), nome: (a, b) => a.e.nome.localeCompare(b.e.nome) }[AUD.ordem] || (() => 0);
        const rows = lista.filter(x => F[AUD.filtro](x) && escBate(AUD.busca, x.e.nome, x.e.cnpj)).sort(ord);
        card.querySelector(".esc2-soma").textContent = rows.length ? plural(rows.length, "empresa", "empresas") : "";
        const ul = card.querySelector("ul"); ul.innerHTML = "";
        if (!rows.length) { ul.innerHTML = escVazio(AUD.filtro === "pendentes" || AUD.filtro === "criticas" ? "Nada pendente nesta seleção" : "Nenhuma empresa nesta seleção", "Troque o filtro ou limpe a busca."); return; }
        rows.forEach(({ e, pend, crit, emp, faltam }) => {
          const st = crit.length ? ["danger", "alerta", `${plural(crit.length, "mês", "meses")} com erro ou divergência`] : faltam > 0 ? ["warn", "relogio", `${plural(faltam, "mês pendente", "meses pendentes")}`] : ["ok", "check", "12 de 12 atualizados"];
          const resumo = pend.length ? "Pendentes: " + pend.map(m => `${periodoLabel(m.period)} (${(AUD_LABELS[m.status] || m.status).toLowerCase()})`).join(", ") : `${Number(e.atualizados)}/12 meses conferidos`;
          const li = el(`<li class="esc2-row aud ${st[0]}">
            <div class="esc2-main"><b>${esc(e.nome)}</b><small>${esc(e.cnpj)}${e.regime ? " · " + esc(e.regime) : ""}</small></div>
            <div class="esc2-res">${escChip(...st)}<small>${esc(resumo)}</small></div>
            <ol class="esc2-meses" aria-label="Situação dos últimos 12 meses">${e.meses.map(m => { const [t] = AUD_TOM[m.status] || [""]; const lbl = `${periodoLabel(m.period)} · ${AUD_LABELS[m.status] || m.status}`; return `<li class="${t}" title="${esc(lbl + (m.motivo ? ": " + m.motivo : ""))}"><span aria-hidden="true">${esc(String(m.period).slice(4, 6))}</span><span class="sr-only">${esc(lbl)}</span></li>`; }).join("")}</ol>
            <div class="esc2-act"><button class="btn sm ${faltam > 0 ? "" : "ghost"}" data-fat>Abrir faturamento</button><button class="link-btn" data-det aria-expanded="false">Ver meses</button></div>
            <div class="esc2-det" hidden><div class="esc2-tabela"><table><thead><tr><th>Competência</th><th>Situação</th><th>Motivo</th><th>Consulta</th><th>Fonte publicada</th></tr></thead><tbody>${e.meses.map(m => { const [t, i] = AUD_TOM[m.status] || ["", "menos"]; return `<tr><td>${esc(periodoLabel(m.period))}</td><td>${escChip(t, i, AUD_LABELS[m.status] || m.status)}</td><td>${esc(m.motivo)}</td><td>${esc(m.verificado_em ? fmtDate(m.verificado_em) : "—")}</td><td>${m.documento_id ? `<button class="link-btn" data-doc="${Number(m.documento_id)}">Pré-visualizar</button>` : "—"}</td></tr>`; }).join("")}</tbody></table></div></div>
          </li>`);
          const bf = li.querySelector("[data-fat]");
          if (emp) bf.onclick = () => escAbrirEmpresa(emp.id, "receita-mensal");
          else bf.replaceWith(el(`<small class="muted esc2-fora" title="Não há tela de faturamento para abrir: cadastre a empresa em Empresas.">Fora do cadastro do portal</small>`));
          const det = li.querySelector(".esc2-det"), bd = li.querySelector("[data-det]");
          const abrir = v => { det.hidden = !v; bd.setAttribute("aria-expanded", String(v)); bd.textContent = v ? "Ocultar meses" : "Ver meses"; v ? abertos.add(e.cnpj) : abertos.delete(e.cnpj); };
          bd.onclick = () => abrir(det.hidden); if (abertos.has(e.cnpj)) abrir(true);
          li.querySelectorAll("[data-doc]").forEach(b => b.onclick = () => previewCertidao({ id: Number(b.dataset.doc), titulo: "Fonte do faturamento", nome_arquivo: "relatorio-fiscal.pdf" }));
          ul.appendChild(li);
        });
      }
      busca.oninput = () => { AUD.busca = busca.value; draw(); };
      ordem.onchange = () => { AUD.ordem = ordem.value; draw(); };
      draw();
    } catch (e) { c.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  }

  // ---------- Empresas (escritório) v2 ----------
  const EMP2 = { filtro: "todas", busca: "" };
  async function viewEmpresas() {
    setTitle("Empresas", "Cadastro de clientes e acessos");
    const consulta = ME.funcao === "consulta";
    const btnE = el(`<button class="btn">${icone("mais", "ico-svg ico-xs")} Nova empresa</button>`);
    if (consulta) { btnE.disabled = true; btnE.title = "Perfil somente consulta"; }
    btnE.addEventListener("click", modalEmpresa);
    topActions().appendChild(btnE);
    const c = content(); c.innerHTML = "<div class='empty'>Carregando…</div>";
    try {
      // Os painéis de parcelamentos e de faturamento só complementam a saúde da empresa; se falharem, a lista continua.
      const [r, lote, aud] = await Promise.all([api("/api/empresas"), pegar("/api/parcelamentos/lote"), pegar("/api/faturamento/auditoria")]);
      EMPRESAS = r.empresas;
      if (VIEW !== "empresas") return;
      sincronizarEmpresaHeader();
      const lista = EMPRESAS.map(e => {
        const l = lote && lote.empresas ? lote.empresas.find(x => x.id === e.id) : null;
        const a = aud && aud.empresas ? aud.empresas.find(x => soDigitos(x.cnpj) && soDigitos(x.cnpj) === soDigitos(e.cnpj)) : null;
        return { e, l, a, regime: e.regime || (a && a.regime) || "", atraso: !!(l && l.situacao === "pendente"), fatPend: a ? 12 - Number(a.atualizados || 0) : 0 };
      });
      const F = { todas: () => true, sem_acesso: x => !Number(x.e.usuarios), atraso: x => x.atraso, faturamento: x => x.fatPend > 0, grupo: x => !!x.e.grupo };
      if (!F[EMP2.filtro]) EMP2.filtro = "todas";
      const n = k => lista.filter(F[k]).length;
      c.innerHTML = "";
      const box = el(`<div class="esc2"></div>`); c.appendChild(box);
      const kh = el(`<div></div>`); box.appendChild(kh);
      const card = el(`<section class="hcard esc2-lista-card">
        <div class="esc2-barra"><div class="esc2-pills"></div><div class="esc2-busca"><input type="search" aria-label="Buscar empresa ou CNPJ" placeholder="Buscar por nome ou CNPJ"></div></div>
        <p class="small muted esc2-soma" aria-live="polite"></p>
        <ul class="esc2-list"></ul>
      </section>`);
      box.appendChild(card);
      box.appendChild(el(`<p class="essential-note">Alertas vêm das telas Consultas de parcelamentos e Atualização de faturamentos; "—" indica que o painel não estava disponível. "Abrir" seleciona a empresa no topo e vai para o Início.</p>`));
      const busca = card.querySelector("input"); busca.value = EMP2.busca;
      const setFiltro = k => { EMP2.filtro = k; draw(); };
      function draw() {
        kh.innerHTML = "";
        kh.appendChild(escKpis([
          ["todas", "Empresas cadastradas", lista.length, "", plural(lista.reduce((s, x) => s + Number(x.e.usuarios || 0), 0), "usuário de cliente", "usuários de clientes")],
          ["sem_acesso", "Sem acesso de cliente", n("sem_acesso"), n("sem_acesso") ? "warn" : "", "cadastre um usuário"],
          ["atraso", "Parcelas em atraso", lote ? n("atraso") : "—", n("atraso") ? "danger" : "", lote ? "última consulta em lote" : "painel indisponível"],
          ["faturamento", "Faturamento pendente", aud ? n("faturamento") : "—", n("faturamento") ? "warn" : "", aud ? "Lucro Real · 12 meses" : "painel indisponível"],
        ], EMP2.filtro, setFiltro));
        const ph = card.querySelector(".esc2-pills"); ph.innerHTML = "";
        ph.appendChild(escPills([["todas", "Todas", lista.length], ["sem_acesso", "Sem acesso", n("sem_acesso")], ["atraso", "Parcelas em atraso", n("atraso")], ["faturamento", "Faturamento pendente", n("faturamento")], ["grupo", "Em grupo", n("grupo")]], EMP2.filtro, setFiltro, "Filtrar empresas"));
        const rows = lista.filter(x => F[EMP2.filtro](x) && escBate(EMP2.busca, x.e.nome, x.e.cnpj, x.e.grupo || ""))
          .sort((a, b) => (b.atraso - a.atraso) || (!Number(a.e.usuarios) ? -1 : 0) - (!Number(b.e.usuarios) ? -1 : 0) || a.e.nome.localeCompare(b.e.nome));
        card.querySelector(".esc2-soma").textContent = rows.length ? plural(rows.length, "empresa", "empresas") : "";
        const ul = card.querySelector("ul"); ul.innerHTML = "";
        if (!EMPRESAS.length) { ul.innerHTML = escVazio("Nenhuma empresa cadastrada", consulta ? "Peça a um administrador para cadastrar." : 'Use "Nova empresa" para começar.', "empresas"); return; }
        if (!rows.length) { ul.innerHTML = escVazio("Nenhuma empresa nesta seleção", "Troque o filtro ou limpe a busca.", "menos"); return; }
        rows.forEach(({ e, l, a, regime, atraso, fatPend }) => {
          const u = Number(e.usuarios) || 0;
          const chips = [
            u ? escChip("", "pessoal", plural(u, "usuário", "usuários")) : escChip("warn", "alerta", "Sem acesso de cliente"),
            atraso ? escChip("danger", "alerta", plural(Number(l.parcelasVencidas) || 0, "parcela vencida", "parcelas vencidas")) : "",
            fatPend > 0 ? escChip("warn", "relogio", `Faturamento: ${plural(fatPend, "mês pendente", "meses pendentes")}`) : "",
            a && fatPend <= 0 ? escChip("ok", "check", "Faturamento em dia") : "",
          ].join("");
          const li = el(`<li class="esc2-row emp ${atraso ? "danger" : !u ? "warn" : ""}">
            <div class="esc2-main"><b>${esc(e.nome)}</b><small>${esc(e.cnpj || "CNPJ não informado")}${regime ? " · " + esc(regime) : ""}</small>${e.grupo ? `<small>${icone("pessoal", "ico-svg ico-xs")} ${esc(e.grupo)} · Consultas automáticas suspensas</small>` : ""}</div>
            <div class="esc2-fontes">${chips}</div>
            <div class="esc2-act"><button class="btn sm" data-abrir>Abrir</button><button class="link-btn" data-user>${icone("mais", "ico-svg ico-xs")} Usuário</button></div>
          </li>`);
          li.querySelector("[data-abrir]").onclick = () => escAbrirEmpresa(e.id, "painel");
          const bu = li.querySelector("[data-user]");
          if (consulta) { bu.disabled = true; bu.title = "Perfil somente consulta"; } else bu.onclick = () => modalUsuario(e);
          ul.appendChild(li);
        });
      }
      busca.oninput = () => { EMP2.busca = busca.value; draw(); };
      draw();
    } catch (e) { c.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  }

  function modalEmpresa() {
    openModal("Nova empresa", `
      <div class="field"><label>Nome / razão social</label><input name="nome"></div>
      <div class="field"><label>CNPJ</label><input name="cnpj" placeholder="00.000.000/0000-00"></div>
    `, async (form, close, setErr) => {
      try { await jpost("/api/empresas", { nome: form.nome.value, cnpj: form.cnpj.value }); close(); viewEmpresas(); }
      catch (e) { setErr(e.message); }
    });
  }

  function modalUsuario(empresa) {
    openModal(`Novo usuário — ${empresa.nome}`, `
      <div class="field"><label>Nome</label><input name="nome"></div>
      <div class="row">
        <div class="field"><label>Usuário (login)</label><input name="usuario"></div>
        <div class="field"><label>Senha temporária</label><input name="senha" type="text" value="Portal@2026!"><small>Troca obrigatória no primeiro acesso.</small></div>
      </div>
      <div class="field"><label>E-mail</label><input name="email" type="email"></div>
    `, async (form, close, setErr) => {
      try {
        await jpost("/api/usuarios", {
          nome: form.nome.value, usuario: form.usuario.value, senha: form.senha.value,
          email: form.email.value, perfil: "cliente", empresa_id: empresa.id,
        });
        close(); viewEmpresas();
      } catch (e) { setErr(e.message); }
    });
  }

  function renderTrocaSenha() {
    root.innerHTML = `<div class="login-wrap"><form class="login-card" id="trocaForm"><h1>Crie sua senha</h1><p>Antes de acessar os documentos, substitua a senha temporária.</p><div class="alert err hide" id="senhaErro"></div><div class="field"><label>Senha temporária</label><input name="atual" type="password" autocomplete="current-password" required></div><div class="field"><label>Nova senha</label><input name="nova" type="password" autocomplete="new-password" minlength="10" required></div><div class="field"><label>Confirme a nova senha</label><input name="confirma" type="password" autocomplete="new-password" required></div><button class="btn" type="submit">Salvar nova senha</button></form></div>`;
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault(); const f=e.target;
      try { if(f.nova.value!==f.confirma.value) throw Error('As senhas não conferem.'); const r=await jpost('/api/senha',{atual:f.atual.value,nova:f.nova.value});ME=r.usuario;renderApp(); }
      catch(err){const box=f.querySelector('#senhaErro');box.textContent=err.message;box.classList.remove('hide');}
    });
  }

  // ---------- Departamento Pessoal v2: simulador ----------
  let DP_TIPO='custo';
  const DP_SIMS=[
    {k:'custo',ico:'calc',nome:'Custo de contratação',desc:'Quanto um funcionário custa por mês e por ano para a empresa.'},
    {k:'rescisao',ico:'saida',nome:'Rescisão',desc:'Verbas a pagar e custo para a empresa num desligamento CLT.'},
  ];
  // Líquido estimado do funcionário: tabelas mensais de 2026 (INSS progressivo; IRRF com desconto simplificado e a redução da Lei 15.270/2025), sem dependentes.
  const DP_TAB={inss:[[1621.00,.075],[2902.84,.09],[4354.27,.12],[8475.55,.14]],irrf:[[2428.80,0,0],[2826.65,.075,182.16],[3751.05,.15,394.16],[4664.68,.225,675.49],[Infinity,.275,908.73]],simplificado:607.20};
  function dpLiquido(bruto){
    let inss=0,ant=0;for(const [teto,a] of DP_TAB.inss){if(bruto>ant)inss+=(Math.min(bruto,teto)-ant)*a;ant=teto;}
    inss=Math.round(inss*100)/100;
    const base=Math.max(0,bruto-Math.max(inss,DP_TAB.simplificado));let ir=0;
    for(const [teto,a,ded] of DP_TAB.irrf){if(base<=teto){ir=Math.max(0,base*a-ded);break;}}
    if(bruto<=5000)ir=0;else if(bruto<=7350)ir=Math.max(0,ir-(978.62-0.133145*bruto));
    ir=Math.round(ir*100)/100;
    return {inss,ir};
  }
  async function viewDP(){
    setTitle('Departamento Pessoal','Simulações gratuitas para planejar · não alteram a folha');const c=content();c.innerHTML='';topActions().innerHTML='';const filter=officeFilterBar();if(filter)c.appendChild(filter);
    if(!FILTRO_EMPRESA){c.appendChild(el('<section class="hcard act-ok"><span aria-hidden="true">i</span><div><b>Selecione uma empresa</b><small>Escolha a empresa no topo da página para iniciar a simulação.</small></div></section>'));return;}
    const company=EMPRESAS.find(e=>String(e.id)===String(FILTRO_EMPRESA));
    acoesContexto();
    // 1) Escolha da simulação
    const tiles=el(`<section class="dp2-escolha"><div class="dp2-escolha-head"><h3 class="sec-title">O que você quer simular?</h3>${liberado('folha')?'<button class="link-btn" data-folha>Ver folha publicada →</button>':''}</div><div class="dp2-tiles" role="group" aria-label="Tipo de simulação"></div></section>`);
    DP_SIMS.forEach(s=>{const b=el(`<button type="button" class="dp2-tile ${DP_TIPO===s.k?'active':''}" aria-pressed="${DP_TIPO===s.k}"><span class="dp2-tile-ico">${icone(s.ico)}</span><span class="dp2-tile-txt"><b>${esc(s.nome)}</b><small>${esc(s.desc)}</small></span></button>`);b.onclick=()=>{if(DP_TIPO!==s.k){DP_TIPO=s.k;viewDP();}};tiles.querySelector('.dp2-tiles').appendChild(b);});
    tiles.querySelector('[data-folha]')?.addEventListener('click',()=>irPara('folha'));c.appendChild(tiles);
    // 2) Formulário curto + "mais opções"
    const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
    const salario=finFields([['salario','Salário mensal (R$)','','number']]);
    const ident=finFields([['referencia','Referência da simulação (opcional, sem CPF)',''],['convencao','Categoria / convenção coletiva de referência (opcional)','']]);
    const custoBase=`${salario}<div class="field"><label>Contribuição patronal</label><select name="regime" required><option value="">Selecione com orientação do escritório</option><option value="cpp_das">CPP incluída no DAS</option><option value="fora_das">CPP fora do DAS / encargos sobre folha</option></select></div>${finFields([['patronal','Encargos patronais totais sobre folha (%)','','number']])}`;
    const custoMais=finFields([['adicionais','Adicionais mensais fixos (R$)','0','number'],['fgts','FGTS (%)','8','number'],['beneficios','Benefícios mensais (R$)','0','number'],['coparticipacao','Desconto do empregado nos benefícios (R$)','0','number'],['outros','Outros custos mensais (R$)','0','number']]);
    const custoNota='CPP, RAT/FAP e terceiros variam por enquadramento: confirme o percentual com o escritório. Com a CPP no DAS, informe 0 em encargos patronais (o DAS não entra neste custo).';
    const resBase=`${salario}${finFields([['admissao','Data de admissão','','date'],['saida','Último dia trabalhado',today,'date']])}<div class="field"><label>Motivo</label><select name="motivo"><option value="sem_justa">Dispensa sem justa causa</option><option value="pedido">Pedido de demissão</option><option value="acordo">Acordo entre as partes</option></select></div><div class="field"><label>Aviso-prévio</label><select name="aviso"><option value="indenizado">Indenizado</option><option value="trabalhado">Trabalhado</option></select></div>${finFields([['dias_saldo','Dias de saldo salarial (0 a 30)','','number'],['avos13','Avos de 13º devidos (0 a 12)','','number'],['avos_ferias','Avos de férias proporcionais (0 a 12)','','number']])}`;
    const resMais=finFields([['medias','Médias e adicionais que integram a remuneração (R$)','0','number'],['ferias_vencidas','Períodos integrais de férias não gozadas (sem dobra)','0','number'],['fgts','FGTS sobre verbas rescisórias (%)','8','number'],['base_fgts','Base total rescisória do FGTS (R$), se conhecida','','number'],['outras_verbas','Outras verbas já conferidas (R$)','0','number'],['descontos','Descontos e retenções já conferidos (R$)','0','number'],['encargos','Encargos patronais adicionais já conferidos (R$)','0','number']]);
    const resNota='Os avos devem considerar o histórico e os efeitos do aviso (a projeção não é automática). Informe a base rescisória total do FGTS, se souber. INSS, IRRF, convenção coletiva e férias em dobro exigem conferência.';
    const custo=DP_TIPO==='custo';
    const box=el(`<form class="hcard dp2-form" novalidate><header><h3>${custo?'Dados do funcionário':'Dados do contrato (CLT, prazo indeterminado)'}</h3></header><div class="dp2-grid">${custo?custoBase:resBase}</div><details class="dp2-mais"><summary><b>Mais opções</b> <span class="muted small">${custo?'adicionais, FGTS, benefícios, outros custos, referência':'médias, férias vencidas, FGTS, descontos, encargos, referência'}</span></summary><div class="dp2-grid">${custo?custoMais:resMais}${ident}</div></details><p class="essential-note">${custo?custoNota:resNota}</p><div class="alert err hide" role="alert"></div><div class="dp2-form-acts"><button class="btn" type="submit">Calcular</button><span class="muted small">Estimativa para planejamento · conferência do escritório recomendada</span></div></form>`);
    c.appendChild(box);const f=box;
    const result=el('<div class="dp2-result" aria-live="polite"></div>');c.appendChild(result);f.addEventListener('input',()=>{result.innerHTML='';});
    const required=custo?['salario','patronal','fgts']:['salario','admissao','saida','dias_saldo','avos13','avos_ferias','fgts'];required.forEach(k=>f.elements.namedItem(k).required=true);
    if(custo){
      // CPP no DAS: o campo patronal deve ser zero; preenche se estiver vazio
      f.elements.namedItem('regime').addEventListener('change',()=>{const p=f.elements.namedItem('patronal');if(f.elements.namedItem('regime').value==='cpp_das'&&p.value==='')p.value='0';});
    }else{
      ['dias_saldo','avos13','avos_ferias','ferias_vencidas'].forEach(k=>{f.elements.namedItem(k).step='1';f.elements.namedItem(k).max=k==='dias_saldo'?'30':k==='ferias_vencidas'?'5':'12';});
      f.elements.namedItem('motivo').onchange=()=>{const pedido=f.elements.namedItem('motivo').value==='pedido';f.elements.namedItem('aviso').innerHTML=pedido?'<option value="descontado">Não cumprido, com desconto de 30 dias</option><option value="trabalhado">Trabalhado</option><option value="dispensado">Dispensado sem desconto</option>':'<option value="indenizado">Indenizado</option><option value="trabalhado">Trabalhado</option>';};
      // sugestão: dias de saldo = dia do último dia trabalhado (só se o campo estiver vazio)
      const sugerirDias=()=>{const ds=f.elements.namedItem('dias_saldo'),s=f.elements.namedItem('saida').value;if(ds.value===''&&/^\d{4}-\d{2}-\d{2}$/.test(s))ds.value=String(Math.min(30,Number(s.slice(8,10))));};
      f.elements.namedItem('saida').addEventListener('change',sugerirDias);
    }
    f.onsubmit=async e=>{e.preventDefault();
      const inv=f.querySelector(':invalid');if(inv){const det=inv.closest('details');if(det)det.open=true;}
      if(!f.reportValidity())return;const button=f.querySelector('button[type=submit]');button.disabled=true;const err=f.querySelector('[role=alert]');err.classList.add('hide');try{
      const params=Object.fromEntries(new FormData(f));const dadosInformados=Object.entries(params).map(([key,value])=>{const field=f.elements.namedItem(key);return [(field?.closest('.field')?.querySelector('label')?.textContent||key),field?.tagName==='SELECT'?field.selectedOptions[0]?.textContent:value];});params.empresa_id=Number(FILTRO_EMPRESA);params.tipo=DP_TIPO;const d=await jpost('/api/dp/simular',params);
      const detail=DP_TIPO==='custo'?d.componentes:[...d.creditos,...d.descontos.map(x=>({descricao:'Desconto: '+x.descricao,valor:-x.valor}))];
      const kpis=DP_TIPO==='custo'?[['Custo médio mensal',d.mensal],['Custo anual estimado',d.anual]]:[['Verbas brutas',d.bruto],['Subtotal após descontos informados',d.subtotal_informado],[d.custo_incompleto?'Custo parcial da empresa':'Custo conforme premissas',d.custo_empresa]];
      // relatório para download (mesmo conteúdo da versão anterior)
      let report=`<h2>${DP_TIPO==='custo'?'Custo do funcionário':'Simulação de rescisão'}</h2><p>${esc(company?.nome||'')} · ${esc(params.referencia||'Sem identificação pessoal')} · ${esc(params.convencao||'Convenção não informada')}</p><p>Estimativa para planejamento. Conferência do escritório necessária.</p><div class="finance-kpis">${kpis.map(([label,v])=>`<article><small>${esc(label)}</small><strong>${finBRL(v)}</strong></article>`).join('')}</div><table><thead><tr><th>Componente</th><th>Valor</th></tr></thead><tbody>${detail.map(x=>`<tr><td>${esc(x.descricao)}</td><td>${finBRL(x.valor)}</td></tr>`).join('')}</tbody></table>`;
      const recolh=DP_TIPO==='rescisao'?`<p>FGTS estimado sobre verbas: ${finBRL(d.deposito_fgts)}<br>Multa FGTS (${d.aliquota_multa}%): ${d.multa_fgts==null?'Pendente de base':finBRL(d.multa_fgts)}<br>Encargos adicionais informados: ${finBRL(d.encargos)}<br>Aviso de referência: ${d.dias_aviso_referencia} dias. No acordo, a indenização do aviso corresponde à metade.</p><p><b>O subtotal não é o líquido definitivo. Retenções não calculadas podem alterar o valor a pagar ao empregado.</b></p>`:'';
      if(DP_TIPO==='rescisao')report+=`<h3>Recolhimentos e custo da empresa</h3>${recolh}`;
      const extras=`<h3>Premissas</h3>${d.premissas.map(v=>`<p>${esc(v)}</p>`).join('')}<h3>Limites da estimativa</h3>${d.alertas.map(v=>`<p>${esc(v)}</p>`).join('')}<h3>Dados informados</h3><p>${dadosInformados.map(([k,v])=>esc(k)+': '+esc(v||'não informado')).join('<br>')}</p><h3>Fontes oficiais</h3>${d.fontes.map(v=>`<p><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.titulo)}</a></p>`).join('')}<p>${esc(d.versao)} · ${fmtDateTime(d.calculado_em)}</p>`;
      report+=extras;
      // resultado na tela: funcionário × empresa (padrão Gusto) e encargos em sanfona
      const n=v=>Number(String(v??'').replace(',','.'))||0;
      const linha=(t,v,cls='')=>`<li class="${cls}"><span>${t}</span><b>${v}</b></li>`;
      let lado1,lado2,sanfona;
      if(DP_TIPO==='custo'){
        const bruto=n(params.salario)+n(params.adicionais),cop=n(params.coparticipacao),{inss,ir}=dpLiquido(bruto),liq=Math.max(0,bruto-inss-ir-cop);
        const pct=bruto>0?(d.mensal/100/bruto-1)*100:null;
        lado1=`<span class="kpi-label">O funcionário recebe</span><p class="kpi">${brl(liq)}</p><small class="muted">líquido estimado por mês</small><ul class="dp2-lines">${linha('Salário bruto'+(n(params.adicionais)?' + adicionais':''),brl(bruto))}${linha('INSS (estimado)','− '+brl(inss))}${linha('IRRF (estimado)',ir?'− '+brl(ir):'Isento')}${cop?linha('Desconto nos benefícios','− '+brl(cop)):''}</ul><p class="small muted">Tabelas de 2026, sem dependentes nem outras deduções. O valor exato sai na folha.</p>`;
        lado2=`<span class="kpi-label">A empresa paga</span><p class="kpi">${finBRL(d.mensal)}</p><small class="muted">custo total por mês · ${finBRL(d.anual)} por ano</small>${pct!==null?`<div class="dp2-barra" role="img" aria-label="Salário ${fatNum(100/(1+pct/100),0)}% e encargos ${fatNum(100-100/(1+pct/100),0)}% do custo"><span style="width:${Math.max(4,Math.min(100,100/(1+pct/100)))}%"></span></div><p class="small"><b>+${fatNum(pct,0)}%</b> sobre o salário em encargos, provisões e benefícios</p>`:''}`;
        sanfona=`<details class="dp2-acc" open><summary><b>Ver os encargos</b> <span class="muted small">${detail.length} componentes do custo mensal</span></summary><ul class="dp2-lines">${detail.map(x=>linha(esc(x.descricao),finBRL(x.valor))).join('')}${linha('Total por mês',finBRL(d.mensal),'tot')}</ul></details>`;
      }else{
        const desc=d.descontos.reduce((s,x)=>s+x.valor,0);
        lado1=`<span class="kpi-label">O funcionário recebe</span><p class="kpi">${finBRL(d.subtotal_informado)}</p><small class="muted">subtotal antes de INSS e IRRF (não calculados)</small><ul class="dp2-lines">${linha('Verbas brutas',finBRL(d.bruto))}${desc?linha('Descontos informados','− '+finBRL(desc)):''}</ul><p class="small muted">O subtotal não é o líquido definitivo: retenções não calculadas podem alterar o valor.</p>`;
        lado2=`<span class="kpi-label">A empresa paga</span><p class="kpi">${finBRL(d.custo_empresa)}</p><small class="${d.custo_incompleto?'txt-warn':'muted'}">${d.custo_incompleto?'<span aria-hidden="true">!</span> custo parcial: falta a multa do FGTS, que depende do saldo da conta':'custo conforme as premissas'}</small><ul class="dp2-lines">${linha('Verbas brutas',finBRL(d.bruto))}${linha('FGTS sobre as verbas',finBRL(d.deposito_fgts))}${linha(`Multa do FGTS (${d.aliquota_multa}%)`,d.multa_fgts==null?'Pendente de base':finBRL(d.multa_fgts))}${d.encargos?linha('Encargos adicionais informados',finBRL(d.encargos)):''}</ul>`;
        sanfona=`<details class="dp2-acc" open><summary><b>Ver as verbas</b> <span class="muted small">${detail.length} ${detail.length===1?'item':'itens'} · aviso de referência de ${d.dias_aviso_referencia} dias</span></summary><ul class="dp2-lines">${detail.map(x=>linha(esc(x.descricao),finBRL(x.valor),x.valor<0?'neg':'')).join('')}${linha('Subtotal',finBRL(d.subtotal_informado),'tot')}</ul><p class="small muted">No acordo entre as partes, a indenização do aviso corresponde à metade.</p></details>`;
      }
      result.innerHTML=`<section class="hcard dp2-res"><header><h3>Resultado · ${DP_TIPO==='custo'?'Custo de contratação':'Rescisão'}</h3><span class="status-chip info"><span aria-hidden="true">i</span> Estimativa</span></header><p class="small muted dp2-ref">${esc(company?.nome||'')} · ${esc(params.referencia||'Sem identificação pessoal')} · ${esc(params.convencao||'Convenção não informada')}</p><div class="dp2-duo"><div class="dp2-lado">${lado1}</div><div class="dp2-lado empresa">${lado2}</div></div>${sanfona}<details class="dp2-acc"><summary><b>Premissas, limites e fontes</b> <span class="muted small">${esc(d.versao)}</span></summary><div class="dp2-extras">${extras}</div></details><div class="dp2-res-acts"><button class="btn" data-review>Pedir conferência ao escritório</button><button class="btn ghost" data-report>Baixar relatório</button></div></section>`;
      result.querySelector('[data-report]').onclick=()=>{const blob=new Blob(['<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Simulação DP</title><style>body{font:17px Arial;max-width:960px;margin:40px auto;color:#173541;padding:24px}table{border-collapse:collapse;width:100%}td,th{padding:12px;text-align:left;border-bottom:1px solid #ccc}article{display:inline-block;min-width:220px;padding:18px}small,strong{display:block}strong{font-size:26px}a{color:#087f74}</style>'+report+'</html>'],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='simulacao-dp.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
      result.querySelector('[data-review]').onclick=()=>modalNovaSolicitacao({assunto:'Conferência de simulação DP: '+(params.tipo==='custo'?'custo do funcionário':'rescisão'),corpo:'Solicito conferência da estimativa DP.\n'+dadosInformados.map(([k,v])=>k+': '+v).join('\n')+'\n\n'+kpis.map(([k,v])=>k+': '+finBRL(v)).join('\n')+'\nVersão: '+d.versao});
      result.scrollIntoView({block:'start',behavior:'smooth'});
    }catch(e){err.textContent=e.message;err.classList.remove('hide');}finally{button.disabled=false;}};
  }

  // ---------- Certificado digital v2: um cartão de situação + renovação em um clique ----------
  const CERT_NOMES={valido:'Válido',vence_em_breve:'Vence em breve',vencido:'Vencido',sem_certificado:'Sem certificado cadastrado',validade_desconhecida:'Validade não informada',nao_confirmado:'Situação não confirmada'};
  const CERT_ASSUNTO='Atualização do certificado digital';
  // Faixas: neutro (> 60 dias) · atenção (≤ 60) · crítico (≤ 15) · vencido
  function certSituacao(cert){
    if(!cert)return {tom:'info',ico:'relogio',titulo:'Aguardando sincronização',curto:'Aguardando dados'};
    const d=cert.dias_restantes;
    if(cert.status==='sem_certificado')return {tom:'info',ico:'certificado',titulo:'Nenhum certificado cadastrado',curto:'Sem certificado'};
    if(d==null)return {tom:'info',ico:'relogio',titulo:CERT_NOMES[cert.status]||'Validade não informada',curto:'Sem data'};
    if(d<0)return {tom:'danger',ico:'alerta',titulo:`Vencido há ${-d} dia${d===-1?'':'s'}`,curto:'Vencido'};
    if(d===0)return {tom:'danger',ico:'alerta',titulo:'Vence hoje',curto:'Renovar agora'};
    if(d<=15)return {tom:'danger',ico:'alerta',titulo:`Vence em ${d} dia${d===1?'':'s'}`,curto:'Renovar agora'};
    if(d<=60)return {tom:'warn',ico:'relogio',titulo:`Vence em ${d} dias`,curto:'Renovar em breve'};
    return {tom:'ok',ico:'check',titulo:`Válido por mais ${d} dias`,curto:'Válido'};
  }
  const certVenc=cert=>cert?.vencimento?String(cert.vencimento).slice(0,10):'';
  async function viewCertificado(){
    setTitle('Certificado digital','Validade e renovação');const c=content();c.innerHTML='';const filter=officeFilterBar();if(filter)c.appendChild(filter);
    acoesContexto();
    if(!FILTRO_EMPRESA){
      if(!isOffice()){c.appendChild(el('<div class="empty">Selecione uma empresa para consultar o certificado digital.</div>'));return;}
      return certificadosTodas(c);
    }
    const company=FILTRO_EMPRESA;
    try{
      const [d,s]=await Promise.all([api('/api/certificado-digital'+empParam()),api('/api/solicitacoes'+empParam())]);
      if(VIEW!=='certificado'||company!==FILTRO_EMPRESA)return;
      const cert=d.certificado,empresa=EMPRESAS.find(e=>String(e.id)===String(FILTRO_EMPRESA));
      const requests=s.solicitacoes.filter(x=>x.assunto===CERT_ASSUNTO);const active=requests.find(x=>['aberta','respondida','em_andamento'].includes(x.status));
      const sit=certSituacao(cert),dias=cert?.dias_restantes,venc=certVenc(cert);
      const pct=dias==null?0:Math.max(0,Math.min(100,Math.round(dias/365*100)));
      const card=el(`<section class="hcard dv2 cert2 ${sit.tom}" aria-label="Certificado digital da empresa">
        <div class="cert2-top">
          <i class="cert2-seal" aria-hidden="true">${icone('certificado')}</i>
          <div class="cert2-id"><span class="kpi-label">Certificado digital (e-CNPJ)</span><b>${esc(empresa?.nome||'Empresa')}</b>${empresa?.cnpj?`<small>CNPJ ${esc(empresa.cnpj)}</small>`:''}</div>
          ${chipHtml(sit.tom,sit.ico,sit.curto)}
        </div>
        <h3 class="cert2-big">${esc(sit.titulo)}</h3>
        ${dias!=null?`<div class="cert2-meter"><div class="meter" role="img" aria-label="${dias<0?'Vencido':dias+' de 365 dias restantes'}"><span style="width:${pct}%"></span></div><div class="cert2-marks" aria-hidden="true"><i style="left:${(15/365*100).toFixed(1)}%">15</i><i style="left:${(60/365*100).toFixed(1)}%">60 dias</i></div></div>`:''}
        <dl class="cert2-facts"><div><dt>Vencimento</dt><dd>${venc?fmtDate(venc):'Não informado'}</dd></div><div><dt>Última sincronização</dt><dd>${cert?.sincronizado_em?fmtDateTime(cert.sincronizado_em):'Aguardando dados'}</dd></div></dl>
        ${cert&&!cert.confirmacao_recente?`<p class="cert2-aviso">${icone('alerta','ico-svg ico-xs')} Situação a confirmar: a data acima é a última cadastrada.</p>`:''}
        <div class="cert2-acts"></div>
        <p class="essential-note">O escritório cuida do pedido e responde com os próximos passos. Não envie o arquivo do certificado, a chave ou a senha por mensagem.</p>
      </section>`);
      const acts=card.querySelector('.cert2-acts');
      if(active){
        addAcao(acts,{txt:'Renovação solicitada',tipo:'ghost',off:true});
        addAcao(acts,{txt:'Acompanhar '+active.protocolo,tipo:'link',onClick:()=>modalSolicitacao(active)});
      }else{
        addAcao(acts,{txt:sit.tom==='ok'?'Solicitar atualização':'Solicitar renovação',tipo:sit.tom==='ok'||sit.tom==='info'?'ghost':'primario',off:ME.funcao==='consulta',onClick:()=>modalNovaSolicitacao({assunto:CERT_ASSUNTO,corpo:`Solicito orientação para atualização / renovação do certificado digital da empresa ${empresa?.nome||''}.\nVencimento informado: ${venc?fmtDate(venc):'não informado'}.\n\nMelhor contato e observações: `,onCreated:()=>viewCertificado()})});
      }
      c.appendChild(card);
      const hist=el(`<section class="hcard dv2 obr-list cert2-hist"><header><h3>Pedidos de renovação</h3><span class="count">${requests.length}</span></header><ul></ul></section>`);
      const ul=hist.querySelector('ul');
      if(!requests.length)ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">${icone('check')}</span><div><b>Nenhum pedido ainda</b><small>Quando você solicitar a renovação, o andamento aparece aqui.</small></div></li>`));
      requests.forEach(r=>{const [txt,cls]=STATUS_SOL[r.status]||[r.status,''];const t=cls==='muted'?'':cls;const li=el(`<li class="obr-row ${t}">${chipHtml(t,r.status==='fechada'?'check':'relogio',txt)}<div class="obr-main"><b>${esc(r.protocolo)}</b><small>Aberto em ${fmtDateTime(r.criada_em)}${r.responsavel?' · '+esc(r.responsavel):''}</small></div><span class="obr-prazo">${r.prazo?'Prazo '+fmtDate(r.prazo):''}</span><span class="obr-act"><button class="btn sm ghost">Acompanhar</button></span></li>`);li.querySelector('button').onclick=()=>modalSolicitacao(r);ul.appendChild(li);});
      c.appendChild(hist);
    }catch(e){c.appendChild(el(`<div class="alert err">${esc(e.message)}</div>`));}
  }
  // Escritório com "Todas as empresas": quem vence primeiro.
  async function certificadosTodas(c){
    const loading=el('<div class="empty">Carregando certificados…</div>');c.appendChild(loading);
    const lista=await Promise.all(EMPRESAS.map(async e=>({e,cert:(await pegar('/api/certificado-digital?empresa_id='+encodeURIComponent(e.id)))?.certificado||null})));
    if(VIEW!=='certificado'||FILTRO_EMPRESA)return;
    loading.remove();
    lista.forEach(x=>x.sit=certSituacao(x.cert));
    lista.sort((a,b)=>(a.cert?.dias_restantes??1e9)-(b.cert?.dias_restantes??1e9));
    const venc=lista.filter(x=>x.sit.tom==='danger').length,aten=lista.filter(x=>x.sit.tom==='warn').length;
    const tom=venc?'danger':aten?'warn':'ok';
    c.appendChild(el(`<section class="obr-hero dv2 ${tom}"><span class="obr-hero-ico" aria-hidden="true">${icone(tom==='ok'?'check':'alerta')}</span><div><h3>${venc?`${venc} certificado${venc===1?'':'s'} vencido${venc===1?'':'s'} ou vencendo em 15 dias`:aten?`${aten} certificado${aten===1?'':'s'} vence${aten===1?'':'m'} em até 60 dias`:'Todos os certificados em dia'}</h3><p>${plural(lista.length,'empresa','empresas')} · ordenadas pelo vencimento mais próximo</p></div></section>`));
    const box=el('<section class="hcard dv2 obr-list"><header><h3>Certificados das empresas</h3></header><ul></ul></section>');
    lista.forEach(({e,cert,sit})=>{const v=certVenc(cert);const li=el(`<li class="obr-row ${sit.tom}">${chipHtml(sit.tom,sit.ico,sit.curto)}<div class="obr-main"><b>${esc(e.nome)}</b><small>${v?'Vencimento '+fmtDate(v):'Vencimento não informado'}</small></div><span class="obr-prazo ${sit.tom==='danger'?'txt-danger':''}">${v?esc(quando(v)):''}</span><span class="obr-act"><button class="btn sm ghost">Abrir</button></span></li>`);li.querySelector('button').onclick=()=>{FILTRO_EMPRESA=String(e.id);routeView();};box.querySelector('ul').appendChild(li);});
    c.appendChild(box);
  }

  // ---------- Financeiro v2: "quanto tenho a pagar e a receber?" ----------
  let FIN_TIPO='receber',FIN_MES='',FIN_BUSCA='',FIN_ABA='contas',FIN_FILTRO='pagar',FIN_EST_BUSCA='',FIN_EST_BAIXO=false;
  const finBRL=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const finDiaMais=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('en-CA');};
  const finAberto=r=>!r.cancelado&&r.saldo>0;
  const finVencido=r=>finAberto(r)&&r.vencimento<hojeLocal();
  function finSit(r){
    if(r.cancelado)return ['','✕','Cancelado'];
    if(!(r.saldo>0))return ['ok','✓',r.tipo==='pagar'?'Pago':'Recebido'];
    if(finVencido(r))return ['danger','!',r.situacao==='Parcial'?'Vencido · parcial':'Vencido'];
    if(r.situacao==='Parcial')return ['warn','◐','Parcial'];
    return ['info','○','Em aberto'];
  }
  async function viewFinanceiro(){
    setTitle('Financeiro','Contas a pagar e a receber · estoque');const c=content();c.innerHTML='';topActions().innerHTML='';await ensureEmpresas();const filtro=officeFilterBar();if(filtro)c.appendChild(filtro);
    if(!FILTRO_EMPRESA){c.appendChild(el('<section class="hcard act-ok"><span aria-hidden="true">i</span><div><b>Selecione uma empresa</b><small>Escolha a empresa no topo da página para abrir o financeiro.</small></div></section>'));return;}
    const company=FILTRO_EMPRESA;c.appendChild(el('<div class="empty">Carregando financeiro…</div>'));
    try{
      const d=await api('/api/financeiro/painel'+empParam());if(VIEW!=='financeiro'||company!==FILTRO_EMPRESA)return;c.innerHTML='';
      const sub=d.assinatura,podeEditar=sub.liberado&&ME.funcao!=='consulta';
      const admin=ME.perfil==='escritorio'&&ME.funcao==='administrador';
      // Ações do topo
      if(FIN_ABA==='contas'){const nb=el(`<button class="btn" ${podeEditar?'':'disabled'}>＋ Novo lançamento</button>`);nb.onclick=()=>finTitulo();topActions().appendChild(nb);}
      topActions().appendChild(el(`<a class="btn ghost" href="/api/financeiro/exportar${empParam()}">Exportar CSV</a>`));
      // Plano (módulo opcional): destaque só quando não está liberado
      const planoTxt=`${sub.ate?'Liberação até '+fmtDate(sub.ate)+'. ':''}${sub.valor_mensal!=null&&sub.valor_mensal!==15000?'Mensalidade cadastrada: '+finBRL(sub.valor_mensal)+'. ':''}`;
      const planoBtn=admin?'<button class="btn sm" data-sub>Gerenciar assinatura</button>':!sub.liberado?'<button class="btn sm" data-contract>Solicitar contratação</button>':'';
      const ligarPlano=box=>{box.querySelector('[data-sub]')?.addEventListener('click',()=>finAssinatura(sub));box.querySelector('[data-contract]')?.addEventListener('click',()=>modalNovaSolicitacao({assunto:'Interesse no Financeiro Empresarial · R$ 150,00/mês',corpo:'Gostaria de contratar o módulo Financeiro Empresarial por R$ 150,00 mensais por empresa. Por favor, informem as condições e a forma de pagamento para ativação.'}));return box;};
      if(sub.liberado)c.appendChild(ligarPlano(el(`<div class="fin2-faixa" role="status"><span class="status-chip ok"><span aria-hidden="true">✓</span> ${sub.situacao==='piloto'?'Piloto liberado':'Assinatura ativa'}${sub.ate?' até '+fmtDate(sub.ate):''}</span><span class="small muted">Financeiro Empresarial · plano mensal por empresa${sub.valor_mensal!=null&&sub.valor_mensal!==15000?' · mensalidade '+finBRL(sub.valor_mensal):''}</span>${admin?'<button class="link-btn" data-sub>Gerenciar assinatura</button>':''}</div>`)));
      if(!sub.liberado)c.appendChild(ligarPlano(el(`<section class="obr-hero info fin2-plano"><span class="obr-hero-ico" aria-hidden="true">${icone('financeiro')}</span><div><h3>Financeiro Empresarial · módulo opcional</h3><p>Contas a pagar e a receber, parcelas e recorrências, estoque e exportação por R$ 150,00/mês por empresa. O escritório libera o módulo após combinar o pagamento; o histórico já registrado continua disponível para consulta e exportação. ${esc(planoTxt)}</p></div>${planoBtn}</section>`)));

      // 1) Resumo: a pagar / a receber (vencidos + próximos 7 dias) e saldo previsto em 30 dias
      const hoje=hojeLocal(),em7=finDiaMais(hoje,7),em30=finDiaMais(hoje,30);
      const abertos=d.titulos.filter(finAberto),soma=l=>l.reduce((s,r)=>s+r.saldo,0);
      const grupo=t=>{const l=abertos.filter(r=>r.tipo===t);return {venc:l.filter(r=>r.vencimento<hoje),sem:l.filter(r=>r.vencimento>=hoje&&r.vencimento<=em7),ate30:l.filter(r=>r.vencimento<=em30),todos:l};};
      const P=grupo('pagar'),R=grupo('receber');
      const np=P.venc.length,nr=R.venc.length;
      const hero=el(`<section class="obr-hero fin2-hero ${np?'danger':nr?'warn':'ok'}"><span class="obr-hero-ico" aria-hidden="true">${np||nr?'!':'✓'}</span><div><h3>${np?`${np} ${np===1?'conta a pagar vencida':'contas a pagar vencidas'} · ${finBRL(soma(P.venc))}`:nr?`${nr} ${nr===1?'recebimento atrasado':'recebimentos atrasados'} · ${finBRL(soma(R.venc))}`:'Nada vencido'}</h3><p>${np&&nr?`Também há ${nr} ${nr===1?'recebimento atrasado':'recebimentos atrasados'} (${finBRL(soma(R.venc))}).`:np?'Nenhum recebimento em atraso.':nr?'Nenhuma conta a pagar vencida.':`Próximos 7 dias: ${finBRL(soma(P.sem))} a pagar e ${finBRL(soma(R.sem))} a receber.`}</p></div>${np||nr?'<button class="btn ghost sm">Ver vencidos</button>':''}</section>`);
      hero.querySelector('button')?.addEventListener('click',()=>{FIN_ABA='contas';FIN_FILTRO='vencidos';viewFinanceiro();});c.appendChild(hero);
      const cartao=(titulo,G,tipo)=>{const card=el(`<div class="hcard fin2-card"><span class="kpi-label">${titulo} · vencido e próximos 7 dias</span><span class="kpi">${finBRL(soma(G.venc)+soma(G.sem))}</span><ul class="fin2-mini"><li class="${G.venc.length?'txt-danger':''}"><span>${G.venc.length?'<span aria-hidden="true">!</span> ':''}Vencido</span><b>${finBRL(soma(G.venc))}${G.venc.length?' · '+G.venc.length:''}</b></li><li><span>Até ${fmtDate(em7)}</span><b>${finBRL(soma(G.sem))}${G.sem.length?' · '+G.sem.length:''}</b></li><li class="muted"><span>Total em aberto</span><b>${finBRL(soma(G.todos))}</b></li></ul><button class="link-btn">Ver contas ${tipo==='pagar'?'a pagar':'a receber'} →</button></div>`);card.querySelector('.link-btn').onclick=()=>{FIN_ABA='contas';FIN_FILTRO=tipo;FIN_TIPO=tipo;viewFinanceiro();};return card;};
      const saldo=soma(R.ate30)-soma(P.ate30);
      const resumo=el('<div class="guia-summary fin2-resumo"></div>');resumo.appendChild(cartao('A pagar',P,'pagar'));resumo.appendChild(cartao('A receber',R,'receber'));
      resumo.appendChild(el(`<div class="hcard fin2-card"><span class="kpi-label">Saldo previsto até ${fmtDate(em30)}</span><span class="kpi ${saldo<0?'txt-danger':''}">${saldo<0?'− ':''}${finBRL(Math.abs(saldo))}</span><ul class="fin2-mini"><li><span>A receber</span><b>${finBRL(soma(R.ate30))}</b></li><li><span>A pagar</span><b>− ${finBRL(soma(P.ate30))}</b></li></ul><small class="muted">Inclui vencidos; não considera o saldo bancário.</small></div>`));
      c.appendChild(resumo);

      // 2) Abas internas: Contas · Fluxo de caixa · Estoque
      const abas=el('<div class="chip-filter fin2-abas" role="group" aria-label="Área do financeiro"></div>');
      [['contas','Contas a pagar e receber',abertos.length],['fluxo','Fluxo de caixa',null],['estoque','Estoque',null]].forEach(([k,l,n])=>{const b=el(`<button class="pill ${FIN_ABA===k?'active':''}" aria-pressed="${FIN_ABA===k}">${l}${n!=null?` <span class="n">${n}</span>`:''}</button>`);b.onclick=()=>{if(FIN_ABA!==k){FIN_ABA=k;viewFinanceiro();}};abas.appendChild(b);});
      c.appendChild(abas);
      if(FIN_ABA==='estoque')await finEstoque(c,sub);
      else if(FIN_ABA==='fluxo')finFluxo(c,d.titulos);
      else finContas(c,d.titulos,podeEditar);

      // Nota curta
      c.appendChild(el('<p class="essential-note">Baixas são registros manuais: não movimentam dinheiro nem confirmam pagamento no banco.</p>'));
    }catch(e){c.innerHTML='';c.appendChild(el(`<div class="alert err">${esc(e.message)}</div>`));}
  }
  function finContas(c,titulos,podeEditar){
    const filtros=[['pagar','A pagar',r=>r.tipo==='pagar'&&finAberto(r)],['receber','A receber',r=>r.tipo==='receber'&&finAberto(r)],['vencidos','Vencidos',finVencido],['pagos','Pagos e recebidos',r=>!r.cancelado&&!(r.saldo>0)],['todos','Todos',()=>true]];
    if(!filtros.some(([k])=>k===FIN_FILTRO))FIN_FILTRO='pagar';
    const sec=el(`<section class="hcard fin2-contas"><div class="fin2-barra"><div class="chip-filter" role="group" aria-label="Filtrar contas"></div><div class="fin2-busca"><input type="search" aria-label="Buscar contas" placeholder="Buscar descrição, contato ou categoria" value="${esc(FIN_BUSCA)}"><label class="fin2-mes"><span class="muted small">Vencimento</span><input type="month" aria-label="Mês de vencimento" value="${esc(FIN_MES)}"></label><button class="link-btn" data-limpar ${FIN_MES?'':'hidden'}>Todos os meses</button></div></div><p class="small muted fin2-soma" aria-live="polite"></p><ul class="fin2-lista"></ul></section>`);
    const bar=sec.querySelector('.chip-filter');
    filtros.forEach(([k,l,fn])=>{const n=titulos.filter(fn).length;const b=el(`<button class="pill ${FIN_FILTRO===k?'active':''}" aria-pressed="${FIN_FILTRO===k}">${l} <span class="n">${n}</span></button>`);b.onclick=()=>{FIN_FILTRO=k;if(k==='pagar'||k==='receber')FIN_TIPO=k;bar.querySelectorAll('.pill').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});draw();};bar.appendChild(b);});
    const ul=sec.querySelector('ul'),somaEl=sec.querySelector('.fin2-soma');
    function draw(){
      const fn=filtros.find(([k])=>k===FIN_FILTRO)[2],q=FIN_BUSCA.toLocaleLowerCase();
      const rows=titulos.filter(r=>fn(r)&&(!FIN_MES||r.vencimento.startsWith(FIN_MES))&&[r.descricao,r.contato,r.categoria,r.centro_custo].join(' ').toLocaleLowerCase().includes(q));
      rows.sort((a,b)=>FIN_FILTRO==='pagos'||FIN_FILTRO==='todos'?b.vencimento.localeCompare(a.vencimento):a.vencimento.localeCompare(b.vencimento));
      const val=rows.filter(r=>!r.cancelado),aberto=val.reduce((s,r)=>s+r.saldo,0),total=val.reduce((s,r)=>s+r.valor,0);
      somaEl.textContent=rows.length?`${rows.length} ${rows.length===1?'conta':'contas'} · ${FIN_FILTRO==='pagos'?finBRL(total)+' liquidado':finBRL(aberto)+' em aberto'+(total!==aberto?' de '+finBRL(total):'')}`:'';
      ul.innerHTML='';
      if(!rows.length){ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">✓</span><div><b>${FIN_FILTRO==='vencidos'?'Nada vencido':'Nada por aqui'}</b><small>${titulos.length?'Nenhuma conta neste filtro.':'Nenhuma conta cadastrada ainda.'}${podeEditar?' Use "Novo lançamento" para cadastrar.':''}</small></div></li>`));return;}
      rows.forEach(r=>{
        const [tom,ico,txt]=finSit(r),dt=new Date(r.vencimento+'T12:00:00');
        const li=el(`<li class="fin2-row ${tom==='danger'?'danger':''} ${r.cancelado?'cancelado':''}">
          <span class="nota-date" aria-hidden="true"><b>${dt.getDate()}</b>${dt.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span>
          <div class="fin2-main"><b>${esc(r.descricao)}</b><small><span class="fin2-tipo ${r.tipo}">${r.tipo==='pagar'?'↑ A pagar':'↓ A receber'}</span> · ${esc(r.contato)} · ${esc(r.categoria||'Sem categoria')}${r.total_parcelas>1?` · parcela ${r.parcela}/${r.total_parcelas}`:''}</small></div>
          <div class="fin2-st"><span class="status-chip ${tom}"><span aria-hidden="true">${ico}</span> ${esc(txt)}</span><small class="${tom==='danger'?'txt-danger':'muted'}">${finAberto(r)?esc(quando(r.vencimento)):'Venc. '+fmtDate(r.vencimento)}</small></div>
          <div class="fin2-val"><b>${finBRL(finAberto(r)?r.saldo:r.valor)}</b>${finAberto(r)&&r.saldo!==r.valor?`<small>de ${finBRL(r.valor)}</small>`:''}</div>
          <div class="fin2-act"></div>
        </li>`);
        const act=li.querySelector('.fin2-act');
        const pode=podeEditar&&!r.cancelado,editavel=pode&&!r.baixas.length;
        const add=(t,cls,fn)=>{const b=el(`<button class="${cls}">${esc(t)}</button>`);b.onclick=fn;act.appendChild(b);return b;};
        if(pode&&r.saldo>0)add('Dar baixa','btn sm',()=>finBaixa(r));
        else if(editavel)add('Editar','btn sm',()=>finTitulo(r));
        else add('Detalhes','btn sm ghost',()=>finDetalhe(r));
        if(pode&&r.saldo>0||editavel)add('Detalhes','link-btn',()=>finDetalhe(r));
        if(editavel&&r.saldo>0)add('Editar','link-btn',()=>finTitulo(r));
        if(editavel)add('Cancelar','link-btn',()=>openModal('Cancelar lançamento',`<p>Cancelar ${esc(r.descricao)} (${finBRL(r.valor)})? O registro permanecerá no histórico.</p>`,async(f,close,err)=>{try{await jpost('/api/financeiro/titulos',{empresa_id:Number(FILTRO_EMPRESA),id:r.id,acao:'cancelar'});close();viewFinanceiro();}catch(e){err(e.message);}}));
        ul.appendChild(li);
      });
    }
    sec.querySelector('[type=search]').oninput=e=>{FIN_BUSCA=e.target.value;draw();};
    const mes=sec.querySelector('[type=month]'),limpar=sec.querySelector('[data-limpar]');
    mes.onchange=e=>{FIN_MES=e.target.value;limpar.hidden=!FIN_MES;draw();};
    limpar.onclick=()=>{FIN_MES='';mes.value='';limpar.hidden=true;draw();};
    c.appendChild(sec);draw();
  }
  const finQty=n=>(n/1000).toLocaleString('pt-BR',{maximumFractionDigits:3});
  async function finEstoque(c,sub){
    const data=await api('/api/financeiro/estoque'+empParam()),editable=sub.liberado&&ME.funcao!=='consulta';
    const baixos=data.produtos.filter(p=>p.saldo<=p.minimo);
    const box=el(`<section class="hcard fin2-estoque"><header><div><h3>Produtos e estoque</h3><p class="small muted">Entradas, saídas e saldo físico registrado.</p></div><div class="fin2-est-acts"><button class="btn ghost sm" data-csv ${data.produtos.length?'':'disabled'}>Baixar CSV</button><button class="btn sm" data-product ${editable?'':'disabled'}>Cadastrar produto</button></div></header>
      ${baixos.length?`<p class="fin2-est-alerta"><span class="status-chip warn"><span aria-hidden="true">!</span> ${baixos.length} ${baixos.length===1?'produto no mínimo ou abaixo':'produtos no mínimo ou abaixo'}</span></p>`:''}
      <div class="fin2-busca"><input type="search" aria-label="Buscar produto" placeholder="Buscar por nome ou código" value="${esc(FIN_EST_BUSCA)}"><label class="fin2-check"><input type="checkbox" ${FIN_EST_BAIXO?'checked':''}> Só estoque baixo</label></div>
      <ul class="fin2-lista"></ul></section>`);c.appendChild(box);
    box.querySelector('[data-product]').onclick=()=>openModal('Cadastrar produto',finFields([['codigo','Código do produto',''],['nome','Nome do produto',''],['unidade','Unidade (ex.: UN, KG)','UN'],['minimo','Estoque mínimo','0','number'],['preco','Preço de venda (R$)','0','number']]),async(f,close,error)=>{try{await jpost('/api/financeiro/produtos',{empresa_id:Number(FILTRO_EMPRESA),...Object.fromEntries(['codigo','nome','unidade','minimo','preco'].map(k=>[k,f.elements.namedItem(k).value]))});close();viewFinanceiro();}catch(e){error(e.message);}});
    box.querySelector('[data-csv]').onclick=()=>baixarCsv('estoque.csv',[['Código','Produto','Unidade','Saldo','Mínimo','Preço de venda (R$)','Situação'],...data.produtos.map(p=>[p.codigo,p.nome,p.unidade,finQty(p.saldo),finQty(p.minimo),csvNum(p.preco/100),p.saldo<=p.minimo?'Estoque baixo':'OK'])]);
    const ul=box.querySelector('ul');
    function draw(){
      const q=FIN_EST_BUSCA.toLocaleLowerCase();
      const lista=data.produtos.filter(p=>(!FIN_EST_BAIXO||p.saldo<=p.minimo)&&(p.nome+' '+p.codigo).toLocaleLowerCase().includes(q)).sort((a,b)=>(a.saldo<=a.minimo?0:1)-(b.saldo<=b.minimo?0:1)||a.nome.localeCompare(b.nome));
      ul.innerHTML='';
      if(!data.produtos.length){ul.appendChild(el('<li class="act-ok"><span aria-hidden="true">i</span><div><b>Nenhum produto cadastrado</b><small>Comece pelo cadastro e registre uma entrada para informar o saldo inicial.</small></div></li>'));return;}
      if(!lista.length){ul.appendChild(el('<li class="act-ok"><span aria-hidden="true">✓</span><div><b>Nada por aqui</b><small>Nenhum produto neste filtro.</small></div></li>'));return;}
      lista.forEach(p=>{
        const baixo=p.saldo<=p.minimo;
        const row=el(`<li class="fin2-row est ${baixo?'warn':''}"><div class="fin2-main"><b>${esc(p.nome)}</b><small>${esc(p.codigo)} · ${esc(p.unidade)} · venda ${finBRL(p.preco)}</small></div><div class="fin2-st">${baixo?'<span class="status-chip warn"><span aria-hidden="true">!</span> Estoque baixo</span>':'<span class="status-chip ok"><span aria-hidden="true">✓</span> OK</span>'}<small class="muted">mínimo ${finQty(p.minimo)}</small></div><div class="fin2-val"><b>${finQty(p.saldo)}</b><small>${esc(p.unidade)} em estoque</small></div><div class="fin2-act"><button class="btn sm" data-move ${editable?'':'disabled'}>Movimentar</button><button class="link-btn" data-history>Histórico</button></div></li>`);
        row.querySelector('[data-move]').onclick=()=>{const key=crypto.randomUUID();openModal('Movimentar estoque',`<p>${esc(p.nome)} · Saldo ${finQty(p.saldo)} ${esc(p.unidade)}</p><div class="field"><label>Tipo</label><select name="tipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select></div><div class="field"><label>Quantidade</label><input name="quantidade" type="number" min="0.001" step="0.001" required></div>${finFields([['data','Data',hojeLocal(),'date'],['motivo','Motivo / referência','']])}<p>O movimento atualiza apenas o estoque. Vendas e compras devem ser registradas separadamente no financeiro.</p>`,async(f,close,error)=>{try{await jpost('/api/financeiro/movimentos',{empresa_id:Number(FILTRO_EMPRESA),produto_id:p.id,chave:key,...Object.fromEntries(['tipo','quantidade','data','motivo'].map(k=>[k,f.elements.namedItem(k).value]))});close();viewFinanceiro();}catch(e){error(e.message);}});};
        row.querySelector('[data-history]').onclick=()=>openModal('Histórico · '+p.nome,`${p.movimentos.length?p.movimentos.map(m=>`<p><b>${m.tipo==='entrada'?'Entrada':'Saída'} · ${finQty(m.quantidade)} ${esc(p.unidade)}</b><br>${fmtDate(m.data)} · ${esc(m.motivo)}</p>`).join(''):'<p>Nenhum movimento registrado.</p>'}`,async(f,close)=>close(),{somenteLeitura:true});
        ul.appendChild(row);
      });
    }
    box.querySelector('[type=search]').oninput=e=>{FIN_EST_BUSCA=e.target.value;draw();};
    box.querySelector('.fin2-check input').onchange=e=>{FIN_EST_BAIXO=e.target.checked;draw();};
    draw();
    c.appendChild(el('<p class="essential-note">Saldo apurado pelos movimentos cadastrados; saídas que deixariam o estoque negativo são bloqueadas. O preço de venda não é o custo do estoque.</p>'));
  }
  function finFluxo(c,titulos){
    const flows=new Map();const bucket=day=>{const month=day.slice(0,7);if(!flows.has(month))flows.set(month,{entrada:0,saida:0,receber:0,pagar:0});return flows.get(month);};
    titulos.filter(r=>!r.cancelado).forEach(r=>{bucket(r.vencimento)[r.tipo==='receber'?'receber':'pagar']+=r.saldo;r.baixas.forEach(b=>{bucket(b.data)[r.tipo==='receber'?'entrada':'saida']+=b.principal+b.juros+b.multa-b.desconto+b.tarifa*(r.tipo==='pagar'?1:-1);});});
    const panel=el('<section class="hcard fin2-fluxo"><header><div><h3>Fluxo de caixa mensal</h3><p class="small muted">Realizado pela data das baixas; pendências pelo vencimento.</p></div></header><div class="fat-tabela-wrap"><table><thead><tr><th>Mês</th><th>Entradas registradas</th><th>Saídas registradas</th><th>Resultado registrado</th><th>A receber</th><th>A pagar</th></tr></thead><tbody></tbody></table></div><div class="flow-empty"></div></section>');
    [...flows.entries()].sort(([a],[b])=>a.localeCompare(b)).forEach(([month,r])=>{const res=r.entrada-r.saida;panel.querySelector('tbody').appendChild(el(`<tr><td>${esc(month.slice(5)+'/'+month.slice(0,4))}</td><td>${finBRL(r.entrada)}</td><td>${finBRL(r.saida)}</td><td><b class="${res<0?'txt-danger':''}">${finBRL(res)}</b></td><td>${finBRL(r.receber)}</td><td>${finBRL(r.pagar)}</td></tr>`));});
    if(!flows.size)panel.querySelector('.flow-empty').innerHTML='<div class="act-ok"><span aria-hidden="true">i</span><div><b>Sem movimentos ainda</b><small>Cadastre contas e baixas para acompanhar o fluxo de caixa.</small></div></div>';c.appendChild(panel);c.appendChild(el('<p class="essential-note">Resultado registrado = entradas menos saídas das baixas, sem saldo inicial; pendências não entram no realizado.</p>'));
  }
  function finFields(fields){return fields.map(([name,label,value,type='text'])=>`<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value??'')}" ${type==='number'?'min="0" step="0.01"':''}></div>`).join('');}
  function finAssinatura(s){
    const until=new Date();until.setDate(until.getDate()+30);
    openModal('Assinatura mensal do financeiro',`<p>A liberação é por empresa. No piloto, o administrador gerencia a validade. Ainda não há cobrança automática.</p><div class="field"><label>Situação</label><select name="situacao">${['piloto','ativo','suspenso','cancelado'].map(v=>`<option ${s.situacao===v?'selected':''}>${v}</option>`).join('')}</select></div>${finFields([['ate','Liberado até',s.ate||until.toLocaleDateString('sv-SE'),'date'],['valor_mensal','Mensalidade (R$), deixe vazio para definir depois',s.valor_mensal==null?'150.00':(s.valor_mensal/100).toFixed(2),'number']])}`,async(f,close,err)=>{try{await jpost('/api/financeiro/assinatura',{empresa_id:Number(FILTRO_EMPRESA),situacao:f.situacao.value,ate:f.ate.value,valor_mensal:f.valor_mensal.value});close();viewFinanceiro();}catch(e){err(e.message);}});
  }
  function finTitulo(r){
    const chave=crypto.randomUUID();
    const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
    openModal(r?'Editar parcela':'Novo lançamento',`<div class="fin-form"><div class="field"><label>Tipo</label><select name="tipo"><option value="receber" ${(r?.tipo||FIN_TIPO)==='receber'?'selected':''}>Conta a receber</option><option value="pagar" ${(r?.tipo||FIN_TIPO)==='pagar'?'selected':''}>Conta a pagar</option></select></div>${finFields([['descricao','Descrição',r?.descricao],['contato','Cliente / fornecedor',r?.contato],['valor','Valor (R$)',r?(r.valor/100).toFixed(2):'','number'],['competencia','Data de competência',r?.competencia||today,'date'],['vencimento','Vencimento',r?.vencimento||today,'date'],['categoria','Categoria financeira',r?.categoria],['centro_custo','Centro de custo',r?.centro_custo],['conta','Conta financeira',r?.conta],['forma','Forma de pagamento',r?.forma]])}${r?'':`<div class="field"><label>Condição</label><select name="modo"><option value="unico">À vista / parcela única</option><option value="parcelado">Parcelado: divide o valor total</option><option value="recorrente">Recorrente: repete o valor mensal</option></select></div><div class="field"><label>Quantidade de parcelas / meses</label><input type="number" name="parcelas" min="1" max="60" step="1" value="1"></div>`}<div class="field"><label>Observação</label><textarea name="observacao">${esc(r?.observacao||'')}</textarea></div></div><p>Os registros controlam compromissos. Cadastrar uma conta não emite cobrança nem executa pagamento.</p>`,async(f,close,err)=>{try{const data={empresa_id:Number(FILTRO_EMPRESA),id:r?.id,chave};['tipo','descricao','contato','valor','competencia','vencimento','categoria','centro_custo','conta','forma','observacao','modo','parcelas'].forEach(k=>{if(f.elements.namedItem(k))data[k]=f.elements.namedItem(k).value;});await jpost('/api/financeiro/titulos',data);close();viewFinanceiro();}catch(e){err(e.message);}});
  }
  function finBaixa(r){const chave=crypto.randomUUID();openModal('Registrar baixa manual',`<p>${esc(r.descricao)} · Saldo ${finBRL(r.saldo)}</p>${finFields([['principal','Principal a liquidar (R$)',(r.saldo/100).toFixed(2),'number'],['data','Data do pagamento / recebimento',new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}),'date'],['conta','Conta financeira',r.conta],['juros','Juros (R$)','0','number'],['multa','Multa (R$)','0','number'],['desconto','Desconto (R$)','0','number'],['tarifa','Tarifa (R$)','0','number']])}<p>Este registro não movimenta dinheiro nem confirma pagamento no banco. Tarifa aumenta o desembolso em contas a pagar e reduz a entrada em contas a receber.</p>`,async(f,close,err)=>{try{const data={empresa_id:Number(FILTRO_EMPRESA),id:r.id,chave};['principal','data','conta','juros','multa','desconto','tarifa'].forEach(k=>data[k]=f.elements.namedItem(k).value);await jpost('/api/financeiro/baixas',data);close();viewFinanceiro();}catch(e){err(e.message);}});}
  function finDetalhe(r){openModal('Detalhes do lançamento',`<h3>${esc(r.descricao)}</h3><p>${esc(r.contato)} · ${esc(r.forma||'Forma não informada')}</p><p>${esc(r.observacao||'Sem observações')}</p><h4>Baixas registradas</h4>${r.baixas.length?r.baixas.map(b=>`<p>${fmtDate(b.data)} · Principal ${finBRL(b.principal)} · ${esc(b.conta)}<br><small>Juros ${finBRL(b.juros)} · Multa ${finBRL(b.multa)} · Desconto ${finBRL(b.desconto)} · Tarifa ${finBRL(b.tarifa)}</small></p>`).join(''):'<p>Nenhuma baixa.</p>'}<p>Movimentação líquida registrada: ${finBRL(r.movimentado)}</p>`,async(f,close)=>close(),{somenteLeitura:true});}

  // ---------- Acessos e grupos (escritório · administrador) v2 ----------
  const ACE = { aba: "usuarios", situacao: "todos", perfil: "", empresa: "", busca: "", buscaGrupo: "", buscaPend: "" };
  const ACE_FUNCAO = { administrador: "Administrador", operador: "Operador", consulta: "Somente consulta" };
  async function viewAcessos() {
    setTitle("Acessos e grupos", "Gerencie a equipe do escritório e os acessos dos clientes.");
    const c = content(); c.innerHTML = '<div class="empty">Carregando…</div>';
    try {
      const [g, u] = await Promise.all([api("/api/grupos"), api("/api/usuarios/gestao")]);
      if (VIEW !== "acessos") return;
      c.innerHTML = "";
      const grupoDeId = id => g.grupos.find(gr => gr.id === id);
      const ativos = u.usuarios.filter(x => x.perfil === "cliente" && x.ativo);
      const cobertas = new Set(ativos.flatMap(x => x.grupo_id ? (grupoDeId(x.grupo_id)?.empresa_ids || []) : [x.empresa_id]));
      const pendentes = EMPRESAS.filter(e => !cobertas.has(e.id));
      const vinculoDe = x => x.grupo_id ? grupoDeId(x.grupo_id)?.nome : EMPRESAS.find(e => e.id === x.empresa_id)?.nome;
      const empresasDe = x => x.perfil !== "cliente" ? [] : x.grupo_id ? (grupoDeId(x.grupo_id)?.empresa_ids || []) : [x.empresa_id];
      const SIT = { todos: () => true, ativos: x => x.ativo, troca: x => x.ativo && x.trocar_senha, desativados: x => !x.ativo };
      if (!SIT[ACE.situacao]) ACE.situacao = "todos";
      const nAtivos = u.usuarios.filter(SIT.ativos).length, nTroca = u.usuarios.filter(SIT.troca).length, nDes = u.usuarios.filter(SIT.desativados).length;

      // Ações do topo dependem da aba
      const ta = topActions(); ta.innerHTML = "";
      if (ACE.aba === "grupos") { const b = el(`<button class="btn">${icone("mais", "ico-svg ico-xs")} Novo grupo</button>`); b.onclick = () => editarGrupo(null, g.grupos); ta.appendChild(b); }
      else {
        const b1 = el(`<button class="btn">${icone("mais", "ico-svg ico-xs")} Novo acesso de cliente</button>`); b1.onclick = () => editarAcesso(null, g.grupos);
        const b2 = el(`<button class="btn ghost">Novo usuário interno</button>`); b2.onclick = () => editarUsuario(null);
        ta.appendChild(b1); ta.appendChild(b2);
      }
      const box = el(`<div class="esc2"></div>`); c.appendChild(box);
      box.appendChild(escKpis([
        ["ativos", "Usuários ativos", nAtivos, "", `${u.usuarios.filter(x => x.perfil === "escritorio" && x.ativo).length} equipe · ${ativos.length} clientes`],
        ["pendentes", "Empresas sem acesso", pendentes.length, pendentes.length ? "warn" : "", `${cobertas.size} com acesso ativo`],
        ["troca", "Troca de senha pendente", nTroca, nTroca ? "warn" : "", plural(ativos.filter(x => x.trocar_senha).length, "cliente aguardando", "clientes aguardando")],
        ["desativados", "Desativados", nDes, "", "sessões encerradas"],
      ], ACE.aba === "usuarios" ? ACE.situacao : "", k => {
        ACE.aba = "usuarios";
        if (k === "pendentes") { ACE.situacao = "todos"; viewAcessos().then(() => { const d = content().querySelector(".esc2-pend"); if (d) { d.open = true; d.scrollIntoView({ block: "start", behavior: "smooth" }); } }); return; }
        ACE.situacao = k; viewAcessos();
      }));

      // Abas internas
      const abas = el(`<div class="chip-filter esc2-abas" role="tablist" aria-label="Área de acessos"></div>`);
      [["usuarios", "Usuários", u.usuarios.length], ["grupos", "Grupos de empresas", g.grupos.length]].forEach(([k, l, n]) => {
        const b = el(`<button class="pill ${ACE.aba === k ? "active" : ""}" role="tab" aria-selected="${ACE.aba === k}">${l} <span class="n">${n}</span></button>`);
        b.onclick = () => { if (ACE.aba !== k) { ACE.aba = k; viewAcessos(); } };
        abas.appendChild(b);
      });
      box.appendChild(abas);

      if (ACE.aba === "grupos") aceGrupos(box, g, u);
      else aceUsuarios(box, g, u, { pendentes, vinculoDe, empresasDe, SIT });
      box.appendChild(el('<p class="essential-note">Administrador gerencia acessos. Operador trabalha com todas as empresas, sem gerenciar usuários. Somente consulta pode visualizar e baixar documentos. Clientes acessam apenas a empresa ou o grupo autorizado. Desativação e redefinição encerram as sessões do usuário.</p>'));
    } catch (err) { c.innerHTML = `<div class="alert err">${esc(err.message)}</div>`; }
  }
  function aceUsuarios(box, g, u, { pendentes, vinculoDe, empresasDe, SIT }) {
    // Empresas sem acesso (preparação dos acessos)
    if (pendentes.length) {
      const pend = el(`<details class="hcard esc2-pend"><summary><span class="status-chip warn">${icone("alerta", "ico-svg ico-xs")} ${plural(pendentes.length, "empresa sem acesso", "empresas sem acesso")}</span> <span class="small muted">Cadastre um acesso exclusivo por empresa ou vincule uma pessoa autorizada ao grupo. A senha temporária exige alteração no primeiro acesso.</span></summary>
        <input type="search" aria-label="Buscar empresa sem acesso" placeholder="Buscar empresa sem acesso">
        <ul class="esc2-list pending-access-list"></ul></details>`);
      const pul = pend.querySelector("ul"), pin = pend.querySelector("input"); pin.value = ACE.buscaPend;
      pendentes.forEach(e => {
        const li = el(`<li class="esc2-row mini"><div class="esc2-main"><b>${esc(e.nome)}</b><small>${esc(e.cnpj || "CNPJ não informado")}</small></div><div class="esc2-act"><button class="btn sm ghost">Cadastrar acesso</button></div></li>`);
        li.dataset.search = escNorm(e.nome + " " + e.cnpj + " " + soDigitos(e.cnpj));
        li.querySelector("button").onclick = () => editarAcesso(null, g.grupos, e);
        pul.appendChild(li);
      });
      const filtrarPend = () => { const t = escNorm(ACE.buscaPend); pul.querySelectorAll("li").forEach(li => li.hidden = !li.dataset.search.includes(t)); };
      pin.oninput = () => { ACE.buscaPend = pin.value; filtrarPend(); }; filtrarPend();
      box.appendChild(pend);
    }
    const card = el(`<section class="hcard esc2-lista-card">
      <div class="esc2-barra"><div class="esc2-pills"></div>
        <div class="esc2-busca"><input type="search" aria-label="Buscar usuário" placeholder="Nome, login ou e-mail">
          <select data-perfil aria-label="Perfil ou função"><option value="">Todos os perfis</option><option value="f:administrador">Equipe · Administrador</option><option value="f:operador">Equipe · Operador</option><option value="f:consulta">Equipe · Somente consulta</option><option value="cliente">Clientes</option></select>
          <select data-empresa aria-label="Empresa com acesso"><option value="">Todas as empresas</option>${EMPRESAS.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join("")}</select></div></div>
      <p class="small muted esc2-soma" aria-live="polite"></p>
      <ul class="esc2-list"></ul></section>`);
    box.appendChild(card);
    const inBusca = card.querySelector("input"), selP = card.querySelector("[data-perfil]"), selE = card.querySelector("[data-empresa]");
    inBusca.value = ACE.busca; selP.value = ACE.perfil; selE.value = ACE.empresa;
    if (selP.value !== ACE.perfil) ACE.perfil = ""; if (selE.value !== ACE.empresa) ACE.empresa = "";
    const porPerfil = x => !ACE.perfil || (ACE.perfil === "cliente" ? x.perfil === "cliente" : x.perfil === "escritorio" && "f:" + x.funcao === ACE.perfil);
    const porEmpresa = x => !ACE.empresa || empresasDe(x).includes(Number(ACE.empresa));
    function draw() {
      const base = u.usuarios.filter(x => porPerfil(x) && porEmpresa(x) && escBate(ACE.busca, x.nome, x.usuario, x.email || "", vinculoDe(x) || ""));
      const ph = card.querySelector(".esc2-pills"); ph.innerHTML = "";
      ph.appendChild(escPills([["todos", "Todos", base.length], ["ativos", "Ativos", base.filter(SIT.ativos).length], ["troca", "Troca de senha pendente", base.filter(SIT.troca).length], ["desativados", "Desativados", base.filter(SIT.desativados).length]], ACE.situacao, k => { ACE.situacao = k; draw(); }, "Filtrar por situação"));
      const rows = base.filter(SIT[ACE.situacao]).sort((a, b) => (a.perfil === b.perfil ? 0 : a.perfil === "escritorio" ? -1 : 1) || (b.ativo - a.ativo) || a.nome.localeCompare(b.nome));
      card.querySelector(".esc2-soma").textContent = (rows.length ? plural(rows.length, "usuário", "usuários") : "") + (ACE.empresa ? " · com acesso à empresa selecionada (a equipe acessa todas)" : "");
      const ul = card.querySelector("ul"); ul.innerHTML = "";
      if (!rows.length) { ul.innerHTML = escVazio("Nenhum usuário nesta seleção", "Troque os filtros ou limpe a busca.", "menos"); return; }
      rows.forEach(usuario => {
        const interno = usuario.perfil === "escritorio", eu = usuario.id === ME.id;
        const vinc = interno ? "Todas as empresas do escritório" : (vinculoDe(usuario) ? (usuario.grupo_id ? "Grupo: " : "") + vinculoDe(usuario) : "Sem vínculo");
        const li = el(`<li class="esc2-row usr ${usuario.ativo ? "" : "off"}">
          <div class="esc2-main"><b>${esc(usuario.nome)}${eu ? ' <span class="esc2-tag">você</span>' : ""}</b><small>${esc(usuario.usuario)}${usuario.email ? " · " + esc(usuario.email) : ""}</small></div>
          <div class="esc2-res">${interno ? escChip("info", "escritorio", "Equipe · " + (ACE_FUNCAO[usuario.funcao] || usuario.funcao || "—")) : escChip("", "pessoal", "Cliente")}<small class="${!interno && !vinculoDe(usuario) ? "txt-danger" : ""}">${esc(vinc)}</small></div>
          <div class="esc2-fontes">${usuario.ativo ? escChip("ok", "check", "Ativo") : escChip("", "menos", "Desativado")}${usuario.trocar_senha ? escChip("warn", "relogio", "Troca de senha pendente") : '<small class="muted">Senha personalizada</small>'}</div>
          <div class="esc2-act"><button class="btn sm" data-edit>Editar</button>${interno ? "" : '<button class="link-btn" data-link>Alterar vínculo</button>'}${eu ? "" : '<button class="link-btn" data-password>Redefinir senha</button>'}</div>
        </li>`);
        li.querySelector("[data-edit]").onclick = () => editarUsuario(usuario);
        if (!interno) li.querySelector("[data-link]").onclick = () => editarAcesso(usuario, g.grupos);
        if (!eu) li.querySelector("[data-password]").onclick = () => redefinirSenha(usuario);
        ul.appendChild(li);
      });
    }
    inBusca.oninput = () => { ACE.busca = inBusca.value; draw(); };
    selP.onchange = () => { ACE.perfil = selP.value; draw(); };
    selE.onchange = () => { ACE.empresa = selE.value; draw(); };
    draw();
  }
  function aceGrupos(box, g, u) {
    const card = el(`<section class="hcard esc2-lista-card">
      <div class="esc2-barra"><p class="small muted esc2-soma" aria-live="polite"></p><div class="esc2-busca"><input type="search" aria-label="Buscar grupo, sócio ou empresa" placeholder="Grupo, sócio, empresa ou CNPJ"></div></div>
      <ul class="esc2-list"></ul></section>`);
    box.appendChild(card);
    box.appendChild(el('<p class="essential-note">Grupos QSA reúnem participações diretas do mesmo sócio. Revise a composição e vincule o usuário em Usuários › Alterar vínculo. Um vínculo societário não confirma, por si só, um grupo econômico.</p>'));
    const inp = card.querySelector("input"); inp.value = ACE.buscaGrupo;
    function draw() {
      const ul = card.querySelector("ul"); ul.innerHTML = "";
      if (!g.grupos.length) { ul.innerHTML = escVazio("Nenhum grupo cadastrado", 'Use "Novo grupo" e selecione as empresas.', "pessoal"); card.querySelector(".esc2-soma").textContent = ""; return; }
      const rows = g.grupos.map(grupo => ({ grupo, companies: grupo.empresa_ids.map(id => EMPRESAS.find(e => e.id === id)).filter(Boolean) }))
        .filter(({ grupo, companies }) => escBate(ACE.buscaGrupo, grupo.nome, ...(grupo.socios || []).map(s => s.nome), ...companies.map(e => e.nome + " " + e.cnpj)));
      card.querySelector(".esc2-soma").textContent = plural(rows.length, "grupo", "grupos");
      if (!rows.length) { ul.innerHTML = escVazio("Nenhum grupo encontrado", "Limpe a busca para ver todos.", "menos"); return; }
      rows.forEach(({ grupo, companies }) => {
        const clientes = u.usuarios.filter(x => x.perfil === "cliente" && x.grupo_id === grupo.id);
        const qsa = /qsa/i.test(grupo.origem || "");
        const li = el(`<li class="esc2-row grp">
          <div class="esc2-main"><b>${esc(grupo.nome)}</b><small>${plural(grupo.empresa_ids.length, "empresa", "empresas")} · ${esc(grupo.origem || "Manual")}</small>${(grupo.socios || []).map(s => `<small>${icone("dp", "ico-svg ico-xs")} ${esc(s.nome)} · ${esc(s.cpf_mascarado)}</small>`).join("")}</div>
          <div class="esc2-fontes">${escChip(qsa ? "info" : "", qsa ? "obrigacoes" : "editar", qsa ? "QSA Receita Federal" : "Manual")}${grupo.ajustado_manual ? escChip("warn", "editar", "Composição ajustada") : ""}${clientes.length ? escChip("ok", "pessoal", plural(clientes.length, "cliente vinculado", "clientes vinculados")) : escChip("warn", "alerta", "Nenhum cliente vinculado")}</div>
          <ul class="esc2-emps">${companies.map(e => `<li><b>${esc(e.nome)}</b><span class="muted">${esc(e.cnpj)}</span></li>`).join("") || '<li class="muted">Nenhuma empresa do cadastro.</li>'}</ul>
          <div class="esc2-act"><button class="btn sm">Editar empresas</button></div>
        </li>`);
        li.querySelector(".esc2-act button").onclick = () => editarGrupo(grupo, g.grupos);
        ul.appendChild(li);
      });
    }
    inp.oninput = () => { ACE.buscaGrupo = inp.value; draw(); };
    draw();
  }

  function editarUsuario(usuario){
    const interno=!usuario||usuario.perfil==='escritorio';
    const roles=Object.entries({administrador:'Administrador',operador:'Operador',consulta:'Somente consulta'}).map(([key,label])=>`<option value="${key}" ${key===(usuario?.funcao||'operador')?'selected':''}>${label}</option>`).join('');
    openModal(usuario?'Editar usuário':'Novo usuário do escritório',`<div class="field"><label>Nome</label><input name="nome" value="${esc(usuario?.nome||'')}" required maxlength="160"></div>${!usuario?'<div class="field"><label>Login</label><input name="usuario" required autocomplete="off"></div>':''}<div class="field"><label>E-mail</label><input name="email" type="email" value="${esc(usuario?.email||'')}"></div>${interno?'<div class="field"><label>Função</label><select name="funcao">'+roles+'</select><small>A equipe interna tem acesso às empresas do escritório.</small></div>':''}${usuario?'<div class="field"><label>Situação</label><select name="ativo"><option value="1" '+(usuario.ativo?'selected':'')+'>Ativo</option><option value="0" '+(!usuario.ativo?'selected':'')+'>Desativado</option></select></div>':'<div class="field"><label>Senha temporária</label><input name="senha" value="Portal@2026!" minlength="10" required><small>Troca obrigatória no primeiro acesso.</small></div>'}`,async(form,close,setErr)=>{if(!form.reportValidity())return;try{const data={nome:form.nome.value,email:form.email.value,funcao:interno?form.funcao.value:usuario.funcao};if(usuario){Object.assign(data,{id:usuario.id,ativo:form.ativo.value==='1'});await jpost('/api/usuarios/gestao',data);}else{Object.assign(data,{perfil:'escritorio',usuario:form.usuario.value,senha:form.senha.value});await jpost('/api/usuarios',data);}close();viewAcessos();}catch(e){setErr(e.message);}});
  }
  function redefinirSenha(usuario){
    openModal('Redefinir senha temporária',`<p>${esc(usuario.nome)} · ${esc(usuario.usuario)}</p><div class="field"><label>Nova senha temporária</label><input name="senha" value="Portal@2026!" minlength="10" required></div><p>As sessões atuais serão encerradas e o usuário precisará trocar a senha no próximo acesso.</p>`,async(form,close,setErr)=>{if(!form.reportValidity())return;try{await jpost('/api/usuarios/gestao',{id:usuario.id,acao:'senha',senha:form.senha.value});close();viewAcessos();}catch(e){setErr(e.message);}});
  }

  function editarGrupo(grupo) {
    openModal(grupo?'Editar grupo':'Novo grupo',`<div class="field"><label>Nome do grupo</label><input name="nome" value="${esc(grupo?.nome||'')}"></div><div class="field"><label>Buscar empresa</label><input id="buscarGrupo" placeholder="Nome ou CNPJ"></div><div class="group-picks" style="max-height:300px;overflow:auto">${EMPRESAS.map(e=>`<label style="display:block;padding:8px"><input type="checkbox" name="empresa_ids" value="${e.id}" ${grupo?.empresa_ids.includes(e.id)?'checked':''}> ${esc(e.nome)} · ${esc(e.cnpj)}</label>`).join('')}</div>`,async(form,close,setErr)=>{try{await jpost('/api/grupos',{id:grupo?.id,nome:form.nome.value,empresa_ids:[...form.querySelectorAll('[name=empresa_ids]:checked')].map(i=>Number(i.value))});close();viewAcessos();}catch(err){setErr(err.message);}});
    const modal=modalRoot.lastElementChild;modal.querySelector('#buscarGrupo').oninput=e=>{modal.querySelectorAll('.group-picks label').forEach(label=>label.style.display=label.textContent.toLocaleLowerCase().includes(e.target.value.toLocaleLowerCase())?'block':'none');};
  }

  function editarAcesso(usuario,grupos,empresaInicial) {
    if(empresaInicial)usuario=null;
    const opcoes=EMPRESAS.map(e=>`<option value="e:${e.id}" ${(usuario?.empresa_id||empresaInicial?.id)===e.id?'selected':''}>Empresa: ${esc(e.nome)}</option>`).join('')+grupos.map(g=>`<option value="g:${g.id}" ${usuario?.grupo_id===g.id?'selected':''}>Grupo: ${esc(g.nome)}</option>`).join('');
    openModal(usuario?'Editar vínculo':'Novo acesso de cliente',`${usuario?`<p>${esc(usuario.nome)} · ${esc(usuario.usuario)}</p>`:'<div class="field"><label>Nome do cliente</label><input name="nome" value="'+esc(empresaInicial?.nome||'')+'" required></div><div class="field"><label>Login</label><input name="usuario" value="'+esc((empresaInicial?.cnpj||'').replace(/\D/g,''))+'" required autocomplete="off"></div><div class="field"><label>E-mail</label><input name="email" type="email"></div><div class="field"><label>Senha temporária</label><input name="senha" value="Portal@2026!"><small>O cliente precisará trocar a senha antes de acessar documentos.</small></div>'}<div class="field"><label>Empresa ou grupo autorizado</label><select name="vinculo">${opcoes}</select></div>`,async(form,close,setErr)=>{if(!form.reportValidity())return;try{const [tipo,id]=form.vinculo.value.split(':');const dados={empresa_id:tipo==='e'?Number(id):null,grupo_id:tipo==='g'?Number(id):null};if(usuario){dados.id=usuario.id;await jpost('/api/acessos',dados);}else{Object.assign(dados,{nome:form.nome.value,usuario:form.usuario.value,email:form.email.value,senha:form.senha.value,perfil:'cliente'});await jpost('/api/usuarios',dados);}close();EMPRESAS=[];await ensureEmpresas();viewAcessos();}catch(err){setErr(err.message);}});
  }

  async function dadosEmpresa() {
    if(!FILTRO_EMPRESA) throw Error('Selecione uma empresa.');
    const [docs,obrigacoes,digital]=await Promise.all([api('/api/documentos'+empParam()),api('/api/obrigacoes'+empParam()),api('/api/certificado-digital'+empParam())]);
    return {docs:docs.documentos,obrigacoes:obrigacoes.obrigacoes,digital:digital.certificado};
  }
  async function inicioRecurso(titulo,descricao) {
    setTitle(titulo,descricao);topActions().innerHTML='';const c=content();c.innerHTML='';const bar=officeFilterBar();if(bar)c.appendChild(bar);
    if(!FILTRO_EMPRESA){c.appendChild(el('<div class="empty">Selecione uma empresa.</div>'));return null;}
    return c;
  }
  const hojeLocal=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
  function amanhaDas(){const d=new Date(hojeLocal()+'T12:00:00');d.setDate(d.getDate()+1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  async function painelDas(c) {
    const section=el('<section class="panel"><div class="panel-head"><div><h3>DAS · Simples Nacional</h3><p>Guias oficiais e pagamentos consultados na Receita.</p></div><button class="btn ghost sm">Consultar pagamentos</button></div><div class="panel-body"><p class="das-info">Carregando…</p><div class="das-content" style="overflow-x:auto"></div></div></section>');c.appendChild(section);
    async function load(){
      const data=await api('/api/das'+empParam());section.querySelector('.das-info').textContent=(data.consultado_em?'Pagamentos consultados em '+fmtDateTime(data.consultado_em):'Pagamentos ainda não consultados.')+' Ausência de pagamento localizado não confirma débito em aberto.'+(data.consultado_em&&!data.complete?' Consulta parcial; demais registros precisam de conferência.':'');
      const body=section.querySelector('.das-content');body.innerHTML='';
      const tbl=el('<table><thead><tr><th>Competência</th><th>Débito declarado</th><th>Guia disponível</th><th>Situação do documento</th><th>Ações</th></tr></thead><tbody></tbody></table>');
      data.months.filter(m=>m.confirmed).reverse().forEach(m=>{
        const g=data.guides.find(g=>g.period===m.period);const located=data.payments.filter(p=>p.period.slice(0,7).replace('-','')===m.period);const url=g?'/api/das/pdf?empresa_id='+encodeURIComponent(FILTRO_EMPRESA)+'&id='+g.id:'';
        const row=el(`<tr><td>${esc(m.period.slice(4)+'/'+m.period.slice(0,4))}</td><td>${m.declaredTax===null||m.declaredTax===undefined?'—':Number(m.declaredTax).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>${g?Number(g.values.total).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'<br><small>Data limite: '+esc(g.limite||'A conferir')+'</small>':'Ainda não emitida por este portal'}</td><td>${m.status==='Pago'?'<span class="badge ok">Pago</span>':esc(m.status)}</td><td>${g?'<button class="btn sm ghost preview">Pré-visualizar</button> <a class="btn sm ghost" href="'+url+'&download=1">Baixar</a> ':''}<button class="btn sm generate" ${m.status==='Pago'?'disabled title="DAS já pago"':''}>${m.status==='Pago'?'Já pago':g?'Atualizar DAS':'Obter DAS'}</button></td></tr>`);
        if(LANCAMENTO.emissao_das===false && m.status!=='Pago')row.querySelector('.generate').hidden=true;
        if(g)row.querySelector('.preview').onclick=()=>previewCertidao({titulo:'DAS · '+m.period.slice(4)+'/'+m.period.slice(0,4),nome_arquivo:'DAS-'+g.number+'.pdf',previewUrl:url,downloadUrl:url+'&download=1'});
        row.querySelector('.generate').onclick=()=>openModal('Obter DAS oficial',`<p>A Receita calculará a guia para a data escolhida. Confira pagamentos anteriores antes de utilizar uma nova guia.</p><div class="field"><label>Data prevista de pagamento</label><input type="date" name="date" value="${hojeLocal()}" min="${hojeLocal()}"></div>`,async(f,close,setErr)=>{const b=f.closest('.modal').querySelector('#ok');b.disabled=true;try{await jpost('/api/das/gerar',{empresa_id:FILTRO_EMPRESA,period:m.period,date:f.date.value});close();await load();}catch(e){setErr(e.message);}finally{b.disabled=false;}});
        tbl.querySelector('tbody').appendChild(row);
      });body.appendChild(tbl);
      if(data.payments.length){const list=el('<details><summary style="padding:18px;cursor:pointer">Pagamentos oficiais localizados</summary><table><thead><tr><th>Documento</th><th>Período informado</th><th>Pagamento</th><th>Valor</th></tr></thead><tbody></tbody></table></details>');data.payments.forEach(p=>list.querySelector('tbody').appendChild(el(`<tr><td>${esc(p.number)}</td><td>${esc(p.period)}</td><td>${esc(p.paidAt)}</td><td>${Number(p.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>`)));body.appendChild(list);}
      return data;
    }
    const b=section.querySelector('.panel-head button');async function consult(){b.disabled=true;section.querySelector('.das-info').textContent='Consultando pagamentos oficiais…';try{await jpost('/api/das/consultar',{empresa_id:FILTRO_EMPRESA});await load();}catch(e){section.querySelector('.das-info').textContent=e.message;}finally{b.disabled=false;}}
    b.onclick=consult;try{const data=await load();if(!data.consultado_em||Date.now()-new Date(data.consultado_em).getTime()>86400000)await consult();}catch(e){section.querySelector('.das-info').textContent=e.message;}
  }

  let CENTRAL_COMPETENCIA="";
  async function viewCentralFiscal(){
    const fiscalDate=v=>{const s=String(v||'');return /^\d{4}-\d{2}-\d{2}$/.test(s)?s.slice(8)+'/'+s.slice(5,7)+'/'+s.slice(0,4):/^\d{8}$/.test(s)?s.slice(6)+'/'+s.slice(4,6)+'/'+s.slice(0,4):s||'não informado';};
    const fiscalMonth=v=>/^\d{6}$/.test(String(v))?String(v).slice(4)+'/'+String(v).slice(0,4):String(v||'não informado');
    const mode=VIEW,c=await inicioRecurso(mode==='parcelamentos'?'Parcelamentos':mode==='atualizar-guias'?'Atualizar guias':'Central fiscal',mode==='parcelamentos'?'Seus acordos, as parcelas e o que pagar agora.':mode==='atualizar-guias'?'Gere a guia para a data em que você vai pagar.':'Consultas oficiais, documentos e análise da sua empresa');if(!c)return;acoesContexto();const company=FILTRO_EMPRESA;
    const go=view=>{VIEW=view;renderApp();};
    try{
      const d=await api('/api/central-fiscal'+empParam());if(VIEW!==mode||FILTRO_EMPRESA!==company)return;
      if(mode==='central-fiscal'){
        const links=[['Receita e carga tributária','Faturamento, serviços, comércio e comparação mensal.','faturamento'],['Parcelamentos','Pedidos, situação e pagamentos nas modalidades consultadas.','parcelamentos'],['Atualizar guias','Guias permitidas, com conferência oficial antes da emissão.','atualizar-guias'],['Notas de serviços','Emitidas e tomadas, calendário diário e arquivos XML.','notas-servico'],['Compras · NF-e','Notas destinadas à empresa, fornecedores e produtos.','notas-produtos'],['Documentos da empresa','Certidões, contrato, CNPJ e documentos publicados.','documentos'],['Folha e pessoal','Evolução da folha e relatórios disponíveis.','folha'],['Certificado digital','Validade e solicitação de renovação.','certificado'],['Calendário e prazos','Tributos, honorários e compromissos da empresa.','agenda'],['Obrigações e pendências','Documentos e prazos acompanhados pelo escritório.','obrigacoes'],['Simuladores de pessoal','Custo de contratação e simulação de rescisão.','dp']];
        const grid=el('<div class="essential-grid"></div>');links.forEach(([title,text,view])=>{const card=el(`<article class="essential-card"><h3>${title}</h3><p>${text}</p><button class="btn ghost">Acessar</button></article>`);card.querySelector('button').onclick=()=>go(view);grid.appendChild(card);});c.appendChild(grid);
        const panel=el('<section class="panel"><div class="panel-head"><h3>DCTFWeb e MIT</h3></div><div class="panel-body" style="padding:24px"><p>Declarações mensais e apurações disponíveis. Não comprovam pagamento e não substituem o faturamento da EFD.</p><div class="declaration-controls" style="display:flex;gap:12px;flex-wrap:wrap"><select aria-label="Competência"></select><button class="btn ghost dctf">Consultar DCTFWeb</button><button class="btn ghost mit">Consultar MIT</button><button class="btn ghost payments">Consultar pagamentos</button></div><p role="status" class="central-status"></p><div class="declaration-results"></div></div></section>');c.appendChild(panel);
        const sel=panel.querySelector('select');[...d.competencias].reverse().forEach(p=>{const op=document.createElement('option');op.value=p;op.textContent=p.slice(4)+'/'+p.slice(0,4);sel.appendChild(op);});if(d.competencias.includes(CENTRAL_COMPETENCIA))sel.value=CENTRAL_COMPETENCIA;
        async function query(module){CENTRAL_COMPETENCIA=sel.value;const buttons=panel.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);panel.querySelector('.central-status').textContent='Consultando fonte oficial…';try{await jpost('/api/central-fiscal/consultar',{empresa_id:company,modulo:module,periodo:sel.value});go('central-fiscal');}catch(e){panel.querySelector('.central-status').textContent=e.message;buttons.forEach(b=>b.disabled=ME.funcao==='consulta');}}
        panel.querySelector('.dctf').onclick=()=>query('dctfweb');panel.querySelector('.mit').onclick=()=>query('mit');panel.querySelector('.payments').onclick=()=>query('pagamentos');if(ME.funcao==='consulta')panel.querySelectorAll('button').forEach(b=>b.disabled=true);
        const result=panel.querySelector('.declaration-results');const renderResults=()=>{result.innerHTML='';d.consultas.filter(x=>x.modulo!=='parcelamentos'&&(!x.periodo||x.periodo===sel.value)).sort((a,b)=>b.periodo.localeCompare(a.periodo)).forEach(r=>{const doc=d.documentos.find(x=>x.tipo===r.modulo&&x.referencia===r.periodo);const box=el(`<article style="border-top:1px solid #e2e8f0;padding:16px 0"><h4>${r.modulo==='mit'?'MIT':r.modulo==='pagamentos'?'Pagamentos':'DCTFWeb'} · ${r.periodo?r.periodo.slice(4)+'/'+r.periodo.slice(0,4):'últimos 12 meses e mês atual'}</h4><p>${esc(r.dados.mensagem||'Consulta concluída')}</p><small>Consulta: ${fmtDateTime(r.consultado)}</small><div class="official-document"></div></article>`);if(doc)addDoc(box.querySelector('.official-document'),doc);else {const url='/api/central-fiscal/consulta-pdf?empresa_id='+encodeURIComponent(company)+'&modulo='+encodeURIComponent(r.modulo)+'&periodo='+encodeURIComponent(r.periodo);const b=el('<button class="btn ghost sm">Pré-visualizar consulta em PDF</button>');b.onclick=()=>previewCertidao({titulo:'Consulta fiscal · '+r.modulo,nome_arquivo:'Resumo da consulta',previewUrl:url,downloadUrl:url+'&download=1',downloadLabel:'Baixar resumo PDF'});box.querySelector('.official-document').appendChild(b);}
          if(r.dados.pagamentos?.length){const table=el('<table><thead><tr><th>Documento</th><th>Tipo</th><th>Período</th><th>Arrecadação</th><th>Valor</th></tr></thead><tbody></tbody></table>');r.dados.pagamentos.forEach(p=>table.querySelector('tbody').appendChild(el(`<tr><td>${esc(p.numeroDocumento)}</td><td>${esc(p.tipo?.descricaoAbreviada||p.tipo?.descricao||'—')}</td><td>${esc(p.periodoApuracao||'—')}</td><td>${esc(p.dataArrecadacao||'—')}</td><td>${p.valorTotal==null?'—':Number(p.valorTotal).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>`)));box.appendChild(table);}
          if(r.dados.apuracoes?.length){const table=el('<table><thead><tr><th>Apuração</th><th>Situação oficial</th><th>Total apurado</th></tr></thead><tbody></tbody></table>');r.dados.apuracoes.forEach(a=>table.querySelector('tbody').appendChild(el(`<tr><td>${esc(a.idApuracao)}</td><td>${esc(a.situacao)}</td><td>${a.valorTotalApurado==null?'—':Number(a.valorTotalApurado).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>`)));box.appendChild(table);}result.appendChild(box);});};sel.onchange=()=>{CENTRAL_COMPETENCIA=sel.value;renderResults();};renderResults();
      }
      function addDoc(parent,doc){const url='/api/central-fiscal/pdf?empresa_id='+encodeURIComponent(company)+'&id='+doc.id;const buttons=el(`<p><small>Documento consultado em ${fmtDateTime(doc.criado)}</small><br><button class="btn ghost sm">Pré-visualizar</button> <a class="btn sm ghost" href="${url}&download=1">Baixar PDF</a></p>`);buttons.querySelector('button').onclick=()=>previewCertidao({titulo:doc.tipo+' · '+doc.referencia,nome_arquivo:'documento-oficial.pdf',previewUrl:url,downloadUrl:url+'&download=1'});parent.appendChild(buttons);}
      if(mode==='parcelamentos'||mode==='atualizar-guias'){
        if(mode==='atualizar-guias'){
          c.appendChild(el('<section class="obr-hero info"><span class="obr-hero-ico" aria-hidden="true">↻</span><div><h3>Atualize a guia para o dia em que vai pagar</h3><p>A Receita recalcula multa e juros. Guia já paga não pode ser emitida de novo.</p></div></section>'));
          const das=await pegar('/api/das'+empParam());const podeAtualizar=LANCAMENTO.emissao_das!==false&&ME.funcao!=='consulta';
          const grid=el('<div class="guia-grid"></div>');
          (das?.months||[]).filter(m=>m.confirmed&&m.status!=='Pago').forEach(m=>{const g=(das.guides||[]).find(x=>x.period===m.period);const comp=periodoLabel(m.period);const url=g?'/api/das/pdf?empresa_id='+encodeURIComponent(company)+'&id='+g.id:'';
            grid.appendChild(cardGuia(g?{id:'das-'+g.id,tipo:'DAS · Simples Nacional',titulo:'DAS '+comp,competencia:comp,valor:g.values?.total??m.declaredTax,vencimento:g.limite,previewUrl:url,downloadUrl:url+'&download=1',period:m.period,podeAtualizar}:{id:'das-p'+m.period,tipo:'DAS · Simples Nacional',titulo:'DAS '+comp,competencia:comp,valor:m.declaredTax,semGuia:true,period:m.period,podeAtualizar}));});
          const parc=d.consultas.find(r=>r.modulo==='parcelamentos');
          (parc?.dados.modalidades||[]).filter(m=>m.sistema==='PARCSN').forEach(m=>(m.parcelas||[]).forEach(p=>{
            const doc=d.documentos.find(x=>x.tipo==='parcela-parcsn'&&String(x.referencia)===String(p.parcela));
            const card=el(`<article class="guia-card"><header><span class="guia-tipo">Parcelamento · Simples</span><span class="guia-comp">Parcela ${esc(fiscalMonth(p.parcela))}</span></header><p class="guia-titulo">${esc(m.modalidade)}</p><p class="guia-valor">${brl(p.valor)}</p><p class="guia-venc">${doc?'Guia emitida em '+fmtDateTime(doc.criado):'Guia ainda não emitida'}</p><div class="guia-actions"></div></article>`);
            const act=card.querySelector('.guia-actions');
            if(doc){const url='/api/central-fiscal/pdf?empresa_id='+encodeURIComponent(company)+'&id='+doc.id;act.appendChild(el(`<a class="btn" href="${url}&download=1">Baixar guia</a>`));const v=el('<button class="btn ghost">Ver</button>');v.onclick=()=>previewCertidao({titulo:'Parcela '+fiscalMonth(p.parcela),nome_arquivo:'parcela.pdf',previewUrl:url,downloadUrl:url+'&download=1'});act.appendChild(v);}
            const u=el(`<button class="${doc?'link-btn':'btn'}">${doc?'Emitir com nova data':'Emitir guia da parcela'}</button>`);u.disabled=ME.funcao==='consulta';
            u.onclick=()=>openModal('Emitir guia da parcela',`<p>Parcela ${esc(fiscalMonth(p.parcela))} do ${esc(m.modalidade)}. A Receita define o valor e o vencimento; o histórico é conferido antes da emissão.</p><label><input type="checkbox" name="conferido" required> Conferi que esta é a parcela que quero pagar.</label>`,async(f,close,error)=>{try{await jpost('/api/central-fiscal/parcela',{empresa_id:company,periodo:String(p.parcela),conferido:f.conferido.checked});close();go(mode);}catch(e){error(e.message);}});
            act.appendChild(u);grid.appendChild(card);}));
          if(!grid.children.length)grid.appendChild(el('<div class="hcard act-ok"><span aria-hidden="true">✓</span><div><b>Nada para atualizar agora</b><small>Não há DAS em aberto nem parcela do Simples para emitir.</small></div></div>'));
          c.appendChild(grid);
          const outros=(parc?.dados.modalidades||[]).filter(m=>m.sistema!=='PARCSN'&&m.parcelamentos?.length);
          const rodape=el(`<p class="essential-note">Aqui nada é pago, contratado ou transmitido: você só gera a guia. ${outros.length?'Outros parcelamentos ('+outros.map(m=>esc(m.modalidade)).join(', ')+') não são emitidos pelo portal; ':''}Para PGFN e demais guias, <button class="link-btn">peça ao escritório</button>.</p>`);
          rodape.querySelector('button').onclick=()=>modalNovaSolicitacao({assunto:'Guia atualizada',corpo:'Preciso de uma guia atualizada de: ',onCreated:()=>go(mode)});c.appendChild(rodape);
          return;
        }
        if(mode==='parcelamentos'){
          const r=d.resumoParcelamentos||{estado:'verificar',ativos:[],pendentes:[],proximas:[],limitacoes:['Consulta ainda não concluída']};
          const state={sem_parcelamentos:['✓','Nenhum parcelamento identificado','A empresa não possui parcelamentos nas fontes consultadas. Esta informação se refere aos parcelamentos, não à regularidade fiscal completa.','green'],em_dia:['✓','Seus parcelamentos estão em dia','A empresa possui parcelamentos e todos estão em dia, conforme as consultas disponíveis.','green'],pendente:['!','Há parcelas pendentes de pagamento','Confira abaixo as parcelas vencidas sem pagamento localizado na fonte oficial.','orange'],verificar:['◷',r.ativos.length?'Parcelamentos identificados':'Vamos conferir seus parcelamentos',r.ativos.length?'A confirmação dos pagamentos ainda está incompleta. Consulte os acordos e documentos abaixo.':'Atualize as consultas para conhecer a situação da empresa.','blue']}[r.estado];
          const hero=el(`<div><section class="installment-hero ${state[3]}"><div class="installment-symbol">${state[0]}</div><div><span class="installment-eyebrow">SAÚDE DOS PARCELAMENTOS</span><h2>${esc(state[1])}</h2><p>${esc(state[2])}</p></div></section><section class="installment-metrics"><article><span>Acordos ativos identificados · Receita</span><strong>${d.consultas.some(x=>['parcelamentos','parcelamentos-gerais'].includes(x.modulo))?r.ativos.filter(p=>p.tipo==='acordo').length:'—'}</strong></article><article><span>Inscrições negociadas · PGFN</span><strong>${d.consultas.some(x=>x.modulo==='pgfn')?r.ativos.filter(p=>p.tipo==='inscricao').length:'—'}</strong></article><article><span>Parcelas vencidas identificadas</span><strong>${r.pendentes.length|| (r.limitacoes.length?'A confirmar':'0')}</strong></article><article><span>Vencem nos próximos 7 dias</span><strong>${r.proximas.length|| (r.limitacoes.length?'A confirmar':'0')}</strong></article></section></div>`);
          c.appendChild(hero);
          if(r.dashboard?.length){
            const money=v=>v==null?'A confirmar':Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
            const dashboards=el('<section class="installment-dashboard-list" aria-label="Evolução dos acordos"></section>');c.appendChild(dashboards);
            r.dashboard.forEach(a=>{
              const next=a.proximaParcela,paidPartial=a.pagamentos.reduce((sum,x)=>sum+Number(x.valorPago||0),0);
              const box=el(`<article class="agreement-dashboard"><header><div><span class="installment-eyebrow">SEU ACORDO EM NÚMEROS</span><h3>${esc(a.origem)}</h3><p>Acordo ${esc(a.numero)} · ${esc(a.situacao||'Situação a confirmar')}</p></div><span class="agreement-date">Consulta ${esc(fmtDateTime(a.consultado))}</span></header><div class="agreement-overview"><div class="agreement-ring" style="--paid:${Number(a.percentual||0)}%"><div><strong>${a.percentual==null?'—':String(a.percentual).replace('.',',')+'%'}</strong><span>concluído</span></div></div><div class="agreement-counts"><article><strong>${a.totalParcelas??'—'}</strong><span>Total de parcelas</span></article><article class="paid"><strong>${a.parcelasPagas??'—'}</strong><span>Parcelas pagas</span></article><article><strong>${a.parcelasRestantes??'—'}</strong><span>Parcelas restantes</span></article></div></div><div class="agreement-money"><article><span>Total efetivamente pago</span><strong>${money(a.totalPago)}</strong><small>${a.totalPago==null?(a.pagamentosConferidos?money(paidPartial)+' em '+a.pagamentosConferidos+' pagamento(s) detalhado(s); total ainda incompleto':'Detalhamento dos pagamentos ainda não disponível'):'Conforme os pagamentos oficiais detalhados'}</small></article><article><span>Principal quitado</span><strong>${money(a.principalQuitado)}</strong><small>Valor original das parcelas pagas; não inclui juros</small></article><article><span>Principal restante</span><strong>${money(a.principalRestante)}</strong><small>Valor original restante; não inclui atualização futura</small></article><article class="next"><span>Próxima parcela ${next?'· '+esc(fiscalDate(next.vencimento)):''}</span><strong>${next?money(next.saldoAtualizado):'A confirmar'}</strong><small>${next?'Saldo atualizado na consulta. Valor da guia ainda não confirmado.':'Vencimento e valor ainda não disponíveis'}</small></article></div><div class="agreement-timeline"><h4>Evolução das parcelas</h4><div class="agreement-steps"></div><p><span class="step-key paid"></span> Paga <span class="step-key future"></span> A vencer <span class="step-key overdue"></span> Pendente <span class="step-key unknown"></span> A confirmar</p><div class="agreement-selected" role="status"></div></div></article>`);dashboards.appendChild(box);
              const steps=box.querySelector('.agreement-steps'),selected=box.querySelector('.agreement-selected');
              const show=x=>{const payments=a.pagamentos.filter(p=>String(p.numeroParcela)===String(x.numero));selected.innerHTML=`<b>Parcela ${esc(x.numero)} · ${esc(x.situacao)}</b><span>Vencimento: ${esc(fiscalDate(x.vencimento))}</span><span>Valor original: ${money(x.valorOriginal)} · Saldo na consulta: ${money(x.saldoAtualizado)}</span><span>${payments.length?'Pagamento confirmado: '+money(payments.reduce((sum,p)=>sum+Number(p.valorPago),0))+' · '+payments.map(p=>esc(fiscalDate(p.dataDeArrecadacao))).join(', '):x.situacao==='Paga'?'Quitação confirmada; valor efetivamente pago ainda sem detalhamento.':'Guia de pagamento: ainda não disponibilizada para esta parcela.'}</span>`;};
              if(!a.parcelas.length)steps.innerHTML='<p>O demonstrativo completo das parcelas ainda precisa ser consultado.</p>';
              a.parcelas.forEach(x=>{const s=String(x.situacao||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const color=s==='paga'?'paid':s==='a vencer'?'future':['devedora','vencida','paga parcialmente'].includes(s)?'overdue':'unknown';const b=el(`<button class="agreement-step ${color}" title="Parcela ${esc(x.numero)} · ${esc(x.situacao)} · ${esc(fiscalDate(x.vencimento))}" aria-label="Parcela ${esc(x.numero)}, ${esc(x.situacao)}, vencimento ${esc(fiscalDate(x.vencimento))}">${esc(x.numero)}</button>`);b.onclick=()=>show(x);steps.appendChild(b);});if(next)show(next);else if(a.parcelas.length)show(a.parcelas.at(-1));
            });
          }

          const notices=el('<section class="hcard parc-todo"><header><h3>O que pagar agora</h3></header><ul class="act-list"></ul><div class="panel-body"></div></section>');const nb=notices.querySelector('.panel-body');
          [...r.pendentes,...r.proximas].forEach(p=>{const atras=p.dias>0;const row=linhaAcao({tom:atras?'danger':'warn',ico:atras?'!':'◷',titulo:`${p.origem} · parcela ${fiscalMonth(p.competencia)}`,sub:`Pedido ${p.pedido} · vencimento ${fiscalDate(p.vencimento)} · ${atras?p.dias+' dias de atraso':'vence em '+(-p.dias)+' dias'}`,acao:p.sistema==='PARCSN'?'Emitir guia':'Pedir guia',onClick:p.sistema==='PARCSN'?()=>go('atualizar-guias'):()=>modalNovaSolicitacao({assunto:'Guia de parcela: '+p.origem+' '+p.pedido,corpo:`Preciso da guia da parcela ${fiscalMonth(p.competencia)} do acordo ${p.pedido} (${p.origem}).`,onCreated:()=>go(mode)})});notices.querySelector('.act-list').appendChild(row);});
          if(!r.pendentes.length&&!r.proximas.length)nb.appendChild(el(`<p>${r.estado==='verificar'?'Os vencimentos ainda não estão integralmente disponíveis.':'Nenhum vencimento pendente ou próximo foi identificado nas informações consultadas.'}</p>`));
          nb.appendChild(el('<p class="essential-note"><b>Manutenção do acordo:</b> o risco de rescisão ainda não foi confirmado pela fonte. As condições variam por negociação; a quantidade de parcelas em atraso, sozinha, não confirma a perda do acordo.</p>'));
          if(r.limitacoes.length){const detail=el(`<details><summary>O que falta confirmar</summary><ul>${r.limitacoes.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></details>`);nb.appendChild(detail);}c.appendChild(notices);
          const pg=d.consultas.find(x=>x.modulo==='pgfn');const pgsec=el(`<section class="panel"><div class="panel-head"><h3>PGFN · Dívida Ativa e negociações</h3><button class="btn ghost">Consultar PGFN agora</button></div><div class="panel-body" style="padding:20px"><p role="status">${pg?'Consulta: '+esc(fmtDateTime(pg.consultado)):'Consulta ainda não realizada.'}</p><div class="pgfn-results"></div></div></section>`);c.appendChild(pgsec);const pb=pgsec.querySelector('button');pb.disabled=ME.funcao==='consulta';pb.onclick=async()=>{pb.disabled=true;pgsec.querySelector('[role=status]').textContent='Consultando PGFN…';try{await jpost('/api/central-fiscal/consultar',{empresa_id:company,modulo:'pgfn'});go(mode);}catch(e){pgsec.querySelector('[role=status]').textContent=e.message;pb.disabled=false;}};
          if(pg){const host=pgsec.querySelector('.pgfn-results');(pg.dados.inscricoes||[]).forEach(p=>host.appendChild(el(`<article class="installment-due"><b>Inscrição ${esc(p.numeroInscricao)}</b><p>${esc(p.situacaoDescricao)}</p><span>Valor consolidado da inscrição: R$ ${esc(p.valorTotalConsolidadoMoeda||'—')}</span></article>`)));host.appendChild(el('<p class="essential-note">Uma negociação pode incluir várias inscrições. Estes valores não são valores das parcelas mensais. O detalhamento das guias e pagamentos da PGFN ainda não está disponível.</p>'));const preview=el('<button class="btn ghost sm">Pré-visualizar consulta PGFN</button>');preview.onclick=()=>{const url='/api/central-fiscal/consulta-pdf?empresa_id='+encodeURIComponent(company)+'&modulo=pgfn&periodo=';previewCertidao({titulo:'Consulta PGFN',nome_arquivo:'consulta-pgfn.pdf',previewUrl:url,downloadUrl:url+'&download=1'});};host.appendChild(preview);}
        }
        const sec=el('<section class="panel"><div class="panel-head"><h3>Parcelamentos · Receita Federal</h3><button class="btn ghost">Consultar parcelamentos</button></div><div class="panel-body" style="padding:24px"><p class="parcel-status" role="status"></p><div class="parcel-results"></div></div></section>');c.appendChild(sec);const button=sec.querySelector('button');button.disabled=ME.funcao==='consulta';button.onclick=async()=>{button.disabled=true;sec.querySelector('.parcel-status').textContent='Consultando modalidades oficiais…';try{await jpost('/api/central-fiscal/consultar',{empresa_id:company,modulo:'parcelamentos'});go(mode);}catch(e){sec.querySelector('.parcel-status').textContent=e.message;button.disabled=false;}};
        const cached=d.consultas.find(r=>r.modulo==='parcelamentos'),general=d.consultas.find(r=>r.modulo==='parcelamentos-gerais');sec.querySelector('.parcel-status').textContent=cached?'Consultado em '+fmtDateTime(cached.consultado):general?'Consulta piloto e-CAC em '+fmtDateTime(general.consultado):'Consulte para verificar os pedidos disponíveis. Falta de dados não significa ausência de parcelamento.';
        if(cached){const b=el('<button class="btn ghost sm">Pré-visualizar consulta em PDF</button>');b.onclick=()=>{const url='/api/central-fiscal/consulta-pdf?empresa_id='+encodeURIComponent(company)+'&modulo=parcelamentos&periodo=';previewCertidao({titulo:'Consulta de parcelamentos',nome_arquivo:'Resumo da consulta fiscal',previewUrl:url,downloadUrl:url+'&download=1',downloadLabel:'Baixar resumo PDF'});};sec.querySelector('.parcel-status').appendChild(b);}
        const body=sec.querySelector('.parcel-results');(cached?.dados.modalidades||[]).concat(d.consultas.find(x=>x.modulo==='parcelamentos-gerais')?.dados.modalidades||[]).forEach(m=>{const block=el(`<details style="border-top:1px solid #e2e8f0;padding:18px 0" ${m.parcelamentos.length?'open':''}><summary><b>${esc(m.modalidade)}</b> · ${m.parcelamentos.length} pedido(s)</summary><p>${esc(m.mensagem||'Consulta concluída')}</p></details>`);body.appendChild(block);
          m.parcelamentos.forEach(p=>{const det=p.detalhes?.parcelamento||p.detalhes||{},con=det.consolidacaoOriginal;block.appendChild(el(`<h4>Pedido ${esc(p.numero)} · ${esc(p.situacao)}</h4><p>Pedido em ${esc(fiscalDate(p.dataDoPedido))}${con?' · Consolidado: '+Number(con.valorTotalConsolidado).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+' · '+esc(con.quantidadeParcelas)+' parcelas':''}</p>`));
            if(det.parcelas?.length){const all=el('<details class="agreement-all"><summary>Ver todas as parcelas e valores</summary></details>');block.appendChild(all);const table=el('<table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor original</th><th>Saldo na consulta</th><th>Situação oficial</th></tr></thead><tbody></tbody></table>');det.parcelas.forEach(x=>table.querySelector('tbody').appendChild(el(`<tr><td>${esc(x.numero)}</td><td>${esc(fiscalDate(x.vencimento))}</td><td>${Number(x.valorOriginal).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>${Number(x.saldoAtualizado).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td>${esc(x.situacao)}</td></tr>`)));all.appendChild(table);block.appendChild(el('<p class="essential-note">Consulta piloto oficial via certificado e procuração no e-CAC. Valores atualizados na data da consulta; os valores de parcelas futuras podem mudar até o pagamento.</p>'));const generalPreview=el('<button class="btn ghost sm">Pré-visualizar consulta e-CAC em PDF</button>');generalPreview.onclick=()=>{const url='/api/central-fiscal/consulta-pdf?empresa_id='+encodeURIComponent(company)+'&modulo=parcelamentos-gerais&periodo=';previewCertidao({titulo:'Extrato de parcelamento · e-CAC',nome_arquivo:'consulta-ecac.pdf',previewUrl:url,downloadUrl:url+'&download=1'});};block.appendChild(generalPreview);}
            if(det.demonstrativoPagamentos?.length){const table=el('<table><thead><tr><th>Parcela</th><th>Arrecadação</th><th>Valor pago informado</th></tr></thead><tbody></tbody></table>');det.demonstrativoPagamentos.forEach(x=>table.querySelector('tbody').appendChild(el(`<tr><td>${x.numeroParcela!=null?esc(x.numeroParcela):esc(fiscalMonth(x.mesDaParcela))}</td><td>${esc(fiscalDate(x.dataDeArrecadacao))}</td><td>${Number(x.valorPago).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td></tr>`)));block.appendChild(table);}if(p.mensagemDetalhes)block.appendChild(el('<small>'+esc(p.mensagemDetalhes)+'</small>'));});
          if(m.sistema==='PARCSN')m.parcelas.forEach(p=>{const line=el(`<p>Parcela ${esc(fiscalMonth(p.parcela))} · ${Number(p.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} <button class="btn ghost sm">Atualizar guia da parcela</button></p>`);line.querySelector('button').disabled=ME.funcao==='consulta';line.querySelector('button').onclick=()=>openModal('Atualizar guia do parcelamento',`<p>Parcela ${esc(fiscalMonth(p.parcela))}. A Receita define o valor e o vencimento. O histórico será consultado novamente antes da emissão.</p><label><input type="checkbox" name="conferido" required> Conferi a parcela que desejo atualizar.</label>`,async(f,close,error)=>{try{await jpost('/api/central-fiscal/parcela',{empresa_id:company,periodo:String(p.parcela),conferido:f.conferido.checked});close();go(mode);}catch(e){error(e.message);}});block.appendChild(line);});
        });
        d.documentos.filter(x=>x.tipo==='parcela-parcsn').forEach(doc=>{const box=el('<div><h4>Guia da parcela '+esc(doc.referencia)+'</h4></div>');addDoc(box,doc);body.appendChild(box);});
        c.appendChild(el('<p class="essential-note">Cobertura atual: parcelamentos ordinários, especiais, PERT e RELP do Simples Nacional e MEI. Consultas piloto de parcelamentos gerais pelo e-CAC são identificadas separadamente; a coleta autônoma em lote ainda não está integrada. A PGFN apresenta inscrições e suas situações, sem detalhamento das parcelas. Emissão de parcelas liberada somente para Simples ordinário, quando a Receita permite e o histórico pode ser conferido. As demais modalidades ficam em consulta.</p>'));
        if(mode==='parcelamentos'){
          const notes=c.querySelector('.parc-todo'),heroWrap=c.querySelector('.installment-hero')?.parentElement;
          if(notes&&heroWrap)heroWrap.after(notes);
          const tecnicos=[...c.children].filter(x=>(x.matches('section.panel')&&!x.classList.contains('parc-todo'))||(x.matches('p.essential-note')&&x.textContent.startsWith('Cobertura')));
          if(tecnicos.length){const det=el('<details class="hcard consultas-oficiais"><summary><b>Consultas oficiais</b><span class="muted"> · Receita Federal, PGFN, documentos e detalhes técnicos</span></summary></details>');c.appendChild(det);tecnicos.forEach(x=>det.appendChild(x));}
        }
      }
    }catch(e){c.appendChild(el('<p class="alert err">'+esc(e.message)+'</p>'));}
  }

  // ---------- Guias v2: "o que pagar, quanto e até quando" ----------
  const GUIA_BAIXADA_KEY = "ce-guias-baixadas";
  function guiasBaixadas() { try { return JSON.parse(localStorage.getItem(GUIA_BAIXADA_KEY) || "{}"); } catch (e) { return {}; } }
  function marcarBaixada(id) { try { const m = guiasBaixadas(); m[id] = new Date().toISOString(); localStorage.setItem(GUIA_BAIXADA_KEY, JSON.stringify(m)); } catch (e) {} }

  function modalObterDas(period, onDone) {
    openModal("Gerar guia com nova data", `<p>A Receita recalcula a guia, com multa e juros se houver, para a data em que você vai pagar.</p><div class="field"><label>Vou pagar em</label><input type="date" name="date" value="${hojeLocal()}" min="${hojeLocal()}"></div><p class="essential-note">Se você já pagou esta competência, não gere outra guia: use "Já paguei" para avisar o escritório.</p>`,
      async (f, close, setErr) => { try { await jpost("/api/das/gerar", { empresa_id: FILTRO_EMPRESA, period, date: f.date.value }); close(); onDone && onDone(); } catch (e) { setErr(e.message); } });
  }
  function avisarPagamento(titulo) {
    modalNovaSolicitacao({ assunto: "Pagamento realizado: " + titulo, corpo: `Informo que a guia ${titulo} foi paga em ${new Date().toLocaleDateString("pt-BR")}. Segue o comprovante.`, onCreated: () => routeView() });
  }

  function cardGuia(g) {
    // g: {id, tipo, titulo, competencia, valor, vencimento, previewUrl, downloadUrl, period, podeAtualizar, semGuia}
    const n = g.vencimento ? diasAte(g.vencimento) : null;
    const vencida = n != null && n < 0;
    const tom = g.semGuia ? "" : vencida ? "danger" : n != null && n <= 5 ? "warn" : "";
    const baixada = !!guiasBaixadas()[g.id];
    const etapa = g.semGuia ? 0 : baixada ? 2 : 1;
    const card = el(`<article class="guia-card ${tom}">
      <header><span class="guia-tipo">${esc(g.tipo)}</span>${g.competencia ? `<span class="guia-comp">Competência ${esc(g.competencia)}</span>` : ""}</header>
      <p class="guia-titulo">${esc(g.titulo)}</p>
      ${g.valor != null ? `<p class="guia-valor">${brl(g.valor)}</p>` : `<p class="guia-valor none">Valor no documento</p>`}
      <p class="guia-venc ${tom}">${g.semGuia ? "Guia ainda não emitida" : g.vencimento ? `${vencida ? "Venceu em" : "Pagar até"} ${fmtDate(g.vencimento)} · <b>${quando(g.vencimento)}</b>` : "Vencimento não informado"}</p>
      <ol class="guia-steps" aria-label="Etapas da guia">
        <li class="${etapa >= 1 ? "done" : ""} ${etapa === 1 ? "now" : ""}">Disponível</li>
        <li class="${etapa >= 2 ? "done now" : ""}">Baixada</li>
        <li>Paga</li>
      </ol>
      <div class="guia-actions"></div>
    </article>`);
    const act = card.querySelector(".guia-actions");
    const addBtn = (txt, cls, fn) => { const b = el(`<button class="btn ${cls}">${esc(txt)}</button>`); b.onclick = fn; act.appendChild(b); return b; };
    if (g.semGuia) {
      if (g.podeAtualizar) addBtn("Gerar guia", "", () => modalObterDas(g.period, routeView));
      else addBtn("Pedir ao escritório", "", () => modalNovaSolicitacao({ assunto: "Guia: " + g.titulo, corpo: `Preciso da guia ${g.titulo}.`, onCreated: () => routeView() }));
    } else if (vencida && g.podeAtualizar) {
      addBtn("Gerar com nova data", "", () => modalObterDas(g.period, routeView));
      addBtn("Ver guia vencida", "ghost", () => previewCertidao({ titulo: g.titulo, nome_arquivo: g.titulo + ".pdf", previewUrl: g.previewUrl, downloadUrl: g.downloadUrl }));
    } else if (vencida) {
      addBtn("Pedir guia atualizada", "", () => modalNovaSolicitacao({ assunto: "Atualizar guia vencida: " + g.titulo, corpo: `A guia ${g.titulo} venceu em ${fmtDate(g.vencimento)}. Preciso de uma guia atualizada para pagamento.`, onCreated: () => routeView() }));
      addBtn("Ver", "ghost", () => previewCertidao({ titulo: g.titulo, nome_arquivo: g.titulo + ".pdf", previewUrl: g.previewUrl, downloadUrl: g.downloadUrl }));
    } else {
      addBtn("Baixar guia", "", () => { marcarBaixada(g.id); window.location.href = g.downloadUrl; setTimeout(routeView, 400); });
      addBtn("Ver", "ghost", () => previewCertidao({ titulo: g.titulo, nome_arquivo: g.titulo + ".pdf", previewUrl: g.previewUrl, downloadUrl: g.downloadUrl }));
      if (g.podeAtualizar) { const m = el(`<button class="link-btn">Pagar em outra data</button>`); m.onclick = () => modalObterDas(g.period, routeView); act.appendChild(m); }
    }
    if (!g.semGuia) { const p = el(`<button class="link-btn">Já paguei</button>`); p.onclick = () => avisarPagamento(g.titulo); act.appendChild(p); }
    return card;
  }

  async function viewGuias() {
    const c = await inicioRecurso("Guias de impostos", "O que pagar, quanto e até quando."); if (!c) return;
    acoesContexto();
    if (isOffice()) { const b = el('<button class="btn">Publicar guia</button>'); b.onclick = () => modalUpload("Guias"); topActions().appendChild(b); }
    const q = empParam();
    let das = null, docs = [];
    try {
      [das, docs] = await Promise.all([
        pegar("/api/das" + q),
        api("/api/documentos" + q).then(r => r.documentos.filter(d => d.categoria === "Guias" && d.origem === "escritorio")).catch(() => []),
      ]);
    } catch (e) { c.appendChild(el(`<div class="alert err">${esc(e.message)}</div>`)); return; }
    const emp = encodeURIComponent(FILTRO_EMPRESA);
    const podeAtualizar = LANCAMENTO.emissao_das !== false && ME.funcao !== "consulta";

    // Monta a lista "a pagar"
    const aPagar = [];
    const meses = (das?.months || []).filter(m => m.confirmed);
    meses.filter(m => m.status !== "Pago").forEach(m => {
      const g = (das.guides || []).find(x => x.period === m.period);
      const comp = periodoLabel(m.period);
      if (g) {
        const url = "/api/das/pdf?empresa_id=" + emp + "&id=" + g.id;
        aPagar.push({ id: "das-" + g.id, tipo: "DAS · Simples Nacional", titulo: "DAS " + comp, competencia: comp, valor: g.values?.total ?? m.declaredTax, vencimento: g.limite, previewUrl: url, downloadUrl: url + "&download=1", period: m.period, podeAtualizar });
      } else {
        aPagar.push({ id: "das-p" + m.period, tipo: "DAS · Simples Nacional", titulo: "DAS " + comp, competencia: comp, valor: m.declaredTax, semGuia: true, period: m.period, podeAtualizar, status: m.status });
      }
    });
    (das?.guides || []).filter(g => !meses.some(m => m.period === g.period && m.status !== "Pago") && meses.some(m => m.period === g.period && m.status === "Pago") === false).forEach(g => {
      const url = "/api/das/pdf?empresa_id=" + emp + "&id=" + g.id, comp = periodoLabel(g.period);
      aPagar.push({ id: "das-" + g.id, tipo: "DAS · Simples Nacional", titulo: "DAS " + comp, competencia: comp, valor: g.values?.total, vencimento: g.limite, previewUrl: url, downloadUrl: url + "&download=1", period: g.period, podeAtualizar });
    });
    const outrasHist = [];
    docs.forEach(d => {
      const nome = d.titulo.replace(/^guia\s+/i, "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*\d{4}-\d{2}\s*$/, "").trim();
      const comp = d.competencia ? periodoLabel(d.competencia) : "";
      if (/^DAS(\s|$)/i.test(nome) && aPagar.some(x => x.competencia === comp && x.tipo.startsWith("DAS"))) return; // já coberta pela consulta oficial
      const item = { id: "doc-" + d.id, tipo: nome || "Guia", titulo: (nome || d.titulo) + (comp ? " " + comp : ""), competencia: comp, valor: d.valor ?? null, vencimento: d.vencimento, previewUrl: d.previewUrl || "/api/preview?id=" + d.id, downloadUrl: "/api/download?id=" + d.id, podeAtualizar: false };
      if (!d.vencimento || diasAte(d.vencimento) >= -30) aPagar.push(item); else outrasHist.push(d);
    });
    aPagar.sort((a, b) => (a.semGuia ? 1 : 0) - (b.semGuia ? 1 : 0) || (isoData(a.vencimento) || "9").localeCompare(isoData(b.vencimento) || "9"));

    // Resumo
    const comValor = aPagar.filter(g => g.valor != null), semValor = aPagar.length - comValor.length;
    const total = comValor.reduce((s, g) => s + Number(g.valor || 0), 0);
    const proxima = aPagar.find(g => g.vencimento && diasAte(g.vencimento) >= 0);
    const vencidas = aPagar.filter(g => g.vencimento && diasAte(g.vencimento) < 0).length;
    const pagas = meses.filter(m => m.status === "Pago");
    c.appendChild(el(`<div class="guia-summary">
      <div class="hcard"><span class="kpi-label">Total a pagar</span><span class="kpi">${brl(total)}</span><small class="muted">${aPagar.length} guia${aPagar.length === 1 ? "" : "s"}${semValor ? ` (${semValor} com valor só no documento)` : ""}${vencidas ? ` · <b class="txt-danger">${vencidas} vencida${vencidas === 1 ? "" : "s"}</b>` : ""}</small></div>
      <div class="hcard"><span class="kpi-label">Próximo vencimento</span><span class="kpi">${proxima ? fmtDate(proxima.vencimento) : "—"}</span><small class="muted">${proxima ? esc(proxima.titulo) + " · " + quando(proxima.vencimento) : "Nada a vencer"}</small></div>
      <div class="hcard"><span class="kpi-label">DAS pagos em 12 meses</span><span class="kpi">${pagas.length} de ${meses.length || 12}</span><small class="muted">${brl(pagas.reduce((s, m) => s + Number(m.declaredTax || 0), 0))} no total</small></div>
    </div>`));

    // A pagar
    const sec = el(`<section class="guia-sec"><h3>A pagar</h3><div class="guia-grid"></div></section>`);
    if (aPagar.length) aPagar.forEach(g => sec.querySelector(".guia-grid").appendChild(cardGuia(g)));
    else sec.querySelector(".guia-grid").appendChild(el(`<div class="hcard act-ok"><span aria-hidden="true">✓</span><div><b>Nenhuma guia em aberto</b><small>Quando o escritório publicar uma guia, ela aparece aqui.</small></div></div>`));
    c.appendChild(sec);

    // Histórico
    const hist = el(`<section class="hcard guia-hist"><header><h3>Pagas</h3><div class="hist-actions"><span class="muted small das-info"></span><button class="btn ghost sm">Consultar pagamentos na Receita</button></div></header><div style="overflow-x:auto"><table><thead><tr><th>Guia</th><th>Competência</th><th>Valor</th><th>Pago em</th><th></th></tr></thead><tbody></tbody></table></div></section>`);
    const tb = hist.querySelector("tbody");
    [...pagas].reverse().forEach(m => {
      const p = (das.payments || []).find(x => String(x.period).replace("-", "").slice(0, 6) === m.period);
      tb.appendChild(el(`<tr><td>DAS</td><td>${periodoLabel(m.period)}</td><td>${brl(p ? p.amount : m.declaredTax)}</td><td>${p ? esc(p.paidAt) : "—"}</td><td><span class="status-chip ok">✓ Pago</span></td></tr>`));
    });
    outrasHist.forEach(d => { const r = el(`<tr><td>${esc(d.titulo)}</td><td>${esc(d.competencia ? periodoLabel(d.competencia) : "—")}</td><td>—</td><td>—</td><td><button class="btn sm ghost">Ver</button></td></tr>`); r.querySelector("button").onclick = () => previewCertidao(d); tb.appendChild(r); });
    if (!tb.children.length) tb.appendChild(el(`<tr><td colspan="5" class="muted">Nenhum pagamento localizado ainda.</td></tr>`));
    const info = hist.querySelector(".das-info");
    info.textContent = das?.consultado_em ? "Última consulta: " + fmtDateTime(das.consultado_em) : "Ainda não consultado";
    const cb = hist.querySelector(".hist-actions button");
    cb.onclick = async () => { cb.disabled = true; info.textContent = "Consultando a Receita…"; try { await jpost("/api/das/consultar", { empresa_id: FILTRO_EMPRESA }); viewGuias(); } catch (e) { info.textContent = e.message; cb.disabled = false; } };
    if (ME.funcao === "consulta") cb.disabled = true;
    c.appendChild(hist);
    c.appendChild(el('<p class="essential-note">"Pago" vem da consulta oficial da Receita. Se um pagamento não aparecer, ele pode ainda não ter sido processado; isso não significa débito em aberto.</p>'));
  }
  let AGENDA_MES = hojeLocal().slice(0,7);
  function editarEventoAgenda(dia,event){
    const e=event||{};
    openModal(event?'Editar evento':'Adicionar ao calendário',`<div class="field"><label>Título</label><input name="titulo" maxlength="160" value="${esc(e.titulo||'')}" placeholder="Ex.: taxa do sindicato, horário especial"></div><div class="form-row"><div class="field"><label>Data</label><input name="data" type="date" value="${esc(e.data||dia)}"></div><div class="field"><label>Horário (opcional)</label><input name="hora" type="time" value="${esc(e.hora||'')}"></div></div><div class="field"><label>Tipo</label><select name="tipo">${['Lembrete','Taxa','Horário de funcionamento','Compromisso'].map(t=>`<option ${e.tipo===t?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>Valor (opcional)</label><input name="valor" type="number" min="0" step="0.01" value="${e.valor??''}"></div><div class="field"><label>Detalhes</label><textarea name="descricao" maxlength="2000">${esc(e.descricao||'')}</textarea></div><p class="essential-note">Visível para os usuários autorizados desta empresa e para o escritório. Lembretes de taxas não confirmam débito ou pagamento.</p>`,async(f,close,error)=>{try{await jpost('/api/agenda/eventos',{empresa_id:FILTRO_EMPRESA,id:e.id,titulo:f.titulo.value,data:f.data.value,hora:f.hora.value,tipo:f.tipo.value,valor:f.valor.value,descricao:f.descricao.value});close();viewAgenda();}catch(err){error(err.message);}});
  }
  function botaoBuscarNotasAgora(c,tipo,reload){
    if(!isOffice())return;
    const company=FILTRO_EMPRESA,view=VIEW;
    const bar=el(`<section class="notas-busca" aria-label="Busca prioritária de notas"><span class="notas-busca-ico" aria-hidden="true">${icone('atualizar-guias')}</span><span class="small muted" role="status">Consulta prioritária da empresa selecionada, respeitando os intervalos oficiais.</span><button class="btn sm">Buscar agora</button></section>`);c.appendChild(bar);
    const button=bar.querySelector('button'),label=bar.querySelector('[role="status"]');let waiting=false;
    button.disabled=ME.funcao==='consulta';
    async function check(){
      if(!bar.isConnected||company!==FILTRO_EMPRESA||VIEW!==view)return;
      try{const d=await api('/api/notas/buscar-agora?empresa_id='+encodeURIComponent(company)+'&tipo='+tipo);if(!bar.isConnected)return;
        const busy=d.status==='consultando';button.disabled=busy||ME.funcao==='consulta';button.textContent=busy?'Buscando…':'Buscar agora';
        if(d.status!=='sem_solicitacao')label.textContent=d.mensagem+(d.novos_documentos!=null?' · '+d.novos_documentos+' arquivo(s) novo(s)':'');
        if(busy){waiting=true;setTimeout(check,4000);}else if(waiting){waiting=false;reload();}
      }catch(e){label.textContent=e.message;button.disabled=ME.funcao==='consulta';}
    }
    button.onclick=async()=>{button.disabled=true;label.textContent='Iniciando consulta prioritária…';try{await jpost('/api/notas/buscar-agora',{empresa_id:company,tipo});waiting=true;check();}catch(e){label.textContent=e.message;button.disabled=false;}};
    check();
  }
  function downloadsNotaFiscal(tipo,id){
    const empresa=encodeURIComponent(FILTRO_EMPRESA),ident=encodeURIComponent(id);
    const pdf='/api/notas/previa/pdf?empresa_id='+empresa+'&tipo='+encodeURIComponent(tipo)+'&id='+ident+'&download=1';
    const xml=tipo==='sefaz'?'/api/sefaz-go/xml?empresa_id='+empresa+'&id='+ident:tipo==='nfce'?'/api/notas/nfce/xml?empresa_id='+empresa+'&id='+ident:'/api/notas-'+(tipo==='produtos'?'produtos':'servico')+'/xml?empresa_id='+empresa+'&nsu='+ident;
    return el('<span class="invoice-downloads"><a class="btn ghost sm" href="'+pdf+'">Baixar PDF da nota</a> <a class="btn ghost sm" href="'+xml+'">Baixar XML original</a></span>');
  }
  async function previewNotaFiscal(tipo,id){
    const company=FILTRO_EMPRESA;
    const pdf='/api/notas/previa/pdf?empresa_id='+encodeURIComponent(company)+'&tipo='+encodeURIComponent(tipo)+'&id='+encodeURIComponent(id);
    const xml=tipo==='sefaz'?'/api/sefaz-go/xml?empresa_id='+encodeURIComponent(company)+'&id='+encodeURIComponent(id):tipo==='nfce'?'/api/notas/nfce/xml?empresa_id='+encodeURIComponent(company)+'&id='+encodeURIComponent(id):'/api/notas-'+(tipo==='produtos'?'produtos':'servico')+'/xml?empresa_id='+encodeURIComponent(company)+'&nsu='+encodeURIComponent(id);
    await previewCertidao({titulo:'Pré-visualização da nota em PDF',nome_arquivo:'Prévia de leitura gerada do XML original',previewUrl:pdf,downloadUrl:pdf+'&download=1',downloadLabel:'Baixar prévia PDF',xmlUrl:xml});
  }
  let SEFAZ_MES=hojeLocal().slice(0,7),SEFAZ_TIPO='Todas',SEFAZ_MODELO='Todos';
  // ---------- SEFAZ-GO v2: "há algo que eu precise fazer?" → XMLs → ferramentas do escritório ----------
  const SEFAZ_STATUS_BUSCA=['Aguardando acesso oficial','Em processamento na SEFAZ','Importação parcial','Concluída','Sem notas','Bloqueada: acesso necessário'];
  function sefazTomBusca(s){
    if(/^Bloqueada/i.test(s||''))return ['danger','✕'];
    if(s==='Concluída'||s==='Sem notas')return ['ok','✓'];
    if(s==='Importação parcial'||/^Aguardando acesso/i.test(s||''))return ['warn','!'];
    return ['info','◔'];
  }
  function modalRetornoBusca(b,company){
    openModal('Retorno da busca oficial',`<p>${fmtDate(b.inicio)} a ${fmtDate(b.fim)}. Só conclua após conferir todas as consultas e importar os arquivos. Sem notas exige retorno explícito da SEFAZ.</p><div class="field"><label>Situação</label><select name="status">${SEFAZ_STATUS_BUSCA.map(s=>'<option '+(b.status===s?'selected':'')+'>'+esc(s)+'</option>').join('')}</select></div><div class="field"><label>Protocolo / referência do retorno oficial ou motivo da pendência</label><textarea name="evidencia" maxlength="2000" required>${esc(b.evidencia)}</textarea></div><label><input name="conferido" type="checkbox"> Conferi todo o período, entrada e saída, 55 e 65, incluindo canceladas, e a importação correspondente.</label>`,async(f,close,error)=>{try{await jpost('/api/sefaz-go/busca',{empresa_id:company,id:b.id,status:f.status.value,evidencia:f.evidencia.value,conferido:f.conferido.checked});close();viewSefazGo();}catch(e){error(e.message);}});
  }
  function modalImportarSefaz(company){
    openModal('Importar XMLs da SEFAZ',`<p>Importe somente arquivos da empresa selecionada. Até 2.000 XMLs por ZIP (12 MB por envio / 40 MB descompactados). O lote é validado antes de gravar; duplicados não são recriados. A importação não conclui a busca automaticamente.</p><div class="field"><label>Lote XML ou ZIP</label><input name="arquivo" type="file" accept=".xml,.zip" required></div>`,async(f,close,error)=>{try{const file=f.arquivo.files[0];if(!file)throw new Error('Selecione um lote XML ou ZIP.');const r=await jpost('/api/sefaz-go/importar',{empresa_id:company,arquivo:await base64Arquivo(file)});close();await viewSefazGo();topActions().appendChild(el(`<span role="status" class="status-chip ok">✓ ${Number(r.importados)||0} arquivo(s) importado(s); ${Number(r.repetidos)||0} repetido(s).</span>`));}catch(e){error(e.message);}});
  }
  function modalRegistroSefaz(r,company){
    openModal(r.nome,`<p>Registre o resultado conferido no portal oficial. Este registro não transmite declarações, não emite guias e não altera cadastro.</p><div class="field"><label>Data da consulta</label><input name="consultado" type="date" value="${hojeLocal()}" required></div><div class="field"><label>Referência / protocolo oficial</label><input name="referencia" maxlength="500" required></div><div class="field"><label>Resultado para o cliente</label><textarea name="resultado" maxlength="4000" required></textarea></div>`,async(f,close,error)=>{try{await jpost('/api/sefaz-go/registro',{empresa_id:company,recurso:r.id,consultado:f.consultado.value,referencia:f.referencia.value,resultado:f.resultado.value});close();viewSefazGo();}catch(e){error(e.message);}});
  }
  async function viewSefazGo(){
    const c=await inicioRecurso('SEFAZ-GO · XML e consultas','Notas de entrada e saída da empresa e consultas estaduais.');if(!c)return;
    const company=FILTRO_EMPRESA,month=SEFAZ_MES,canEdit=isOffice()&&ME.funcao!=='consulta';
    const loading=el("<div class='empty'>Carregando…</div>");c.appendChild(loading);
    let d;
    try{d=await api('/api/sefaz-go'+empParam()+'&mes='+encodeURIComponent(month));}catch(e){loading.remove();c.appendChild(el('<p class="alert err">'+esc(e.message)+'</p>'));return;}
    if(!c.isConnected||VIEW!=='sefaz-go'||FILTRO_EMPRESA!==company||SEFAZ_MES!==month)return;
    loading.remove();
    if(canEdit){
      const imp=el('<button class="btn">Importar lote XML / ZIP</button>');imp.onclick=()=>modalImportarSefaz(company);
      const link=el('<a class="btn ghost" target="_blank" rel="noopener noreferrer">Abrir SEFAZ-GO ↗</a>');link.href=d.url;
      topActions().append(link,imp);
    }

    // 1) Situação: há algo a fazer?
    const buscas=(d.buscas||[]).slice().sort((a,b)=>{const o=s=>{const t=sefazTomBusca(s)[0];return t==='danger'?0:t==='warn'?1:t==='info'?2:3;};return o(a.status)-o(b.status)||String(b.dia).localeCompare(String(a.dia));});
    const bloq=buscas.filter(b=>sefazTomBusca(b.status)[0]==='danger');
    const atencao=buscas.filter(b=>sefazTomBusca(b.status)[0]==='warn');
    const andamento=buscas.filter(b=>sefazTomBusca(b.status)[0]==='info');
    const ultimaOk=buscas.filter(b=>sefazTomBusca(b.status)[0]==='ok').sort((a,b)=>String(b.dia).localeCompare(String(a.dia)))[0];
    let tom,ico,h3,p;
    if(bloq.length){tom='danger';ico='!';h3='Busca de XMLs bloqueada';p=(bloq[0].evidencia?esc(bloq[0].evidencia)+'. ':'')+(isOffice()?'Resolva o acesso e registre o retorno da rodada.':'O escritório precisa desse acesso para continuar buscando suas notas na SEFAZ.');}
    else if(atencao.length){tom='warn';ico='!';h3=atencao.length===1?'1 busca precisa de conferência':atencao.length+' buscas precisam de conferência';p=esc(atencao[0].status)+(atencao[0].evidencia?' · '+esc(atencao[0].evidencia):'');}
    else if(andamento.length){tom='info';ico='◔';h3='Busca em andamento na SEFAZ';p='Nada a fazer agora. Os XMLs aparecem abaixo assim que o retorno oficial for importado.';}
    else{tom='ok';ico='✓';h3='Arquivo de XMLs em dia';p=ultimaOk?'Última busca concluída em '+fmtDate(ultimaOk.dia)+'.':'Nenhuma busca registrada ainda.';}
    const hero=el(`<section class="obr-hero ${tom}"><span class="obr-hero-ico" aria-hidden="true">${ico}</span><div><h3>${h3}</h3><p>${p}</p></div><div class="sefaz-hero-act"></div></section>`);
    if(bloq.length){
      if(canEdit){const b=el('<button class="btn">Registrar retorno</button>');b.onclick=()=>modalRetornoBusca(bloq[0],company);hero.querySelector('.sefaz-hero-act').appendChild(b);}
      else if(!isOffice()){const b=el('<button class="btn">Falar com o escritório</button>');b.onclick=()=>modalNovaSolicitacao({assunto:'SEFAZ-GO: busca de XMLs bloqueada',corpo:`A busca de XMLs na SEFAZ-GO está bloqueada${bloq[0].evidencia?' ('+bloq[0].evidencia+')':''}. O que preciso fazer para liberar o acesso?`,onCreated:()=>viewSefazGo()});hero.querySelector('.sefaz-hero-act').appendChild(b);}
    }
    c.appendChild(hero);

    // 2) Buscas diárias (rodadas) com status
    if(buscas.length){
      const sec=el(`<section class="hcard obr-list sefaz-buscas"><header><h3>Buscas diárias na SEFAZ</h3><span class="count">${buscas.length} rodada${buscas.length===1?'':'s'}</span></header><ul></ul></section>`);
      buscas.forEach(b=>{
        const [t,i]=sefazTomBusca(b.status);
        const li=el(`<li class="obr-row ${t==='ok'?'':t}"><span class="status-chip ${t==='ok'?'':t}"><span aria-hidden="true">${i}</span> ${esc(b.status)}</span><div class="obr-main"><b>Notas de ${fmtDate(b.inicio)} a ${fmtDate(b.fim)}</b><small>${esc(b.evidencia||'Aguardando retorno oficial')}</small></div><span class="obr-prazo">Rodada de ${fmtDate(b.dia)}</span><span class="obr-act"></span></li>`);
        if(canEdit){const x=el(`<button class="btn sm ghost">Registrar retorno</button>`);x.onclick=()=>modalRetornoBusca(b,company);li.querySelector('.obr-act').appendChild(x);}
        else if(!isOffice()&&t==='danger'){const x=el(`<button class="btn sm ghost">Perguntar</button>`);x.onclick=()=>modalNovaSolicitacao({assunto:'SEFAZ-GO: busca bloqueada',corpo:`A busca de ${fmtDate(b.inicio)} a ${fmtDate(b.fim)} está como "${b.status}"${b.evidencia?' ('+b.evidencia+')':''}. O que preciso fazer?`,onCreated:()=>viewSefazGo()});li.querySelector('.obr-act').appendChild(x);}
        sec.querySelector('ul').appendChild(li);
      });
      c.appendChild(sec);
    }

    // 3) XMLs do mês: lista com download
    const all=d.notas||[];
    const porModelo=SEFAZ_MODELO==='Todos'?all:all.filter(n=>n.modelo===SEFAZ_MODELO);
    const notes=porModelo.filter(n=>SEFAZ_TIPO==='Todas'||n.direcao===SEFAZ_TIPO).sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(b.numero).localeCompare(String(a.numero)));
    const date=new Date(month+'-01T12:00:00'),label=date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const xs=el(`<section class="hcard sefaz-xml"><header><h3>XMLs de <span class="cap">${esc(label)}</span></h3><div class="sefaz-month"><button class="btn ghost sm" aria-label="Mês anterior">←</button><input type="month" aria-label="Mês dos XMLs"><button class="btn ghost sm" aria-label="Próximo mês">→</button></div></header><p class="muted small sefaz-resumo"></p><div class="sefaz-filtros"></div><div class="sefaz-tbl"></div></section>`);
    const inp=xs.querySelector('input');inp.value=month;inp.onchange=()=>{if(inp.value){SEFAZ_MES=inp.value;viewSefazGo();}};
    xs.querySelectorAll('.sefaz-month button').forEach((b,i)=>b.onclick=()=>{SEFAZ_MES=mesSomar(month,i?1:-1);viewSefazGo();});
    const canc=all.filter(n=>/cancel/i.test(n.situacao||'')).length;
    xs.querySelector('.sefaz-resumo').textContent=`${all.length} XML${all.length===1?'':'s'} no mês · ${all.filter(n=>n.modelo==='55').length} NF-e (55) · ${all.filter(n=>n.modelo==='65').length} NFC-e (65)${canc?' · '+canc+' cancelada'+(canc===1?'':'s'):''}`;
    const fx=xs.querySelector('.sefaz-filtros');
    const f1=el('<div class="chip-filter" role="group" aria-label="Direção das notas"></div>');
    [['Todas','Todas',porModelo.length],['Entrada','Entradas',porModelo.filter(n=>n.direcao==='Entrada').length],['Saída','Saídas',porModelo.filter(n=>n.direcao==='Saída').length]].forEach(([k,l,n])=>{const b=el(`<button class="pill ${SEFAZ_TIPO===k?'active':''}" aria-pressed="${SEFAZ_TIPO===k}">${l} <span class="n">${n}</span></button>`);b.onclick=()=>{SEFAZ_TIPO=k;viewSefazGo();};f1.appendChild(b);});
    const f2=el('<label class="sefaz-modelo">Modelo <select aria-label="Modelo fiscal"><option value="Todos">Todos</option><option value="55">NF-e · 55</option><option value="65">NFC-e · 65</option></select></label>');
    const sel=f2.querySelector('select');sel.value=SEFAZ_MODELO;sel.onchange=()=>{SEFAZ_MODELO=sel.value;viewSefazGo();};
    fx.append(f1,f2);
    const tbl=xs.querySelector('.sefaz-tbl');
    if(!notes.length){tbl.appendChild(el(`<div class="act-ok"><span aria-hidden="true">✓</span><div><b>Nenhum XML ${all.length?'para este filtro':'neste mês'}</b><small>A ausência de arquivos não confirma ausência de notas.${all.length?' Tente “Todas”.':' Veja o mês anterior com ←.'}</small></div></div>`));}
    else{
      const t=el('<div style="overflow-x:auto"><table><thead><tr><th>Emissão</th><th>Nota</th><th>Direção</th><th>Contraparte</th><th>Situação</th><th><span class="sr-only">Ações</span></th></tr></thead><tbody></tbody></table></div>');
      notes.forEach(n=>{
        const cancelada=/cancel/i.test(n.situacao||'');
        const xml='/api/sefaz-go/xml?empresa_id='+encodeURIComponent(company)+'&id='+encodeURIComponent(n.id);
        const row=el(`<tr><td>${fmtDate(n.data)}</td><td><b>${n.modelo==='65'?'NFC-e':'NF-e'} ${esc(n.numero)}</b></td><td>${n.direcao==='Saída'?'↗ Saída':'↙ Entrada'}</td><td>${esc(n.contraparte)}</td><td><span class="status-chip ${cancelada?'warn':''}">${cancelada?'✕':'✓'} ${esc(n.situacao)}</span></td><td class="sefaz-acts"><button class="btn sm ghost">Ver PDF</button> <a class="link-btn">Baixar XML</a></td></tr>`);
        row.querySelector('button').onclick=()=>previewNotaFiscal('sefaz',n.id);row.querySelector('a').href=xml;
        t.querySelector('tbody').appendChild(row);
      });
      tbl.appendChild(t);
    }
    c.appendChild(xs);

    // 4) Consultas estaduais: resultado curto para o cliente
    const regs=d.registros||[];
    const cs=el(`<section class="hcard obr-list sefaz-consultas"><header><h3>Consultas estaduais</h3><span class="count">${regs.length} de ${(d.recursos||[]).length} registradas</span></header><ul></ul></section>`);
    (d.recursos||[]).forEach(r=>{
      const record=regs.find(x=>x.recurso===r.id);
      const li=el(`<li class="obr-row"><span class="status-chip ${record?'':'info'}">${record?'✓ Consultada':'◔ Não consultada'}</span><div class="obr-main"><b>${esc(r.nome)}</b><small>${record?esc(String(record.resultado||'').split('\n')[0]):esc(r.descricao)}</small></div><span class="obr-prazo">${record?'Em '+fmtDate(record.consultado):''}</span><span class="obr-act"></span></li>`);
      if(record){const b=el('<button class="btn sm ghost">Ver resultado</button>');b.onclick=()=>{const url='/api/sefaz-go/consulta-pdf?empresa_id='+encodeURIComponent(company)+'&id='+encodeURIComponent(record.id);previewCertidao({titulo:r.nome,nome_arquivo:'Resultado registrado pelo escritório',previewUrl:url,downloadUrl:url+'&download=1',downloadLabel:'Baixar resumo PDF'});};li.querySelector('.obr-act').appendChild(b);}
      cs.querySelector('ul').appendChild(li);
    });
    if((d.recursos||[]).length)c.appendChild(cs);

    // 5) Ferramentas do escritório (recolhidas)
    if(canEdit){
      const tools=el(`<details class="hcard consultas-oficiais sefaz-tools"><summary><b>Ferramentas do escritório</b> <span class="muted small">registrar consultas oficiais, importar lote, rotina de busca</span></summary><p class="small">${esc(d.rotina||'')}</p><p class="small muted">Conferência integral de cada rodada: entrada e saída, modelos 55 e 65, canceladas e período completo. Arquivos da SEFAZ ficam disponíveis por 7 dias.</p><div class="sefaz-tools-row"></div><h4>Registrar consulta oficial</h4><ul class="sefaz-reg"></ul></details>`);
      const row=tools.querySelector('.sefaz-tools-row');
      const imp=el('<button class="btn ghost sm">Importar lote XML / ZIP</button>');imp.onclick=()=>modalImportarSefaz(company);
      const link=el('<a class="btn ghost sm" target="_blank" rel="noopener noreferrer">Abrir SEFAZ-GO ↗</a>');link.href=d.url;row.append(link,imp);
      (d.recursos||[]).forEach(r=>{const record=regs.find(x=>x.recurso===r.id);const li=el(`<li><div><b>${esc(r.nome)}</b><small class="muted">${record?'Último registro: '+fmtDate(record.consultado)+' · Ref. '+esc(record.referencia):'Sem registro'}</small></div><button class="btn sm ghost">${record?'Atualizar registro':'Registrar'}</button></li>`);li.querySelector('button').onclick=()=>modalRegistroSefaz(r,company);tools.querySelector('.sefaz-reg').appendChild(li);});
      c.appendChild(tools);
    }
    c.appendChild(el(`<p class="essential-note">${isOffice()?'':esc(d.rotina||'')+'<br>'}Datas pela emissão do XML. A ausência de arquivos não confirma ausência de notas. Este arquivo complementa Compras · NF-e; os valores não são somados entre as duas fontes. Consultas estaduais são registradas pelo escritório a partir do portal oficial.</p>`));
  }

  // ---------- Notas v2: resumo do mês → lista filtrável com PDF/XML ----------
  const xmlNotaUrl=(tipo,id)=>{const e=encodeURIComponent(FILTRO_EMPRESA),i=encodeURIComponent(id);return tipo==='nfce'?'/api/notas/nfce/xml?empresa_id='+e+'&id='+i:'/api/notas-'+(tipo==='produtos'?'produtos':'servico')+'/xml?empresa_id='+e+'&nsu='+i;};
  const somaNotas=l=>l.reduce((s,n)=>s+Number(n.valor||0),0);
  const plural=(n,um,varios)=>n+' '+(n===1?um:varios);
  function navMesNotas(month,go){
    const atual=hojeLocal().slice(0,7),label=new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const nav=el(`<section class="notas-mes" aria-label="Mês das notas"><button class="btn ghost sm" aria-label="Mês anterior">←</button><div class="notas-mes-lbl"><span class="kpi-label">Notas de</span><b class="cap">${esc(label)}</b></div><button class="btn ghost sm" aria-label="Próximo mês" ${month>=atual?'disabled':''}>→</button><input type="month" aria-label="Escolher mês" max="${atual}">${month!==atual?'<button class="link-btn notas-hoje">Ir para o mês atual</button>':''}</section>`);
    const [ant,prox]=nav.querySelectorAll('.btn');ant.onclick=()=>go(mesSomar(month,-1));prox.onclick=()=>go(mesSomar(month,1));
    const inp=nav.querySelector('input');inp.value=month;inp.onchange=()=>{if(inp.value)go(inp.value);};
    nav.querySelector('.notas-hoje')?.addEventListener('click',()=>go(atual));
    return nav;
  }
  function linhaNota({data,titulo,sub,chips,valor,fora,pdfLabel,onPdf,xml}){
    const dt=new Date(String(data)+'T12:00:00'),ok=!isNaN(dt);
    const li=el(`<li class="nota-row ${fora?'fora':''}"><span class="nota-date" aria-hidden="true">${ok?`<b>${dt.getDate()}</b>${dt.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}`:'—'}</span><div class="nota-main"><b>${titulo}</b><small><span class="sr-only">Emissão ${fmtDate(data)} · </span>${sub||''}</small>${chips?`<span class="nota-chips">${chips}</span>`:''}</div><span class="nota-val">${valor?`<span class="v">${valor}</span>`:''}${fora?'<small>fora do total</small>':''}</span><span class="nota-act"><button class="btn sm ghost">${esc(pdfLabel||'Ver PDF')}</button><a class="link-btn">Baixar XML</a></span></li>`);
    li.querySelector('.nota-act button').onclick=onPdf;li.querySelector('.nota-act a').href=xml;
    return li;
  }
  // Lista com chips de filtro + busca; redesenha só a lista (sem nova chamada à API).
  function listaNotas({titulo,filtros,estado,setEstado,busca,setBusca,placeholder,filtrar,linha,total,vazio}){
    const sec=el(`<section class="hcard notas-lista"><header><h3>${esc(titulo)}</h3><span class="count"></span></header><div class="notas-filtros"><div class="chip-filter" role="group" aria-label="Filtrar notas"></div><input type="search" aria-label="Buscar nota" placeholder="${esc(placeholder)}"></div><ul class="nota-list"></ul></section>`);
    const box=sec.querySelector('.chip-filter'),ul=sec.querySelector('ul'),inp=sec.querySelector('input');
    if(!filtros.some(f=>f[0]===estado()))setEstado('Todas');
    filtros.filter(([k,,n])=>k==='Todas'||n).forEach(([k,l,n])=>{const b=el(`<button class="pill" data-k="${esc(k)}">${esc(l)} <span class="n">${n}</span></button>`);b.onclick=()=>{setEstado(k);desenhar();};box.appendChild(b);});
    inp.value=busca();inp.oninput=()=>{setBusca(inp.value);desenhar();};
    function desenhar(){
      box.querySelectorAll('.pill').forEach(b=>{const on=b.dataset.k===estado();b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
      const lista=filtrar(estado(),busca().trim().toLowerCase());
      sec.querySelector('.count').textContent=lista.length===total?plural(total,'nota','notas'):lista.length+' de '+total;
      ul.innerHTML='';
      if(!lista.length){ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">✓</span><div><b>${total?'Nenhuma nota para este filtro':'Nenhuma nota neste mês'}</b><small>${total?'Limpe a busca ou escolha “Todas”.':esc(vazio)}</small></div></li>`));return;}
      lista.forEach(n=>ul.appendChild(linha(n)));
    }
    desenhar();
    return sec;
  }

  async function painelNfce(c,month){
    const sec=el('<section class="hcard notas-nfce"><header><div><h3>NFC-e · consumidor</h3><p class="small muted">XMLs disponibilizados pelo escritório. A consulta automática de NF-e não coleta NFC-e.</p></div><div class="nfce-actions"></div></header><ul class="nota-list"></ul></section>');c.appendChild(sec);const ul=sec.querySelector('ul');
    if(isOffice()&&ME.funcao!=='consulta'){const btn=el('<button class="btn ghost sm">Disponibilizar XML de NFC-e</button>');sec.querySelector('.nfce-actions').appendChild(btn);btn.onclick=()=>openModal('Disponibilizar NFC-e', '<p>O XML deve identificar a empresa selecionada como emitente ou destinatária. O arquivo original será preservado.</p><div class="field"><label>XML completo da NFC-e</label><input name="arquivo" type="file" accept=".xml" required></div>',async(f,close,error)=>{try{await jpost('/api/notas/nfce',{empresa_id:FILTRO_EMPRESA,arquivo:await base64Arquivo(f.arquivo.files[0])});close();viewNotasProdutos();}catch(e){error(e.message);}});}
    try{const d=await api('/api/notas/nfce'+empParam()+'&mes='+month);if(!sec.isConnected)return;
      if(!d.notas.length){ul.appendChild(el('<li class="act-ok"><span aria-hidden="true">✓</span><div><b>Nenhuma NFC-e disponibilizada neste mês</b><small>Se você emite cupom fiscal eletrônico, o escritório publica os XMLs aqui.</small></div></li>'));return;}
      sec.querySelector('h3').textContent='NFC-e · consumidor ('+d.notas.length+')';
      d.notas.forEach(n=>ul.appendChild(linhaNota({data:n.data,titulo:'NFC-e',sub:`<span class="nota-chave">Chave ${esc(n.chave)}</span>`,onPdf:()=>previewNotaFiscal('nfce',n.id),xml:xmlNotaUrl('nfce',n.id)})));
    }catch(e){ul.appendChild(el(`<li class="muted small">${esc(e.message)}</li>`));}
  }

  let PRODUTOS_MES=hojeLocal().slice(0,7),PRODUTOS_FILTRO='Todas',PRODUTOS_BUSCA='';
  async function viewNotasProdutos(){
    const c=await inicioRecurso('Compras · NF-e','Notas de produtos destinadas à empresa no mês');if(!c)return;acoesContexto();
    const company=FILTRO_EMPRESA,month=PRODUTOS_MES;
    botaoBuscarNotasAgora(c,'produtos',viewNotasProdutos);
    c.appendChild(navMesNotas(month,m=>{PRODUTOS_MES=m;viewNotasProdutos();}));
    const loading=el('<div class="empty">Carregando notas…</div>');c.appendChild(loading);
    let d;try{d=await api('/api/notas-produtos'+empParam()+'&mes='+month);}catch(e){loading.remove();c.appendChild(el('<p class="alert err">'+esc(e.message)+'</p>'));return;}
    if(!c.isConnected||VIEW!=='notas-produtos'||company!==FILTRO_EMPRESA||month!==PRODUTOS_MES)return;
    loading.remove();
    const all=(d.notas||[]).slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(b.numero).localeCompare(String(a.numero)));
    const evento=n=>/^Evento/i.test(n.situacao||''),incl=all.filter(n=>n.incluida),completas=all.filter(n=>n.completo),resumos=all.filter(n=>!n.completo),eventos=all.filter(evento);

    // 1) Resumo do mês
    const base=incl.length?incl:all,porForn=new Map();
    base.forEach(n=>{const k=n.cnpjFornecedor||n.fornecedor;const x=porForn.get(k)||{nome:n.fornecedor,v:0,q:0};x.v+=Number(n.valor||0);x.q++;porForn.set(k,x);});
    const top=[...porForn.values()].sort((a,b)=>b.v-a.v).slice(0,3),maxF=Math.max(1,...top.map(f=>f.v));
    c.appendChild(el(`<div class="guia-summary notas-resumo">
      <div class="hcard"><span class="kpi-label">Total comprado</span><span class="kpi">${incl.length?finBRL(somaNotas(incl)):'—'}</span><small class="muted">${incl.length?plural(incl.length,'NF-e completa sem eventos','NF-e completas sem eventos'):'Sem NF-e completa confirmada neste mês'}</small></div>
      <div class="hcard ${eventos.length?'warn':''}"><span class="kpi-label">Notas no mês</span><span class="kpi">${all.length}</span><small class="muted">${completas.length} ${completas.length===1?'completa':'completas'} · ${resumos.length} aguardando XML${eventos.length?` · <b class="txt-warn">${plural(eventos.length,'com evento','com evento')} a conferir</b>`:''}</small></div>
      <div class="hcard notas-forn-card"><span class="kpi-label">Principais fornecedores</span>${top.length?`<ol class="notas-forn">${top.map(f=>`<li><span>${esc(f.nome)}</span><b>${finBRL(f.v)}</b><small class="muted">${plural(f.q,'nota','notas')}</small><span class="meter" aria-hidden="true"><span style="width:${Math.max(4,f.v/maxF*100)}%"></span></span></li>`).join('')}</ol>${incl.length?'':'<small class="muted">Inclui resumos e notas com evento.</small>'}`:'<small class="muted">Nenhuma compra no mês.</small>'}</div>
    </div>`));

    // 2) Lista filtrável
    c.appendChild(listaNotas({
      titulo:'NF-e do mês',total:all.length,placeholder:'Buscar fornecedor, CNPJ ou número',
      vazio:'A ausência de notas não confirma ausência de compras. Veja o mês anterior com ←.',
      filtros:[['Todas','Todas',all.length],['Completas','Completas',completas.filter(n=>!evento(n)).length],['Resumos','Aguardando XML',resumos.length],['Eventos','A conferir',eventos.length]],
      estado:()=>PRODUTOS_FILTRO,setEstado:v=>{PRODUTOS_FILTRO=v;},busca:()=>PRODUTOS_BUSCA,setBusca:v=>{PRODUTOS_BUSCA=v;},
      filtrar:(f,q)=>all.filter(n=>f==='Todas'||(f==='Completas'&&n.completo&&!evento(n))||(f==='Resumos'&&!n.completo)||(f==='Eventos'&&evento(n))).filter(n=>!q||[n.numero,n.fornecedor,n.cnpjFornecedor,n.chave].some(v=>String(v||'').toLowerCase().includes(q))),
      linha:n=>{
        const chip=evento(n)?`<span class="status-chip warn"><span aria-hidden="true">!</span> Evento a conferir</span>`:!n.completo?`<span class="status-chip info"><span aria-hidden="true">◔</span> Resumo · aguardando XML</span>`:`<span class="status-chip ok"><span aria-hidden="true">✓</span> ${esc(n.situacao||'Autorizada')}</span>`;
        const li=linhaNota({data:n.data,titulo:`NF-e ${esc(n.numero)} · ${esc(n.fornecedor)}`,sub:`CNPJ ${esc(n.cnpjFornecedor)}${n.natureza?' · '+esc(n.natureza):''}`,chips:chip,valor:finBRL(n.valor),fora:!n.incluida,pdfLabel:n.completo?'Ver PDF':'Ver resumo',onPdf:()=>previewNotaFiscal('produtos',n.nsu),xml:xmlNotaUrl('produtos',n.nsu)});
        if(n.itens&&n.itens.length){const det=el(`<details class="nota-itens"><summary>Produtos da nota (${n.itens.length})</summary><div class="fat-tabela-wrap"><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Un.</th><th>Valor</th><th>CFOP</th></tr></thead><tbody></tbody></table></div></details>`);n.itens.forEach(x=>det.querySelector('tbody').appendChild(el(`<tr><td>${esc(x.descricao)}</td><td>${esc(x.quantidade)}</td><td>${esc(x.unidade)}</td><td>${esc(x.valor)}</td><td>${esc(x.cfop)}</td></tr>`)));li.appendChild(det);}
        return li;
      }}));

    // 3) NFC-e e notas técnicas
    await painelNfce(c,month);
    if(!c.isConnected)return;
    c.appendChild(el(`<p class="essential-note">${esc(d.limite||'')}<br>Última verificação: ${d.sync?fmtDateTime(d.sync.atualizado):'aguardando'} · ${esc(d.sync?.status||'Consulta automática pendente')}${d.pendentes?' · '+plural(d.pendentes,'documento não publicado','documentos não publicados')+' para conferência':''}. Resumos não têm os produtos; notas com evento ficam fora do total até a conferência.</p>`));
  }

  let NOTAS_MES=hojeLocal().slice(0,7),NOTAS_TIPO='Todas',NOTAS_BUSCA='';
  async function viewNotasServico(){
    const c=await inicioRecurso('Notas de serviços','NFS-e emitidas e tomadas no mês');if(!c)return;acoesContexto();
    const month=NOTAS_MES,company=FILTRO_EMPRESA;
    botaoBuscarNotasAgora(c,'servicos',viewNotasServico);
    c.appendChild(navMesNotas(month,m=>{NOTAS_MES=m;viewNotasServico();}));
    const loading=el('<div class="empty">Carregando notas…</div>');c.appendChild(loading);
    let d;try{d=await api('/api/notas-servico'+empParam()+'&mes='+month);}catch(e){loading.remove();c.appendChild(el('<p class="alert err">'+esc(e.message)+'</p>'));return;}
    if(!c.isConnected||VIEW!=='notas-servico'||company!==FILTRO_EMPRESA||month!==NOTAS_MES)return;
    loading.remove();
    const all=(d.notas||[]).slice().sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(b.numero).localeCompare(String(a.numero)));
    const emit=all.filter(n=>n.tipo==='Emitida'),tom=all.filter(n=>n.tipo==='Tomada'),conf=all.filter(n=>!n.incluida);
    const resumo=(lista)=>{const fora=lista.filter(n=>!n.incluida).length;return plural(lista.length,'nota','notas')+(fora?' · '+fora+' fora do total':'');};

    // 1) Resumo do mês
    c.appendChild(el(`<div class="guia-summary notas-resumo">
      <div class="hcard"><span class="kpi-label"><span aria-hidden="true">↗</span> Emitidas · serviços prestados</span><span class="kpi">${finBRL(somaNotas(emit.filter(n=>n.incluida)))}</span><small class="muted">${resumo(emit)}</small></div>
      <div class="hcard"><span class="kpi-label"><span aria-hidden="true">↙</span> Tomadas · serviços contratados</span><span class="kpi">${finBRL(somaNotas(tom.filter(n=>n.incluida)))}</span><small class="muted">${resumo(tom)}</small></div>
      <div class="hcard ${conf.length?'warn':''}"><span class="kpi-label">Canceladas ou a conferir</span><span class="kpi">${conf.length}</span><small class="muted">${conf.length?finBRL(somaNotas(conf))+' fora dos totais até a conferência':'Nenhuma nota com evento de cancelamento'}</small></div>
    </div>`));

    // 2) Lista filtrável
    c.appendChild(listaNotas({
      titulo:'Notas do mês',total:all.length,placeholder:'Buscar número, cliente ou prestador',
      vazio:'A ausência de notas não confirma ausência de movimento. Veja o mês anterior com ←.',
      filtros:[['Todas','Todas',all.length],['Emitida','Emitidas',emit.length],['Tomada','Tomadas',tom.length],['Conferir','A conferir',conf.length]],
      estado:()=>NOTAS_TIPO,setEstado:v=>{NOTAS_TIPO=v;},busca:()=>NOTAS_BUSCA,setBusca:v=>{NOTAS_BUSCA=v;},
      filtrar:(f,q)=>all.filter(n=>f==='Todas'||(f==='Conferir'?!n.incluida:n.tipo===f)).filter(n=>!q||[n.numero,n.chave,n.contraparte].some(v=>String(v||'').toLowerCase().includes(q))),
      linha:n=>{
        const e=n.tipo==='Emitida';
        const chips=`<span class="status-chip ${e?'info':''}"><span aria-hidden="true">${e?'↗':'↙'}</span> ${e?'Emitida':'Tomada'}</span>${n.incluida?(n.situacao&&n.situacao!=='Normal'?`<span class="status-chip">${esc(n.situacao)}</span>`:''):`<span class="status-chip warn"><span aria-hidden="true">!</span> ${esc(n.situacao||'A conferir')}</span>`}`;
        return linhaNota({data:n.data,titulo:`Nota ${esc(n.numero||n.chave)} · ${esc(n.contraparte)}`,sub:e?'Serviço prestado para o tomador':'Serviço contratado do prestador',chips,valor:finBRL(n.valor),fora:!n.incluida,onPdf:()=>previewNotaFiscal('servicos',n.nsu),xml:xmlNotaUrl('servicos',n.nsu)});
      }}));

    c.appendChild(el(`<p class="essential-note">${esc(d.limite||'')}<br>Última consulta: ${d.sync?fmtDateTime(d.sync.atualizado):'aguardando'} · ${esc(d.sync?.status||'Consulta automática pendente')}${d.pendentes?' · '+plural(d.pendentes,'arquivo aguardando identificação','arquivos aguardando identificação'):''}. Valores dos serviços no XML; não comprovam pagamento.</p>`));
  }
  // ---------- Calendário e prazos v2: lista "o que vence" + mês opcional ----------
  let AGENDA_HORIZ = 30, AGENDA_FILTRO = "todos";
  const AGENDA_MODO_KEY = "ce-agenda-modo";
  function agendaModo() { try { return localStorage.getItem(AGENDA_MODO_KEY) === "mes" ? "mes" : "lista"; } catch (e) { return "lista"; } }
  function salvarAgendaModo(m) { try { localStorage.setItem(AGENDA_MODO_KEY, m); } catch (e) {} }
  const mesSomar = (ym, n) => { const d = new Date(ym + "-01T12:00:00"); d.setMonth(d.getMonth() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  const AG_GUIA = ["das", "fgts", "inss", "iss", "darf"];
  // categoria visual do item: [rótulo do chip, classe, ícone, grupo do filtro]
  function agCategoria(i) {
    if (i.doc) return ["Guia", "guia", "＄", "impostos"];
    if (i.category === "honorarios") return ["Honorários", "hon", "◆", "honorarios"];
    if (i.manual) return [i.tipo || "Evento", "evento", "★", "eventos"];
    if (i.obrigacao) return ["Prazo", "prazo", "◔", "impostos"];
    if (AG_GUIA.includes(i.category)) return [i.tax || "Guia", "guia", "＄", "impostos"];
    return [i.tax || "Declaração", "decl", "▤", "impostos"];
  }
  const agPago = (i) => /^pago/i.test(i.status || "");
  async function carregarAgenda(meses) {
    const q = empParam(), reqs = [];
    meses.forEach(m => { reqs.push(api("/api/agenda/acessorias" + q + "&mes=" + m)); reqs.push(api("/api/agenda/honorarios" + q + "&mes=" + m)); });
    const [ev, loc, ...rs] = await Promise.allSettled([api("/api/agenda/eventos" + q), dadosEmpresa(), ...reqs]);
    const out = { items: [], fontes: {} };
    meses.forEach((m, k) => {
      const ac = rs[2 * k], ho = rs[2 * k + 1];
      if (ac.status === "fulfilled") { out.fontes.acessorias = ac.value; (ac.value.items || []).filter(i => String(i.data).startsWith(m)).forEach(i => out.items.push({ ...i, category: String(i.tax || "").toLowerCase() })); }
      else out.erroAc = out.erroAc || ac.reason.message;
      if (ho.status === "fulfilled") { out.fontes.honorarios = ho.value; (ho.value.items || []).forEach(i => out.items.push({ ...i, category: "honorarios", mesRef: m })); }
      else out.erroHo = out.erroHo || ho.reason.message;
    });
    if (ev.status === "fulfilled") (ev.value.eventos || []).forEach(i => out.items.push({ ...i, category: "custom", manual: true }));
    else out.erroEv = ev.reason.message;
    const local = loc.status === "fulfilled" ? loc.value : null;
    (local?.obrigacoes || []).filter(o => isoData(o.vencimento) && o.status !== "concluida").forEach(o => out.items.push({ titulo: o.titulo, data: isoData(o.vencimento), category: "local", status: o.status === "atrasada" ? "Atrasada" : "Prazo cadastrado", obrigacao: o, competencia: o.competencia ? periodoLabel(o.competencia) : "" }));
    (local?.docs || []).filter(d => d.categoria === "Guias" && d.origem === "escritorio" && isoData(d.vencimento)).forEach(d => out.items.push({ titulo: d.titulo, data: isoData(d.vencimento), category: "local", status: "Guia publicada", doc: d, valor: d.valor ?? null }));
    out.items.forEach(i => { i.data = isoData(i.data) || i.data; });
    return out;
  }
  async function detalheAgenda(i) {
    if (i.manual && i.editavel && ME.funcao !== "consulta") { editarEventoAgenda(i.data, i); return; }
    openModal(i.titulo, `<p>${fmtDate(i.data)}${i.hora ? " às " + esc(i.hora) : ""}${diasAte(i.data) != null ? " · " + esc(quando(i.data)) : ""}</p><p>${esc(i.status || i.tipo || "Lembrete")}</p>${i.competencia ? "<p>Competência " + esc(i.competencia) + "</p>" : ""}${i.officeDue ? "<p>Prazo de envio do escritório: " + fmtDate(i.officeDue) + "</p>" : ""}${i.delivery ? "<p>" + esc(i.delivery) + "</p>" : ""}${i.valor != null ? "<p>Valor informado: " + brl(i.valor) + "</p>" : ""}<p>${esc(i.descricao || i.origem || "")}</p>${i.autor_nome ? "<small>Cadastrado por " + esc(i.autor_nome) + "</small>" : ""}${i.source ? '<p><a href="' + esc(i.source) + '" target="_blank" rel="noopener noreferrer">Regra oficial ↗</a></p>' : ""}`, async (f, close) => close(), { somenteLeitura: true });
    const modal = modalRoot.lastElementChild;
    if (i.category === "honorarios") {
      const box = el("<p>Consultando link da cobrança…</p>"); modal.querySelector("form").appendChild(box);
      try {
        const billing = await api("/api/agenda/honorarios/cobranca" + empParam() + "&mes=" + (i.mesRef || String(i.data).slice(0, 7)) + "&id=" + encodeURIComponent(i.id));
        if (billing.url) { box.innerHTML = ""; const a = el(`<a class="btn" target="_blank" rel="noopener noreferrer">${agPago(i) ? "Ver cobrança quitada / boleto" : "Acessar cobrança / boleto"} ↗</a>`); a.href = billing.url; box.appendChild(a); }
        else box.innerHTML = "<small>" + esc(billing.note || "Link da cobrança indisponível.") + "</small>";
      } catch (e) { box.textContent = e.message; }
    }
  }
  function linhaAgenda(i, atrasado) {
    const [cat, cls, ico] = agCategoria(i);
    const n = diasAte(i.data), pago = agPago(i);
    const guia = cls === "guia", hon = cls === "hon";
    let acao = "Detalhes", fn = () => detalheAgenda(i), extra = null;
    if (i.doc) { acao = "Ver guia"; fn = () => previewCertidao(i.doc); }
    else if (guia && liberado("guias")) { acao = "Ver guias"; fn = () => irPara("guias"); extra = true; }
    else if (hon) { acao = pago ? "Ver cobrança" : "Pagar honorários"; }
    else if (i.manual && i.editavel && ME.funcao !== "consulta") { acao = "Editar"; }
    else if (i.obrigacao && liberado("obrigacoes")) { acao = "Ver status"; fn = () => irPara("obrigacoes"); }
    const aPagar = !pago && (i.doc || hon || (guia && /enviad|dispon/i.test(i.status || "")));
    const primaria = aPagar && n != null && n <= 7;
    const tom = atrasado ? "danger" : primaria ? "warn" : "";
    const li = el(`<li class="ag-row ${tom}">
      <span class="ag-chip ${cls}"><span aria-hidden="true">${ico}</span> ${esc(cat)}</span>
      <div class="ag-main"><b>${esc(i.titulo)}</b><small>${[i.hora ? esc(i.hora) : "", pago ? "✓ " + esc(i.status) : esc(i.status || ""), i.competencia ? "Competência " + esc(i.competencia) : "", atrasado ? `<span class="txt-danger">${esc(quando(i.data))} · ${fmtDate(i.data)}</span>` : ""].filter(Boolean).join(" · ")}</small></div>
      <span class="ag-val">${i.valor != null && i.valor !== "" ? brl(i.valor) : ""}</span>
      <span class="ag-act"></span>
    </li>`);
    const act = li.querySelector(".ag-act");
    const b = el(`<button class="btn sm ${primaria || atrasado && aPagar ? "" : "ghost"}">${esc(acao)}</button>`); b.onclick = fn; act.appendChild(b);
    if (extra) { const d = el(`<button class="link-btn">Detalhes</button>`); d.onclick = () => detalheAgenda(i); act.appendChild(d); }
    return li;
  }

  async function viewAgenda() {
    const c = await inicioRecurso("Calendário e prazos", "O que vence nos próximos dias: impostos, honorários e compromissos."); if (!c) return;
    acoesContexto();
    const company = FILTRO_EMPRESA, modo = agendaModo(), month = AGENDA_MES, hoje = hojeLocal();
    const add = el('<button class="btn">＋ Novo evento</button>'); add.onclick = () => editarEventoAgenda(modo === "mes" && month !== hoje.slice(0, 7) ? month + "-01" : hoje);
    if (ME.funcao === "consulta") { add.disabled = true; add.title = "Perfil de consulta não altera o calendário"; }
    topActions().appendChild(add);

    const bar = el(`<div class="ag-toolbar"><div class="ag-seg" role="group" aria-label="Modo de visualização"><button class="pill ${modo === "lista" ? "active" : ""}" aria-pressed="${modo === "lista"}" data-m="lista">☰ Lista</button><button class="pill ${modo === "mes" ? "active" : ""}" aria-pressed="${modo === "mes"}" data-m="mes">▦ Mês</button></div></div>`);
    bar.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { if (b.dataset.m === modo) return; salvarAgendaModo(b.dataset.m); viewAgenda(); });
    c.appendChild(bar);
    const body = el(`<div class="ag-body"><div class="empty">Carregando…</div></div>`); c.appendChild(body);
    const stale = () => !c.isConnected || VIEW !== "agenda" || FILTRO_EMPRESA !== company || agendaModo() !== modo || (modo === "mes" && AGENDA_MES !== month);

    if (modo === "mes") {
      let d; try { d = await carregarAgenda([month]); } catch (e) { body.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return; }
      if (stale()) return; body.innerHTML = "";
      renderAgendaMes(body, month, d);
      notasAgenda(body, d);
      return;
    }

    // ----- Lista: atrasados + próximos N dias agrupados por semana/dia -----
    const fim = new Date(hoje + "T12:00:00"); fim.setDate(fim.getDate() + AGENDA_HORIZ);
    const meses = []; for (let m = mesSomar(hoje.slice(0, 7), -1); m <= fim.toISOString().slice(0, 7); m = mesSomar(m, 1)) meses.push(m);
    let d; try { d = await carregarAgenda(meses); } catch (e) { body.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return; }
    if (stale()) return; body.innerHTML = "";

    const atrasados = d.items.filter(i => {
      const n = diasAte(i.data); if (n == null || n >= 0) return false;
      if (i.category === "honorarios") return !agPago(i);
      if (i.obrigacao) return true;
      if (i.doc) return n >= -30;
      return false;
    }).sort((a, b) => a.data.localeCompare(b.data));
    const proximos = d.items.filter(i => { const n = diasAte(i.data); return n != null && n >= 0 && n <= AGENDA_HORIZ; })
      .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || "").localeCompare(b.hora || ""));
    const em7 = proximos.filter(i => diasAte(i.data) <= 7 && !agPago(i));
    const total7 = em7.filter(i => i.valor != null && i.valor !== "").reduce((s, i) => s + Number(i.valor || 0), 0);
    const prox = proximos.find(i => !agPago(i));

    const tom = atrasados.length ? "danger" : em7.length ? "warn" : "ok";
    const h3 = atrasados.length ? `${atrasados.length} ${atrasados.length === 1 ? "item em atraso" : "itens em atraso"}`
      : em7.length ? `${em7.length} ${em7.length === 1 ? "vencimento" : "vencimentos"} nos próximos 7 dias${total7 ? " · " + brl(total7) : ""}`
      : "Nada vence nos próximos 7 dias";
    const sub = prox ? `Próximo: ${esc(prox.titulo)} em ${fmtDate(prox.data)} (${esc(quando(prox.data))})` : `Nenhum prazo nos próximos ${AGENDA_HORIZ} dias.`;
    c.insertBefore(el(`<section class="obr-hero ${tom}"><span class="obr-hero-ico" aria-hidden="true">${tom === "danger" ? "!" : tom === "warn" ? "○" : "✓"}</span><div><h3>${h3}</h3><p>${sub}</p></div></section>`), bar);

    // filtros por tipo
    const grupoDe = i => agCategoria(i)[3];
    const todos = atrasados.concat(proximos);
    const filtros = [["todos", "Tudo", todos.length], ["impostos", "Impostos e prazos", todos.filter(i => grupoDe(i) === "impostos").length], ["honorarios", "Honorários", todos.filter(i => grupoDe(i) === "honorarios").length], ["eventos", "Eventos da empresa", todos.filter(i => grupoDe(i) === "eventos").length]];
    const fbar = el(`<div class="chip-filter" role="group" aria-label="Filtrar por tipo"></div>`);
    filtros.forEach(([k, label, n]) => { const b = el(`<button class="pill ${AGENDA_FILTRO === k ? "active" : ""}" aria-pressed="${AGENDA_FILTRO === k}">${label} <span class="n">${n}</span></button>`); b.onclick = () => { AGENDA_FILTRO = k; viewAgenda(); }; fbar.appendChild(b); });
    bar.appendChild(fbar);
    const passa = i => AGENDA_FILTRO === "todos" || grupoDe(i) === AGENDA_FILTRO;

    if (atrasados.filter(passa).length) {
      const sec = el(`<section class="hcard ag-list ag-late"><header><h3>Em atraso</h3><span class="count">${atrasados.filter(passa).length}</span></header><ul></ul></section>`);
      atrasados.filter(passa).forEach(i => sec.querySelector("ul").appendChild(linhaAgenda(i, true)));
      body.appendChild(sec);
    }

    const hj = new Date(hoje + "T12:00:00"), fimSemana = (7 - hj.getDay()) % 7; // até domingo
    const semanaDe = n => n <= fimSemana ? "Esta semana" : n <= fimSemana + 7 ? "Próxima semana" : "Mais adiante";
    const vis = proximos.filter(passa);
    if (!vis.length) {
      body.appendChild(el(`<section class="hcard ag-list"><div class="act-ok"><span aria-hidden="true">✓</span><div><b>Nada vence nos próximos ${AGENDA_HORIZ} dias</b><small>${AGENDA_FILTRO === "todos" ? "Use “＋ Novo evento” para lembrar uma taxa ou compromisso da empresa." : "Nenhum item deste tipo no período. Tente “Tudo”."}</small></div></div></section>`));
    } else {
      let secAtual = null, ul = null, diaAtual = null;
      vis.forEach(i => {
        const n = diasAte(i.data), s = semanaDe(n);
        if (s !== secAtual) { secAtual = s; const sec = el(`<section class="hcard ag-list"><header><h3>${s}</h3></header><ul></ul></section>`); ul = sec.querySelector("ul"); body.appendChild(sec); diaAtual = null; }
        if (i.data !== diaAtual) {
          diaAtual = i.data;
          const dt = new Date(i.data + "T12:00:00");
          const rel = n === 0 ? "hoje" : n === 1 ? "amanhã" : `em ${n} dias`;
          ul.appendChild(el(`<li class="ag-day"><span class="ag-date"><b>${dt.getDate()}</b>${esc(dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""))}</span><span>${esc(dt.toLocaleDateString("pt-BR", { weekday: "long" }))} · <span class="${n <= 1 ? "txt-strong" : "muted"}">${rel}</span></span></li>`));
        }
        ul.appendChild(linhaAgenda(i, false));
      });
    }
    const mais = el(`<p class="ag-more"></p>`);
    if (AGENDA_HORIZ < 90) { const b = el(`<button class="link-btn">Mostrar os próximos ${AGENDA_HORIZ + 30} dias</button>`); b.onclick = () => { AGENDA_HORIZ += 30; viewAgenda(); }; mais.appendChild(b); }
    const vm = el(`<button class="link-btn">Ver o mês no calendário</button>`); vm.onclick = () => { salvarAgendaModo("mes"); AGENDA_MES = hoje.slice(0, 7); viewAgenda(); }; mais.appendChild(vm);
    body.appendChild(mais);
    notasAgenda(body, d);
  }

  function notasAgenda(body, d) {
    if (d.erroAc) body.appendChild(el(`<p class="alert err">${esc(d.erroAc)} Os lembretes cadastrados continuam disponíveis.</p>`));
    if (d.erroEv) body.appendChild(el(`<p class="alert err">${esc(d.erroEv)}</p>`));
    if (d.erroHo) body.appendChild(el(`<p class="alert warn">Honorários: ${esc(d.erroHo)}</p>`));
    const ac = d.fontes.acessorias, ho = d.fontes.honorarios, partes = [];
    if (ac) partes.push(`Impostos: Acessórias, atualizado ${fmtDateTime(ac.internalSync?.syncedAt)}.${ac.warning ? " " + esc(ac.warning) : ""} Datas nacionais; confira prorrogações na guia oficial. Envio da guia não comprova pagamento.`);
    if (ho) partes.push(`Honorários: Conta Azul, consultada em ${fmtDateTime(ho.updated)}.${ho.warning ? " " + esc(ho.warning) : ""}`);
    partes.push("Taxas e horários são informados pelo cliente ou pelo escritório; meses futuros podem trazer previsões recorrentes.");
    body.appendChild(el(`<p class="essential-note ag-fontes">${partes.join("<br>")}</p>`));
  }

  function renderAgendaMes(body, month, d) {
    const date = new Date(month + "-01T12:00:00"), label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const head = el(`<div class="month-navigation"><h2>${esc(label)}</h2><div><button class="btn ghost" aria-label="Mês anterior">←</button><button class="btn ghost" aria-label="Ir para mês atual">Hoje</button><button class="btn ghost" aria-label="Próximo mês">→</button></div></div>`);
    const nav = delta => { AGENDA_MES = mesSomar(month, delta); viewAgenda(); };
    const buttons = head.querySelectorAll("button"); buttons[0].onclick = () => nav(-1); buttons[1].onclick = () => { AGENDA_MES = hojeLocal().slice(0, 7); viewAgenda(); }; buttons[2].onclick = () => nav(1);
    body.appendChild(head);
    const events = d.items.filter(i => String(i.data).startsWith(month));
    const podeEditar = ME.funcao !== "consulta";
    const calendar = el('<section class="month-calendar" aria-label="Calendário mensal"><div class="month-weekdays">' + ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(x => "<span>" + x + "</span>").join("") + '</div><div class="month-days"></div></section>');
    body.appendChild(calendar); const grid = calendar.querySelector(".month-days");
    const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    for (let n = 0; n < date.getDay(); n++) grid.appendChild(el('<div class="day-cell blank" aria-hidden="true"></div>'));
    for (let n = 1; n <= count; n++) {
      const day = month + "-" + String(n).padStart(2, "0");
      const cell = el(`<div class="day-cell ${day === hojeLocal() ? "today" : ""}"><div class="day-top"><span>${n}</span>${podeEditar ? `<button aria-label="Adicionar evento em ${fmtDate(day)}" title="Adicionar evento">+</button>` : ""}</div><div class="day-events"></div></div>`);
      if (podeEditar) cell.querySelector(".day-top button").onclick = () => editarEventoAgenda(day);
      events.filter(i => i.data === day).sort((a, b) => (a.hora || "").localeCompare(b.hora || "")).forEach(i => {
        const btn = el(`<button class="calendar-event ${esc(i.category)}" title="${esc(i.titulo)}">${i.hora ? "<small>" + esc(i.hora) + "</small>" : ""}<span>${esc(i.titulo)}</span>${i.status ? "<small>" + esc(i.status) + "</small>" : ""}</button>`);
        btn.onclick = () => i.doc ? previewCertidao(i.doc) : detalheAgenda(i);
        cell.querySelector(".day-events").appendChild(btn);
      });
      grid.appendChild(cell);
    }
    while (grid.children.length % 7) grid.appendChild(el('<div class="day-cell blank" aria-hidden="true"></div>'));
    body.appendChild(el(`<div class="calendar-legend"><span class="fgts">FGTS</span><span class="inss">INSS / IRRF</span><span class="das">Simples Nacional</span><span class="honorarios">Honorários</span><span class="custom">Eventos da empresa</span><span class="local">Prazos e guias do escritório</span></div>`));
    if (podeEditar) body.appendChild(el(`<p class="muted small">Clique no + de um dia para cadastrar um lembrete.</p>`));
  }
  // ---------- Avisos e pendências v2: uma caixa de entrada única, por urgência ----------
  // Agora = vencido, vence hoje/amanhã ou aguardando você · Esta semana = até 7 dias · Depois = o resto.
  const AV_GRUPOS = [["agora", "Agora"], ["semana", "Esta semana"], ["depois", "Depois"]];
  const avGrupo = (n, urgente) => urgente || (n != null && n <= 1) ? "agora" : n != null && n <= 7 ? "semana" : "depois";
  async function coletarAvisos() {
    const office = isOffice(), consulta = ME.funcao === "consulta", todas = office && !FILTRO_EMPRESA;
    const q = empParam(), itens = [], falhas = [];
    const empNome = id => (EMPRESAS.find(e => String(e.id) === String(id)) || {}).nome || "";
    const pre = (id, txt) => (todas && id != null ? empNome(id) + " · " : "") + txt;
    const certs = !liberado("certificado") ? null : todas
      ? (EMPRESAS.length <= 30 ? Promise.all(EMPRESAS.map(async e => ({ id: e.id, cert: (await pegar("/api/certificado-digital?empresa_id=" + encodeURIComponent(e.id)))?.certificado || null }))) : null)
      : pegar("/api/certificado-digital" + q).then(r => r ? [{ id: FILTRO_EMPRESA, cert: r.certificado }] : null);
    const [das, obr, docsR, solR, certL] = await Promise.all([
      liberado("guias") && !todas ? pegar("/api/das" + q) : null,
      liberado("obrigacoes") ? pegar("/api/obrigacoes" + q) : null,
      liberado("documentos") || liberado("guias") ? pegar("/api/documentos" + q) : null,
      liberado("solicitacoes") ? pegar("/api/solicitacoes" + q) : null,
      certs,
    ]);
    if (liberado("guias") && !todas && !das) falhas.push("guias");
    if (liberado("obrigacoes") && !obr) falhas.push("obrigações");
    if ((liberado("documentos") || liberado("guias")) && !docsR) falhas.push("documentos");
    if (liberado("solicitacoes") && !solR) falhas.push("solicitações");
    const docs = docsR?.documentos || [], sols = solR?.solicitacoes || [];

    // 1) Guias a pagar (mesma regra da tela Guias)
    if (liberado("guias") && !todas) {
      const meses = (das?.months || []).filter(m => m.confirmed), dasComp = [];
      meses.filter(m => m.status !== "Pago").forEach(m => {
        const g = (das.guides || []).find(x => x.period === m.period), comp = periodoLabel(m.period);
        dasComp.push(comp);
        if (g) {
          const n = diasAte(g.limite);
          itens.push({ grupo: avGrupo(n, n != null && n < 0), n, tom: n != null && n < 0 ? "danger" : n != null && n <= 5 ? "warn" : "", ico: "guias", titulo: "Pagar DAS " + comp, sub: brl(g.values?.total ?? m.declaredTax) + (g.limite ? " · até " + fmtDate(g.limite) : ""), prazo: g.limite, acao: "Ver guia", view: "guias" });
        } else {
          itens.push({ grupo: "agora", n: -1, tom: "danger", ico: "guias", titulo: (m.status === "Pagamento não localizado" ? "Pagamento não localizado: DAS " : "DAS sem guia: ") + comp, sub: "Confira se foi pago ou gere a guia", acao: "Ver guias", view: "guias" });
        }
      });
      docs.filter(d => d.categoria === "Guias" && d.origem === "escritorio").forEach(d => {
        const nome = String(d.titulo || "").replace(/^guia\s+/i, "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s*\d{4}-\d{2}\s*$/, "").trim();
        const comp = d.competencia ? periodoLabel(d.competencia) : "";
        if (/^DAS(\s|$)/i.test(nome) && dasComp.includes(comp)) return;
        const n = d.vencimento ? diasAte(d.vencimento) : null;
        if (n == null || n < -30) return;
        itens.push({ grupo: avGrupo(n, n < 0), n, tom: n < 0 ? "danger" : n <= 5 ? "warn" : "", ico: "guias", titulo: "Pagar " + (nome || d.titulo) + (comp ? " " + comp : ""), sub: "até " + fmtDate(isoData(d.vencimento)), prazo: d.vencimento, acao: "Ver guia", view: "guias" });
      });
    }
    // 2) Obrigações atrasadas ou perto do prazo
    (obr?.obrigacoes || []).filter(o => o.status === "atrasada" || o.status === "pendente").forEach(o => {
      const n = o.vencimento ? diasAte(o.vencimento) : null, atras = o.status === "atrasada" || (n != null && n < 0);
      if (!atras && n != null && n > 30) return;
      itens.push({ grupo: avGrupo(n, atras), n: n ?? 99, tom: atras ? "danger" : n != null && n <= 7 ? "warn" : "", ico: "obrigacoes", titulo: o.titulo, sub: pre(o.empresa_id, (atras ? "Atrasada" : "Pendente") + " · competência " + periodoLabel(o.competencia)), prazo: o.vencimento, acao: "Ver status fiscal", view: "obrigacoes", empresa_id: o.empresa_id });
    });
    // 3) Documentos
    if (liberado("documentos")) {
      const publicados = docs.filter(x => x.origem === "escritorio");
      if (FILTRO_EMPRESA) {
        const comp = mesSomar(hojeLocal().slice(0, 7), -1), compLbl = periodoLabel(comp);
        ENVIOS_MENSAIS.forEach(m => {
          const enviado = docs.some(x => x.origem === "cliente" && String(x.competencia || "").replace("-", "") === comp.replace("-", "") && m.teste(x));
          const semMov = sols.some(s => s.assunto === "Não tenho este mês: " + m.titulo + " " + compLbl);
          if (enviado || semMov) return;
          itens.push(office
            ? { grupo: "depois", n: 50, tom: "", ico: "relogio", titulo: m.titulo + " · " + compLbl, sub: "O cliente ainda não enviou", acao: "Ver documentos", view: "documentos" }
            : { grupo: "semana", n: 7, tom: "warn", ico: "enviar", titulo: "Enviar " + m.titulo.toLowerCase() + " · " + compLbl, sub: "Arquivos da competência " + compLbl, acao: "Enviar", off: consulta, onClick: () => modalUpload({ categoria: m.categoria, titulo: m.arquivo + " " + compLbl, competencia: comp }) });
        });
      }
      if (office) {
        const rec = docs.filter(x => x.origem === "cliente" && !x.conferido_em);
        const porEmp = {}; rec.forEach(x => { (porEmp[x.empresa_id] = porEmp[x.empresa_id] || []).push(x); });
        Object.entries(porEmp).forEach(([id, l]) => itens.push({ grupo: "semana", n: 6, tom: "info", ico: "documentos", titulo: l.length === 1 ? "Conferir: " + l[0].titulo : `Conferir ${l.length} documentos recebidos`, sub: pre(id, "Enviado pelo cliente em " + fmtDate(l[0].criado_em)), acao: "Conferir", view: "documentos", empresa_id: id }));
      }
      const ultima = new Map();
      publicados.filter(x => x.categoria === "Certidões" && x.validade).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em))).forEach(x => { const k = x.empresa_id + "|" + x.titulo; if (!ultima.has(k)) ultima.set(k, x); });
      ultima.forEach(x => {
        const n = diasAte(x.validade); if (n == null || n > 30) return;
        const it = { grupo: avGrupo(n, n < 0), n, tom: n < 0 ? "danger" : "warn", ico: "arq-pdf", titulo: (n < 0 ? "Certidão vencida: " : "Certidão vencendo: ") + x.titulo, sub: pre(x.empresa_id, "Válida até " + fmtDate(isoData(x.validade))), prazo: x.validade, empresa_id: x.empresa_id };
        if (office) Object.assign(it, { acao: "Publicar nova", off: consulta, onClick: () => modalUpload({ categoria: "Certidões", titulo: x.titulo, empresa_id: x.empresa_id }) });
        else if (n < 0) Object.assign(it, { acao: "Pedir nova", off: consulta, onClick: () => modalNovaSolicitacao({ assunto: "Certidão: " + x.titulo, corpo: `A certidão "${x.titulo}" venceu em ${fmtDate(isoData(x.validade))}. Solicito a emissão de uma nova.`, onCreated: () => routeView() }) });
        else Object.assign(it, { acao: "Ver", onClick: () => previewCertidao(x) });
        itens.push(it);
      });
      if (FILTRO_EMPRESA) docsEssenciais().filter(i => !["Certificado digital", "Faturamento"].includes(i.categoria)).forEach(i => {
        if (publicados.some(x => i.categoria === "IRPF" ? String(x.categoria).startsWith("IRPF") : x.categoria === i.categoria)) return;
        itens.push(office
          ? { grupo: "depois", n: 60, tom: "", ico: "documentos", titulo: "Publicar: " + i.titulo, sub: "Ainda não publicado para esta empresa", acao: "Publicar", off: consulta, onClick: () => modalUpload({ categoria: i.categoria }) }
          : { grupo: "depois", n: 60, tom: "", ico: "relogio", titulo: i.titulo, sub: "Aguardando publicação pelo escritório", acao: "Ver documentos", view: "documentos" });
      });
    }
    // 4) Certificado digital
    (certL || []).forEach(({ id, cert }) => {
      if (!cert) { if (!todas) itens.push({ grupo: "depois", n: 80, tom: "info", ico: "certificado", titulo: "Certificado digital: aguardando sincronização", sub: "A situação aparece assim que for consultada", acao: "Ver certificado", view: "certificado" }); return; }
      const d = cert.dias_restantes, venc = certVenc(cert);
      if (d != null && d <= 60) {
        itens.push({ grupo: avGrupo(d, d <= 15), n: d, tom: d <= 15 ? "danger" : "warn", ico: "certificado", titulo: d < 0 ? "Certificado digital vencido" : "Renovar o certificado digital", sub: pre(id, venc ? "Vencimento " + fmtDate(venc) : "Vencimento não informado"), prazo: venc, acao: "Renovar", view: "certificado", empresa_id: id });
      } else if (!cert.confirmacao_recente && !todas) {
        itens.push({ grupo: "depois", n: 80, tom: "info", ico: "certificado", titulo: "Certificado digital: situação a confirmar", sub: "A última data cadastrada pode estar desatualizada", acao: "Ver certificado", view: "certificado" });
      }
    });
    // 5) Solicitações
    sols.forEach(s => {
      if (office) {
        const k = solFila(s);
        if (k === "nova") itens.push({ grupo: "agora", n: -50 + (SOL_PRIO[s.prioridade] ?? 1), tom: s.prioridade === "alta" ? "danger" : "warn", ico: "solicitacoes", titulo: "Triar: " + s.assunto, sub: pre(s.empresa_id, s.protocolo + (s.prioridade === "alta" ? " · prioridade alta" : "") + " · sem responsável"), acao: "Triar", sol: s, filtro: "nova" });
        else if (k === "atendimento" && s.prazo) { const n = diasAte(s.prazo); itens.push({ grupo: avGrupo(n, n != null && n < 0), n, tom: n != null && n < 0 ? "danger" : n != null && n <= 1 ? "warn" : "", ico: "solicitacoes", titulo: "Responder: " + s.assunto, sub: pre(s.empresa_id, s.protocolo + " · " + (s.responsavel || "")), prazo: s.prazo, acao: "Abrir", sol: s, filtro: "atendimento" }); }
      } else if (solEstado(s) === "aguardando") {
        itens.push({ grupo: "agora", n: -40, tom: "warn", ico: "solicitacoes", titulo: "Responder: " + s.assunto, sub: s.protocolo + " · o escritório respondeu " + solHora(s.atualizada_em).replace(/^(\d{2}:\d{2})$/, "hoje às $1").replace(/^(\d{2}\/\d{2})$/, "em $1"), acao: "Responder", sol: s, filtro: "abertas" });
      }
    });
    const TOM = { danger: 0, warn: 1, info: 2, "": 3 };
    itens.sort((a, b) => (TOM[a.tom] ?? 3) - (TOM[b.tom] ?? 3) || (a.n ?? 99) - (b.n ?? 99));
    return { itens, falhas, todas };
  }
  function avExecutar(it) {
    if (it.onClick) return it.onClick();
    if (it.sol) { SOL_SEL = it.sol.id; SOL_FILTRO = it.filtro || ""; SOL_BUSCA = ""; return irPara("solicitacoes"); }
    if (it.empresa_id != null && isOffice() && !FILTRO_EMPRESA) FILTRO_EMPRESA = String(it.empresa_id);
    irPara(it.view);
  }
  function linhaAviso(it) {
    const n = it.prazo ? diasAte(it.prazo) : null;
    const li = el(`<li class="act-row av2-row ${it.tom || ""}">
      <span class="act-ico" aria-hidden="true">${icone(it.ico)}</span>
      <div class="act-txt"><b>${esc(it.titulo)}</b><small>${esc(it.sub || "")}</small></div>
      <span class="av2-prazo ${n != null && n < 0 ? "txt-danger" : ""}">${n != null ? esc(quando(it.prazo)) : ""}</span>
      <button type="button" class="btn sm ${it.grupo === "agora" ? "" : "ghost"}">${esc(it.acao || "Abrir")}</button>
    </li>`);
    const b = li.querySelector("button");
    if (it.off) { b.disabled = true; b.title = "Perfil somente consulta"; }
    b.onclick = () => avExecutar(it);
    return li;
  }
  async function viewAvisos() {
    const office = isOffice();
    setTitle("Avisos e pendências", office && !FILTRO_EMPRESA ? "Todas as empresas · o que precisa de atenção" : "Tudo o que precisa de atenção, em um só lugar");
    topActions().innerHTML = "";
    const c = content(); c.innerHTML = "<div class='empty'>Carregando…</div>";
    const company = FILTRO_EMPRESA;
    let r;
    try { r = await coletarAvisos(); } catch (e) { if (VIEW === "avisos") c.innerHTML = `<div class="alert err">${esc(e.message)}</div>`; return; }
    if (VIEW !== "avisos" || company !== FILTRO_EMPRESA) return;
    c.innerHTML = "";
    const por = Object.fromEntries(AV_GRUPOS.map(([k]) => [k, r.itens.filter(i => i.grupo === k)]));
    definirContador("agora", por.agora.length);
    const ag = por.agora.length, se = por.semana.length, de = por.depois.length;
    const tom = ag ? (por.agora.some(i => i.tom === "danger") ? "danger" : "warn") : se ? "info" : "ok";
    c.appendChild(el(`<section class="obr-hero dv2 av2-hero ${tom}"><span class="obr-hero-ico" aria-hidden="true">${icone(tom === "ok" ? "check" : tom === "info" ? "relogio" : "alerta")}</span><div><h3>${ag ? plural(ag, "item para resolver agora", "itens para resolver agora") : se ? "Nada urgente agora" : "Tudo em dia"}</h3><p>${ag || se || de ? `${plural(se, "item", "itens")} para esta semana · ${plural(de, "item", "itens")} para depois` : "Nenhuma guia, prazo, documento ou resposta pendente."}</p></div></section>`));
    if (!r.itens.length) {
      const ok = el(`<section class="hcard av2-vazio"><div class="act-ok"><span aria-hidden="true">${icone("check")}</span><div><b>Tudo em dia</b><small>Quando houver guia a pagar, prazo chegando ou resposta do escritório, aparece aqui.</small></div></div><button type="button" class="link-btn">Ir para o início</button></section>`);
      ok.querySelector(".link-btn").onclick = () => irPara("painel");
      c.appendChild(ok);
    }
    AV_GRUPOS.forEach(([k, label]) => {
      const l = por[k]; if (!l.length) return;
      const sec = el(`<section class="hcard dv2 av2-grupo av2-${k}"><header><h3>${label}</h3><span class="count">${plural(l.length, "item", "itens")}</span></header><ul class="act-list"></ul></section>`);
      l.forEach(it => sec.querySelector("ul").appendChild(linhaAviso(it)));
      c.appendChild(sec);
    });
    const notas = [];
    if (r.todas && liberado("guias")) notas.push("Guias a pagar aparecem ao escolher uma empresa no topo.");
    if (r.falhas.length) notas.push("Não foi possível carregar agora: " + r.falhas.join(", ") + ". Tente de novo em instantes.");
    if (notas.length) c.appendChild(el(`<p class="essential-note">${esc(notas.join(" "))}</p>`));
  }

  // ---------- Janelas acrílicas do cabeçalho (Conversas e Notificações) ----------
  // Abrem por cima do conteúdo, presas ao ícone. A tela completa continua em "Ver todas".
  let JANELA = null; // { tipo, el, botao }
  function fecharJanela(imediato) {
    const j = JANELA; if (!j) return;
    JANELA = null;
    j.botao?.setAttribute("aria-expanded", "false");
    j.botao?.classList.remove("acr-on");
    document.removeEventListener("keydown", j.onKey, true);
    document.removeEventListener("pointerdown", j.onFora, true);
    window.removeEventListener("resize", j.onResize);
    if (imediato || menosMovimento()) return j.el.remove();
    j.el.classList.add("saindo");
    setTimeout(() => j.el.remove(), 180);
  }
  function posicionarJanela(j) {
    const r = j.botao.getBoundingClientRect(), hdr = document.querySelector(".app-v2 .hdr");
    const topo = Math.round((hdr ? hdr.getBoundingClientRect().bottom : r.bottom) + 10);
    const larg = Math.min(400, window.innerWidth - 24);
    const celular = window.innerWidth <= 560;
    const esq = celular ? 12 : Math.max(12, Math.min(window.innerWidth - larg - 12, r.right - larg + 14));
    Object.assign(j.el.style, { top: topo + "px", left: esq + "px", width: (celular ? window.innerWidth - 24 : larg) + "px", maxHeight: (window.innerHeight - topo - 16) + "px" });
    // setinha apontando para o ícone
    j.el.style.setProperty("--seta-x", Math.round(r.left + r.width / 2 - esq) + "px");
  }
  async function abrirJanela(tipo, botao) {
    if (JANELA && JANELA.tipo === tipo) return fecharJanela();
    fecharJanela(true);
    const sol = tipo === "sol";
    const el_ = el(`<div class="acr-pop" role="dialog" aria-modal="false" aria-label="${sol ? "Conversas" : "Notificações"}">
      <header class="acr-head">
        <span class="acr-ico" aria-hidden="true">${icone(sol ? "solicitacoes" : "avisos")}</span>
        <div><h3>${sol ? "Conversas" : "Notificações"}</h3><small class="acr-sub">Carregando…</small></div>
        <button type="button" class="acr-x" aria-label="Fechar">×</button>
      </header>
      <div class="acr-body"><ul class="acr-list">${'<li class="acr-skel"><i></i><span><b></b><em></em></span></li>'.repeat(4)}</ul></div>
      <footer class="acr-foot"></footer>
    </div>`);
    document.body.appendChild(el_);
    const j = { tipo, el: el_, botao };
    j.onKey = e => { if (e.key === "Escape") { e.stopPropagation(); fecharJanela(); botao.focus(); } };
    j.onFora = e => { if (!el_.contains(e.target) && !botao.contains(e.target)) fecharJanela(); };
    j.onResize = () => posicionarJanela(j);
    JANELA = j;
    botao.setAttribute("aria-expanded", "true");
    botao.classList.add("acr-on");
    posicionarJanela(j);
    document.addEventListener("keydown", j.onKey, true);
    document.addEventListener("pointerdown", j.onFora, true);
    window.addEventListener("resize", j.onResize);
    el_.querySelector(".acr-x").onclick = () => { fecharJanela(); botao.focus(); };
    const ul = el_.querySelector(".acr-list"), sub = el_.querySelector(".acr-sub"), foot = el_.querySelector(".acr-foot");
    const vazio = (t, s) => `<li class="acr-vazio"><span aria-hidden="true">${icone("check")}</span><b>${esc(t)}</b><small>${esc(s)}</small></li>`;
    try {
      if (sol) {
        const d = await pegar("/api/solicitacoes" + empParam());
        if (JANELA !== j) return;
        const lista = (d?.solicitacoes || []).slice().sort((a, b) => String(b.atualizada_em || "").localeCompare(String(a.atualizada_em || "")));
        const pend = contarSol(lista);
        sub.textContent = pend ? `${pend} ${isOffice() ? (pend === 1 ? "nova" : "novas") : "aguardando você"}` : lista.length ? "Tudo respondido" : "Nenhuma conversa ainda";
        ul.innerHTML = lista.length ? "" : vazio("Nada por aqui", "Quando você falar com o escritório, a conversa aparece aqui.");
        lista.slice(0, 6).forEach(s => {
          const ult = (s.mensagens || [])[(s.mensagens || []).length - 1];
          const destaque = isOffice() ? solFila(s) === "nova" : solEstado(s) === "aguardando";
          const quem = ult ? (ult.autor_perfil === "escritorio" ? (isOffice() ? "Você: " : "Escritório: ") : (isOffice() ? "" : "Você: ")) : "";
          const li = el(`<li><button type="button" class="acr-item ${destaque ? "novo" : ""}">
            <span class="acr-av" aria-hidden="true">${destaque ? '<i class="acr-dot"></i>' : ""}${icone("solicitacoes")}</span>
            <span class="acr-txt"><span class="acr-top"><b>${esc(s.assunto || "Sem assunto")}</b><time>${esc(solHora(s.atualizada_em))}</time></span>
              ${ult ? `<small>${esc(quem + String(ult.corpo || "").slice(0, 90))}</small>` : `<small>${esc(s.protocolo || "")}</small>`}
              <span class="acr-chips">${solChip(s)}</span></span>
          </button></li>`);
          li.querySelector("button").onclick = () => { SOL_SEL = s.id; SOL_FILTRO = ""; SOL_BUSCA = ""; fecharJanela(true); irPara("solicitacoes"); };
          ul.appendChild(li);
        });
        foot.innerHTML = `<button type="button" class="acr-link">Ver todas as conversas</button>${ME.funcao === "consulta" ? "" : '<button type="button" class="btn sm acr-nova">Nova conversa</button>'}`;
        foot.querySelector(".acr-link").onclick = () => { fecharJanela(true); irPara("solicitacoes"); };
        foot.querySelector(".acr-nova")?.addEventListener("click", () => { fecharJanela(true); modalNovaSolicitacao(); });
      } else {
        const r = await coletarAvisos();
        if (JANELA !== j) return;
        const agora = r.itens.filter(i => i.grupo === "agora").length;
        sub.textContent = agora ? `${agora} para resolver agora` : r.itens.length ? "Nada urgente agora" : "Tudo em dia";
        ul.innerHTML = r.itens.length ? "" : vazio("Tudo em dia", "Guias, prazos e respostas aparecem aqui.");
        r.itens.slice(0, 7).forEach(it => {
          const n = it.prazo ? diasAte(it.prazo) : null;
          const li = el(`<li><button type="button" class="acr-item tom-${it.tom || "neutro"}">
            <span class="acr-av" aria-hidden="true">${icone(it.ico)}</span>
            <span class="acr-txt"><span class="acr-top"><b>${esc(it.titulo)}</b></span>
              <small>${esc(it.sub || "")}</small>
              ${n != null ? `<span class="acr-prazo ${n < 0 ? "txt-danger" : ""}">${esc(quando(it.prazo))}</span>` : ""}</span>
          </button></li>`);
          li.querySelector("button").onclick = () => { fecharJanela(true); avExecutar(it); };
          ul.appendChild(li);
        });
        foot.innerHTML = `<button type="button" class="acr-link">Ver todos os avisos</button>`;
        foot.querySelector(".acr-link").onclick = () => { fecharJanela(true); irPara("avisos"); };
      }
      el_.querySelector(".acr-item, .acr-link")?.focus({ preventScroll: true });
    } catch (e) {
      if (JANELA !== j) return;
      sub.textContent = "Não foi possível carregar";
      ul.innerHTML = `<li class="acr-vazio"><b>Tente de novo em instantes</b><small>${esc(e.message || "")}</small></li>`;
    }
  }

  // ---------- Contadores do cabeçalho (Solicitações e sino): carregados depois, falham em silêncio ----------
  const CONTADOR = { sol: { chave: "", t: 0, n: 0 }, agora: { chave: "", t: 0, n: 0 } };
  let CONTADOR_TIMER = null;
  const contadorChave = () => (ME ? ME.id + "|" + ME.perfil : "") + "|" + FILTRO_EMPRESA;
  const contarSol = l => l.filter(s => isOffice() ? solFila(s) === "nova" : solEstado(s) === "aguardando").length;
  function invalidarContadores() { CONTADOR.sol.t = 0; CONTADOR.agora.t = 0; agendarContadores(); }
  function pintarContadores() {
    [["goSol", "sol", "Conversas", isOffice() ? "novas" : "aguardando você"], ["goAvisos", "agora", "Notificações", "para agora"]].forEach(([id, k, rot, txt]) => {
      const b = document.getElementById(id); if (!b) return;
      const span = b.querySelector(".hdr-badge"), c = CONTADOR[k], n = c.chave === contadorChave() ? c.n : 0;
      if (span) { span.hidden = !n; span.textContent = n > 9 ? "9+" : String(n || ""); }
      b.setAttribute("aria-label", n ? `${rot} (${n} ${txt})` : rot);
      b.title = n ? `${rot} · ${n} ${txt}` : rot;
    });
  }
  function definirContador(k, n) { CONTADOR[k] = { chave: contadorChave(), t: Date.now(), n }; pintarContadores(); }
  function agendarContadores() { clearTimeout(CONTADOR_TIMER); CONTADOR_TIMER = setTimeout(atualizarContadores, 700); }
  async function atualizarContadores() {
    if (!ME) return;
    pintarContadores();
    const chave = contadorChave(), velho = k => CONTADOR[k].chave !== chave || Date.now() - CONTADOR[k].t > 60000;
    try {
      if (liberado("solicitacoes") && document.getElementById("goSol") && velho("sol")) {
        const d = await pegar("/api/solicitacoes" + empParam());
        if (d && chave === contadorChave()) definirContador("sol", contarSol(d.solicitacoes || []));
      }
      if (liberado("avisos") && document.getElementById("goAvisos") && velho("agora") && VIEW !== "avisos") {
        const r = await coletarAvisos();
        if (chave === contadorChave()) definirContador("agora", r.itens.filter(i => i.grupo === "agora").length);
      }
    } catch (e) { /* contador é opcional */ }
  }
  // ---------- Histórico v2: linha do tempo única, por mês ----------
  let HIST_FILTRO='todos',HIST_PERIODO='365',HIST_BUSCA='',HIST_LIMITE=60;
  async function viewHistorico() {
    const c=await inicioRecurso('Histórico','Tudo o que aconteceu entre a empresa e o escritório');if(!c)return;
    const company=FILTRO_EMPRESA,office=isOffice();
    const loading=el('<div class="empty">Carregando…</div>');c.appendChild(loading);
    let docs,mal,sols,das;
    try{
      [docs,mal,sols,das]=await Promise.all([api('/api/documentos'+empParam()).then(r=>r.documentos||[]),pegar('/api/malotes'+empParam()),pegar('/api/solicitacoes'+empParam()),pegar('/api/das'+empParam())]);
    }catch(e){loading.remove();c.appendChild(el(`<div class="alert err">${esc(e.message)}</div>`));return;}
    if(VIEW!=='historico'||company!==FILTRO_EMPRESA)return;
    loading.remove();
    const ev=[];
    docs.forEach(d=>{
      const comp=d.competencia?' · competência '+periodoLabel(d.competencia):'';
      if(d.origem==='cliente'){
        ev.push({quando:d.criado_em,tipo:'envio',ico:tipoArquivo(d.nome_arquivo)[0],titulo:(office?'Cliente enviou: ':'Você enviou: ')+d.titulo,sub:d.categoria+comp,doc:d});
        if(d.conferido_em)ev.push({quando:d.conferido_em,tipo:'envio',ico:'check',titulo:'Escritório conferiu: '+d.titulo,sub:'Conferido por '+(d.conferido_por||'escritório')});
      }else ev.push({quando:d.criado_em,tipo:'documento',ico:tipoArquivo(d.nome_arquivo)[0],titulo:'Publicado: '+d.titulo,sub:d.categoria+comp+(d.validade?' · válida até '+fmtDate(isoData(d.validade)):''),doc:d});
    });
    (mal?.malotes||[]).forEach(m=>ev.push({quando:m.created_at,tipo:'envio',ico:'malotes',titulo:`Malote ${maloteNum(m.id)} enviado`,sub:`Competência ${periodoLabel(m.competence)} · ${plural((m.files||[]).length,'arquivo','arquivos')} · ${m.status||''}`,view:'malotes'}));
    (sols?.solicitacoes||[]).forEach(s=>{
      ev.push({quando:s.criada_em,tipo:'solicitacao',ico:'solicitacoes',titulo:'Solicitação aberta: '+s.assunto,sub:s.protocolo+' · '+(STATUS_SOL[s.status]?.[0]||s.status),sol:s});
      (s.mensagens||[]).filter(m=>m.autor_perfil==='escritorio').forEach(m=>ev.push({quando:m.criada_em,tipo:'solicitacao',ico:'solicitacoes',titulo:'Escritório respondeu: '+s.assunto,sub:s.protocolo+' · '+(m.autor_nome||''),sol:s}));
    });
    (das?.payments||[]).forEach(p=>{const q=isoData(p.paidAt);if(q)ev.push({quando:q,tipo:'pagamento',ico:'pagamento',titulo:'DAS '+periodoLabel(p.period)+' pago',sub:brl(p.amount)+' · localizado na consulta oficial da Receita'});});
    ev.forEach(e=>{const s=String(e.quando||'');e.dia=isoData(s)||'';e.hora=s.includes('T')?s.slice(11,16):'';e.ord=e.dia+(e.hora||'12:00');});
    ev.sort((a,b)=>b.ord.localeCompare(a.ord));

    const TIPOS=[['todos','Tudo'],['documento','Publicados pelo escritório'],['envio',office?'Envios do cliente':'Seus envios'],['solicitacao','Solicitações'],['pagamento','Pagamentos']];
    const PERIODOS=[['30','Últimos 30 dias'],['90','Últimos 3 meses'],['365','Últimos 12 meses'],['tudo','Todo o período']];
    const sec=el(`<section class="hcard dv2 hist2"><header><h3>Linha do tempo</h3><span class="count"></span></header><div class="notas-filtros"><div class="chip-filter" role="group" aria-label="Filtrar por tipo"></div><div class="hist2-busca"><select aria-label="Período">${PERIODOS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select><input type="search" aria-label="Buscar no histórico" placeholder="Buscar documento, protocolo…"></div></div><div class="hist2-body"></div><div class="dv2-more"></div></section>`);
    const chips=sec.querySelector('.chip-filter'),sel=sec.querySelector('select'),inp=sec.querySelector('input'),body=sec.querySelector('.hist2-body'),more=sec.querySelector('.dv2-more');
    sel.value=HIST_PERIODO;inp.value=HIST_BUSCA;
    const noPeriodo=e=>HIST_PERIODO==='tudo'||(diasAte(e.dia)??0)>=-Number(HIST_PERIODO);
    function desenhar(){
      chips.innerHTML='';
      const base=ev.filter(noPeriodo),q=HIST_BUSCA.trim().toLowerCase();
      TIPOS.forEach(([k,l])=>{const n=k==='todos'?base.length:base.filter(e=>e.tipo===k).length;if(k!=='todos'&&!n&&HIST_FILTRO!==k)return;const b=el(`<button class="pill ${HIST_FILTRO===k?'active':''}" aria-pressed="${HIST_FILTRO===k}">${esc(l)} <span class="n">${n}</span></button>`);b.onclick=()=>{HIST_FILTRO=k;HIST_LIMITE=60;desenhar();};chips.appendChild(b);});
      const vis=base.filter(e=>HIST_FILTRO==='todos'||e.tipo===HIST_FILTRO).filter(e=>!q||(e.titulo+' '+e.sub).toLowerCase().includes(q));
      sec.querySelector('.count').textContent=plural(vis.length,'evento','eventos');
      body.innerHTML='';more.innerHTML='';
      if(!vis.length){body.appendChild(el(`<div class="act-ok"><span aria-hidden="true">${icone('check')}</span><div><b>Nada neste período</b><small>${ev.length?'Escolha um período maior, outro tipo ou limpe a busca.':'Os envios, publicações e solicitações aparecem aqui.'}</small></div></div>`));return;}
      let mes='',ol=null;
      vis.slice(0,HIST_LIMITE).forEach(e=>{
        const m=e.dia.slice(0,7);
        if(m!==mes){mes=m;const g=el(`<section class="hist2-mes"><h4 class="cap">${m?esc(mesLongo(m)):'Sem data'}</h4><ol class="hist2-list"></ol></section>`);body.appendChild(g);ol=g.querySelector('ol');}
        const li=el(`<li class="hist2-row t-${e.tipo}"><i class="hist2-ico" aria-hidden="true">${icone(e.ico)}</i><div class="hist2-main"><b>${esc(e.titulo)}</b><small><time datetime="${esc(e.dia)}">${e.dia?fmtDate(e.dia):''}${e.hora?' às '+esc(e.hora):''}</time> · ${esc(e.sub)}</small></div><span class="hist2-act"></span></li>`);
        const act=li.querySelector('.hist2-act');
        if(e.doc){if(docPrevisualizavel(e.doc))addAcao(act,{txt:'Ver',tipo:'link',onClick:()=>previewCertidao(e.doc)});else addAcao(act,{txt:'Baixar',tipo:'link',href:docDownload(e.doc)});}
        else if(e.sol)addAcao(act,{txt:'Abrir',tipo:'link',onClick:()=>modalSolicitacao(e.sol)});
        else if(e.view)addAcao(act,{txt:'Ver malotes',tipo:'link',onClick:()=>irPara(e.view)});
        ol.appendChild(li);
      });
      if(vis.length>HIST_LIMITE){const b=el(`<button class="btn ghost sm">Mostrar mais ${Math.min(60,vis.length-HIST_LIMITE)} de ${vis.length-HIST_LIMITE}</button>`);b.onclick=()=>{HIST_LIMITE+=60;desenhar();};more.appendChild(b);}
    }
    sel.onchange=()=>{HIST_PERIODO=sel.value;HIST_LIMITE=60;desenhar();};
    inp.oninput=()=>{HIST_BUSCA=inp.value;HIST_LIMITE=60;desenhar();};
    desenhar();
    c.appendChild(sec);
    c.appendChild(el('<p class="essential-note">Certidões retiradas ou vencidas não ficam disponíveis para download. Pagamentos vêm da última consulta à Receita (em Guias).</p>'));
  }

  // ---------- Malotes v2: pedido de envio com prazo + histórico ----------
  // Convenção do portal: os arquivos de uma competência vão até o dia 10 do mês seguinte.
  // A API ainda não informa o prazo nem a lista esperada por empresa; ajuste aqui se o escritório combinar outra regra.
  const MALOTE_DIA_LIMITE=10;
  const MALOTE_ESPERADOS=[
    {titulo:'Extratos bancários',desc:'Todas as contas e aplicações',cats:['Extratos bancários']},
    {titulo:'Notas fiscais',desc:'Compras e serviços contratados',cats:['Notas fiscais']},
    {titulo:'Boletos e comprovantes',desc:'Pagamentos feitos no mês',cats:['Boletos']},
    {titulo:'Contas de consumo',desc:'Água, energia e internet',cats:['Água','Energia','Internet']},
  ];
  const maloteNum=id=>'MAL-'+String(id).padStart(6,'0');
  function maloteTom(s){s=String(s||'');if(/^conferid|^recebid|^aprovad/i.test(s))return ['ok','check'];if(/recus|rejeit|pend|erro/i.test(s))return ['warn','alerta'];return ['info','relogio'];}
  async function viewMalotes() {
    const c=await inicioRecurso('Malotes','Arquivos do mês para o escritório, com prazo');if(!c)return;
    const consulta=ME.funcao==='consulta',office=isOffice(),company=FILTRO_EMPRESA;
    const b=el('<button class="btn">Enviar malote</button>');b.onclick=()=>modalMalote();if(consulta)b.disabled=true;topActions().appendChild(b);
    let data,sols;
    try{[data,sols]=await Promise.all([api('/api/malotes'+empParam()),pegar('/api/solicitacoes'+empParam())]);}
    catch(e){c.appendChild(el(`<div class="alert err">${esc(e.message)}</div>`));return;}
    if(VIEW!=='malotes'||company!==FILTRO_EMPRESA)return;
    const malotes=data.malotes||[],solicit=sols?.solicitacoes||[];
    const atual=hojeLocal().slice(0,7),anterior=mesSomar(atual,-1);
    const pedido=comp=>{
      const prazo=mesSomar(comp,1)+'-'+String(MALOTE_DIA_LIMITE).padStart(2,'0');
      const files=malotes.filter(m=>String(m.competence||'').slice(0,7)===comp).flatMap(m=>m.files||[]);
      const itens=MALOTE_ESPERADOS.map(x=>{const assunto=`Malote ${periodoLabel(comp)}: não tenho ${x.titulo.toLowerCase()}`;return {...x,assunto,arqs:files.filter(f=>x.cats.includes(f.category)),sem:solicit.find(s=>s.assunto===assunto)};});
      const feitos=itens.filter(i=>i.arqs.length||i.sem).length;
      return {comp,prazo,itens,feitos,total:itens.length,extras:files.filter(f=>!MALOTE_ESPERADOS.some(x=>x.cats.includes(f.category)))};
    };
    const abertos=[pedido(anterior),pedido(atual)].filter((p,i)=>i===1||p.feitos<p.total);
    abertos.forEach(p=>{
      const completo=p.feitos===p.total,n=diasAte(p.prazo),atrasado=!completo&&n<0;
      const tom=completo?'ok':atrasado?'warn':n<=5?'warn':'info';
      const card=el(`<section class="hcard dv2 mal2 ${tom}"><header><div><span class="kpi-label">Malote da competência</span><h3 class="cap">${esc(mesLongo(p.comp))}</h3></div>${chipHtml(tom,completo?'check':atrasado?'alerta':'relogio',completo?'Completo':atrasado?'Prazo passou':'Aberto')}</header>
        <div class="mal2-prog"><div class="meter" role="img" aria-label="${p.feitos} de ${p.total} itens"><span style="width:${Math.round(p.feitos/p.total*100)}%"></span></div><p><b>${p.feitos} de ${p.total}</b> itens enviados ou informados · ${completo?'tudo certo para esta competência':`envie até <b>${fmtDate(p.prazo)}</b> (${esc(quando(p.prazo).replace(/^vence/,'prazo vence').replace(/^venceu/,'prazo venceu'))})`}</p></div>
        <ul class="act-list"></ul></section>`);
      const ul=card.querySelector('ul');
      p.itens.forEach(i=>{
        const enviar=()=>modalMalote({competencia:p.comp,categoria:i.cats[0]==='Água'?'Energia':i.cats[0]});
        if(i.arqs.length){
          const pend=i.arqs.filter(f=>!/^conferid/i.test(f.review_status||'')).length;
          ul.appendChild(linhaCheck({tom:'ok',ico:'check',titulo:i.titulo,sub:plural(i.arqs.length,'arquivo','arquivos')+': '+i.arqs.map(f=>f.original_name).join(', '),chip:pend?['info',plural(pend,'em conferência','em conferência'),'relogio']:['ok','Conferido','check'],acoes:[{txt:'Enviar mais',tipo:'link',off:consulta,onClick:enviar}]}));
        }else if(i.sem){
          ul.appendChild(linhaCheck({tom:'',ico:'menos',titulo:i.titulo,sub:(office?'Cliente informou':'Você informou')+' que não houve neste mês · '+i.sem.protocolo,chip:['','Não se aplica','menos'],acoes:[{txt:'Enviar mesmo assim',tipo:'link',off:consulta,onClick:enviar}]}));
        }else{
          const acoes=[{txt:'Enviar',tipo:'primario',off:consulta,onClick:enviar}];
          if(!office)acoes.push({txt:'Não tenho este mês',tipo:'link',off:consulta,onClick:()=>modalNovaSolicitacao({assunto:i.assunto,corpo:`Informo que não houve ${i.titulo.toLowerCase()} na competência ${periodoLabel(p.comp)}.`,onCreated:()=>viewMalotes()})});
          ul.appendChild(linhaCheck({tom:atrasado?'warn':'',ico:'enviar',titulo:i.titulo,sub:i.desc,chip:[atrasado?'warn':'','Pendente','relogio'],acoes}));
        }
      });
      if(p.extras.length)ul.appendChild(linhaCheck({tom:'ok',ico:'check',titulo:'Outros arquivos',sub:p.extras.map(f=>f.original_name).join(', '),chip:null,acoes:[]}));
      c.appendChild(card);
    });

    const hist=el(`<section class="hcard dv2 mal2-hist"><header><h3>Malotes enviados</h3><span class="count">${malotes.length}</span></header><ul class="dv2-list"></ul></section>`);
    const ul=hist.querySelector('ul');
    if(!malotes.length)ul.appendChild(el(`<li class="act-ok"><span aria-hidden="true">${icone('check')}</span><div><b>Nenhum malote enviado ainda</b><small>Use “Enviar” em um item acima para mandar os primeiros arquivos.</small></div></li>`));
    [...malotes].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).forEach(m=>{
      const [t,ico]=maloteTom(m.status),files=m.files||[];
      const li=el(`<li class="dv2-doc"><i class="dv2-fico" aria-hidden="true">${icone('malotes')}</i><div class="dv2-main"><b>${maloteNum(m.id)} · competência ${esc(periodoLabel(m.competence))}</b><small>Enviado em ${fmtDateTime(m.created_at)}${m.delivery_mode?' · '+esc(m.delivery_mode):''}</small><details class="mal2-files"><summary>${plural(files.length,'arquivo','arquivos')}</summary><ul>${files.map(f=>{const [ft,fi]=maloteTom(f.review_status);return `<li><span class="mal2-fname">${esc(f.original_name)}</span><small>${esc(f.category||'')}</small>${chipHtml(ft,fi,f.review_status||'Recebido')}</li>`;}).join('')}</ul></details></div><span class="dv2-acts">${chipHtml(t,ico,m.status||'Recebido')}</span></li>`);
      ul.appendChild(li);
    });
    c.appendChild(hist);
    c.appendChild(el(`<p class="essential-note">Até 50 arquivos e 12 MB por envio (PDF, imagem, XML, OFX, CSV ou planilha). Prazo padrão: dia ${MALOTE_DIA_LIMITE} do mês seguinte à competência.</p>`));
  }
  // modalMalote() ou modalMalote({competencia:'AAAA-MM', categoria})
  function modalMalote(preset) {
    const o=preset&&typeof preset==='object'&&!(preset instanceof Event)?preset:{};
    const cats=['Notas fiscais','Extratos bancários','Boletos','Água','Energia','Internet','Outros'];
    let pending=null;
    openModal('Enviar malote ao escritório',`<div class="field"><label>Competência</label><input name="competencia" type="month" value="${esc(o.competencia||hojeLocal().slice(0,7))}"></div><div class="field"><label>Categoria</label><select name="categoria">${cats.map(x=>`<option ${x===o.categoria?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Arquivos</label><input name="arquivos" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.xml,.ofx,.csv,.xlsx,.xls"><small>Até 50 arquivos e 12 MB no total.</small></div><div class="field"><label>Observação</label><textarea name="notes"></textarea></div><p role="status" id="maloteStatus"></p>`,async(form,close,setErr)=>{
      const save=form.closest('.modal').querySelector('#ok');save.disabled=true;
      try {
        if(!pending){
          const files=[...form.arquivos.files];if(!files.length)throw Error('Selecione os arquivos do malote.');if(files.reduce((n,f)=>n+f.size,0)>12*1024*1024)throw Error('O malote deve ter até 12 MB.');
          const encoded=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({filename:file.name,mimeType:file.type,fileBase64:String(reader.result).split(',')[1],category:form.categoria.value});reader.onerror=()=>reject(Error('Não foi possível ler '+file.name));reader.readAsDataURL(file);})));pending={request_key:crypto.randomUUID(),empresa_id:Number(FILTRO_EMPRESA),competencia:form.competencia.value,notes:form.notes.value,files:encoded};
        }
        form.querySelector('#maloteStatus').textContent='Enviando e aguardando confirmação do portal interno…';
        const result=await jpost('/api/malotes',pending);close();await viewMalotes();content().prepend(el(`<div class="alert">Malote ${maloteNum(result.id)} recebido no portal interno.</div>`));
      }catch(e){form.querySelector('#maloteStatus').textContent='Envio não confirmado. A nova tentativa reutiliza o mesmo identificador e os mesmos arquivos.';setErr(e.message);}finally{save.disabled=false;}
    },{okLabel:'Enviar malote'});
  }

  // ---------- Modal genérico ----------
  // opts: { somenteLeitura: true } esconde "Salvar" e troca "Cancelar" por "Fechar"; { okLabel: "Enviar" } renomeia o botão principal.
  function openModal(title, bodyHtml, onSubmit, opts = {}) {
    const leitura = !!opts.somenteLeitura;
    const back = el(`<div class="modal-backdrop"></div>`);
    const modal = el(`<div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${esc(title)}</h3><button class="x" aria-label="Fechar">×</button></div>
      <form class="modal-body"><div class="alert err hide" id="err"></div>${bodyHtml}</form>
      <div class="modal-foot"><button class="btn ghost" type="button" id="cancel">${leitura ? "Fechar" : "Cancelar"}</button>${leitura ? "" : `<button class="btn" id="ok">${esc(opts.okLabel || "Salvar")}</button>`}</div>
    </div>`);
    back.appendChild(modal);
    const form = modal.querySelector("form");
    const errEl = modal.querySelector("#err");
    const okBtn = modal.querySelector("#ok");
    const setErr = (m) => { errEl.textContent = m; errEl.classList.remove("hide"); };
    const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape" && back.isConnected && modalRoot.lastElementChild === back) close(); };
    document.addEventListener("keydown", onKey);
    back.addEventListener("click", (e) => { if (e.target === back) close(); });
    modal.querySelector(".x").addEventListener("click", close);
    modal.querySelector("#cancel").addEventListener("click", close);
    let enviando=false;
    const submit = async () => { if (leitura) return; if(enviando||!form.reportValidity())return;enviando=true;okBtn.disabled=true;try{await onSubmit(form, close, setErr);}finally{enviando=false;okBtn.disabled=false;} };
    if (okBtn) okBtn.addEventListener("click", submit);
    form.addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    modalRoot.appendChild(back);
    const first = form.querySelector("input,select,textarea");
    if (first) first.focus(); else modal.querySelector(leitura ? "#cancel" : ".x").focus();
  }

  // ---------- Boot ----------
  (async function boot() {
    try {
      LANCAMENTO = await api("/api/lancamento");
      const r = await api("/api/me");
      if (r.autenticado && !(DEMO() && !demoEntrou())) { ME = r.usuario; renderApp(); }
      else renderLogin();
    } catch (e) { renderLogin(); }
  })();
})();
