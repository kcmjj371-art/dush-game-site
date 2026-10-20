(() => {
const G = window.GAME;
const $ = (s, r = document) => r.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KEY = "dushs-tour-v1";

/* ---------- 진행 상황 (개인정보는 저장하지 않음) ---------- */
let prog = { done: [], motion: true };
try { Object.assign(prog, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
if (matchMedia("(prefers-reduced-motion: reduce)").matches) prog.motion = false;
const saveProg = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) {} };

/* ---------- 장면 & 카메라 ---------- */
const img = $("#sceneImg"), actor = $("#actorImg"), sceneEl = $("#scene");
let cam = { x: .5, y: .38, z: 1 }, curCourse = null, actorFor = null;
function setScene(src, s, blur = false) {
  sceneEl.classList.toggle("blur", blur); sceneEl.classList.remove("soft", "light");
  act(null);
  return new Promise(res => {
    if (img.getAttribute("src") === src) { shot(s); return res(); }
    img.onload = () => { shot(s, true); res(); };
    img.onerror = res;
    img.src = src; actor.src = src;
    $("#backdrop").style.backgroundImage = `url('${src}')`;
  });
}
// 카메라: 그림의 (x, y) 지점을 화면 중앙 근처에 두고 z 배 확대
function applyCam(instant) {
  const nw = img.naturalWidth, nh = img.naturalHeight, cw = sceneEl.clientWidth, ch = sceneEl.clientHeight;
  if (!nw || !cw) return;
  // cam.fit = [w, h]: 그림의 그 영역이 화면 안에 다 들어오도록 확대 (인포그래픽 칸 보기)
  const S = cam.fit ? Math.min(cw / (cam.fit[0] * nw), ch / (cam.fit[1] * nh)) : Math.max(cw / nw, ch / nh) * cam.z;
  const W = nw * S, H = nh * S;
  const tx = W <= cw ? (cw - W) / 2 : Math.min(0, Math.max(cw - W, cw / 2 - cam.x * W));
  const ty = H <= ch ? (ch - H) / 2 : Math.min(0, Math.max(ch - H, (cam.fit ? ch / 2 : ch * .45) - cam.y * H));
  const t = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${S.toFixed(4)})`;
  [img, actor].forEach(el => { if (instant) el.style.transition = "none"; el.style.transform = t; });
  if (instant) requestAnimationFrame(() => requestAnimationFrame(() => { img.style.transition = ""; actor.style.transition = ""; }));
}
function shot(s, instant) {
  if (s == null) return;
  if (typeof s === "number") s = { x: s };
  cam = { x: s.x ?? cam.x, y: s.y ?? .38, z: s.z ?? 1, fit: s.fit || null };
  applyCam(instant || !prog.motion);
}
// 말하는 선배 부분만 겹쳐 그려서 살짝 들썩이게 함
function act(x) {
  if (x == null || !img.naturalWidth) { actor.classList.remove("on", "hop"); actorFor = null; return; }
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const m = `radial-gradient(ellipse ${(nw * .14).toFixed(0)}px ${(nh * .62).toFixed(0)}px at ${(x * nw).toFixed(0)}px ${(nh * .62).toFixed(0)}px, #000 58%, transparent 88%)`;
  actor.style.webkitMaskImage = m; actor.style.maskImage = m;
  actor.classList.add("on");
  actor.classList.remove("hop"); void actor.offsetWidth; actor.classList.add("hop");
  actorFor = x;
}
function ambient(kind) {
  const box = $("#fxl");
  box.className = "fxl" + (kind ? " fx-" + kind : "");
  if (!kind) { box.innerHTML = ""; return; }
  if (kind === "drone") {
    box.innerHTML = `<div class="flyer"><svg viewBox="0 0 80 40"><path d="M10 12h22M48 12h22" stroke="#333" stroke-width="3"/><ellipse cx="21" cy="10" rx="13" ry="3" fill="#cfd8e3" opacity=".8"/><ellipse cx="59" cy="10" rx="13" ry="3" fill="#cfd8e3" opacity=".8"/><rect x="28" y="12" width="24" height="12" rx="5" fill="#4a4f58"/><circle cx="40" cy="27" r="4" fill="#222"/><path d="M30 24l-6 8M50 24l6 8" stroke="#333" stroke-width="2.5"/><circle cx="34" cy="17" r="1.6" fill="#ff5a5a"/></svg></div>`
      + Array.from({ length: 10 }, (_, i) => `<i style="left:${(i * 31 + 9) % 100}%;top:${40 + (i * 17) % 50}%;animation-duration:${6 + i % 4}s;animation-delay:-${i * .9}s"></i>`).join("");
    box.className += " fx-dust";
    return;
  }
  const n = kind === "dust" ? 16 : 12;
  box.innerHTML = Array.from({ length: n }, (_, i) =>
    `<i style="left:${(i * 37 + 11) % 96}%;top:${(i * 23 + 15) % 80}%;animation-duration:${kind === "dust" ? 6 + i % 5 : 2.2 + (i % 4) * .5}s;animation-delay:-${(i * .73) % 4}s"></i>`).join("");
}
addEventListener("resize", () => applyCam(true));

/* ---------- 첫 만남 애니메이션: 그림을 번갈아 보여 줌 ---------- */
const sprite = $("#sprite"), spA = $("#spA"), spB = $("#spB");
const frameCache = {};
let anim = null, spriteKind = null;
// [프레임 번호, 유지 시간(ms)] — 눈 깜빡임(짧게)과 손 흔들기·표정 바꾸기
const SEQ = {
  pair: [[0, 1800], [1, 150], [0, 900], [2, 420], [3, 420], [2, 420], [3, 420], [0, 1400], [1, 150], [0, 700]],
  solo: [[0, 2300], [1, 140], [0, 1600], [1, 900]],
  // 첫 만남: 눈만 깜빡임 (가끔 두 번 연속)
  blink: [[0, 2800], [1, 130], [0, 2200], [1, 130], [0, 160], [1, 130]],
};
function preloadFrames(srcs) { srcs.forEach(src => { if (!frameCache[src]) { const im = new Image(); im.src = src; frameCache[src] = im; } }); }
// 세로 화면(휴대폰)에서는 학과 선배를 GPT가 만든 전신 그림으로 보여 줌
const portraitMQ = matchMedia("(max-aspect-ratio: 4/5)");
let cgMode = false;  // 주요 실습: 인포그래픽 장면을 보여 주는 중
// 인포그래픽 칸 위치 (그림 가로·세로 비율 기준)
const ZONES = {
  tl: { x: .26, y: .335, fit: [.5, .33] }, tr: { x: .74, y: .335, fit: [.5, .33] },
  bl: { x: .26, y: .69, fit: [.5, .36] }, br: { x: .74, y: .69, fit: [.5, .36] },
  top: { x: .5, y: .3, fit: [1, .42] }, bottom: { x: .5, y: .66, fit: [1, .42] },
  full: { x: .5, y: .5, fit: [1, 1] },
};
// 세로 화면에서는 두 칸짜리(top·bottom)가 너무 작아져서 왼쪽 칸 하나만 보여 줌
const zoneShot = z => ZONES[portraitMQ.matches ? ({ top: "tl", bottom: "bl" }[z] || z) : z] || ZONES.full;
// key: 첫 만남 "pair" | "sj" | "hr", 학과 화면 "bg" | "pair" | "m" | "f" (curCourse 기준)
function spriteSet(key) {
  // 실습 장면 설명: 그 장면을 맡은 선배 한 명 그림 (세로 9:16)
  if (key && key.startsWith("scene:")) return { frames: [key.slice(6)], cls: "portrait scene" };
  if (curCourse && curCourse.portraits && portraitMQ.matches && curCourse.portraits[key]) {
    return { frames: [curCourse.portraits[key]], cls: "portrait" };
  }
  if (curCourse && curCourse.sprites) {
    const sp = curCourse.sprites, v = sp[key];
    const solo = key === "m" || key === "f";
    return { frames: Array.isArray(v) ? v : [v], cls: "cell " + (solo ? "solo still" : "pair"), seq: solo ? SEQ.blink : null };
  }
  return { frames: G.sprites[key], cls: "still cutout " + (key === "pair" ? "pair" : "solo"), seq: SEQ.blink };
}
function showSprite(key) {
  if (anim && key === spriteKind) return;
  clearTimeout(anim && anim.t); anim = null; spriteKind = key;
  if (!key) { sprite.hidden = true; return; }
  const set = spriteSet(key), { frames, cls } = set;
  const seq = set.seq || (frames.length >= 4 ? SEQ.pair : frames.length === 2 ? SEQ.solo : [[0, 60000]]);
  preloadFrames(frames);
  sprite.hidden = false;
  sprite.className = "sprite " + cls;
  void sprite.offsetWidth; sprite.classList.add("enter");
  spA.src = frames[0]; spB.src = frames[0];
  const me = anim = { i: 0, onB: false };
  const step = () => {
    if (anim !== me) return;
    if (prog.motion) {
      const [f, ms] = seq[me.i++ % seq.length];
      (me.onB ? spA : spB).src = frames[f];  // 보이지 않는 쪽에 다음 장을 미리 넣고 한 번에 바꿈 (깜빡임 방지)
      me.onB = !me.onB; sprite.classList.toggle("b", me.onB);
      me.t = setTimeout(step, ms);
    } else {
      spA.src = frames[0]; sprite.classList.remove("b"); me.onB = false;  // 움직임 멈춤: 첫 장 고정
      me.t = setTimeout(step, 500);
    }
  };
  step();
}
// 벚꽃잎: 크기·속도·흔들림을 조금씩 다르게
function petals(on) {
  const box = $("#petals");
  box.hidden = !on;
  if (on && !box.firstChild) box.innerHTML = Array.from({ length: 46 }, (_, i) => {
    const size = 8 + (i * 7) % 9, dur = 6 + (i * 13) % 7, sway = 3 + (i * 5) % 3;
    return `<i style="left:${(i * 37 + 7) % 104 - 2}%;--s:${size}px;--dx:${-60 - (i * 29) % 140}px;animation-duration:${dur}s;animation-delay:-${(i * 1.37) % dur}s"><b style="animation-duration:${sway}s;animation-delay:-${(i * .7) % sway}s"></b></i>`;
  }).join("");
}
// 첫 화면 반복 영상: 무음·자동재생·반복. 움직임을 멈추거나 재생이 안 되면 그림만 보임
const vid = $("#titleVideo");
let videoWanted = false;
function titleVideo(on) {
  videoWanted = on;
  if (!vid || !G.images.bloomVideo) return;
  if (on && prog.motion) {
    if (!vid.getAttribute("src")) {
      // VP9(WebM)을 지원하면 WebM, 아니면 MP4 (아이폰 사파리 등)
      const webm = G.images.bloomVideo.replace(/\.mp4$/, ".webm");
      vid.src = vid.canPlayType('video/webm; codecs="vp9"') ? webm : G.images.bloomVideo;
    }
    vid.hidden = false;
    const p = vid.play(); if (p && p.catch) p.catch(() => { vid.hidden = true; });
  } else { vid.pause(); vid.hidden = true; }
}
if (vid) vid.addEventListener("error", () => { vid.hidden = true; });
function setMotion(on) {
  prog.motion = on; saveProg();
  if (vid) titleVideo(videoWanted);
  document.body.classList.toggle("moving", on);
  $("#motionBtn").textContent = on ? "움직임 멈추기" : "움직임 켜기";
  $("#motionBtn").setAttribute("aria-pressed", String(!on));
}
const schoolImg = () => G.images.bloom;
async function fade(fn) {
  const f = $("#fade"); f.classList.add("on"); await wait(360);
  await fn(); f.classList.remove("on"); await wait(200);
}
async function banner(title, step, color) {
  const b = $("#banner");
  b.innerHTML = `<div class="band" style="--accent:${color || "var(--gold)"}"><small>${esc(step)}</small><b>${esc(title)}</b></div>`;
  await wait(prog.motion ? 1900 : 900);
  b.innerHTML = "";
}

/* ---------- 대화 ---------- */
const dialog = $("#dialog"), textEl = $("#text");
// AUTO: 기본으로 켜짐. 대사를 다 보여 준 뒤 (1.3초 + 글자당 0.045초 + 3초) 기다렸다 넘어감
const AUTO_EXTRA = 3000;
let typing = null, waiting = null, auto = true, autoTimer = null, log = [], extra = {};
function speakerInfo(who) {
  if (who === "both") return { name: "서준 · 하린", sub: "안내 선배", color: G.guides.sj.color };
  if (who === "sj" || who === "hr") return { name: G.guides[who].name, sub: "안내 선배", color: G.guides[who].color };
  if ((who === "m" || who === "f") && curCourse) return { name: curCourse[who].name, sub: curCourse.name, color: curCourse.color };
  return null;
}
function fill(t) { return String(t).replace(/\{(\w+)\}/g, (m, k) => extra[k] ?? ""); }
function typeLine(who, raw, s) {
  const t = fill(raw), sp = speakerInfo(who);
  dialog.hidden = false;
  dialog.classList.remove("ready");
  dialog.classList.toggle("narr", !sp);
  $("#plate").hidden = !sp;
  if (sp) { $("#plateName").textContent = sp.name; $("#plateSub").textContent = sp.sub; $("#plate").style.setProperty("--accent", sp.color); }
  // 말하는 사람 쪽으로 카메라 이동 + 그 선배만 살짝 움직임
  let px = null;
  if (curCourse && sprite.hidden && !cgMode && (who === "m" || who === "f")) px = curCourse.pos[who];
  if (!curCourse && sprite.hidden && (who === "sj" || who === "hr") && img.getAttribute("src") === G.images.guides.src) px = G.images.guides[who];
  if (s) shot(s); else if (px != null) shot({ x: px, y: .34, z: 1.14 });
  act(px);
  log.push({ name: sp ? sp.name : "", color: sp ? sp.color : "", text: t });
  if (log.length > 120) log.shift();
  return new Promise(res => {
    let i = 0;
    const done = () => { clearInterval(typing?.timer); textEl.textContent = t; typing = null; dialog.classList.add("ready"); res(t); };
    textEl.textContent = "";
    if (!prog.motion) return done();
    typing = { done, timer: setInterval(() => { i++; textEl.textContent = t.slice(0, i); if (i >= t.length) done(); }, 30) };
  });
}
async function say(who, raw, s) {
  const t = await typeLine(who, raw, s);
  await new Promise(res => { waiting = res; if (auto) autoTimer = setTimeout(advance, AUTO_EXTRA + 1300 + t.length * 45); });
}
async function lines(arr) { for (const [who, t, s] of arr) await say(who, t, s); }
function advance() {
  clearTimeout(autoTimer);
  if (typing) return typing.done();
  if (waiting) { const w = waiting; waiting = null; w(); }
}
dialog.addEventListener("click", e => { if (!e.target.closest(".ctrl")) advance(); });
sceneEl.addEventListener("click", () => { if (!layer.firstChild) advance(); });
document.addEventListener("keydown", e => {
  if ((e.key === " " || e.key === "Enter") && !layer.firstChild && !modal.firstChild && !dialog.hidden && !e.target.closest("input,textarea,select,button")) { e.preventDefault(); advance(); }
  if (e.key === "Escape" && modal.firstChild) closeModal();
});
$("#autoBtn").addEventListener("click", () => {
  auto = !auto; $("#autoBtn").setAttribute("aria-pressed", String(auto));
  clearTimeout(autoTimer);
  if (auto && waiting && !typing) autoTimer = setTimeout(advance, AUTO_EXTRA + 900);
});

/* ---------- 오버레이 ---------- */
const layer = $("#layer"), modal = $("#modal");
function show(html, cls = "") { layer.innerHTML = `<div class="layer ${cls}">${html}</div>`; return layer.firstElementChild; }
const hide = () => { layer.innerHTML = ""; };
let onModalClose = null;
function openModal(html) {
  clearTimeout(autoTimer);
  modal.innerHTML = `<div class="layer dim modal" role="dialog" aria-modal="true">${html}</div>`;
  const m = modal.firstElementChild;
  m.addEventListener("click", e => { if (e.target === m) closeModal(); });
  m.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
  return m;
}
function closeModal() {
  modal.innerHTML = "";
  const cb = onModalClose; onModalClose = null; if (cb) cb();
  if (auto && waiting && !typing) autoTimer = setTimeout(advance, AUTO_EXTRA + 900);
}
function choose(options) {
  dialog.classList.remove("ready");
  return new Promise(res => {
    const o = show(`<div class="btn-row">${options.map((t, i) => `<button class="btn" type="button" data-i="${i}"><span class="num">${i + 1}</span>${esc(t)}</button>`).join("")}</div>`, "choices");
    o.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { hide(); res(+b.dataset.i); }));
    o.querySelector("button").focus();
  });
}

