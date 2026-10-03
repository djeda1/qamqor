/* ==========================================================================
   Qamqor · логика приложения
   Состояние хранится в localStorage этого устройства. Если хранилище
   недоступно, приложение работает в памяти до перезагрузки.
   ========================================================================== */
(() => {
  "use strict";

  // Английская версия живёт в /en/ и хранит свои данные отдельно, чтобы не смешивать языки
  const EN = document.documentElement.lang.startsWith("en");
  const L = (ru, en) => (EN ? en : ru);
  const BASE = EN ? "../" : "";
  const STORE_KEY = EN ? "qamqor:v1:en" : "qamqor:v1";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Даты ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const DOW = EN ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const MONTHS = EN
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const MONTHS_GEN = EN ? MONTHS : ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const fmtDay = (d) => (EN ? `${MONTHS_GEN[d.getMonth()]} ${d.getDate()}` : `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`);
  const WEEKDAYS_FULL = EN
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

  // Детерминированный «случайный» генератор, чтобы демо-история была стабильной
  const rand = (seed) => { let x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
  const daySeed = (d) => d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();

  /* ---------- Справочники ---------- */
  const MEDS = [
    { id: "don", name: L("Донепезил", "Donepezil"), dose: L("5 мг, 1 таблетка", "5 mg, 1 tablet"), icon: "pill", times: ["08:00", "20:00"] },
    { id: "vitd", name: L("Витамин D", "Vitamin D"), dose: L("1 капсула", "1 capsule"), icon: "pill", times: ["09:00"] },
    { id: "par", name: L("Парацетамол", "Paracetamol"), dose: L("1 × 200 мг", "1 × 200 mg"), icon: "pill", times: ["15:00"] },
  ];

  const ROUTINE = [
    { id: "r-breakfast", time: "07:30", icon: "fork-knife", title: L("Позавтракать", "Have breakfast") },
    { id: "r-water1", time: "10:00", icon: "drop", title: L("Выпить стакан воды", "Drink a glass of water") },
    { id: "r-walk", time: "11:00", icon: "person-simple-walk", title: L("Прогулка 20 минут", "20-minute walk") },
    { id: "r-lunch", time: "13:00", icon: "bowl-food", title: L("Пообедать", "Have lunch") },
    { id: "r-dog", time: "17:00", icon: "paw-print", title: L("Погулять с Бароном", "Walk Baron") },
    { id: "r-call", time: "19:00", icon: "phone", title: L("Позвонить Дане", "Call Dana") },
    { id: "r-sleep", time: "22:00", icon: "moon-stars", title: L("Лечь спать", "Go to bed") },
  ];

  const PRESETS = [
    { icon: "fork-knife", title: L("Поесть", "Eat") },
    { icon: "drop", title: L("Выпить воды", "Drink water") },
    { icon: "person-simple-walk", title: L("Прогулка", "Walk") },
    { icon: "phone", title: L("Позвонить близким", "Call family") },
    { icon: "plant", title: L("Полить цветы", "Water the plants") },
    { icon: "moon-stars", title: L("Отдохнуть", "Rest") },
  ];

  const MOODS = [
    { v: 1, label: L("Плохо", "Bad"), color: "#E7836A" },
    { v: 2, label: L("Так себе", "So-so"), color: "#EFB27A" },
    { v: 3, label: L("Нормально", "Okay"), color: "#C9CBEE" },
    { v: 4, label: L("Хорошо", "Good"), color: "#9FD8BE" },
    { v: 5, label: L("Отлично", "Great"), color: "#F9DF77" },
  ];

  const CONTACTS = [
    { name: L("Дана", "Dana"), role: L("Дочь · на связи", "Daughter · available"), tel: "+77010000001", initial: L("Д", "D") },
    { name: L("Др. Ахметова", "Dr. Akhmetova"), role: L("Терапевт", "GP"), tel: "+77010000002", initial: "A", brand: true },
    { name: L("Скорая помощь", "Ambulance"), role: L("Экстренный вызов", "Emergency call"), tel: "103", initial: "103", brand: true },
  ];

  /* ---------- Состояние ---------- */
  let state = load() || seed();
  const ui = {
    screen: "home",
    trackerTab: "dash",
    range: 7,
    slide: 0,
    planDate: today(),
    calMonth: new Date(today().getFullYear(), today().getMonth(), 1),
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* приватный режим: работаем в памяти */ }
  }

  function seed() {
    const s = { scale: 1, contrast: false, done: {}, meds: {}, moods: {}, custom: {}, log: [], events: [] };
    const t = today();
    // История за 45 дней: лекарства в основном приняты, настроение колеблется
    for (let i = 45; i >= 1; i--) {
      const d = addDays(t, -i), k = dkey(d), r = daySeed(d);
      s.meds[k] = {};
      MEDS.forEach((m, mi) => m.times.forEach((tm, ti) => {
        if (rand(r + mi * 7 + ti * 13) < 0.84) s.meds[k][`${m.id}@${tm}`] = true;
      }));
      s.moods[k] = Math.max(1, Math.min(5, Math.round(3.5 + Math.sin(i * 1.7) * 1.1 + (rand(r + 5) - 0.5) * 1.6)));
      s.done[k] = ROUTINE.filter((_, ri) => rand(r + ri * 3) < 0.8).map((x) => x.id);
    }
    // Немного событий в журнале за последние дни
    for (let i = 3; i >= 1; i--) {
      const d = addDays(t, -i);
      const k = dkey(d);
      const mood = s.moods[k];
      pushLog(s, at(d, "09:05"), "smiley", L("Настроение", "Mood"), MOODS[mood - 1].label);
      if (s.meds[k]["don@08:00"]) pushLog(s, at(d, "08:07"), "pill", L("Лекарство", "Medication"), L("Донепезил 5 мг — принято", "Donepezil 5 mg taken"));
      pushLog(s, at(d, "11:24"), "person-simple-walk", L("Активность", "Activity"), L("Прогулка 20 минут", "20-minute walk"));
      if (s.meds[k]["par@15:00"]) pushLog(s, at(d, "15:10"), "pill", L("Лекарство", "Medication"), L("Парацетамол 200 мг — принято", "Paracetamol 200 mg taken"));
    }
    // Встречи в календаре относительно сегодняшнего дня
    const ev = (offset, time, end, title, note) => s.events.push({ id: uid(), date: dkey(addDays(t, offset)), time, end, title, note });
    ev(0, "09:00", "09:15", L("Звонок Дане", "Call with Dana"), L("Дана перезвонит, если вы не ответите", "Dana will call back if you don’t pick up"));
    ev(0, "16:00", "16:30", L("Полить цветы", "Water the plants"), L("Фикус и герань на подоконнике", "The ficus and geraniums on the windowsill"));
    ev(1, "08:15", "08:45", L("Физиотерапия", "Physiotherapy"), L("Такси заказано на 07:50", "Taxi booked for 07:50"));
    ev(3, "13:30", "14:30", L("Когнитивные занятия", "Memory class"), L("Центр «Долголетие», каб. 4", "Longevity Centre, room 4"));
    ev(5, "11:00", "11:30", L("Приём у терапевта", "GP appointment"), L("Взять список лекарств", "Bring the medication list"));
    ev(8, "18:00", "20:00", L("Ужин с семьёй", "Family dinner"), L("Дана и внуки придут в гости", "Dana and the grandchildren are coming over"));
    ev(-2, "10:00", "10:40", L("Физиотерапия", "Physiotherapy"), "");
    return s;
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function at(d, t) { const x = new Date(d); const [h, m] = t.split(":"); x.setHours(+h, +m, 0, 0); return x.getTime(); }
  function pushLog(s, ts, icon, kind, text) {
    s.log.push({ ts, icon, kind, text });
    s.log.sort((a, b) => b.ts - a.ts);
    if (s.log.length > 200) s.log.length = 200;
  }
  function log(icon, kind, text) { pushLog(state, Date.now(), icon, kind, text); }

  /* ---------- Задачи дня ---------- */
  function tasksFor(d) {
    const k = dkey(d);
    const doneSet = new Set(state.done[k] || []);
    const medLog = state.meds[k] || {};
    const list = ROUTINE.map((r) => ({ ...r, kind: "routine", done: doneSet.has(r.id) }));
    MEDS.forEach((m) => m.times.forEach((tm) => list.push({
      id: `${m.id}@${tm}`, time: tm, icon: "pill", title: `${m.name} ${m.dose.split(",")[0]}`, kind: "med", med: m, done: !!medLog[`${m.id}@${tm}`],
    })));
    (state.custom[k] || []).forEach((c) => list.push({ ...c, kind: "custom", done: doneSet.has(c.id) }));
    return list.sort((a, b) => toMin(a.time) - toMin(b.time));
  }

  function setTaskDone(task, done) {
    const k = dkey(today());
    if (task.kind === "med") {
      state.meds[k] = state.meds[k] || {};
      if (done) state.meds[k][task.id] = true; else delete state.meds[k][task.id];
      if (done) log("pill", L("Лекарство", "Medication"), L(`${task.title} — принято`, `${task.title} taken`));
    } else {
      const set = new Set(state.done[k] || []);
      done ? set.add(task.id) : set.delete(task.id);
      state.done[k] = [...set];
      if (done) log(task.icon, L("Задача", "Task"), L(`${task.title} — сделано`, `${task.title} done`));
    }
    save();
  }

  function setMood(v) {
    const k = dkey(today());
    state.moods[k] = v;
    log("smiley", L("Настроение", "Mood"), MOODS[v - 1].label);
    save();
  }

  /* ---------- Метрики ---------- */
  function adherence(days) {
    const t = today();
    let taken = 0, total = 0;
    const cat = { opt: 0, sub: 0, miss: 0 };
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(t, -i), k = dkey(d), ml = state.meds[k] || {};
      let dayTaken = 0, dayTotal = 0;
      MEDS.forEach((m) => m.times.forEach((tm) => {
        // Сегодняшние дозы в будущем не считаем пропущенными
        if (i === 0 && toMin(tm) > nowMin() && !ml[`${m.id}@${tm}`]) return;
        dayTotal++; if (ml[`${m.id}@${tm}`]) dayTaken++;
      }));
      if (!dayTotal) continue;
      taken += dayTaken; total += dayTotal;
      const p = dayTaken / dayTotal;
      if (p >= 0.9) cat.opt++; else if (p >= 0.5) cat.sub++; else cat.miss++;
    }
    return { pct: total ? Math.round((taken / total) * 100) : 0, cat, taken, total };
  }

  function moodSeries(days) {
    const t = today();
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(t, -(days - 1 - i));
      return { d, v: state.moods[dkey(d)] || null };
    });
  }

  function steadinessSeries(days) {
    const t = today();
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(t, -(days - 1 - i)), r = daySeed(d);
      return { d, v: 0.55 + Math.sin(r / 3.1) * 0.18 + (rand(r + 11) - 0.5) * 0.2 };
    });
  }

  /* ---------- SVG ---------- */
  function face(v, size = 64) {
    const m = MOODS[v - 1];
    const curve = [-9, -4, 0, 5, 10][v - 1];
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="${m.color}"/>
      <circle cx="23" cy="27" r="3.6" fill="#2F3273"/><circle cx="41" cy="27" r="3.6" fill="#2F3273"/>
      <path d="M20 41 Q32 ${41 + curve} 44 41" fill="none" stroke="#2F3273" stroke-width="3.6" stroke-linecap="round"/>
    </svg>`;
  }

  function donutSvg(a) {
    const R = 70, C = 2 * Math.PI * R, sum = a.cat.opt + a.cat.sub + a.cat.miss || 1;
    const parts = [
      { v: a.cat.opt, c: "#4D50A2" },
      { v: a.cat.sub, c: "#C4C6EA" },
      { v: a.cat.miss, c: "#E6E7F6" },
    ].filter((p) => p.v > 0);
    const gap = parts.length > 1 ? 6 : 0;
    let off = 0;
    const arcs = parts.map((p) => {
      const len = (p.v / sum) * C;
      const s = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${p.c}" stroke-width="42"
        stroke-dasharray="${Math.max(len - gap, 0.1)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"/>`;
      off += len;
      return s;
    }).join("");
    return `<svg class="donut" viewBox="0 0 200 200" role="img" aria-label="${L("Приём лекарств", "Medication adherence")}: ${a.pct}%">
      ${arcs}
      <circle cx="100" cy="100" r="46" fill="#fff"/>
      <text class="donut__num" x="100" y="106" text-anchor="middle">${a.pct}</text>
      <text class="donut__pct" x="100" y="128" text-anchor="middle">%</text>
    </svg>`;
  }

  function lineChart(series, { min = 1, max = 5, area = false, h = 200, yLabels = null, dashed = true } = {}) {
    const W = 300, H = h, px = yLabels ? 46 : 16, pt = 14, pb = 26;
    const n = series.length;
    const x = (i) => px + (i * (W - px - 10)) / Math.max(n - 1, 1);
    const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
    const pts = series.map((p, i) => (p.v == null ? null : [x(i), y(p.v)]));
    const valid = pts.filter(Boolean);
    let path = "";
    if (area) {
      // сглаженная кривая
      valid.forEach((p, i) => {
        if (!i) { path += `M${p[0]},${p[1]}`; return; }
        const q = valid[i - 1], cx = (q[0] + p[0]) / 2;
        path += ` C${cx},${q[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
      });
    } else {
      path = valid.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
    }
    const grid = series.map((_, i) => `<line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb}" stroke="#EEEFF9" stroke-width="1.5"/>`).join("");
    const every = n > 10 ? Math.ceil(n / 7) : 1;
    const xl = series.map((p, i) => (i % every === 0 || i === n - 1)
      ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${n > 10 ? p.d.getDate() : DOW[p.d.getDay()]}</text>` : "").join("");
    const yl = (yLabels || []).map(([v, t]) => `<text x="0" y="${y(v) + 4}">${t}</text>`).join("");
    const areaPath = area && valid.length
      ? `<path d="${path} L${valid[valid.length - 1][0]},${H - pb} L${valid[0][0]},${H - pb} Z" fill="url(#ag)"/>` : "";
    const dots = !area ? valid.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="${n > 10 ? 3.5 : 6}" fill="#4D50A2" stroke="#fff" stroke-width="2.5"/>`).join("") : "";
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4D50A2" stop-opacity=".35"/><stop offset="1" stop-color="#4D50A2" stop-opacity="0"/></linearGradient></defs>
      ${grid}${yl}${areaPath}
      <path d="${path}" fill="none" stroke="#4D50A2" stroke-width="${area ? 3 : 2.5}" ${!area && dashed ? 'stroke-dasharray="5 5"' : ""} stroke-linecap="round"/>
      ${dots}${xl}
    </svg>`;
  }

  /* ---------- Рендер: Сегодня ---------- */
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return L("Доброй ночи", "Good night");
    if (h < 12) return L("Доброе утро", "Good morning");
    if (h < 18) return L("Добрый день", "Good afternoon");
    return L("Добрый вечер", "Good evening");
  }

  function renderHome() {
    const t = today();
    const tasks = tasksFor(t);
    const done = tasks.filter((x) => x.done).length;
    const nm = nowMin();
    const upcoming = tasks.filter((x) => !x.done);
    // Сначала ближайшее несделанное (в т.ч. просроченное не больше чем на 2 часа)
    const startIdx = Math.max(0, upcoming.findIndex((x) => toMin(x.time) >= nm - 120));
    const rail = upcoming.slice(startIdx).concat(upcoming.slice(0, startIdx)).slice(0, 4);
    const mood = state.moods[dkey(t)];

    const railHtml = rail.length ? rail.map((x, i) => `
      <article class="card now-card ${i ? "now-card--next" : ""}" data-task="${esc(x.id)}">
        <div class="now-card__top">
          <span class="now-card__time">${x.time}</span>
          <span class="now-card__tag">${toMin(x.time) < nm ? L("Пора", "Now") : i === 0 ? L("Далее", "Next") : L("Потом", "Later")}</span>
        </div>
        <div class="now-card__icon"><i class="ph-fill ph-${x.icon}" aria-hidden="true"></i></div>
        <p class="now-card__label">${esc(x.title)}</p>
        <button class="btn btn--sun btn--block" data-done="${esc(x.id)}"><i class="ph ph-check-fat" aria-hidden="true"></i>${L("Готово", "Done")}</button>
      </article>`).join("") : `
      <article class="card now-card is-done">
        <div class="now-card__top"><span class="now-card__time">${hhmm(new Date())}</span><span class="now-card__tag">${L("Всё сделано", "All done")}</span></div>
        <div class="now-card__icon"><i class="ph-fill ph-confetti" aria-hidden="true"></i></div>
        <p class="now-card__label">${L("На сегодня всё. Можно отдыхать!", "That’s everything for today. Time to rest!")}</p>
      </article>`;

    $('[data-screen="home"]').innerHTML = `
      <h1 class="h-greet">${greeting()}, ${L("Сауле", "Saule")}</h1>
      <p class="sub">${L(`Сегодня ${WEEKDAYS_FULL[t.getDay()]}, ${fmtDay(t)}`, `Today is ${WEEKDAYS_FULL[t.getDay()]}, ${fmtDay(t)}`)}</p>

      <div class="now-rail" aria-label="${L("Ближайшие дела", "Coming up")}">${railHtml}</div>

      <div class="progress">
        <div class="progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${tasks.length}" aria-valuenow="${done}" aria-label="${L("Выполнено дел", "Tasks done")}"><span style="width:${(done / tasks.length) * 100}%"></span></div>
        <span class="progress__txt">${done} ${L("из", "of")} ${tasks.length}</span>
      </div>

      <div class="card" style="margin-top:18px">
        <p class="card__title">${L("Как вы себя чувствуете?", "How are you feeling?")}</p>
        <div class="mood-row">${MOODS.map((m) => `<button class="mood-btn" data-mood="${m.v}" aria-pressed="${mood === m.v}" aria-label="${m.label}">${face(m.v)}</button>`).join("")}</div>
        <p class="mood-caption">${mood ? `${L("Отмечено", "Logged")}: ${MOODS[mood - 1].label}` : L("Нажмите на лицо, которое ближе", "Tap the face that fits best")}</p>
      </div>

      <h2 class="section-title">${L("Дела на сегодня", "Today’s tasks")} <small>${tasks.length - done} ${L("осталось", "left")}</small></h2>
      <ul class="task-list">${tasks.map(taskRow).join("")}</ul>
      <p class="app-credit">© djedai</p>`;
  }

  function taskRow(x) {
    return `<li class="task ${x.done ? "is-done" : ""}">
      <span class="task__icon"><i class="ph-fill ph-${x.icon}" aria-hidden="true"></i></span>
      <span><span class="task__time">${x.time}${x.kind === "med" ? L(" · лекарство", " · medication") : ""}</span><br><span class="task__title">${esc(x.title)}</span></span>
      <button class="check" data-toggle="${esc(x.id)}" aria-pressed="${x.done}" aria-label="${x.done ? L("Отменить", "Undo") : L("Отметить", "Mark done")}: ${esc(x.title)}"><i class="ph-bold ph-check" aria-hidden="true"></i></button>
    </li>`;
  }

  /* ---------- Рендер: Трекер ---------- */
  function renderTracker() {
    const el = $('[data-screen="tracker"]');
    const tabs = `<div class="seg" role="tablist">
        <button role="tab" data-ttab="dash" aria-selected="${ui.trackerTab === "dash"}">${L("Панель", "Overview")}</button>
        <button role="tab" data-ttab="log" aria-selected="${ui.trackerTab === "log"}">${L("Журнал", "Log")}</button>
      </div>`;

    if (ui.trackerTab === "log") {
      const groups = new Map();
      state.log.slice(0, 60).forEach((e) => {
        const d = new Date(e.ts); d.setHours(0, 0, 0, 0);
        const diff = Math.round((today() - d) / 864e5);
        const label = diff === 0 ? L("Сегодня", "Today") : diff === 1 ? L("Вчера", "Yesterday") : `${DOW[d.getDay()]}, ${fmtDay(d)}`;
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(e);
      });
      el.innerHTML = tabs + (groups.size ? [...groups].map(([label, items]) => `
        <p class="log-day">${label}</p>
        ${items.map((e) => `<div class="log-item">
          <span class="log-item__icon"><i class="ph-fill ph-${e.icon}" aria-hidden="true"></i></span>
          <span><span class="log-item__kind">${esc(e.kind)}</span><br><span class="log-item__text">${esc(e.text)}</span></span>
          <span class="log-item__time">${hhmm(new Date(e.ts))}</span>
        </div>`).join("")}`).join("") : `<p class="empty">${L("Пока здесь пусто. Отметьте дело или настроение, и запись появится.", "Nothing here yet. Mark a task or your mood and it will show up.")}</p>`)
        + `<p class="app-credit">© djedai</p>`;
      return;
    }

    const days = ui.range;
    const a = adherence(days);
    const moods = moodSeries(days);
    const withMood = moods.filter((m) => m.v);
    const avgMood = withMood.length ? withMood.reduce((s, m) => s + m.v, 0) / withMood.length : 0;
    const good = withMood.filter((m) => m.v >= 4).length;
    const st = steadinessSeries(days);
    const stAvg = st.reduce((s, p) => s + p.v, 0) / st.length;
    const stLabel = stAvg > 0.66 ? L("высокая", "high") : stAvg > 0.45 ? L("в норме", "normal") : L("снижена", "lower than usual");
    const tasksToday = tasksFor(today());
    const doneToday = tasksToday.filter((t) => t.done).length;
    const period = days === 7 ? L("за неделю", "this week") : L("за месяц", "this month");

    el.innerHTML = tabs + `
      <div class="carousel" id="carousel">
        <article class="card" aria-label="${L("Приём лекарств", "Medication")}">
          <p class="card__title">${L("Приём лекарств", "Medication")}</p>
          ${donutSvg(a)}
          <p class="card__note">${L(`Принято <b>${a.taken} из ${a.total}</b> доз ${period}`, `<b>${a.taken} of ${a.total}</b> doses taken ${period}`)}</p>
          <div class="legend" style="margin-top:14px">
            <span><b style="background:#4D50A2"></b>${L("Вовремя", "On time")} · ${a.cat.opt}</span>
            <span><b style="background:#C4C6EA"></b>${L("Частично", "Partly")} · ${a.cat.sub}</span>
            <span><b style="background:#E6E7F6;border:1px solid #C4C6EA"></b>${L("Пропуск", "Missed")} · ${a.cat.miss}</span>
          </div>
        </article>

        <article class="card" aria-label="${L("Трекер настроения", "Mood tracker")}">
          <p class="card__title">${L("Настроение", "Mood")}</p>
          ${lineChart(moods, { min: 1, max: 5, h: 230, yLabels: EN ? [[5, "Great"], [3, "Okay"], [1, "Bad"]] : [[5, "Отл."], [3, "Норм."], [1, "Плохо"]] })}
          <p class="card__note">${L("В среднем", "On average")} <b>${avgMood ? MOODS[Math.round(avgMood) - 1].label.toLowerCase() : L("нет данных", "no data")}</b>. ${L(`Хороших дней ${period}`, `Good days ${period}`)}: <b>${good}</b></p>
        </article>

        <article class="card" aria-label="${L("Устойчивость походки", "Walking steadiness")}">
          <p class="card__title">${L("Устойчивость походки", "Walking steadiness")}</p>
          ${lineChart(st, { min: 0.1, max: 1, area: true, h: 230, yLabels: EN ? [[0.9, "High"], [0.55, "Norm"], [0.2, "Low"]] : [[0.9, "Выс."], [0.55, "Норм."], [0.2, "Низ."]] })}
          <p class="card__note">${L(`Устойчивость <b>${stLabel}</b>. Данные с телефона во время прогулок.`, `Steadiness is <b>${stLabel}</b>. Measured by your phone during walks.`)}</p>
        </article>

        <article class="card" aria-label="${L("Итоги", "Summary")}">
          <p class="card__title">${L("Итоги", "Summary")}</p>
          <div class="trophy"><i class="ph-fill ph-trophy" aria-hidden="true"></i></div>
          <p class="insight-head">${a.pct >= 80 ? L("Отличная работа!", "Great work!") : a.pct >= 60 ? L("Хороший темп!", "Good pace!") : L("Шаг за шагом", "Step by step")}</p>
          <ul class="insight-list">
            <li><i class="ph-fill ph-check-circle" aria-hidden="true"></i><span>${L(`Лекарства вовремя в ${a.cat.opt} из ${a.cat.opt + a.cat.sub + a.cat.miss} дней`, `Medication on time on ${a.cat.opt} of ${a.cat.opt + a.cat.sub + a.cat.miss} days`)}</span></li>
            <li><i class="ph-fill ph-check-circle" aria-hidden="true"></i><span>${L(`Сегодня сделано ${doneToday} из ${tasksToday.length} дел`, `${doneToday} of ${tasksToday.length} tasks done today`)}</span></li>
            <li><i class="ph-fill ph-check-circle" aria-hidden="true"></i><span>${L("Дана видит ваши успехи и спокойна", "Dana can see your progress and isn’t worried")}</span></li>
          </ul>
        </article>
      </div>
      <div class="dots" role="tablist" aria-label="${L("Карточки", "Cards")}">${[0, 1, 2, 3].map((i) => `<button data-dot="${i}" aria-label="${L("Карточка", "Card")} ${i + 1}" aria-current="${ui.slide === i}"></button>`).join("")}</div>
      <p class="app-credit">© djedai</p>`;

    const car = $("#carousel");
    car.scrollLeft = ui.slide * slideStep(car);
    car.addEventListener("scroll", () => {
      const i = Math.round(car.scrollLeft / slideStep(car));
      if (i !== ui.slide) {
        ui.slide = i;
        $$("[data-dot]").forEach((d) => d.setAttribute("aria-current", String(+d.dataset.dot === i)));
      }
    }, { passive: true });
  }

  const slideStep = (car) => car.firstElementChild.offsetWidth + 14;

  /* ---------- Рендер: План ---------- */
  function renderPlan() {
    const m = ui.calMonth, sel = ui.planDate, t = today();
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    const shift = (first.getDay() + 6) % 7; // неделя с понедельника
    const start = addDays(first, -shift);
    const evDates = new Set(state.events.map((e) => e.date));
    const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    const trimmed = cells[35].getMonth() !== m.getMonth() ? cells.slice(0, 35) : cells;

    const dayEvents = state.events.filter((e) => e.date === dkey(sel)).sort((a, b) => toMin(a.time) - toMin(b.time));
    const isToday = dkey(sel) === dkey(t);
    const medLog = state.meds[dkey(t)] || {};

    $('[data-screen="plan"]').innerHTML = `
      <div class="card cal">
        <div class="cal__head">
          <button class="icon-btn icon-btn--soft" data-cal="-1" aria-label="${L("Предыдущий месяц", "Previous month")}"><i class="ph ph-caret-left" aria-hidden="true"></i></button>
          <h3>${MONTHS[m.getMonth()]} ${m.getFullYear()}</h3>
          <button class="icon-btn icon-btn--soft" data-cal="1" aria-label="${L("Следующий месяц", "Next month")}"><i class="ph ph-caret-right" aria-hidden="true"></i></button>
        </div>
        <div class="cal__grid">
          ${(EN ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]).map((d) => `<span class="cal__dow">${d}</span>`).join("")}
          ${trimmed.map((d) => `<button class="cal__day ${d.getMonth() !== m.getMonth() ? "is-other" : ""} ${dkey(d) === dkey(t) ? "is-today" : ""} ${evDates.has(dkey(d)) ? "has-ev" : ""}"
              data-day="${dkey(d)}" aria-pressed="${dkey(d) === dkey(sel)}" aria-label="${fmtDay(d)}${evDates.has(dkey(d)) ? L(", есть встречи", ", has events") : ""}">${d.getDate()}</button>`).join("")}
        </div>
      </div>

      <h2 class="section-title">${isToday ? L("Сегодня", "Today") : `${DOW[sel.getDay()]}, ${fmtDay(sel)}`} <small>${dayEvents.length ? `${dayEvents.length} ${EN ? (dayEvents.length === 1 ? "event" : "events") : plural(dayEvents.length, "встреча", "встречи", "встреч")}` : ""}</small></h2>
      ${dayEvents.length ? dayEvents.map((e) => `
        <div class="event">
          <span class="event__bar" aria-hidden="true"></span>
          <div><p class="event__time">${e.time}${e.end ? ` – ${e.end}` : ""}</p><p class="event__title">${esc(e.title)}</p>${e.note ? `<p class="event__note">${esc(e.note)}</p>` : ""}</div>
        </div>`).join("") : `<p class="empty" style="padding:18px 12px">${L("Встреч нет. Свободный день.", "No events. A free day.")}</p>`}

      <h2 class="section-title">${L("Мои лекарства", "My medication")} <small>${L("сегодня", "today")}</small></h2>
      ${MEDS.map((md) => `
        <div class="med">
          <span class="med__icon"><i class="ph-fill ph-${md.icon}" aria-hidden="true"></i></span>
          <div><p class="med__name">${md.name}</p><p class="med__dose">${md.dose}</p></div>
          <div class="med__doses">${md.times.map((tm) => {
            const on = !!medLog[`${md.id}@${tm}`];
            return `<button class="dose" data-toggle="${md.id}@${tm}" aria-pressed="${on}"><i class="ph${on ? "-bold ph-check" : " ph-clock"}" aria-hidden="true"></i>${tm}</button>`;
          }).join("")}</div>
        </div>`).join("")}
      <p class="app-credit">© djedai</p>`;
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  /* ---------- Рендер: Безопасность ---------- */
  function renderCare() {
    const upd = new Date(Date.now() - 2 * 60000);
    $('[data-screen="care"]').innerHTML = `
      <div class="status">
        <span class="status__dot" aria-hidden="true"></span>
        <div><b>${L("Сауле дома", "Saule is home")}</b><span>${L("В безопасной зоне · обновлено в", "In a safe zone · updated at")} ${hhmm(upd)}</span></div>
      </div>

      <div class="card map" style="margin-top:14px">
        ${mapSvg()}
        <div class="map__actions">
          <button class="btn btn--brand" data-act="zones"><i class="ph ph-shield-check" aria-hidden="true"></i>${L("Безопасные зоны", "Safe zones")}</button>
          <button class="btn btn--ghost" data-act="home-route" aria-label="${L("Дорога домой", "Route home")}"><i class="ph ph-navigation-arrow" aria-hidden="true"></i></button>
        </div>
      </div>

      <button class="sos" data-act="sos">
        <span class="sos__icon"><i class="ph-fill ph-siren" aria-hidden="true"></i></span>
        <span><b>${L("Нужна помощь", "I need help")}</b><span>${L("Дана получит сигнал и ваше местоположение", "Dana gets an alert with your location")}</span></span>
      </button>

      <h2 class="section-title">${L("Близкие и врачи", "Family and doctors")}</h2>
      ${CONTACTS.map((c) => `
        <div class="contact">
          <span class="avatar ${c.brand ? "avatar--brand" : ""}" aria-hidden="true" ${c.initial.length > 1 ? 'style="font-size:.95rem"' : ""}>${c.initial}</span>
          <span><b>${c.name}</b><span>${c.role}</span></span>
          <a class="call" href="tel:${c.tel}" aria-label="${L("Позвонить", "Call")}: ${c.name}"><i class="ph-fill ph-phone" aria-hidden="true"></i></a>
        </div>`).join("")}
      <p class="app-credit">© djedai</p>`;
  }

  function mapSvg() {
    return `<svg viewBox="0 0 320 280" role="img" aria-label="${L("Карта: вы находитесь в безопасной зоне «Дом»", "Map: you are in the Home safe zone")}">
      <rect width="320" height="280" fill="#EEF0F7"/>
      <path d="M-10 190 Q60 150 120 170 T330 120" fill="none" stroke="#fff" stroke-width="18"/>
      <path d="M200 -10 L180 300" stroke="#fff" stroke-width="14"/>
      <path d="M-10 70 L330 90" stroke="#fff" stroke-width="12"/>
      <path d="M60 -10 L90 300" stroke="#fff" stroke-width="9"/>
      <path d="M250 -10 L290 300" stroke="#fff" stroke-width="8"/>
      <path d="M-10 240 L330 250" stroke="#fff" stroke-width="8"/>
      <rect x="215" y="160" width="70" height="60" rx="16" fill="#D8EEDF"/>
      <rect x="10" y="95" width="42" height="50" rx="10" fill="#E2E4F0"/>
      <rect x="100" y="100" width="70" height="46" rx="10" fill="#E2E4F0"/>
      <rect x="205" y="100" width="36" height="40" rx="8" fill="#E2E4F0"/>
      <rect x="100" y="200" width="68" height="36" rx="8" fill="#E2E4F0"/>
      <text x="228" y="196" font-family="Nunito" font-weight="800" font-size="11" fill="#7FA990">${L("Парк", "Park")}</text>
      <text x="8" y="64" font-family="Nunito" font-weight="800" font-size="10" fill="#A3A6C8">${L("ул. Абая", "Abay St")}</text>
      <text x="206" y="30" font-family="Nunito" font-weight="800" font-size="10" fill="#A3A6C8" transform="rotate(84 206 30)">${L("пр. Достык", "Dostyk Ave")}</text>
      <circle cx="150" cy="150" r="92" fill="#4D50A2" fill-opacity=".12" stroke="#4D50A2" stroke-width="2" stroke-dasharray="6 6"/>
      <circle cx="150" cy="150" r="30" fill="#fff" stroke="#fff" stroke-width="4"/>
      <circle cx="150" cy="150" r="26" fill="#F9DF77"/>
      <text x="150" y="157" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="20" fill="#2F3273">${L("С", "S")}</text>
      <rect x="120" y="188" width="60" height="24" rx="12" fill="#fff" stroke="#2F3273" stroke-width="1.5"/>
      <text x="150" y="204" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="11" fill="#2F3273" letter-spacing=".08em">${L("ДОМ", "HOME")}</text>
    </svg>`;
  }

  /* ---------- Меню ---------- */
  function renderDrawer() {
    $("#drawer").innerHTML = `
      <div class="profile">
        <span class="avatar" aria-hidden="true">${L("С", "S")}</span>
        <div><b>${L("Сауле Ахметова", "Saule Akhmetova")}</b><span>${L("72 года · Алматы", "72 · Almaty")}</span></div>
      </div>

      <div class="setting">
        <p class="setting__label">${L("Размер текста", "Text size")}</p>
        <div class="sizes">
          ${[[1, L("А", "A"), 16], [1.12, L("А", "A"), 20], [1.25, L("А", "A"), 24]].map(([v, t, fs]) => `<button data-scale="${v}" aria-pressed="${state.scale === v}" style="font-size:${fs}px" aria-label="${L("Размер", "Size")} ${fs}">${t}</button>`).join("")}
        </div>
      </div>

      <div class="setting">
        <button class="toggle" role="switch" data-contrast aria-checked="${state.contrast}">
          <span>${L("Высокий контраст", "High contrast")}</span><span class="toggle__knob" aria-hidden="true"></span>
        </button>
      </div>

      <div class="setting">
        <p class="setting__label">${L("Семья", "Family")}</p>
        <div class="contact" style="box-shadow:none;background:var(--mist)">
          <span class="avatar" aria-hidden="true">${L("Д", "D")}</span>
          <span><b>${L("Дана", "Dana")}</b><span>${L("Видит дела и лекарства", "Sees tasks and medication")}</span></span>
          <i class="ph-fill ph-check-circle" style="font-size:1.8rem;color:var(--ok);justify-self:center" aria-hidden="true"></i>
        </div>
      </div>

      <div class="setting">
        <p class="setting__label">${L("Язык", "Language")}</p>
        <div class="sizes lang-pick">
          <a href="${BASE}" ${EN ? "" : 'aria-current="true"'} hreflang="ru" lang="ru">Русский</a>
          <a href="${EN ? "./" : "en/"}" ${EN ? 'aria-current="true"' : ""} hreflang="en" lang="en">English</a>
        </div>
      </div>

      <div class="drawer__foot">
        <button class="linkish" data-reset>${L("Сбросить данные", "Reset data")}</button>
        <p class="drawer__credit">Qamqor 1.0 · © djedai</p>
      </div>`;
  }

  /* ---------- Лист «Добавить» ---------- */
  let sheetMode = "menu";
  const draft = { preset: 0, time: null, mood: null };

  function timeOptions() {
    const n = new Date();
    const inHour = new Date(n.getTime() + 60 * 60000);
    inHour.setMinutes(inHour.getMinutes() < 30 ? 30 : 60, 0, 0);
    const opts = [hhmm(inHour)];
    ["12:00", "15:00", "18:00", "21:00"].forEach((t) => { if (toMin(t) > toMin(opts[0]) && opts.length < 4) opts.push(t); });
    return opts;
  }

  function renderSheet() {
    const body = $("#sheet-body");
    const title = $("#sheet-title");
    if (sheetMode === "menu") {
      title.textContent = L("Добавить", "Add");
      body.innerHTML = `<div class="choice-grid">
          <button class="choice choice--big" data-mode="mood"><i class="ph-fill ph-smiley" aria-hidden="true"></i>${L("Настроение", "Mood")}</button>
          <button class="choice choice--big" data-mode="med"><i class="ph-fill ph-pill" aria-hidden="true"></i>${L("Лекарство", "Medication")}</button>
          <button class="choice choice--big" data-mode="remind"><i class="ph-fill ph-bell-ringing" aria-hidden="true"></i>${L("Напоминание", "Reminder")}</button>
        </div>
        <p class="mood-caption" style="margin-top:18px">${L("Одно нажатие, без ввода текста", "One tap, no typing")}</p>`;
    } else if (sheetMode === "mood") {
      title.textContent = L("Как настроение?", "How’s your mood?");
      body.innerHTML = `<div class="mood-row">${MOODS.map((m) => `<button class="mood-btn" data-smood="${m.v}" aria-pressed="${draft.mood === m.v}" aria-label="${m.label}">${face(m.v)}</button>`).join("")}</div>
        <p class="mood-caption">${draft.mood ? MOODS[draft.mood - 1].label : L("Выберите лицо", "Pick a face")}</p>
        <button class="btn btn--brand btn--block" data-save="mood" ${draft.mood ? "" : "disabled style=\"opacity:.5\""}>${L("Сохранить", "Save")}</button>`;
    } else if (sheetMode === "med") {
      title.textContent = L("Какое лекарство приняли?", "Which medication did you take?");
      const k = dkey(today()), ml = state.meds[k] || {};
      const doses = [];
      MEDS.forEach((m) => m.times.forEach((t) => doses.push({ m, t, on: !!ml[`${m.id}@${t}`] })));
      body.innerHTML = `<div class="task-list">${doses.map(({ m, t, on }) => `
        <div class="task ${on ? "is-done" : ""}" style="box-shadow:none;background:var(--mist)">
          <span class="task__icon" style="background:#fff"><i class="ph-fill ph-pill" aria-hidden="true"></i></span>
          <span><span class="task__time">${t}</span><br><span class="task__title">${m.name}</span></span>
          <button class="check" style="background:${on ? "" : "#fff"}" data-toggle="${m.id}@${t}" aria-pressed="${on}" aria-label="${m.name} ${t}"><i class="ph-bold ph-check" aria-hidden="true"></i></button>
        </div>`).join("")}</div>`;
    } else if (sheetMode === "remind") {
      title.textContent = L("Новое напоминание", "New reminder");
      const times = timeOptions();
      if (!draft.time || !times.includes(draft.time)) draft.time = times[0];
      body.innerHTML = `<p class="label" style="margin-top:4px">${L("Что сделать?", "What to do?")}</p>
        <div class="choice-grid">${PRESETS.map((p, i) => `<button class="choice" data-preset="${i}" aria-pressed="${draft.preset === i}"><i class="ph-fill ph-${p.icon}" aria-hidden="true"></i>${p.title}</button>`).join("")}</div>
        <p class="label">${L("Когда?", "When?")}</p>
        <div class="chips">${times.map((t, i) => `<button class="chip" data-time="${t}" aria-pressed="${draft.time === t}">${i === 0 ? `${L("Через час", "In an hour")} · ${t}` : t}</button>`).join("")}</div>
        <button class="btn btn--brand btn--block" data-save="remind"><i class="ph ph-bell-simple-ringing" aria-hidden="true"></i>${L("Напомнить в", "Remind me at")} ${draft.time}</button>`;
    }
  }

  function openSheet(mode = "menu") {
    sheetMode = mode;
    draft.mood = state.moods[dkey(today())] || null;
    renderSheet();
    $("#scrim").hidden = false;
    $("#sheet").hidden = false;
    setTimeout(() => $("#sheet [data-close]").focus(), 50);
  }
  function closeOverlays() {
    $("#scrim").hidden = true;
    $("#sheet").hidden = true;
    $("#drawer").hidden = true;
    $("#menu-btn").setAttribute("aria-expanded", "false");
  }

  /* ---------- Уведомление ---------- */
  let toastTimer;
  function toast(text, icon = "check-circle") {
    const el = $("#toast");
    el.innerHTML = `<i class="ph-fill ph-${icon}" aria-hidden="true"></i>${esc(text)}`;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2600);
  }

  /* ---------- Навигация ---------- */
  const TITLES = EN
    ? { home: "Today", tracker: "Wellbeing", plan: "Plan", care: "Safety" }
    : { home: "Сегодня", tracker: "Самочувствие", plan: "План", care: "Безопасность" };

  function go(screen) {
    ui.screen = screen;
    $$(".screen").forEach((s) => (s.hidden = s.dataset.screen !== screen));
    $$(".tab[data-tab]").forEach((b) => {
      const on = b.dataset.tab === screen;
      b.classList.toggle("is-active", on);
      on ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current");
    });
    $("#topbar-title").textContent = TITLES[screen];
    $("#range-btn").hidden = !(screen === "tracker" && ui.trackerTab === "dash");
    $("#topbar-date").hidden = !$("#range-btn").hidden;
    render();
    $(`[data-screen="${screen}"]`).scrollTop = 0;
  }

  function render() {
    ({ home: renderHome, tracker: renderTracker, plan: renderPlan, care: renderCare })[ui.screen]();
    $("#range-btn").textContent = ui.range === 7 ? L("Неделя", "Week") : L("Месяц", "Month");
  }

  function applyPrefs() {
    document.documentElement.style.setProperty("--scale", state.scale);
    document.documentElement.classList.toggle("hc", !!state.contrast);
  }

  function tick() {
    const n = new Date();
    $("#sb-time").textContent = `${n.getHours()}:${pad(n.getMinutes())}`;
    $("#topbar-date").textContent = EN ? `${MONTHS_GEN[n.getMonth()].slice(0, 3)} ${n.getDate()}` : `${n.getDate()} ${MONTHS_GEN[n.getMonth()].slice(0, 3)}`;
  }

  /* ---------- События ---------- */
  function findTask(id) { return tasksFor(today()).find((t) => t.id === id); }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, [data-day]");
    if (!t) {
      if (e.target.id === "scrim") closeOverlays();
      return;
    }
    const d = t.dataset;

    if (d.tab) return go(d.tab);
    if (t.id === "add-btn") return openSheet("menu");
    if (t.id === "menu-btn") {
      renderDrawer();
      $("#scrim").hidden = false;
      $("#drawer").hidden = false;
      t.setAttribute("aria-expanded", "true");
      return;
    }
    if (t.id === "range-btn") { ui.range = ui.range === 7 ? 30 : 7; return render(); }
    if (d.close !== undefined) return closeOverlays();

    // Сегодня
    if (d.done) {
      const task = findTask(d.done);
      if (task) { setTaskDone(task, true); toast(task.kind === "med" ? L("Лекарство отмечено", "Medication logged") : L("Отлично, сделано!", "Nice, done!")); render(); }
      return;
    }
    if (d.toggle) {
      const task = findTask(d.toggle);
      if (!task) return;
      setTaskDone(task, !task.done);
      if (!task.done) toast(task.kind === "med" ? L(`${task.title} — принято`, `${task.title} taken`) : L("Отлично, сделано!", "Nice, done!"));
      if (!$("#sheet").hidden) renderSheet();
      return render();
    }
    if (d.mood) { setMood(+d.mood); toast(`${L("Настроение", "Mood")}: ${MOODS[d.mood - 1].label}`, "smiley"); return render(); }

    // Трекер
    if (d.ttab) {
      ui.trackerTab = d.ttab;
      $("#range-btn").hidden = d.ttab !== "dash";
      $("#topbar-date").hidden = d.ttab === "dash";
      return render();
    }
    if (d.dot) {
      const car = $("#carousel");
      car.scrollTo({ left: +d.dot * slideStep(car), behavior: "smooth" });
      return;
    }

    // План
    if (d.cal) { ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + +d.cal, 1); return render(); }
    if (d.day) {
      const [y, m, dd] = d.day.split("-").map(Number);
      ui.planDate = new Date(y, m - 1, dd);
      if (ui.planDate.getMonth() !== ui.calMonth.getMonth()) ui.calMonth = new Date(y, m - 1, 1);
      return render();
    }

    // Безопасность
    if (d.act === "sos") {
      if (confirm(L("Отправить Дане сигнал о помощи и ваше местоположение?", "Send Dana a help alert with your location?"))) {
        log("siren", L("Безопасность", "Safety"), L("Отправлен сигнал о помощи", "Help alert sent"));
        save();
        toast(L("Сигнал отправлен. Дана уже знает", "Alert sent. Dana already knows"), "siren");
      }
      return;
    }
    if (d.act === "zones") return toast(L("Зоны: Дом, Парк, Поликлиника", "Zones: Home, Park, Clinic"), "shield-check");
    if (d.act === "home-route") return toast(L("Дом рядом: 0 м. Вы на месте", "Home is 0 m away. You’re there"), "house-line");

    // Лист
    if (d.mode) { sheetMode = d.mode; return renderSheet(); }
    if (d.smood) { draft.mood = +d.smood; return renderSheet(); }
    if (d.preset) { draft.preset = +d.preset; return renderSheet(); }
    if (d.time) { draft.time = d.time; return renderSheet(); }
    if (d.save === "mood" && draft.mood) {
      setMood(draft.mood); closeOverlays(); toast(`${L("Настроение", "Mood")}: ${MOODS[draft.mood - 1].label}`, "smiley"); return render();
    }
    if (d.save === "remind") {
      const p = PRESETS[draft.preset], k = dkey(today());
      state.custom[k] = state.custom[k] || [];
      state.custom[k].push({ id: `c-${uid()}`, time: draft.time, icon: p.icon, title: p.title });
      log("bell-ringing", L("Напоминание", "Reminder"), L(`${p.title} в ${draft.time}`, `${p.title} at ${draft.time}`));
      save(); closeOverlays(); toast(L(`Напомним в ${draft.time}`, `We’ll remind you at ${draft.time}`), "bell-ringing");
      return render();
    }

    // Меню
    if (d.scale) { state.scale = +d.scale; save(); applyPrefs(); renderDrawer(); return render(); }
    if (d.contrast !== undefined) { state.contrast = !state.contrast; save(); applyPrefs(); return renderDrawer(); }
    if (d.reset !== undefined) {
      if (confirm(L("Сбросить все отметки и вернуть демо-данные?", "Reset everything and restore the demo data?"))) {
        state = seed(); save(); applyPrefs(); closeOverlays(); render(); toast(L("Данные сброшены", "Data reset"), "arrow-counter-clockwise");
      }
    }
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeOverlays(); });

  /* ---------- Старт ---------- */
  applyPrefs();
  tick();
  setInterval(tick, 30000);
  go("home");
  save();

  // Офлайн-режим и установка на телефон (нужен https или localhost)
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {}));
  }
})();
