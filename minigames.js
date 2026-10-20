/*
 * 학과별 미니게임 (터치·마우스·키보드 모두 가능)
 * 각 게임: run(area, api) → 정리 함수
 *   api.hud(왼쪽 글, 오른쪽 글)  api.win()  api.lose(이유)
 *   api.win({ score, unit }) 처럼 점수를 넘기면 점수가 높은 순으로, 안 넘기면 걸린 시간이 짧은 순으로 랭킹에 올라감
 * 제목·설명·힌트 문구는 data.js 각 학과의 game 에 있습니다.
 */
(function () {
  const rand = (a, b) => a + Math.random() * (b - a);
  const MG = "img/mg/";  // GPT가 만든 미니게임 그림 (DUSH_GPT/img/minigame_graphics_v1 에서 잘라 냄)
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function loop(fn) {
    let raf, last = performance.now(), on = true;
    const t = now => { if (!on) return; const dt = Math.min(.05, (now - last) / 1000); last = now; fn(dt, now); if (on) raf = requestAnimationFrame(t); };
    raf = requestAnimationFrame(t);
    return () => { on = false; cancelAnimationFrame(raf); };
  }

  /* 파티시에과: 케이크 타이쿤 — 손님 주문(시트·크림·토핑)대로 케이크를 만들어 팔기 (매출이 높을수록 좋음) */
  function patissier(area, api) {
    const ac = new AbortController(), GOAL = 45, PRICE = 1000;
    const PARTS = {
      sheet: [["choco", "초코 시트", "#6b3f2a"], ["vanilla", "바닐라 시트", "#f1d29a"]],
      cream: [["fresh", "생크림", "#fffaf2"], ["berry", "딸기 크림", "#f6a9bf"]],
      top: [["straw", "딸기", "#e8344e"], ["blue", "블루베리", "#4a5bd1"], ["chocochip", "초콜릿", "#3b2216"]],
    };
    // 재료 그림(GPT): img/mg/cake_{재료}.webp — 시트 위에 크림, 크림 위 가운데에 토핑을 겹쳐 그림
    const pic = (cls, k) => k ? `<img class="${cls}" src="${MG}cake_${k}.webp" data-k="${k}" alt="" draggable="false">` : "";
    const layers = o => pic("sh", o.sheet) + pic("cr", o.cream) + pic("tp", o.top);
    const mini = o => `<span class="mg-cake mini">${layers(o)}</span>`;
    area.innerHTML = `<div class="mg-shop"><div class="mg-guests"></div>
      <div class="mg-counter"><div class="mg-plate2"><span class="mg-cake big"></span></div><div class="mg-pop" aria-live="polite"></div></div>
      <div class="mg-bins">${Object.entries(PARTS).map(([cat, list]) => `<div class="row">${list.map(([k, label, c]) => `<button type="button" class="bin" data-cat="${cat}" data-k="${k}"><img src="${MG}cake_${k}.webp" alt="" draggable="false">${label}</button>`).join("")}</div>`).join("")}</div></div>`;
    const guestsEl = area.querySelector(".mg-guests"), cakeEl = area.querySelector(".mg-cake.big"), pop = area.querySelector(".mg-pop");
    let t = 0, sales = 0, served = 0, lives = 3, nextIn = .2, guests = [], cur = {}, gid = 0;
    const hud = () => api.hud(`매출 ${sales.toLocaleString()}원 · ${served}개`, `${"♥".repeat(lives)}${"♡".repeat(3 - lives)} · ${Math.max(0, Math.ceil(GOAL - t))}초`);
    const say = (txt, good) => { pop.textContent = txt; pop.className = "mg-pop show " + (good ? "good" : "bad"); clearTimeout(pop.t); pop.t = setTimeout(() => pop.className = "mg-pop", 900); };
    const pick = list => list[Math.floor(Math.random() * list.length)][0];
    const drawCake = () => { cakeEl.innerHTML = layers(cur); };
    const addGuest = () => {
      const o = { sheet: pick(PARTS.sheet), cream: pick(PARTS.cream), top: pick(PARTS.top) }, life = Math.max(8, 13 - t * .11);
      const d = document.createElement("div"); d.className = "mg-guest";
      d.innerHTML = `<div class="bubble">${mini(o)}</div><div class="face">${["🙂", "😀", "😊", "🤗"][gid++ % 4]}</div><div class="bar"><b></b></div>`;
      guestsEl.appendChild(d); guests.push({ o, d, life, left: life });
    };
    const lose1 = why => { lives--; say(why, false); if (lives <= 0) { api.lose(why === "손님이 기다리다 갔어요" ? "기다리다 떠난 손님이 세 명이에요." : "주문과 다른 케이크를 세 번 만들었어요."); return true; } return false; };
    const tap = (cat, k) => {
      cur[cat] = k; drawCake();
      if (!cur.sheet || !cur.cream || !cur.top) return;
      const i = guests.findIndex(g => g.o.sheet === cur.sheet && g.o.cream === cur.cream && g.o.top === cur.top);
      const done = cur; cur = {}; setTimeout(drawCake, 180);
      if (i < 0) { cakeEl.classList.add("toss"); setTimeout(() => cakeEl.classList.remove("toss"), 300); lose1("주문이랑 달라요!"); return; }
      const g = guests.splice(i, 1)[0], tip = Math.round(500 * g.left / g.life / 100) * 100;
      sales += PRICE + tip; served++; g.d.classList.add("happy"); setTimeout(() => g.d.remove(), 350);
      say(tip ? `+${(PRICE + tip).toLocaleString()}원 (빨리 줘서 팁 ${tip}원!)` : `+${PRICE.toLocaleString()}원`, true);
      hud(); void done;
    };
    area.querySelectorAll(".bin").forEach(btn => btn.addEventListener("pointerdown", e => { e.preventDefault(); tap(btn.dataset.cat, btn.dataset.k); }, { signal: ac.signal }));
    // 키보드: 1·2 시트, 3·4 크림, 5·6·7 토핑
    const keys = [["sheet", "choco"], ["sheet", "vanilla"], ["cream", "fresh"], ["cream", "berry"], ["top", "straw"], ["top", "blue"], ["top", "chocochip"]];
    document.addEventListener("keydown", e => { const k = keys[+e.key - 1]; if (k) { e.preventDefault(); tap(...k); } }, { signal: ac.signal });
    hud();
    const stop = loop(dt => {
      t += dt;
      if ((nextIn -= dt) <= 0 && guests.length < 3) { addGuest(); nextIn = Math.max(2.2, 4.2 - t * .05); }
      for (const g of guests.slice()) {
        g.left -= dt; g.d.querySelector(".bar b").style.width = Math.max(0, g.left / g.life * 100) + "%";
        if (g.left <= 0) { guests.splice(guests.indexOf(g), 1); g.d.classList.add("gone"); setTimeout(() => g.d.remove(), 350); if (lose1("손님이 기다리다 갔어요")) return; }
      }
      hud();
      if (t >= GOAL) api.win({ score: sales, unit: "원" });
    });
    return () => { stop(); ac.abort(); clearTimeout(pop.t); };
  }

  /* 모빌리티과: 도로 주행 테스트 — 정비한 차로 3차선을 달리며 장애물 피하기 (점수가 높을수록 좋음) */
  function mobility(area, api) {
    const ac = new AbortController(), W = area.clientWidth, H = area.clientHeight, GOAL = 30;
    // 도로 그림(GPT)의 세 차선 가운데 위치 (그림 너비 기준 비율)
    const LC = [.225, .496, .77].map(f => f * W), LW = .272 * W;
    area.innerHTML = `<div class="mg-road"></div><img class="mg-car" src="${MG}mobility_player_car.webp" alt="" draggable="false">`;
    const road = area.querySelector(".mg-road"), car = area.querySelector(".mg-car");
    const CW = Math.min(46, LW * .5), CH = CW * 260 / 129, carY = H - CH - 14;
    Object.assign(car.style, { width: CW + "px", height: CH + "px", top: carY + "px" });
    let lane = 1, carX = LC[1], lives = 3, t = 0, pts = 0, speed = 240, spawnIn = .6, hurt = 0, things = [];
    const hud = () => api.hud(`점수 ${Math.floor(pts).toLocaleString()}`, `${"♥".repeat(lives)}${"♡".repeat(3 - lives)} · ${Math.max(0, Math.ceil(GOAL - t))}초`);
    const SPR = { cone: ["mobility_cone", 264 / 260], hole: ["mobility_pothole", 266 / 260], car: ["mobility_red_car", 142 / 260], bonus: ["mobility_wrench", 221 / 260] };
    const add = (kind, ln) => {
      const d = document.createElement("img"); d.className = "mg-ob " + kind; d.alt = ""; d.draggable = false;
      d.src = MG + SPR[kind][0] + ".webp";
      const w = kind === "bonus" ? 32 : kind === "cone" ? Math.min(40, LW * .45) : kind === "hole" ? LW * .62 : CW;
      const h = w / SPR[kind][1];
      Object.assign(d.style, { width: w + "px", height: h + "px", left: (LC[ln] - w / 2) + "px", top: -h + "px" });
      area.appendChild(d); things.push({ d, kind, ln, y: -h, h, w });
    };
    const spawn = () => {
      const lanes = shuffle([0, 1, 2]), n = t > 12 && Math.random() < .45 ? 2 : 1;  // 한 줄은 항상 비워 둠
      const kinds = ["cone", "hole", "car"];
      for (let i = 0; i < n; i++) add(kinds[Math.floor(Math.random() * kinds.length)], lanes[i]);
      if (Math.random() < .35) add("bonus", lanes[2]);
    };
    const move = d => { lane = Math.max(0, Math.min(2, lane + d)); };
    hud();
    const stop = loop(dt => {
      t += dt; speed = (230 + t * 10) * H / 380; pts += (230 + t * 10) * dt / 10;  // 화면 높이에 맞춘 속도 (휴대폰·컴퓨터 같은 난이도)
      carX += (LC[lane] - carX) * Math.min(1, dt * 16);
      car.style.left = (carX - CW / 2) + "px";
      road.style.backgroundPositionY = (t * speed) % (W * 1366 / 1024) + "px";  // 도로 그림(원본+위아래 뒤집은 것, 이음새 없음) 높이만큼 반복
      if ((spawnIn -= dt) <= 0) { spawn(); spawnIn = Math.max(.5, .95 - t * .016); }
      if (hurt > 0) { hurt -= dt; car.classList.toggle("hurt", Math.floor(hurt * 10) % 2 === 0); } else car.classList.remove("hurt");
      for (const o of things) {
        o.y += speed * dt; o.d.style.top = o.y + "px";
        const hit = Math.abs(LC[o.ln] - carX) < (o.w + CW) / 2 - 4 && o.y + o.h > carY + 6 && o.y < carY + CH - 6;  // 눈에 보이는 크기끼리 겹칠 때만
        if (hit && !o.gone) {
          if (o.kind === "bonus") { o.gone = 1; pts += 100; o.d.classList.add("got"); api.hud(`점수 ${Math.floor(pts).toLocaleString()}`, "렌치 +100!"); continue; }
          if (hurt <= 0) {
            o.gone = 1; o.d.classList.add("crash"); lives--; hurt = 1.1;
            if (lives <= 0) return api.lose("장애물에 세 번 부딪혔어요.");
          }
        }
      }
      things = things.filter(o => { if (o.y > H + 40) { o.d.remove(); return false; } return true; });
      hud();
      if (t >= GOAL) api.win({ score: Math.floor(pts), unit: "점" });
    });
    let sx = null;
    area.addEventListener("pointerdown", e => { e.preventDefault(); sx = e.clientX; }, { signal: ac.signal });
    area.addEventListener("pointerup", e => {
      if (sx == null) return;
      const dx = e.clientX - sx, r = area.getBoundingClientRect(); sx = null;
      if (Math.abs(dx) > 24) move(dx > 0 ? 1 : -1);            // 밀어서 바꾸기
      else move(e.clientX - r.left < r.width / 2 ? -1 : 1);   // 왼쪽·오른쪽 탭
    }, { signal: ac.signal });
    document.addEventListener("keydown", e => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) { e.preventDefault(); move(-1); }
      if (["ArrowRight", "d", "D"].includes(e.key)) { e.preventDefault(); move(1); }
    }, { signal: ac.signal });
    return () => { stop(); ac.abort(); };
  }

  /* 전기배터리과: BMS 충전 관리 — 셀 4개가 충전되는 동안 초록 구간(80~95%)에서 탭해 충전 완료 (점수가 높을수록 좋음) */
  function battery(area, api) {
    const ac = new AbortController(), GOAL = 40, N = 4;
    area.innerHTML = `<div class="mg-bms"><div class="bms-cells">${Array.from({ length: N }, (_, i) =>
      `<button type="button" class="cell" data-i="${i}" aria-label="배터리 셀 ${i + 1}"><i class="cap"></i><span class="body"><b class="band"></b><b class="fill"></b><em class="pct">0%</em></span><small>셀 ${i + 1}</small></button>`).join("")}</div>
      <div class="bms-log" aria-live="polite">초록 구간에서 탭!</div></div>`;
    const els = [...area.querySelectorAll(".cell")], log = area.querySelector(".bms-log");
    let t = 0, pts = 0, done = 0, over = 0, ended = false;
    const cells = els.map(() => ({ lv: rand(0, 30), rate: rand(14, 24), cool: 0 }));
    const hud = () => api.hud(`점수 ${pts.toLocaleString()} · 완료 ${done}`, `${"⚠".repeat(over)}${"·".repeat(3 - over)} · ${Math.max(0, Math.ceil(GOAL - t))}초`);
    const say = (txt, good) => { log.textContent = txt; log.className = "bms-log " + (good ? "good" : "bad"); };
    const reset = c => { c.lv = rand(0, 12); c.rate = rand(14, 24) + t * .35; c.cool = .35; };  // 시간이 갈수록 빨라짐
    const draw = () => cells.forEach((c, i) => {
      const e = els[i], v = Math.min(100, c.lv);
      e.querySelector(".fill").style.height = v + "%";
      e.querySelector(".pct").textContent = Math.floor(v) + "%";
      e.classList.toggle("ready", v >= 80 && v <= 95); e.classList.toggle("hot", v > 95);
    });
    const tap = i => {
      if (ended) return;
      const c = cells[i], v = c.lv, e = els[i];
      if (c.cool > 0) return;
      if (v < 80) { say(`셀 ${i + 1}: 아직 ${Math.floor(v)}%야. 조금 더!`, false); e.classList.remove("nope"); void e.offsetWidth; e.classList.add("nope"); return; }
      const perfect = v >= 88 && v <= 95, gain = perfect ? 150 : 100;
      pts += gain; done++; say(`셀 ${i + 1}: ${perfect ? "딱 좋아! +150" : "충전 완료 +100"}`, true);
      e.classList.add("ok"); setTimeout(() => e.classList.remove("ok"), 300);
      reset(c); hud();
    };
    els.forEach((e, i) => e.addEventListener("pointerdown", ev => { ev.preventDefault(); tap(i); }, { signal: ac.signal }));
    document.addEventListener("keydown", ev => { const k = +ev.key - 1; if (k >= 0 && k < N) { ev.preventDefault(); tap(k); } }, { signal: ac.signal });
    hud(); draw();
    const stop = loop(dt => {
      if (ended) return;
      t += dt;
      for (let i = 0; i < N; i++) {
        const c = cells[i];
        if (c.cool > 0) { c.cool -= dt; continue; }
        c.lv += c.rate * dt;
        if (c.lv >= 100) {  // 과충전
          over++; say(`셀 ${i + 1} 과충전! 다음엔 더 빨리 눌러.`, false);
          els[i].classList.add("boom"); setTimeout(() => els[i].classList.remove("boom"), 400);
          reset(cells[i]);
          if (over >= 3) { ended = true; hud(); return api.lose("셀이 세 번 과충전됐어요."); }
        }
      }
      draw(); hud();
      if (t >= GOAL) { ended = true; api.win({ score: pts, unit: "점" }); }
    });
    return () => { stop(); ac.abort(); };
  }

  /* 건축리모델링과: 금 간 타일 교체 — 금이 간 타일을 빨리 탭 */
  function remodel(area, api) {
    const ac = new AbortController(), GOAL = 10;
    area.innerHTML = `<div class="mg-tiles">${Array.from({ length: 16 }, (_, i) => `<button type="button" class="tile" data-i="${i}" aria-label="타일 ${i + 1}"></button>`).join("")}</div>`;
    // 타일 그림 비율(292:200)을 지키면서 4×4가 영역 안에 들어오는 크기
    const cw = Math.floor(Math.min((area.clientWidth - 48) / 4, (area.clientHeight - 48) / 4 * 292 / 200));
    area.querySelector(".mg-tiles").style.gridTemplateColumns = `repeat(4, ${cw}px)`;
    const tiles = [...area.querySelectorAll(".tile")], born = new Array(16).fill(0);
    let fixed = 0, miss = 0, clock = 0, next = .4, gap = .85, ended = false;
    const hud = () => api.hud(`교체 ${fixed}/${GOAL}`, `놓침 ${miss}/3`);
    hud();
    tiles.forEach((t, i) => t.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (ended || !t.classList.contains("crack")) return;
      t.classList.remove("crack"); t.classList.add("fixed"); born[i] = 0;
      setTimeout(() => t.classList.remove("fixed"), 300);
      fixed++; hud();
      if (fixed >= GOAL) { ended = true; api.win(); }
    }, { signal: ac.signal }));
    const stop = loop(dt => {
      if (ended) return;
      clock += dt;
      if (clock >= next) {
        const free = tiles.map((t, i) => i).filter(i => !born[i] && !tiles[i].classList.contains("broken"));
        if (free.length) { const i = free[Math.floor(Math.random() * free.length)]; born[i] = clock; tiles[i].classList.add("crack"); }
        gap = Math.max(.5, gap - .02); next = clock + gap;
      }
      born.forEach((b, i) => {
        if (b && clock - b > 2.4) {
          born[i] = 0; tiles[i].classList.remove("crack"); tiles[i].classList.add("broken");
          setTimeout(() => tiles[i].classList.remove("broken"), 500);
          miss++; hud();
          if (miss >= 3 && !ended) { ended = true; api.lose("금 간 타일을 너무 오래 두었어요."); }
        }
      });
    });
    return () => { stop(); ac.abort(); };
  }

  /* 드론지형정보과: 드론 측량 비행 — 누르고 있으면 상승, 떼면 하강. 송전탑·새를 피해 날다가 착륙장에 천천히 내려앉기 (점수가 높을수록 좋음) */
  function drone(area, api) {
    const ac = new AbortController(), W = area.clientWidth, H = area.clientHeight, S = H / 380, FLY = 30;
    const GROUND = H * .9, DX = W * .26, DW = 64, DH = DW * 200 / 427;  // 땅 높이, 드론 x 위치와 크기
    area.innerHTML = `<div class="mg-fly"></div><div class="mg-pad" hidden><b>H</b></div>
      <div class="mg-drone fly"><img src="${MG}drone_drone.webp" alt="" draggable="false"></div><div class="mg-vs" hidden></div>`;
    const bg = area.querySelector(".mg-fly"), dr = area.querySelector(".mg-drone"), pad = area.querySelector(".mg-pad"), vs = area.querySelector(".mg-vs");
    dr.style.width = DW + "px"; dr.style.left = DX - DW / 2 + "px";
    let t = 0, y = H * .4, vy = 0, up = false, lives = 3, pts = 0, hurt = 0, spawnIn = 1.2, scroll = 0, speed = 150 * S, things = [], ended = false;
    let landing = false, padX = 0, markIn = -1;
    const PADW = Math.max(90, W * .24), SAFE = 95 * S;  // 착륙장 너비, 안전하게 내려앉는 속도
    const hud = () => api.hud(`점수 ${pts.toLocaleString()}`, `${"♥".repeat(lives)}${"♡".repeat(3 - lives)} · ${landing ? "착륙!" : `착륙까지 ${Math.max(0, Math.ceil(FLY - t))}초`}`);
    const add = kind => {
      const d = document.createElement("div"), o = { d, kind, x: W + 40 };
      if (kind === "pylon") {
        o.h = rand(.32, .56) * H; o.w = o.h * 217 / 600; o.top = GROUND - o.h;  // 송전탑 그림(선생님 제공) 비율대로
        d.className = "mg-pylon"; d.innerHTML = `<img src="${MG}drone_pylon.webp" alt="" draggable="false">`; Object.assign(d.style, { width: o.w + "px", height: o.h + "px", top: o.top + "px" });
      } else {
        o.w = kind === "bird" ? 44 : 30; o.h = kind === "bird" ? 24 : 35; o.base = rand(H * .12, GROUND - H * .35); o.ph = rand(0, 6);
        d.className = kind === "bird" ? "mg-bird" : "mg-mark"; Object.assign(d.style, { width: o.w + "px", height: o.h + "px" });
      }
      area.insertBefore(d, dr); things.push(o);
    };
    const hit = why => {
      if (hurt > 0) return false;
      lives--; hurt = 1.2; vy = -160 * S; dr.classList.remove("hit"); void dr.offsetWidth; dr.classList.add("hit");
      hud();
      if (lives <= 0) { ended = true; api.lose(why); return true; }
      return false;
    };
    const press = on => { up = on; dr.classList.toggle("thrust", on); };
    area.addEventListener("pointerdown", e => { e.preventDefault(); press(true); }, { signal: ac.signal });
    window.addEventListener("pointerup", () => press(false), { signal: ac.signal });
    window.addEventListener("pointercancel", () => press(false), { signal: ac.signal });
    document.addEventListener("keydown", e => { if ([" ", "ArrowUp", "w", "W"].includes(e.key)) { e.preventDefault(); press(true); } }, { signal: ac.signal });
    document.addEventListener("keyup", e => { if ([" ", "ArrowUp", "w", "W"].includes(e.key)) press(false); }, { signal: ac.signal });
    hud();
    const stop = loop(dt => {
      if (ended) return;
      t += dt;
      // 비행: 누르면 위로 힘, 떼면 천천히 떨어짐
      vy += (up ? -560 : 330) * S * dt; vy = Math.max(-230 * S, Math.min(260 * S, vy));
      y += vy * dt;
      if (y < 6) { y = 6; vy = Math.max(0, vy); }
      dr.style.top = y + "px"; dr.style.transform = `rotate(${Math.max(-8, Math.min(10, vy / S / 22))}deg)`;
      if (hurt > 0) { hurt -= dt; dr.classList.toggle("blink", Math.floor(hurt * 10) % 2 === 0); } else dr.classList.remove("blink");
      // 착륙 단계: 착륙장이 드론 아래에서 멈추도록 점점 느려짐
      if (!landing && t >= FLY && !things.some(o => o.kind === "pylon" && o.x > DX - 60)) { landing = true; padX = W + PADW; pad.hidden = false; vs.hidden = false; Object.assign(pad.style, { width: PADW + "px", top: GROUND - 10 + "px" }); }
      const v = landing ? Math.min(speed, Math.max(0, padX - DX) * 1.1) : speed;
      speed = 150 * S + Math.min(t, FLY) * 2.4 * S;
      scroll += v * dt * .45; bg.style.backgroundPositionX = -scroll + "px";
      if (landing) { padX -= v * dt; pad.style.left = padX - PADW / 2 + "px"; }
      // 장애물·측량 표지
      if (!landing && (spawnIn -= dt) <= 0) {
        add(Math.random() < .55 ? "pylon" : "bird");
        if (Math.random() < .55) markIn = .45;
        spawnIn = Math.max(1.05, 1.7 - t * .02);
      }
      if (markIn > 0 && (markIn -= dt) <= 0 && !landing) add("mark");
      const dl = DX - DW * .38, drr = DX + DW * .38, dt0 = y + DH * .2, db = y + DH * .85;  // 드론 몸통 범위
      for (const o of things) {
        o.x -= v * dt;
        if (o.kind !== "pylon") { o.y = o.base + Math.sin(t * 3 + o.ph) * (o.kind === "bird" ? 18 : 8) * S; o.d.style.top = o.y + "px"; }
        o.d.style.left = o.x - o.w / 2 + "px";
        if (o.gone) continue;
        // 송전탑은 위로 갈수록 좁아지므로 드론 아래쪽 높이에서의 폭으로 판정
        const half = o.kind === "pylon" ? o.w * (.1 + .25 * Math.min(1, Math.max(0, (db - o.top) / o.h))) : o.w * .32;
        const ol = o.x - half, or = o.x + half, ot = o.kind === "pylon" ? o.top + 10 : o.y + o.h * .2, ob = o.kind === "pylon" ? GROUND : o.y + o.h * .8;
        if (drr > ol && dl < or && db > ot && dt0 < ob) {
          if (o.kind === "mark") { o.gone = 1; pts += 100; o.d.classList.add("got"); continue; }
          o.gone = 1; o.d.classList.add("bump");
          if (hit(o.kind === "bird" ? "새와 세 번 부딪혔어요." : "송전탑에 세 번 부딪혔어요.")) return;
        }
      }
      things = things.filter(o => { if (o.x < -60) { o.d.remove(); return false; } return true; });
      // 하강 속도 표시 (착륙할 때 보고 조절)
      if (landing) { const fast = vy > SAFE; vs.textContent = `하강 속도 ${Math.max(0, Math.round(vy / S / 10))} ${fast ? "· 너무 빨라요!" : "· 안전"}`; vs.className = "mg-vs" + (fast ? " fast" : ""); }
      // 땅에 닿음
      if (y + DH >= GROUND) {
        y = GROUND - DH; dr.style.top = y + "px";
        const onPad = landing && Math.abs(DX - padX) < PADW / 2 - DW * .25;
        if (onPad && vy <= SAFE) {
          ended = true; dr.classList.remove("thrust"); dr.style.transform = "";
          const soft = Math.round((1 - Math.max(0, vy) / SAFE) * 300 / 10) * 10, center = Math.round((1 - Math.abs(DX - padX) / (PADW / 2)) * 200 / 10) * 10;
          pts += 500 + soft + center + lives * 100; hud();
          api.hud(`점수 ${pts.toLocaleString()}`, `착륙 성공! (부드럽게 +${soft} · 정확히 +${center})`);
          setTimeout(() => api.win({ score: pts, unit: "점" }), 700);
          return;
        }
        if (onPad && vy > SAFE) { ended = true; api.lose("착륙장에 너무 빠르게 내려왔어요."); return; }
        if (hit(landing ? "착륙장이 아닌 곳에 세 번 내려앉았어요." : "땅에 세 번 부딪혔어요.")) return;
      }
      hud();
    });
    return () => { stop(); ac.abort(); };
  }

  /* 군 특성화 과정: 무전기 정비 순서 — 켜진 순서대로 따라 누르기 */
  function military(area, api) {
    const ac = new AbortController(), timers = [];
    const pads = [["전원", "#ff5a5a", "power"], ["주파수", "#ffd23d", "frequency"], ["채널", "#4dd2ff", "channel"], ["송신", "#5fe08f", "transmit"]];
    // 버튼 그림: 꺼짐/켜짐 두 장을 같은 자리에 겹쳐 두고 켜질 때만 켜짐 그림을 보이게 (한글 이름은 위에 글자로)
    area.innerHTML = `<div class="mg-radio"><div class="mg-screen" id="mgScreen">순서를 잘 봐!</div>
      <div class="mg-pads">${pads.map((p, i) => `<button type="button" class="pad" data-i="${i}" style="--c:${p[1]}"><img class="off" src="${MG}radio_${p[2]}_off.webp" alt="" draggable="false"><img class="on" src="${MG}radio_${p[2]}_on.webp" alt="" draggable="false"><span>${p[0]}</span></button>`).join("")}</div></div>`;
    const btns = [...area.querySelectorAll(".pad")], screen = area.querySelector(".mg-screen");
    const LENS = [3, 4, 5];
    let round = 0, seq = [], pos = 0, input = false, ended = false;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const flash = (i, ms = 420) => { btns[i].classList.add("lit"); later(() => btns[i].classList.remove("lit"), ms); };
    const play = () => {
      input = false; pos = 0;
      while (seq.length < LENS[round]) seq.push(Math.floor(Math.random() * 4));
      api.hud(`라운드 ${round + 1}/${LENS.length}`, "보는 중");
      screen.textContent = "순서를 잘 봐!";
      seq.forEach((s, k) => later(() => flash(s), 700 + k * 650));
      later(() => { input = true; api.hud(`라운드 ${round + 1}/${LENS.length}`, "따라 누르기"); screen.textContent = "이제 똑같이 눌러!"; }, 700 + seq.length * 650);
    };
    btns.forEach((b, i) => b.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (!input || ended) return;
      flash(i, 200);
      if (i !== seq[pos]) { ended = true; input = false; screen.textContent = "순서가 틀렸어!"; return api.lose("누르는 순서가 달랐어요."); }
      pos++;
      if (pos === seq.length) {
        input = false; round++;
        if (round >= LENS.length) { ended = true; screen.textContent = "정비 완료!"; return api.win(); }
        screen.textContent = "좋아! 다음 단계"; later(play, 800);
      }
    }, { signal: ac.signal }));
    play();
    return () => { timers.forEach(clearTimeout); ac.abort(); };
  }

  window.MINIGAMES = { patissier, mobility, battery, remodel, drone, military };
})();