$("#logBtn").addEventListener("click", () => {
  const m = openModal(`<div class="panel"><div class="eyebrow">BACKLOG</div><h2>지난 대화</h2>
    <div id="logLines">${log.map(l => `<p style="margin:0 0 10px">${l.name ? `<b style="font-family:var(--serif);color:${l.color}">${esc(l.name)}</b><br>` : ""}<span style="color:${l.name ? "var(--fg)" : "var(--muted)"}">${esc(l.text)}</span></p>`).join("")}</div>
    <button class="btn" type="button" data-close>닫기</button></div>`);
  const p = $(".panel", m); p.scrollTop = p.scrollHeight;
});

/* ---------- 입학 안내 ---------- */
function admissionInfo() {
  const d = G.admissionDetails;
  const list = arr => `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const t = d.split.reduce((a, r) => ({ c: a.c + r.classes, s: a.s + r.special, g: a.g + r.general }), { c: 0, s: 0, g: 0 });
  openModal(`<div class="panel">
    <div class="eyebrow">${esc(G.school.year)} ADMISSION</div><h2>입학전형 안내</h2>
    <p>${esc(G.school.year)} 신입생 입학전형입니다. 아래 날짜는 모두 2026년입니다.</p>
    <h3>전형 일정</h3>
    <table><tbody>${G.schedule.map(s => `<tr><th>${esc(s.what)}</th><td>${esc(s.when)}${s.note ? `<br><span class="tag-note">${esc(s.note)}</span>` : ""}</td></tr>`).join("")}</tbody></table>
    <h3>모집 학과 및 정원</h3>
    ${list(d.overview)}
    <div class="tscroll"><table class="quota"><thead><tr><th>학과</th><th>학급</th><th>전체</th><th>특별</th><th>일반</th></tr></thead><tbody>
      ${d.split.map(r => `<tr><th>${esc(r.dept)}</th><td class="num">${r.classes}</td><td class="num"><b>${r.special + r.general}</b></td><td class="num">${r.special}</td><td class="num">${r.general}</td></tr>`).join("")}
      <tr><th>합계</th><td class="num">${t.c}</td><td class="num"><b>${t.s + t.g}</b></td><td class="num">${t.s}</td><td class="num">${t.g}</td></tr>
    </tbody></table></div>
    <p class="small">${esc(d.splitNote)}</p>
    <p class="small">군 특성화 과정(수송정비·기갑조종 2개반)은 별도 신입생 모집 학과가 아닌 과정입니다. 해병대 부사관 임관(전공무관).</p>
    ${d.events.map(e => `<h3>${esc(e.title)}</h3>${list(e.items)}`).join("")}
    <h3>지원 자격</h3>${list(d.eligibility)}
    <h3>제출 서류</h3>${list(d.documents)}
    <h3>전형 방법 · 특별전형</h3>${list(d.criteria.special)}
    <h3>전형 방법 · 일반전형</h3>${list(d.criteria.general)}
    <h3>문의 · 공식 홈페이지</h3><p>${esc(d.contact)}<br><a href="${G.school.homepage}" target="_blank" rel="noopener">${esc(G.school.homepage)}</a></p>
    <p class="src">출처: 「2027학년도 대전도시과학고등학교 신입생 입학 전형요강」(2026. 7. 31.), 「2027학년도 입시설명회 및 학과체험」 안내. 자세한 내용은 전형요강 원문을 확인해 주세요.</p>
    <div class="btn-row"><button class="btn primary" type="button" id="toApply">신청서 작성</button><button class="btn ghost" type="button" data-close>닫기</button></div>
  </div>`);
  $("#toApply").addEventListener("click", () => { closeModal(); openForm(); });
}
$("#infoBtn").addEventListener("click", admissionInfo);

/* ---------- 신청서 ---------- */
let prefillDept = "";
function openForm(dept = prefillDept, after) {
  const opts = G.admissionDepts.map(d => `<option value="${esc(d)}" ${d === dept ? "selected" : ""}>${esc(d)}</option>`).join("");
  const m = openModal(`<form class="panel form" id="applyForm" novalidate>
    <div class="eyebrow">CONSULTATION</div><h2>입학 상담·관심 신청서</h2>
    <p>이 신청서는 <b>입학 상담과 관심 표시를 위한 양식</b>이며, 정식 고입 원서 접수가 아닙니다. 원서교부 및 접수는 11월 23일 ~ 11월 25일 16:00에 별도로 진행됩니다.</p>
    <label for="f-name">성명<span class="req">필수</span></label><input type="text" id="f-name" name="name" maxlength="20" autocomplete="name"><div class="err" data-for="name"></div>
    <label for="f-school">중학교명<span class="req">필수</span></label><input type="text" id="f-school" name="school" maxlength="30" placeholder="예: ○○중학교"><div class="err" data-for="school"></div>
    <div class="row2">
      <div><label for="f-cls">반<span class="req">필수</span></label><input type="text" id="f-cls" name="cls" maxlength="10" inputmode="numeric" placeholder="예: 3"><div class="err" data-for="cls"></div></div>
      <div><label for="f-phone">연락처<span class="req">필수</span></label><input type="tel" id="f-phone" name="phone" maxlength="13" inputmode="tel" placeholder="010-0000-0000" autocomplete="tel"><div class="err" data-for="phone"></div></div>
    </div>
    <label for="f-dept">희망학과<span class="req">필수</span></label>
    <select id="f-dept" name="dept"><option value="">선택해 주세요</option>${opts}</select><div class="err" data-for="dept"></div>
    <label for="f-grade">내신점수<span class="opt">선택</span></label><input type="text" id="f-grade" name="grade" maxlength="20">
    <label for="f-q">궁금한 점<span class="opt">선택</span></label><textarea id="f-q" name="question" maxlength="500"></textarea>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label class="consent"><input type="checkbox" id="f-agree" name="agree"><span>입학 상담 연락을 위해 위 개인정보(성명·중학교명·반·연락처·희망학과·내신점수·궁금한 점)를 수집·이용하는 데 동의합니다. <span class="req" style="color:var(--pink)">필수</span></span></label>
    <div class="err" data-for="agree"></div>
    <div class="status" id="f-status" hidden></div>
    <div class="btn-row two" style="margin-top:16px"><button class="btn ghost" type="button" data-close>닫기</button><button class="btn primary" type="submit" id="f-submit">신청서 제출</button></div>
  </form>`);
  if (after) onModalClose = after;
  const f = $("#applyForm", m);
  setTimeout(() => $("#f-name", m).focus(), 50);
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f).entries());
    Object.keys(v).forEach(k => { if (typeof v[k] === "string") v[k] = v[k].trim(); });
    const errs = {};
    if (v.name.length < 2) errs.name = "성명을 2자 이상 입력해 주세요.";
    if (!v.school) errs.school = "중학교명을 입력해 주세요.";
    if (!/^\d{1,2}$/.test(v.cls.replace(/반$/, ""))) errs.cls = "반을 숫자로 입력해 주세요. (예: 3)";
    const phone = v.phone.replace(/[^\d]/g, "");
    if (!/^\d{9,11}$/.test(phone)) errs.phone = "전화번호를 숫자 9~11자리로 입력해 주세요. (예: 010-1234-5678 또는 01012345678)";
    if (!G.admissionDepts.includes(v.dept)) errs.dept = "희망학과를 선택해 주세요.";
    if (!$("#f-agree", f).checked) errs.agree = "개인정보 수집·이용에 동의해야 제출할 수 있어요.";
    f.querySelectorAll(".err").forEach(el => { el.textContent = errs[el.dataset.for] || ""; });
    f.querySelectorAll("input, select").forEach(el => el.classList.toggle("invalid", !!errs[el.name]));
    const st = $("#f-status", f);
    if (Object.keys(errs).length) { st.hidden = true; f.querySelector(".invalid")?.focus(); return; }
    if (v.website) return; // 자동 입력 방지
    const payload = { name: v.name, school: v.school, cls: v.cls.replace(/반$/, ""), phone: phone.length === 11 ? phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3") : phone.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, "$1-$2-$3"), dept: v.dept, grade: v.grade, question: v.question, agree: true, sentAt: new Date().toISOString() };
    const btn = $("#f-submit", f);
    if (!G.formEndpoint) {
      st.hidden = false; st.className = "status warn";
      st.textContent = "아직 온라인 접수 저장 위치가 연결되지 않아 신청서를 보낼 수 없어요. 작성한 내용은 전송되지 않았습니다. 학교로 직접 문의해 주세요.";
      return;
    }
    btn.disabled = true; btn.textContent = "보내는 중…";
    try {
      let r, j;
      try { r = await fetch(G.formEndpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }); }
      catch (e) { throw new Error("접수 서버에 연결하지 못함"); }
      try { j = await r.json(); } catch (e) { throw new Error(`접수 서버 응답 오류 ${r.status}`); }
      if (!r.ok || !j || j.ok !== true) throw new Error(j && j.error || "저장 실패");
      f.innerHTML = `<div class="eyebrow">THANK YOU</div><h2>신청서가 접수되었어요</h2>
        <p>${esc(payload.name)} 님의 입학 상담·관심 신청서가 저장되었습니다. 정식 원서 접수는 11월 23일 ~ 11월 25일 16:00에 따로 진행돼요.</p>
        <button class="btn primary" type="button" data-close>확인</button>`;
      f.querySelector("[data-close]").addEventListener("click", closeModal);
    } catch (err) {
      st.hidden = false; st.className = "status warn";
      st.textContent = `전송에 실패했어요. 신청서가 저장되지 않았습니다. 잠시 후 다시 시도하거나 학교로 문의해 주세요. (이유: ${err.message})`;
      btn.disabled = false; btn.textContent = "다시 제출";
    }
  });
}
$("#applyBtn").addEventListener("click", () => openForm());

/* ---------- 화면 ---------- */
async function titleScreen() {
  $("#exitBtn").hidden = true;
  hide(); dialog.hidden = true; curCourse = null;
  await setScene(schoolImg(), { x: .5, y: .45 });
  titleVideo(true);
  petals(true); ambient(null);
  const anyDone = prog.done.length > 0;
  const o = show(`
    <div class="eyebrow">${esc(G.school.year)} 신입생 학과 탐방</div>
    <h1>${esc(G.school.name)}</h1>
    <div class="sub">선배들과 함께하는 학과 탐방</div>
    <div class="btn-row">
      <button class="btn primary" type="button" id="enterBtn">입장하기</button>
      ${anyDone ? `<button class="btn" type="button" id="contBtn">이어서 둘러보기 (${prog.done.length}/${G.courses.length})</button>` : ""}
      <button class="btn ghost" type="button" id="gamesBtn">🎮 미니게임 바로가기</button>
    </div>
    <div class="credit"><span aria-hidden="true">✿</span> made by 강철민</div>`, "title");
  $("#enterBtn", o).addEventListener("click", () => { prog.done = []; prog.guide = null; saveProg(); intro(); });
  if (anyDone) $("#contBtn", o).addEventListener("click", () => fade(hub));
  $("#gamesBtn", o).addEventListener("click", () => fade(() => gameList("title")));
}

// 미니게임 바로가기: 학과 탐방 없이 6개 게임 중 하나를 골라 바로 하기 (랭킹도 똑같이 등록됨)
async function gameList(back) {
  $("#exitBtn").hidden = false;
  titleVideo(false);
  hide(); dialog.hidden = true; curCourse = null;
  await setScene(schoolImg(), { x: .5, y: .45 }, true);
  petals(true); ambient(null);
  const list = G.courses.filter(c => c.game && window.MINIGAMES && window.MINIGAMES[c.id]);
  // 카드 사진: GPT 게임 선택 화면 시안(game_selection_v1)에서 잘라 낸 img/mg/sel_{학과}.jpg
  const o = show(`
    <div class="pick-head"><div class="eyebrow">${esc(G.school.name)}</div><h2>어떤 게임을 해볼까?</h2><p>마음에 드는 체험을 선택해 보세요</p></div>
    <div class="pick-grid">${list.map(c => `<button type="button" class="course pick" data-id="${c.id}" style="--accent:${c.color}">
        <span class="thumb" style="background-image:url('img/mg/sel_${c.id}.jpg'), url('${c.game.start || c.image}')"></span>
        <span class="body"><b>${esc(c.game.title)}</b><small>${esc(c.name)}</small><span class="go">게임 시작 ›</span></span></button>`).join("")}</div>
    <div class="hub-foot"><button class="btn" type="button" id="glBack" style="max-width:420px">${back === "hub" ? "↩ 학과 목록으로 돌아가기" : "↩ 처음 화면으로 돌아가기"}</button></div>`, "hub dim games");
  o.querySelectorAll(".course").forEach(b => b.addEventListener("click", async () => {
    await miniGame(list.find(c => c.id === b.dataset.id));
    gameList(back);
  }));
  $("#glBack", o).addEventListener("click", () => fade(back === "hub" ? hub : titleScreen));
}

function pickGuide() {
  dialog.hidden = true;
  return new Promise(res => {
    const card = k => `<button type="button" class="gpick" data-k="${k}" style="--accent:${G.guides[k].color}">
      <span class="ph" style="background-image:url('${G.sprites[k][0]}')"></span>
      <span class="gp-body"><b>${esc(G.guides[k].name)}</b><small>${esc(G.guides[k].name)} 선배와 둘러보기</small></span></button>`;
    const o = show(`<div class="panel" style="max-width:520px;text-align:center"><div class="eyebrow">SELECT YOUR GUIDE</div><h2>누구랑 같이 둘러볼까?</h2>
      <div class="gpicks">${card("sj")}${card("hr")}</div></div>`, "dim");
    o.querySelectorAll(".gpick").forEach(b => b.addEventListener("click", () => { hide(); res(b.dataset.k); }));
    o.querySelector(".gpick").focus();
  });
}

async function intro() {
  $("#exitBtn").hidden = false;
  titleVideo(false);
  await fade(async () => { hide(); petals(true); ambient(null); await setScene(schoolImg(), { x: .5, y: .45 }); sceneEl.classList.add("soft"); showSprite("pair"); });
  await banner("첫 만남", "PROLOGUE");
  // 1) 두 선배가 함께 인사
  await lines(G.intro.pair);
  // 2) 말하는 선배만 등장: 서준 → 하린 → 서준 → 하린
  for (const [who, t] of G.intro.solo) { if (spriteKind !== who) showSprite(who); await say(who, t); }
  // 3) 안내 선배 선택
  const g = await pickGuide();
  prog.guide = g; saveProg();
  showSprite(g);
  await say(...G.intro.pickReply[g]);
  await fade(() => { showSprite(null); return hub(); });
}

async function hub(justDone) {
  $("#exitBtn").hidden = false;
  titleVideo(false);
  hide(); dialog.hidden = true; curCourse = null;
  await setScene(schoolImg(), { x: .5, y: .45 }, true);
  petals(true); ambient(null);
  const n = prog.done.length, total = G.courses.length;
  const line = n === 0 ? G.hubLines.first : n === total ? G.hubLines.done : G.hubLines.middle;
  const o = show(`
    <div class="hub-head"><div><div class="eyebrow">CAMPUS TOUR</div><h2>학과 탐방</h2></div>
      <div class="progress">${n} / ${total} 탐방 완료<div class="bar"><b style="width:${n / total * 100}%"></b></div></div></div>
    <div class="grid">${G.courses.map(c => {
      const done = prog.done.includes(c.id);
      const q = G.quota.find(x => x.dept === c.name);
      return `<button type="button" class="course" data-id="${c.id}" style="--accent:${c.color};--pos:${(c.pos.both * 100).toFixed(0)}%">
        <div class="thumb" style="background-image:url('${c.image}')"></div>
        <div class="body"><div class="row"><b>${esc(c.name)}</b><span class="badge">${q ? `모집 ${q.n}명` : "별도 모집 아님"}</span></div>
        <small>${esc(c.tagline)}</small><span class="pair">${esc(c.m.name)} · ${esc(c.f.name)} 선배</span></div>
        ${done ? `<span class="done-mark">탐방 완료</span>` : ""}</button>`;
    }).join("")}</div>
    <div class="hub-foot">
      <div class="bubble"><b>${esc(G.guides[prog.guide || "hr"].name)}</b>${esc(line)}</div>
      ${n === total ? `<button class="btn primary" type="button" id="finaleBtn" style="max-width:420px">서준·하린 선배에게 돌아가기</button>`
        : `<button class="linkish" type="button" id="finaleBtn">탐방 마무리하고 선배들에게 돌아가기</button>`}
      <button class="linkish" type="button" id="hubGames">🎮 미니게임만 바로 하기</button>
    </div>`, "hub dim");
  o.querySelectorAll(".course").forEach(b => b.addEventListener("click", () => runCourse(G.courses.find(c => c.id === b.dataset.id))));
  $("#finaleBtn", o).addEventListener("click", finale);
  $("#hubGames", o).addEventListener("click", () => fade(() => gameList("hub")));
  if (justDone) o.querySelector(`[data-id="${justDone}"]`)?.scrollIntoView({ block: "nearest" });
}

function courseInfo(c) {
  const q = G.quota.find(x => x.dept === c.name);
  const chips = arr => `<div class="chips">${arr.map(x => `<span>${esc(x)}</span>`).join("")}</div>`;
  return new Promise(res => {
    dialog.hidden = true;
    const o = show(`<div class="panel info" style="--accent:${c.color}">
      <header><div><div class="eyebrow" style="color:#fff">${esc(c.kind === "과정" ? "COURSE" : "DEPARTMENT")}</div><h2>${esc(c.name)}</h2></div></header>
      <p class="slogan">“${esc(c.tagline)}”</p>
      <p>${esc(c.about_text)}</p>
      <div class="facts"><span>학급 수 <b>${esc(c.classes)}</b></span><span>${esc(G.school.year)} 모집정원 <b>${q ? q.n + "명" : "별도 모집 학과 아님"}</b></span></div>
      ${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}
      <h3>${c.kind === "과정" ? "과정 안내" : "특성화 교육과정"}</h3>
      <table class="cur"><tbody>${c.curriculum.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v.map(esc).join(" · ")}</td></tr>`).join("")}</tbody></table>
      <h3>${c.kind === "과정" ? "임관 병과" : "인력양성 유형"}</h3>${chips(c.roles)}
      ${c.certs.length ? `<h3>취득 자격증</h3>${chips(c.certs)}` : ""}
      <h3>${c.kind === "과정" ? "진로와 지원" : "졸업 후 진로"}</h3>
      <table class="cur"><tbody>${c.careers.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>
      <p class="src">출처: ${esc(c.source || "학교 홈페이지 게시 내용 (2026. 10. 9. 확인)")}${c.curriculumSource ? ` · 교육과정: ${esc(c.curriculumSource)}` : ""}</p>
      <div class="btn-row" style="margin:16px auto 0"><button class="btn primary" type="button" id="infoOk">계속하기</button></div>
    </div>`, "dim");
    $("#infoOk", o).addEventListener("click", () => { hide(); res(); });
    $("#infoOk", o).focus({ preventScroll: true }); o.scrollTop = 0; o.querySelector(".panel").scrollTop = 0;  // 카드 맨 위부터 보이게
  });
}

