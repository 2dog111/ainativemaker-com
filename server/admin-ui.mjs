export const adminHtml = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Заявки — AI Native Maker</title>
  <link rel="stylesheet" href="/admin/styles.css">
  <script type="module" src="/admin/app.js"></script>
</head>
<body>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <a class="brand" href="/admin/" aria-label="AI Native Maker — админка">AI Native Maker <span>Admin</span></a>
        <h1>Заявки</h1>
        <p class="summary" data-summary>Загрузка…</p>
      </div>
      <div class="header-actions">
        <button type="button" class="button-secondary" data-refresh>Обновить</button>
        <a class="button-secondary" href="/admin/export.csv">Скачать CSV</a>
        <form method="post" action="/admin/logout"><button type="submit" class="button-quiet">Выйти</button></form>
      </div>
    </header>

    <p class="admin-notice" data-admin-notice role="status" hidden></p>

    <section class="metrics" aria-label="Сводка по заявкам">
      <button type="button" class="metric metric-attention" data-metric="attention"><span data-count-attention>0</span><small>требуют внимания</small></button>
      <button type="button" class="metric" data-metric="new"><span data-count-new>0</span><small>новых</small></button>
      <button type="button" class="metric" data-metric="active"><span data-count-active>0</span><small>в работе</small></button>
      <button type="button" class="metric" data-metric="deal"><span data-count-deal>0</span><small>сделок</small></button>
    </section>

    <section class="workspace">
      <div class="inbox">
        <div class="inbox-tools">
          <label class="search"><span class="sr-only">Поиск по заявкам</span><input type="search" placeholder="Имя, контакт или задача" data-search></label>
          <div class="filters" role="group" aria-label="Фильтр заявок">
            <button type="button" data-filter="all" aria-pressed="true">Все</button>
            <button type="button" data-filter="attention" aria-pressed="false">Внимание</button>
            <button type="button" data-filter="new" aria-pressed="false">Новые</button>
            <button type="button" data-filter="active" aria-pressed="false">В работе</button>
            <button type="button" data-filter="deal" aria-pressed="false">Сделки</button>
          </div>
        </div>
        <div class="lead-list" data-lead-list aria-live="polite"></div>
        <p class="empty" data-empty hidden>По этому фильтру заявок нет.</p>
      </div>

      <aside class="lead-detail" data-detail aria-label="Карточка заявки">
        <div class="detail-placeholder" data-detail-placeholder>
          <p>Выберите заявку</p>
          <span>Здесь появятся контакт, задача, заметка и следующее действие.</span>
        </div>
        <div data-detail-content hidden>
          <div class="detail-topline">
            <div><p class="detail-date" data-detail-date></p><h2 data-detail-name></h2></div>
            <button type="button" class="detail-close" data-detail-close aria-label="Закрыть карточку">Закрыть</button>
          </div>
          <div class="contact-actions" data-contact-actions></div>
          <dl class="lead-facts">
            <div><dt>Канал</dt><dd data-detail-method></dd></div>
            <div><dt>Контакт</dt><dd data-detail-contact></dd></div>
            <div><dt>Email</dt><dd data-detail-email></dd></div>
            <div><dt>Выбранный кейс</dt><dd data-detail-case></dd></div>
          </dl>
          <section class="task-block"><h3>Задача</h3><p data-detail-task></p></section>
          <form class="lead-form" data-lead-editor>
            <label>Статус<select name="status" data-status-select>
              <option value="new">Новая</option>
              <option value="telegram">Связались в Telegram</option>
              <option value="whatsapp">Связались в WhatsApp</option>
              <option value="deal">Сделка состоялась</option>
            </select></label>
            <label>Следующее действие<input type="datetime-local" name="followUpAt" data-follow-up></label>
            <div class="quick-dates" role="group" aria-label="Быстрый выбор следующего действия">
              <button type="button" data-follow-up-shortcut="today">Сегодня</button>
              <button type="button" data-follow-up-shortcut="tomorrow">Завтра</button>
              <button type="button" data-follow-up-shortcut="week">Через неделю</button>
              <button type="button" data-follow-up-shortcut="clear">Очистить</button>
            </div>
            <label>Внутренняя заметка<textarea name="note" rows="5" maxlength="2000" placeholder="Что обсудили и что сделать дальше" data-note></textarea></label>
            <div class="editor-actions"><button type="submit" class="button-primary" data-save>Сохранить</button><span class="save-state" data-save-state role="status"></span></div>
          </form>
        </div>
      </aside>
    </section>
  </main>