function miniGame(c) {
  const spec = c.game, run = window.MINIGAMES && window.MINIGAMES[c.id];
  if (!spec || !run) return quiz(c);
  dialog.hidden = true; clearTimeout(autoTimer);
  return new Promise(resolve => {
    const o = show(`<div class="panel mg" style="--accent:${c.color}">
      <div class="eyebrow">MINI GAME · ${esc(c.name)}</div><h2>${esc(spec.title)}</h2>
      <p class="mg-how">${esc(spec.how)}</p>
      <div class="mg-hud"><span id="mgL"></span><span id="mgR"></span></div>
      <div class="mg-area" id="mgArea"><div class="mg-ready${spec.start ? " start" : ""}"${spec.start ? ` style="--start:url('${esc(spec.start)}')"` : ""}>시작을 누르면 게임이 시작돼요</div></div>
      <div class="mg-msg" id="mgMsg" hidden></div>
      <div class="btn-row two" id="mgBtns"></div>
    </div>`, "dim mgl");
    const area = $("#mgArea", o), msg = $("#mgMsg", o), btns = $("#mgBtns", o);
    let stop = null;
    const hud = (l, r) => { $("#mgL", o).textContent = l ?? ""; $("#mgR", o).textContent = r ?? ""; };
    const setBtns = arr => {
      btns.innerHTML = arr.map((b, i) => `<button class="btn ${b.primary ? "primary" : "ghost"}" type="button" data-i="${i}">${esc(b.t)}</button>`).join("");
      btns.querySelectorAll("button").forEach(x => x.addEventListener("click", () => arr[+x.dataset.i].fn()));
      btns.querySelector(".primary")?.focus();
    };
    const finish = won => { if (stop) stop(); hide(); resolve(won); };
    const start = () => {
      msg.hidden = true; area.innerHTML = ""; btns.innerHTML = ""; hud("", "");
      let ended = false, t0 = performance.now();
      const end = (won, why, res) => {
        if (ended) return; ended = true;
        if (stop) { stop(); stop = null; }
        msg.hidden = false;
        if (won) {
          msg.className = "mg-msg ok"; msg.innerHTML = `<b>성공!</b> ${esc(spec.win || "")}`;
          // 랭킹: 점수를 준 게임은 점수(높을수록 위), 아니면 걸린 시간(짧을수록 위)
          const rec = res && res.score != null ? { score: res.score, kind: "points", unit: res.unit } : { score: Math.round(performance.now() - t0), kind: "time" };
          rankPanel(msg, c, rec);
          setBtns([{ t: "다시 도전", fn: start }, { t: "계속하기", primary: 1, fn: () => finish(true) }]);
        } else {
          const [w, h] = spec.hint;
          msg.className = "mg-msg hint"; msg.innerHTML = `${why ? `<span class="why">${esc(why)}</span>` : ""}<b>${esc(c[w].name)}</b>${esc(h)}`;
          setBtns([{ t: "그만하기", fn: () => finish(false) }, { t: "다시 도전", primary: 1, fn: start }]);
        }
      };
      stop = run(area, { hud, win: res => end(true, null, res), lose: why => end(false, why) });
    };
    setBtns([{ t: "건너뛰기", fn: () => finish(false) }, { t: "시작", primary: 1, fn: start }]);
  });
}

// ---------- 미니게임 랭킹 (신청서와 같은 구글 Apps Script → 구글 시트 "랭킹" 탭, apps-script/Code.gs) ----------
const fmtScore = (kind, v, unit = "점") => kind === "points" ? `${Number(v).toLocaleString()}${unit}` : `${(v / 1000).toFixed(1)}초`;
// 사람이 몰려서 잠깐 실패하면(연결 오류·busy) 조금씩 간격을 늘려 최대 5번 더 보내 봄 (모두 합쳐 30초쯤)
async function rankCall(opt, game) {
  const ep = G.rankEndpoint || G.formEndpoint;
  if (!ep) throw new Error("no-endpoint");
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(opt ? ep : `${ep}?rank=${encodeURIComponent(game)}`, opt ? { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ rank: "submit", ...opt }) } : {});
      const d = await r.json();
      if (d.error === "busy") throw new Error("busy");
      if (d.error) { const x = new Error(d.error); x.final = true; throw x; }
      return d;
    } catch (err) {
      if (err.final || i >= 5) throw err;
      await new Promise(res => setTimeout(res, [1000, 2000, 3500, 5000, 7000][i] + Math.random() * 1500));  // 동시에 다시 몰리지 않게 조금씩 다르게
      // 등록은 됐는데 응답만 깨졌을 수 있으니, 다시 보내기 전에 이미 올라가 있는지 확인 (같은 기록이 두 번 올라가지 않게)
      if (opt && err.message !== "busy") {
        try {
          const d = await (await fetch(`${ep}?rank=${encodeURIComponent(opt.game)}&t=${Date.now()}`)).json();
          const k = (d.top || []).findIndex(e => e.name === opt.name && e.score === opt.score);
          if (k >= 0) return { ...d, rank: k + 1 };
        } catch (e) { /* 확인도 안 되면 그냥 다시 보냄 */ }
      }
    }
  }
}
function rankPanel(box, c, rec) {
  let saved = ""; try { saved = localStorage.getItem("dush-nick") || ""; } catch (e) {}
  box.insertAdjacentHTML("beforeend", `<div class="rank">
    <div class="rank-me">내 기록 <b>${fmtScore(rec.kind, rec.score, rec.unit)}</b></div>
    <form class="rank-form" novalidate>
      <input type="text" maxlength="10" placeholder="닉네임 (실명 말고)" aria-label="랭킹에 올릴 닉네임" value="${esc(saved)}" autocomplete="nickname">
      <button class="btn primary" type="submit">랭킹 등록</button>
    </form>
    <div class="rank-note">닉네임과 기록만 저장되고, 이 게임을 하는 모든 사람에게 보여요.</div>
    <div class="rank-list"><div class="rank-wait">랭킹 불러오는 중…</div></div>
  </div>`);
  const form = box.querySelector(".rank-form"), input = form.querySelector("input"), list = box.querySelector(".rank-list"), note = box.querySelector(".rank-note");
  const draw = (d, myRank) => {
    list.innerHTML = `<h4>${esc(c.game.title)} TOP 10</h4>` + (d.top.length
      ? `<ol>${d.top.map((e, i) => `<li class="${i + 1 === myRank ? "me" : ""}"><span class="no">${i + 1}</span><span class="nm">${esc(e.name)}</span><span class="sc">${fmtScore(d.kind, e.score, c.game.unit)}</span></li>`).join("")}</ol>`
      : `<div class="rank-wait">아직 기록이 없어요. 첫 번째 주인공이 되어 봐!</div>`);
  };
  const fail = () => { list.innerHTML = `<div class="rank-wait">랭킹 서버에 연결하지 못했어요. 잠시 뒤 다시 눌러 주세요.</div>`; };
  rankCall(null, c.id).then(d => draw(d)).catch(fail);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = input.value.replace(/\s+/g, " ").trim();
    if (!name) { input.focus(); note.textContent = "닉네임을 적어 주세요."; return; }
    try { localStorage.setItem("dush-nick", name); } catch (e) {}
    form.querySelector("button").disabled = true; input.disabled = true; note.textContent = "등록하는 중… 잠시만요.";
    try {
      const d = await rankCall({ game: c.id, name, score: rec.score });
      draw(d, d.rank);
      note.textContent = d.rank <= 10 ? `${d.rank}등으로 등록했어요!` : `등록했어요! 지금 ${d.rank}등이에요.`;
      form.hidden = true;
    } catch (err) { fail(); note.textContent = "등록하지 못했어요. 다시 눌러 주세요."; form.querySelector("button").disabled = false; input.disabled = false; }
  });
}