</body>
</html>`;

export const loginHtml = (hasError = false) => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Вход в админку — AI Native Maker</title><link rel="stylesheet" href="/admin/styles.css"></head><body class="login-page"><main class="login-shell"><a class="brand" href="/" aria-label="Вернуться на сайт">AI Native Maker <span>Admin</span></a><section class="login-card" aria-labelledby="login-title"><div class="login-heading"><p class="eyebrow">Закрытый раздел</p><h1 id="login-title">Вход в админку</h1><p>Заявки с сайта и статусы работы с ними.</p></div>${hasError ? '<p class="login-error" role="alert">Неверный логин или пароль.</p>' : ""}<form class="login-form" method="post" action="/admin/login"><label for="username">Логин</label><input id="username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus><label for="password">Пароль</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit">Войти</button></form></section><p class="login-footnote">Доступ только для владельца проекта.</p></main></body></html>`;

export const adminCss = `
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f3f5f7;line-height:1.45;--ink:#172033;--muted:#647086;--line:#d9dee8;--panel:#fff;--blue:#2856bd;--blue-soft:#e6edff;--danger:#a43828;--danger-soft:#fff0ed;--green:#267452;--green-soft:#e7f5ee}
*{box-sizing:border-box;font-weight:400}
body{margin:0;min-width:320px;font-size:16px}
button,a,input,select,textarea{font:inherit;font-weight:400}
button,a{min-height:44px}
button{cursor:pointer}
button:disabled{cursor:wait;opacity:.58}
:focus-visible{outline:3px solid rgba(40,86,189,.32);outline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.brand{display:inline-flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none;letter-spacing:-.02em}
.brand span{padding:4px 9px;border-radius:999px;background:var(--blue-soft);color:var(--blue);font-size:16px}
.login-page{min-height:100vh;background:radial-gradient(circle at 50% 0,#e7eeff 0,transparent 36rem),#f3f5f7}
.login-shell{width:min(100% - 32px,460px);min-height:100vh;margin:auto;padding:36px 0;display:flex;flex-direction:column;justify-content:center}
.login-shell>.brand{align-self:flex-start;margin-bottom:28px}
.login-card{padding:34px;border:1px solid var(--line);border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(31,43,67,.1)}
.login-heading{margin-bottom:26px}.eyebrow{margin:0 0 10px;color:var(--blue);font-size:16px;letter-spacing:.08em;text-transform:uppercase}
.login-heading h1{margin:0;color:#11192a;font-size:clamp(32px,8vw,46px);font-weight:200;line-height:1.05;letter-spacing:-.045em}.login-heading p{margin:14px 0 0;color:var(--muted)}
.login-form{display:grid;gap:10px}.login-form label{margin-top:7px;color:#39455a}
.login-form input,.lead-form input,.lead-form select,.lead-form textarea,.search input{width:100%;min-height:48px;padding:11px 13px;border:1px solid #bdc6d5;border-radius:12px;background:#fff;color:var(--ink);outline:none}
.login-form input:focus,.lead-form input:focus,.lead-form select:focus,.lead-form textarea:focus,.search input:focus{border-color:var(--blue);box-shadow:0 0 0 4px rgba(40,86,189,.13)}
.login-form button,.button-primary{justify-self:start;margin-top:12px;padding:11px 24px;border:1px solid var(--blue);border-radius:999px;background:var(--blue);color:#fff}.login-form button:hover,.button-primary:hover{background:#1e469e}
.login-error,.admin-notice{padding:12px 14px;border-radius:12px;background:var(--danger-soft);color:var(--danger)}.login-error{margin:0 0 16px}.login-footnote{margin:18px 0 0;color:#7b8495;font-size:16px}
.admin-shell{max-width:1500px;margin:auto;padding:28px 24px 48px}
.admin-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap}.admin-header h1{margin:24px 0 4px;font-size:clamp(38px,5vw,62px);font-weight:200;line-height:1;letter-spacing:-.04em}.summary{margin:0;color:var(--muted)}
.header-actions,.filters,.contact-actions,.quick-dates,.editor-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.header-actions form{margin:0}
.button-secondary,.button-quiet,.header-actions button,.filters button,.quick-dates button,.contact-actions a{display:inline-flex;align-items:center;justify-content:center;padding:9px 14px;border:1px solid #bdc6d5;border-radius:999px;background:#fff;color:var(--ink);text-decoration:none}.button-quiet,.header-actions .button-quiet{border-color:transparent;background:transparent;color:var(--muted)}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:28px 0 18px}.metric{min-height:110px;padding:18px;text-align:left;border:1px solid var(--line);border-radius:18px;background:var(--panel);color:var(--ink)}.metric:hover{border-color:#aeb9ca}.metric[aria-pressed="true"]{border-color:var(--blue);box-shadow:0 0 0 3px rgba(40,86,189,.1)}.metric span{display:block;font-size:34px;font-weight:200;line-height:1}.metric small{display:block;margin-top:9px;color:var(--muted);font-size:16px}.metric-attention span{color:var(--danger)}
.workspace{display:grid;grid-template-columns:minmax(360px,.88fr) minmax(500px,1.12fr);gap:16px;align-items:start}.inbox,.lead-detail{border:1px solid var(--line);border-radius:20px;background:var(--panel)}
.inbox-tools{position:sticky;top:0;z-index:2;padding:16px;border-bottom:1px solid #e6e9ef;border-radius:20px 20px 0 0;background:rgba(255,255,255,.96);backdrop-filter:blur(12px)}.search{display:block}.filters{margin-top:11px}.filters button{min-height:40px;padding:7px 12px}.filters button[aria-pressed="true"]{border-color:var(--blue);background:var(--blue);color:#fff}
.lead-list{display:grid}.lead-card{width:100%;min-height:0;padding:16px;border:0;border-bottom:1px solid #e6e9ef;background:#fff;color:var(--ink);text-align:left}.lead-card:last-child{border-bottom:0;border-radius:0 0 20px 20px}.lead-card:hover{background:#f8faff}.lead-card[aria-current="true"]{background:#eef3ff;box-shadow:inset 4px 0 var(--blue)}.lead-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.lead-card h3{margin:0;font-size:19px;line-height:1.25}.lead-card time{color:var(--muted);white-space:nowrap}.lead-card p{margin:8px 0 0;color:#43516a;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lead-card-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}.status-badge,.attention-badge{display:inline-flex;align-items:center;min-height:28px;padding:4px 9px;border-radius:999px;background:#edf0f5;color:#4c5b72;font-size:14px}.attention-badge{background:var(--danger-soft);color:var(--danger)}.follow-up{font-size:14px;color:var(--muted)}.empty{padding:30px;color:var(--muted)}
.lead-detail{position:sticky;top:16px;min-height:520px;padding:24px}.detail-placeholder{min-height:470px;display:grid;place-content:center;text-align:center;color:var(--muted)}.detail-placeholder p{margin:0 0 6px;color:var(--ink);font-size:23px}.detail-topline{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.detail-topline h2{margin:3px 0 0;font-size:clamp(28px,4vw,42px);font-weight:200;line-height:1.05}.detail-date{margin:0;color:var(--muted)}.detail-close{display:none;padding:8px 12px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted)}
.contact-actions{margin:20px 0}.contact-actions a.primary-contact{border-color:var(--blue);background:var(--blue);color:#fff}.contact-actions a.email-contact{border-color:#b7c9bf;background:var(--green-soft);color:var(--green)}
.lead-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;margin:0;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--line)}.lead-facts div{padding:13px;background:#fff}.lead-facts dt{color:var(--muted);font-size:14px}.lead-facts dd{margin:5px 0 0;overflow-wrap:anywhere}.task-block{margin:20px 0}.task-block h3{margin:0 0 7px;font-size:16px;color:var(--muted)}.task-block p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.lead-form{display:grid;gap:14px;padding-top:20px;border-top:1px solid #e6e9ef}.lead-form label{display:grid;gap:7px;color:#39455a}.lead-form textarea{resize:vertical;min-height:120px}.quick-dates button{min-height:38px;padding:6px 11px}.editor-actions{min-height:48px}.editor-actions .button-primary{margin:0}.save-state{color:var(--green)}
@media(max-width:900px){.workspace{grid-template-columns:1fr}.lead-detail{position:fixed;z-index:10;inset:0;overflow:auto;border:0;border-radius:0;padding:22px;background:#fff;transform:translateX(100%);transition:transform .2s ease}.lead-detail.is-open{transform:translateX(0)}.detail-close{display:inline-flex}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.admin-shell{padding:20px 14px 34px}.admin-header{align-items:flex-start}.header-actions{width:100%}.header-actions>a,.header-actions>button,.header-actions>form{flex:1 1 auto}.header-actions form button{width:100%}.metrics{gap:8px;margin-top:20px}.metric{min-height:94px;padding:14px}.metric span{font-size:30px}.workspace{display:block}.inbox-tools{padding:13px}.filters{display:grid;grid-template-columns:repeat(3,1fr)}.filters button{padding-inline:8px}.lead-card{padding:15px 13px}.lead-card-head{display:block}.lead-card time{display:block;margin-top:4px}.lead-facts{grid-template-columns:1fr}.contact-actions a{flex:1 1 auto}.login-shell{padding:24px 0}.login-card{padding:26px 22px;border-radius:20px}}
@media(prefers-reduced-motion:reduce){.lead-detail{transition:none}}
`;