async function quiz(c) {
  for (let qi = 0; qi < c.quiz.length; qi++) {
    const q = c.quiz[qi];
    dialog.hidden = true;
    await new Promise(res => {
      const o = show(`<div class="panel quiz">
        <div class="qnum">QUIZ ${qi + 1} / ${c.quiz.length}</div><h2>${esc(q.q)}</h2>
        <div class="opts">${q.options.map((t, i) => `<button class="btn" type="button" data-i="${i}">${esc(t)}</button>`).join("")}</div>
        <div class="hint" id="hint" hidden></div></div>`, "dim");
      o.querySelectorAll(".opts button").forEach(b => b.addEventListener("click", async () => {
        const i = +b.dataset.i;
        if (i === q.answer) {
          b.classList.add("right");
          o.querySelectorAll(".opts button").forEach(x => { x.disabled = true; });
          const h = $("#hint", o); h.hidden = false;
          h.innerHTML = `<b>${esc(c[q.hint[0]].name)}</b>정답이야!`;
          await wait(900); hide(); res();
        } else {
          b.classList.add("wrong"); b.disabled = true;
          const h = $("#hint", o); h.hidden = false;
          h.innerHTML = `<b>${esc(c[q.hint[0]].name)}</b>${esc(q.hint[1])} 다시 골라 봐!`;
        }
      }));
    });
  }
}

// 실습 그림 4칸 중 눌러서 세부 내용 보기 ("다음으로"를 누르면 끝)
const PANEL_RECTS = { tl: [1.5, 18, 48.5, 31], tr: [51, 18, 47.5, 31], bl: [1.5, 52, 48.5, 34], br: [51, 52, 47.5, 34] };
function explorePanels(c) {
  dialog.hidden = true; clearTimeout(autoTimer);
  return new Promise(res => {
    const P = c.practice, RECTS = c.panelRects || PANEL_RECTS;
    const list = arr => `<ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const grid = () => show(`<div class="panel explore" style="--accent:${c.color}">
        <div class="eyebrow">${esc(c.name)} · 주요 실습</div><h2>궁금한 장면을 눌러 보세요</h2>
        <div class="xp-map"><img src="${esc(c.practiceImage)}" alt="${esc(c.name)} 실습 장면 4가지">
          ${P.panels.map((pn, i) => { const r = RECTS[pn.zone]; return `<button type="button" class="xp-hot" data-i="${i}" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%"><span>${esc(pn.label)}</span></button>`; }).join("")}
        </div>
        <div class="xp-chips">${P.panels.map((pn, i) => `<button type="button" class="xp-chip" data-i="${i}">${esc(pn.label)}</button>`).join("")}</div>
        <div class="btn-row" style="margin:14px auto 0"><button class="btn primary" type="button" id="xpNext">다음으로</button></div>
      </div>`, "dim");
    const open = i => {
      const pn = P.panels[i], d = pn.detail;
      const o = show(`<div class="panel info xp-detail" style="--accent:${c.color}">
        <header><div><div class="eyebrow" style="color:#fff">${esc(c.name)}</div><h2>${esc(pn.label)}</h2></div></header>
        ${pn.scene ? `<img class="xp-scene" src="${esc(pn.scene)}" alt="${esc(pn.label)} 장면">`
          : `<div class="xp-crop" style="--x:${RECTS[pn.zone][0]};--y:${RECTS[pn.zone][1]};--w:${RECTS[pn.zone][2]};--h:${RECTS[pn.zone][3]};background-image:url('${esc(c.practiceImage)}')"></div>`}
        <p>${pn.lines.map(l => esc(l[1])).join(" ")}</p>
        <h3>이렇게 배워요</h3>${list(d.learn)}
        ${d.certs.length ? `<h3>관련 자격증</h3><div class="chips">${d.certs.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
        <h3>${c.kind === "과정" ? "임관과 진로" : "이어지는 진로"}</h3>${list(d.career)}
        <p class="src">출처: ${esc(c.source || "학교 홈페이지 게시 내용 (2026. 10. 9. 확인)")}${c.curriculumSource ? ` · 교육과정: ${esc(c.curriculumSource)}` : ""}</p>
        <div class="btn-row two" style="margin:14px auto 0"><button class="btn ghost" type="button" id="xpBack">다른 장면 보기</button><button class="btn primary" type="button" id="xpDone">다음으로</button></div>
      </div>`, "dim");
      $("#xpBack", o).addEventListener("click", draw);
      $("#xpDone", o).addEventListener("click", () => { hide(); res(); });
      $("#xpBack", o).focus({ preventScroll: true }); o.scrollTop = 0; o.querySelector(".panel").scrollTop = 0;
    };
    const draw = () => {
      const o = grid();
      o.querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => open(+b.dataset.i)));
      $("#xpNext", o).addEventListener("click", () => { hide(); res(); });
    };
    draw();
  });
}