export const adminJs = `
const list=document.querySelector("[data-lead-list]");
const summary=document.querySelector("[data-summary]");
const empty=document.querySelector("[data-empty]");
const search=document.querySelector("[data-search]");
const notice=document.querySelector("[data-admin-notice]");
const refresh=document.querySelector("[data-refresh]");
const detail=document.querySelector("[data-detail]");
const detailPlaceholder=document.querySelector("[data-detail-placeholder]");
const detailContent=document.querySelector("[data-detail-content]");
const editor=document.querySelector("[data-lead-editor]");
const saveButton=document.querySelector("[data-save]");
const saveState=document.querySelector("[data-save-state]");
const statuses={new:"Новая",telegram:"Связались в Telegram",whatsapp:"Связались в WhatsApp",deal:"Сделка состоялась"};
let leads=[];
let activeId="";
let filter="all";

const showNotice=(message="")=>{notice.textContent=message;notice.hidden=!message};
const requestJson=async(url,options)=>{const response=await fetch(url,options);if(response.status===401){location.assign("/admin/");throw new Error("Требуется повторный вход.")}const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||"Запрос не выполнен.");return payload};
const isAttention=(lead)=>lead.status!=="deal"&&(lead.status==="new"||(lead.followUpAt&&new Date(lead.followUpAt).getTime()<=Date.now()));
const isActive=(lead)=>lead.status==="telegram"||lead.status==="whatsapp";
const localDate=(value)=>value?new Date(value).toLocaleString("ru-RU",{dateStyle:"short",timeStyle:"short"}):"";
const localInput=(value)=>{if(!value)return "";const date=new Date(value);if(Number.isNaN(date.getTime()))return "";const offset=date.getTimezoneOffset()*60000;return new Date(date.getTime()-offset).toISOString().slice(0,16)};
const escapeSelector=(value)=>CSS.escape(String(value));
const normalizedTelegram=(value)=>String(value||"").trim().replace(/^https?:\\/\\/t\\.me\\//u,"").replace(/^@/u,"").split(/[/?#]/u)[0];
const normalizedPhone=(value)=>String(value||"").replace(/\\D/gu,"");
const nativeFirst=(anchor,nativeUrl)=>{anchor.addEventListener("click",(event)=>{event.preventDefault();let fallback=true;const cancel=()=>{fallback=false;clearTimeout(timer);window.removeEventListener("blur",cancel);document.removeEventListener("visibilitychange",visibility)};const visibility=()=>{if(document.hidden)cancel()};window.addEventListener("blur",cancel,{once:true});document.addEventListener("visibilitychange",visibility);const timer=setTimeout(()=>{window.removeEventListener("blur",cancel);document.removeEventListener("visibilitychange",visibility);if(fallback)location.href=anchor.href},700);location.href=nativeUrl})};

const contactLinks=(lead)=>{const container=document.querySelector("[data-contact-actions]");container.replaceChildren();const add=(label,href,nativeUrl,className="")=>{const anchor=document.createElement("a");anchor.textContent=label;anchor.href=href;anchor.className=className;if(nativeUrl)nativeFirst(anchor,nativeUrl);container.append(anchor)};if(lead.contactMethod==="Telegram"){const username=normalizedTelegram(lead.contact);if(username)add("Открыть Telegram","https://t.me/"+encodeURIComponent(username),"tg://resolve?domain="+encodeURIComponent(username),"primary-contact")}if(lead.contactMethod==="WhatsApp"){const phone=normalizedPhone(lead.contact);if(phone)add("Открыть WhatsApp","https://wa.me/"+phone,"whatsapp://send?phone="+phone,"primary-contact")}if(lead.contactMethod==="SMS"){const phone=normalizedPhone(lead.contact);if(phone)add("Написать SMS","sms:"+phone,"","primary-contact")}if(lead.email)add("Написать email","mailto:"+encodeURIComponent(lead.email),"","email-contact")};

const metrics=()=>{const counts={attention:leads.filter(isAttention).length,new:leads.filter((lead)=>lead.status==="new").length,active:leads.filter(isActive).length,deal:leads.filter((lead)=>lead.status==="deal").length};for(const key of Object.keys(counts))document.querySelector("[data-count-"+key+"]").textContent=String(counts[key]);summary.textContent=leads.length+" заявок · "+counts.attention+" требуют внимания"};
const matchesFilter=(lead)=>filter==="all"||(filter==="attention"&&isAttention(lead))||(filter==="new"&&lead.status==="new")||(filter==="active"&&isActive(lead))||(filter==="deal"&&lead.status==="deal");
const visibleLeads=()=>{const query=search.value.trim().toLocaleLowerCase("ru");return leads.filter((lead)=>matchesFilter(lead)&&(!query||[lead.name,lead.contact,lead.email,lead.task,lead.caseId,lead.note].some((value)=>String(value||"").toLocaleLowerCase("ru").includes(query)))).sort((a,b)=>Number(isAttention(b))-Number(isAttention(a))||new Date(b.createdAt)-new Date(a.createdAt))};

const renderList=()=>{metrics();const visible=visibleLeads();list.replaceChildren(...visible.map((lead)=>{const button=document.createElement("button");button.type="button";button.className="lead-card";button.dataset.leadId=lead.id;button.setAttribute("aria-current",String(lead.id===activeId));const head=document.createElement("div");head.className="lead-card-head";const name=document.createElement("h3");name.textContent=lead.name||"Без имени";const time=document.createElement("time");time.dateTime=lead.createdAt;time.textContent=localDate(lead.createdAt);head.append(name,time);const task=document.createElement("p");task.textContent=lead.task||lead.contact||"Задача не указана";const foot=document.createElement("div");foot.className="lead-card-foot";const badge=document.createElement("span");badge.className=isAttention(lead)?"attention-badge":"status-badge";badge.textContent=isAttention(lead)?"Требует внимания":statuses[lead.status]||"Новая";const follow=document.createElement("span");follow.className="follow-up";follow.textContent=lead.followUpAt?"Следующее: "+localDate(lead.followUpAt):lead.contactMethod+(lead.lang==="en"?" · EN":"");foot.append(badge,follow);button.append(head,task,foot);button.addEventListener("click",()=>openLead(lead.id));return button}));empty.hidden=visible.length>0};

const openLead=(id)=>{const lead=leads.find((item)=>item.id===id);if(!lead)return;activeId=id;detailPlaceholder.hidden=true;detailContent.hidden=false;detail.classList.add("is-open");document.querySelector("[data-detail-date]").textContent=localDate(lead.createdAt);document.querySelector("[data-detail-name]").textContent=lead.name||"Без имени";document.querySelector("[data-detail-method]").textContent=(lead.contactMethod||"—")+(lead.lang==="en"?" · с английской страницы":"");document.querySelector("[data-detail-contact]").textContent=lead.contact||"—";document.querySelector("[data-detail-email]").textContent=lead.email||"—";document.querySelector("[data-detail-case]").textContent=lead.caseId||"—";document.querySelector("[data-detail-task]").textContent=lead.task||"Не указана";document.querySelector("[data-status-select]").value=lead.status||"new";document.querySelector("[data-follow-up]").value=localInput(lead.followUpAt);document.querySelector("[data-note]").value=lead.note||"";saveState.textContent="";contactLinks(lead);renderList()};
const closeDetail=()=>{detail.classList.remove("is-open")};

const setFilter=(next)=>{filter=next;document.querySelectorAll("[data-filter]").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.filter===filter)));document.querySelectorAll("[data-metric]").forEach((button)=>button.setAttribute("aria-pressed",String(button.dataset.metric===filter)));renderList()};
document.querySelectorAll("[data-filter]").forEach((button)=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));
document.querySelectorAll("[data-metric]").forEach((button)=>button.addEventListener("click",()=>setFilter(button.dataset.metric)));
document.querySelector("[data-detail-close]").addEventListener("click",closeDetail);
search.addEventListener("input",renderList);

document.querySelectorAll("[data-follow-up-shortcut]").forEach((button)=>button.addEventListener("click",()=>{const input=document.querySelector("[data-follow-up]");const action=button.dataset.followUpShortcut;if(action==="clear"){input.value="";return}const date=new Date();date.setSeconds(0,0);if(action==="today")date.setHours(18,0,0,0);if(action==="tomorrow"){date.setDate(date.getDate()+1);date.setHours(11,0,0,0)}if(action==="week"){date.setDate(date.getDate()+7);date.setHours(11,0,0,0)}input.value=localInput(date.toISOString())}));

editor.addEventListener("submit",async(event)=>{event.preventDefault();const lead=leads.find((item)=>item.id===activeId);if(!lead)return;saveButton.disabled=true;saveState.textContent="Сохраняю…";showNotice();const followValue=document.querySelector("[data-follow-up]").value;try{const payload=await requestJson("/admin/api/leads/"+encodeURIComponent(lead.id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:document.querySelector("[data-status-select]").value,followUpAt:followValue?new Date(followValue).toISOString():"",note:document.querySelector("[data-note]").value})});Object.assign(lead,payload.lead);saveState.textContent="Сохранено";renderList()}catch(error){saveState.textContent="";showNotice(error.message||"Не удалось сохранить заявку.")}finally{saveButton.disabled=false}});

const load=async()=>{refresh.disabled=true;summary.textContent="Загрузка…";showNotice();try{const payload=await requestJson("/admin/api/leads",{cache:"no-store"});leads=Array.isArray(payload.leads)?payload.leads:[];renderList();if(activeId&&leads.some((lead)=>lead.id===activeId))openLead(activeId)}catch(error){summary.textContent="Заявки не загружены";showNotice(error.message||"Не удалось загрузить заявки. Обновите страницу.")}finally{refresh.disabled=false}};
refresh.addEventListener("click",load);
load();
`;