async function runCourse(c) {
  curCourse = c;
  // 말하는 사람에 맞춰 그림을 바꿈: 선배 대사 → 그 선배 한 명, 내레이션 → 배경
  const solo = (who, t) => { showSprite(who === "m" || who === "f" ? who : "bg"); return say(who, t); };
  const soloLines = async arr => { for (const [who, t] of arr) await solo(who, t); };
  // 1) 학과에 들어가면 실습실 배경부터 보여 주고, 말하는 선배가 한 명씩 등장
  await fade(async () => { hide(); petals(false); ambient(c.fx); await setScene(c.sprites.bg, { x: .5, y: .5 }); sceneEl.classList.add("light"); showSprite("bg"); });
  await banner(c.name, "첫 만남", c.color);
  await soloLines(c.meet);
  // 2) 학과 소개: 말하는 선배만
  await banner(c.name, c.kind === "과정" ? "과정 소개" : "학과 소개", c.color);
  await soloLines(c.about);
  await courseInfo(c);
  // 3) 주요 실습 1·2: 말하는 선배만
  // 3) 주요 실습: 4장면 전체 → 장면별 자세한 설명 → 원하는 장면을 눌러 세부 내용 보기
  const P = c.practice;
  if (c.practiceImage && P) {
    await fade(async () => { showSprite(null); cgMode = true; await setScene(c.practiceImage, ZONES.full); });
    await banner(c.kind === "과정" ? "과정 한눈에 보기" : "실습 한눈에 보기", "주요 실습", c.color);
    for (const [who, t] of P.intro) await say(who, t, ZONES.full);
    for (const pn of P.panels) {
      if (pn.scene) {
        // 장면 그림이 따로 있으면: 그 선배 그림을 크게, 뒤는 같은 그림을 흐리게
        // 대사에 그림을 따로 적었으면([말하는 사람, 대사, 그림]) 그 대사에서 그림을 바꿈
        let shown = null;
        for (const [who, t, pic] of pn.lines) {
          const im = pic || pn.scene;
          if (im !== shown) { shown = im; await fade(async () => { await setScene(im, { x: .5, y: .5 }); sceneEl.classList.add("light"); showSprite("scene:" + im); }); }
          await say(who, t);
        }
      } else for (const [who, t] of pn.lines) await say(who, t, zoneShot(pn.zone));
    }
    if (P.panels.some(pn => pn.scene)) await fade(async () => { showSprite(null); await setScene(c.practiceImage, ZONES.full); });
    await say(P.intro[0][0], G.practiceExplore, ZONES.full);
    await explorePanels(c);
    if (P.outro) await say(P.outro[0], P.outro[1], ZONES.full);
    await fade(async () => { cgMode = false; await setScene(c.sprites.bg, { x: .5, y: .5 }); sceneEl.classList.add("light"); showSprite(G.gameAsk[0]); });
  }
  // 4) 게임 참여 여부
  await solo(...G.gameAsk);
  const pick = await choose(["게임하기", "소개만 보고 건너뛰기"]);
  if (pick === 0) { const won = await miniGame(c); await solo(...(won ? G.gameDone : G.gameSkip)); }
  else await solo(...G.gameSkip);
  // 5) 마지막 인사: 다시 함께
  showSprite("pair");
  await lines(c.bye);
  if (!prog.done.includes(c.id)) prog.done.push(c.id);
  saveProg();
  await fade(() => { showSprite(null); cgMode = false; curCourse = null; return hub(c.id); });
}

async function finale() {
  const F = G.finale;
  // 고른 안내 선배가 먼저 말하도록 서준·하린 순서를 바꿈
  const sw = l => prog.guide === "hr" ? [l[0] === "sj" ? "hr" : l[0] === "hr" ? "sj" : l[0], ...l.slice(1)] : l;
  const say2 = l => say(...sw(l));
  await fade(async () => { hide(); curCourse = null; petals(false); ambient("dust"); await setScene(G.images.guides.src, { x: .48, y: .4 }); });
  await banner("다시 만난 선배들", "EPILOGUE");
  await say2(F.q1.line);
  const a = await choose(F.q1.options.map(o => o.t));
  await say2(F.q1.options[a].reply);
  await say2(F.q2);
  const opts = [...G.admissionDepts, "아직 고민 중이야"];
  const d = await choose(opts);
  if (d < G.admissionDepts.length) { prefillDept = G.admissionDepts[d]; extra.dept = prefillDept; await say2(F.q2Reply); }
  else { prefillDept = ""; await say2(F.q2Undecided); }
  await say2(F.q3);
  await say2(F.q3b);
  dialog.hidden = true;
  openForm(prefillDept, () => fade(groupScreen));
}

let groupPan = null;
async function groupScreen() {
  hide(); dialog.hidden = true; curCourse = null;
  await setScene(G.images.finale, { x: .5, y: .4 });
  petals(true); ambient("sparkle");
  // 단체 그림을 천천히 왼쪽·오른쪽으로 훑어봄
  clearInterval(groupPan);
  let side = 0;
  groupPan = setInterval(() => {
    if (!$("#gRestart")) return clearInterval(groupPan);
    if (prog.motion) shot([{ x: .2, y: .4, z: 1.2 }, { x: .5, y: .4, z: 1 }, { x: .8, y: .4, z: 1.2 }, { x: .5, y: .4, z: 1 }][side++ % 4]);
  }, 5000);
  const o = show(`<div class="panel"><div class="eyebrow">THANK YOU FOR VISITING</div><h2>${esc(G.finale.groupLine)}</h2>
    <p>${esc(G.school.name)} 선배 14명이 기다리고 있을게.</p>
    <div class="btn-row" style="margin:0 auto"><button class="btn primary" type="button" id="gApply">신청서 작성</button>
    <button class="btn" type="button" id="gInfo">입학전형 일정 보기</button>
    <button class="btn ghost" type="button" id="gRestart">처음부터 다시 시작</button></div></div>`, "finale");
  $("#gApply", o).addEventListener("click", () => openForm());
  $("#gInfo", o).addEventListener("click", admissionInfo);
  $("#gRestart", o).addEventListener("click", () => fade(() => { prog.done = []; prog.guide = null; prefillDept = ""; log = []; saveProg(); return titleScreen(); }));
}

$("#motionBtn").addEventListener("click", () => setMotion(!prog.motion));
// 나가기: 진행 중인 장면·게임을 멈추고 학과 목록이나 처음 화면으로 (다 본 학과는 그대로 저장됨)
$("#exitBtn").addEventListener("click", () => {
  const m = openModal(`<div class="panel exit-panel">
    <h2>탐방에서 나갈까요?</h2>
    <p>지금 보던 장면이나 게임은 멈춰요. 다 둘러본 학과는 그대로 남아 있어요.</p>
    <div class="btn-row">
      ${prog.guide ? `<button class="btn primary" type="button" id="exHub">학과 목록으로</button>` : ""}
      <button class="btn${prog.guide ? "" : " primary"}" type="button" id="exTitle">처음 화면으로</button>
      <button class="btn ghost" type="button" data-close>계속 보기</button>
    </div></div>`);
  const go = hash => { location.hash = hash; location.reload(); };
  $("#exHub", m)?.addEventListener("click", () => go("hub"));
  $("#exTitle", m).addEventListener("click", () => go(""));
  (m.querySelector(".btn.primary") || m.querySelector("button")).focus();
});
setMotion(prog.motion);
// 나가기로 '학과 목록으로'를 고른 경우: 바로 학과 목록부터
if (location.hash === "#hub" && prog.guide) { history.replaceState(null, "", location.pathname); hub(); }
else { if (location.hash) history.replaceState(null, "", location.pathname); titleScreen(); }
})();
