(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* =========================================================
     SOUND — synthesized with WebAudio, no external files
  ========================================================= */
  let audioCtx = null;
  let soundOn = false;
  const muteBtn = document.getElementById("muteBtn");
  const muteIcon = document.getElementById("muteIcon");

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, start, duration, type = "sine", gainPeak = 0.06) {
    if (!soundOn || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
    gain.gain.setValueAtTime(0, audioCtx.currentTime + start);
    gain.gain.linearRampToValueAtTime(gainPeak, audioCtx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + start + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + start);
    osc.stop(audioCtx.currentTime + start + duration + 0.05);
  }

  function playDodge() {
    tone(520 + Math.random() * 160, 0, 0.12, "sine", 0.045);
  }
  function playWhoosh() {
    tone(240, 0, 0.25, "sawtooth", 0.03);
  }
  function playChime() {
    [660, 880, 990, 1320].forEach((f, i) => tone(f, i * 0.12, 0.4, "triangle", 0.06));
  }
  function playSelect() {
    tone(760, 0, 0.16, "triangle", 0.05);
  }

  muteBtn.addEventListener("click", () => {
    ensureAudio();
    soundOn = !soundOn;
    muteBtn.setAttribute("aria-pressed", String(soundOn));
    muteBtn.setAttribute("aria-label", soundOn ? "Desativar som" : "Ativar som");
    muteIcon.textContent = soundOn ? "🔊" : "🔈";
    if (soundOn) playSelect();
  });

  /* =========================================================
     LOADER
  ========================================================= */
  const loader = document.getElementById("loader");
  const revealApp = () => loader.classList.add("is-hidden");
  window.addEventListener("load", () => setTimeout(revealApp, reduceMotion ? 250 : 1500));
  setTimeout(revealApp, 3200);

  /* =========================================================
     SAKURA PETALS — ambient falling layer
  ========================================================= */
  const sakuraLayer = document.getElementById("sakuraLayer");
  let sakuraIntensity = 1; // multiplier, raised in romantic/final scenes

  function spawnPetal() {
    if (reduceMotion) return;
    const petal = document.createElement("span");
    petal.className = "sakura-petal";
    petal.textContent = Math.random() > 0.5 ? "❀" : "✿";
    const startX = Math.random() * 100;
    const duration = 7 + Math.random() * 6;
    const drift = (Math.random() - 0.5) * 160;
    const rotation = Math.random() * 360;
    const size = 0.7 + Math.random() * 0.9;
    petal.style.left = startX + "vw";
    petal.style.fontSize = size + "rem";
    petal.style.setProperty("--drift", drift + "px");
    petal.style.setProperty("--rot", rotation + "deg");
    petal.animate(
      [
        { transform: `translate(0, -5vh) rotate(0deg)`, opacity: 0 },
        { transform: `translate(${drift * 0.3}px, 40vh) rotate(${rotation * 0.5}deg)`, opacity: 0.85, offset: 0.15 },
        { transform: `translate(${drift}px, 108vh) rotate(${rotation}deg)`, opacity: 0 },
      ],
      { duration: duration * 1000, easing: "ease-in-out" }
    );
    sakuraLayer.appendChild(petal);
    setTimeout(() => petal.remove(), duration * 1000 + 200);
  }

  let sakuraTimer = null;
  function startSakura(rate = 900) {
    stopSakura();
    if (reduceMotion) return;
    sakuraTimer = setInterval(spawnPetal, rate / sakuraIntensity);
  }
  function stopSakura() {
    if (sakuraTimer) clearInterval(sakuraTimer);
  }
  startSakura(1400);

  /* =========================================================
     AMBIENT PARTICLES (full page canvas)
  ========================================================= */
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let W, H, particles = [];
  let mouseX = -9999, mouseY = -9999;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function rand(min, max) { return Math.random() * (max - min) + min; }

  const PARTICLE_COUNT = reduceMotion ? 0 : (window.innerWidth < 700 ? 32 : 65);
  function makeParticle() {
    return {
      x: rand(0, W), y: rand(0, H), r: rand(0.6, 2.2),
      vx: rand(-0.12, 0.12), vy: rand(-0.22, -0.05),
      alpha: rand(0.15, 0.6), hue: rand(315, 335), drift: rand(0, Math.PI * 2),
    };
  }
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(makeParticle());

  window.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener("mouseleave", () => { mouseX = -9999; mouseY = -9999; });

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.drift += 0.01;
      p.x += p.vx + Math.sin(p.drift) * 0.05;
      p.y += p.vy;
      const dx = p.x - mouseX, dy = p.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110) {
        const force = (110 - dist) / 110;
        p.x += (dx / (dist || 1)) * force * 1.6;
        p.y += (dy / (dist || 1)) * force * 1.6;
      }
      if (p.y < -10) { p.y = H + 10; p.x = rand(0, W); }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 100%, 72%, ${p.alpha})`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 65%, 0.9)`;
      ctx.shadowBlur = 6;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(drawParticles);
  }
  if (!reduceMotion) requestAnimationFrame(drawParticles);

  if (hasFinePointer) {
    const cursorGlow = document.getElementById("cursorGlow");
    let cx = W / 2, cy = H / 2, tx = cx, ty = cy;
    window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
    (function animateCursor() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursorGlow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(animateCursor);
    })();
  } else {
    document.getElementById("cursorGlow").style.display = "none";
  }

  /* =========================================================
     SCENE ENGINE
  ========================================================= */
  const scenes = Array.from(document.querySelectorAll(".scene"));
  const dots = Array.from(document.querySelectorAll(".dot"));
  const domainTransition = document.getElementById("domainTransition");
  const order = ["intro", "missao", "romantico", "pedido", "final"];
  let currentScene = "intro";

  function updateDots(name) {
    const idx = order.indexOf(name);
    dots.forEach((dot) => {
      const dIdx = order.indexOf(dot.dataset.dot);
      dot.classList.toggle("is-active", dIdx === idx);
      dot.classList.toggle("is-done", dIdx < idx);
    });
  }

  function goToScene(name) {
    if (name === currentScene) return;
    ensureAudio();
    playWhoosh();
    if (!reduceMotion) {
      domainTransition.classList.add("is-active");
    }
    const doSwitch = () => {
      scenes.forEach((s) => s.classList.remove("is-active"));
      const target = document.querySelector(`[data-scene="${name}"]`);
      target.classList.add("is-active");
      currentScene = name;
      updateDots(name);
      window.scrollTo(0, 0);

      // scene-specific intensity / setup
      if (name === "romantico" || name === "final") {
        sakuraIntensity = 2.4;
        startSakura(1400);
      } else {
        sakuraIntensity = 1;
        startSakura(1400);
      }
      if (name === "pedido") initPedidoScene();
      if (name === "final") triggerCelebration();
    };
    if (reduceMotion) {
      doSwitch();
    } else {
      setTimeout(doSwitch, 480);
      setTimeout(() => domainTransition.classList.remove("is-active"), 1250);
    }
  }

  document.getElementById("btnStartMission").addEventListener("click", () => { ensureAudio(); goToScene("missao"); });
  document.getElementById("btnToRomantico").addEventListener("click", () => goToScene("romantico"));
  document.getElementById("btnToPedido").addEventListener("click", () => goToScene("pedido"));

  /* =========================================================
     CHARACTER CARD EASTER EGGS (missão scene)
  ========================================================= */
  const pokeLines = {
    gojo: "😎",
    megumi: "…",
    nobara: "😏",
    yuji: "🔥",
  };
  document.querySelectorAll(".char-card").forEach((card) => {
    card.addEventListener("click", () => {
      const c = card.dataset.char;
      card.dataset.pokeText = pokeLines[c] || "✨";
      card.classList.remove("is-poked");
      // force reflow to restart animation
      void card.offsetWidth;
      card.classList.add("is-poked");
      playSelect();
    });
  });

  /* =========================================================
     PEDIDO SCENE — the button that won't be caught
  ========================================================= */
  const btnNao = document.getElementById("btnNao");
  const btnSim = document.getElementById("btnSim");
  const pedidoScene = document.querySelector('[data-scene="pedido"]');
  const safeZone = document.getElementById("pedidoSafeZone");
  const pedidoCounter = document.getElementById("pedidoCounter");
  const sukunaReaction = document.getElementById("sukunaReaction");
  const sukunaText = document.getElementById("sukunaText");

  const naoPhrases = [
    "NÃO",
    "não 😭",
    "tem certeza?",
    "pensa melhor...",
    "não vai escapar dessa",
    "essa opção foi selada",
    "desiste 🙈",
    "só clica no SIM logo",
    "é sério isso?",
    "impossível, gato",
  ];
  const sukunaPhrases = [
    "kkkkkk foge dele, Vitória",
    "vai correr até quando?",
    "essa eu vou assistir de pipoca",
    "domain expansion: sem chance",
    "amador. o SIM tá bem ali",
  ];

  let naoAttempts = 0;
  let dodgeCooldown = false;
  let pedidoActive = false;
  let counterShown = false;

  function initPedidoScene() {
    pedidoActive = true;
    naoAttempts = 0;
    counterShown = false;
    pedidoCounter.textContent = "";
    btnNao.textContent = "NÃO";
    btnNao.style.fontSize = "";
    btnNao.style.padding = "";
    btnNao.classList.remove("is-static");
    placeNaoInitial();
  }

  function placeNaoInitial() {
    // start it beside SIM, in normal flow, until first dodge
    btnNao.classList.add("is-static");
    btnNao.style.position = "";
    btnNao.style.top = "";
    btnNao.style.left = "";
  }

  function getSafeExclusionRect() {
    const r = safeZone.getBoundingClientRect();
    const pad = 26;
    return { left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad };
  }

  function randomPositionAvoiding(exclude, btnW, btnH) {
    const margin = 18;
    const maxLeft = Math.max(margin, window.innerWidth - btnW - margin);
    const maxTop = Math.max(margin, window.innerHeight - btnH - margin);
    let x, y, tries = 0;
    do {
      x = rand(margin, maxLeft);
      y = rand(margin, maxTop);
      tries++;
    } while (
      tries < 18 &&
      x < exclude.right && x + btnW > exclude.left &&
      y < exclude.bottom && y + btnH > exclude.top
    );
    return { x, y };
  }

  function stageForAttempts(n) {
    const scale = Math.max(0.55, 1 - n * 0.045);
    const speed = Math.max(0.14, 0.42 - n * 0.028);
    return { scale, speed };
  }

  function showSukunaNear(x, y) {
    if (naoAttempts < 2) return;
    if (naoAttempts % 2 !== 0 && naoAttempts < 6) return;
    sukunaText.textContent = sukunaPhrases[Math.min(sukunaPhrases.length - 1, Math.floor(naoAttempts / 2) - 1)] || sukunaPhrases[0];
    const sw = 240, sh = 40;
    let sx = x + 40, sy = y - 60;
    sx = Math.min(Math.max(sx, 10), window.innerWidth - sw - 10);
    sy = Math.min(Math.max(sy, 10), window.innerHeight - sh - 10);
    sukunaReaction.style.left = sx + "px";
    sukunaReaction.style.top = sy + "px";
    sukunaReaction.classList.add("is-visible");
    clearTimeout(showSukunaNear._t);
    showSukunaNear._t = setTimeout(() => sukunaReaction.classList.remove("is-visible"), 1100);
  }

  function dodgeNao() {
    if (dodgeCooldown || !pedidoActive) return;
    dodgeCooldown = true;

    naoAttempts++;
    const rect = btnNao.getBoundingClientRect();
    const { scale, speed } = stageForAttempts(naoAttempts);

    // switch to fixed positioning on first dodge
    if (btnNao.classList.contains("is-static")) {
      btnNao.classList.remove("is-static");
      btnNao.style.top = rect.top + "px";
      btnNao.style.left = rect.left + "px";
      void btnNao.offsetWidth;
    }

    const exclude = getSafeExclusionRect();
    const btnW = rect.width || 120;
    const btnH = rect.height || 50;
    const pos = randomPositionAvoiding(exclude, btnW, btnH);

    btnNao.style.transition = `top ${speed}s cubic-bezier(.34,1.4,.64,1), left ${speed}s cubic-bezier(.34,1.4,.64,1), transform .25s ease, font-size .3s ease, padding .3s ease`;
    btnNao.style.top = pos.y + "px";
    btnNao.style.left = pos.x + "px";
    btnNao.style.transform = `scale(${scale})`;

    if (naoAttempts >= 4) {
      const fontSize = Math.max(0.66, 0.85 - naoAttempts * 0.015);
      btnNao.style.fontSize = fontSize + "rem";
      btnNao.style.padding = Math.max(10, 16 - naoAttempts) + "px " + Math.max(18, 32 - naoAttempts * 1.4) + "px";
    }

    if (naoAttempts >= 3) {
      const phraseIdx = Math.min(naoPhrases.length - 1, naoAttempts - 3);
      btnNao.textContent = naoPhrases[phraseIdx];
    }

    btnNao.classList.add("is-shaking");
    setTimeout(() => btnNao.classList.remove("is-shaking"), 350);

    if (!counterShown && naoAttempts >= 3) {
      counterShown = true;
    }
    if (counterShown) {
      pedidoCounter.textContent = `tentativas de clicar em "não": ${naoAttempts}`;
    }

    showSukunaNear(pos.x, pos.y);
    playDodge();

    setTimeout(() => { dodgeCooldown = false; }, Math.max(140, speed * 1000 * 0.7));
  }

  const DODGE_RADIUS = 130;
  function proximityCheck(clientX, clientY) {
    if (!pedidoActive) return;
    const rect = btnNao.getBoundingClientRect();
    const cxp = rect.left + rect.width / 2;
    const cyp = rect.top + rect.height / 2;
    const dist = Math.hypot(clientX - cxp, clientY - cyp);
    if (dist < DODGE_RADIUS) dodgeNao();
  }

  document.addEventListener("mousemove", (e) => proximityCheck(e.clientX, e.clientY));
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!pedidoActive) return;
      const t = e.touches[0];
      if (t) proximityCheck(t.clientX, t.clientY);
    },
    { passive: true }
  );
  btnNao.addEventListener("touchstart", (e) => {
    e.preventDefault();
    dodgeNao();
  }, { passive: false });
  btnNao.addEventListener("mouseenter", () => dodgeNao());
  btnNao.addEventListener("click", (e) => {
    e.preventDefault();
    dodgeNao();
  });

  window.addEventListener("resize", () => {
    if (pedidoActive && !btnNao.classList.contains("is-static")) {
      const rect = btnNao.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width - 12;
      const maxTop = window.innerHeight - rect.height - 12;
      btnNao.style.left = Math.min(parseFloat(btnNao.style.left) || 0, Math.max(0, maxLeft)) + "px";
      btnNao.style.top = Math.min(parseFloat(btnNao.style.top) || 0, Math.max(0, maxTop)) + "px";
    }
  });

  btnSim.addEventListener("click", () => {
    pedidoActive = false;
    playChime();
    goToScene("final");
  });

  /* =========================================================
     PEDIDO SCENE — ambient petal canvas
  ========================================================= */
  const pedidoCanvas = document.getElementById("pedidoCanvas");
  const pCtx = pedidoCanvas.getContext("2d");
  let pW, pH, pPetals = [];

  function resizePedido() {
    pW = pedidoCanvas.width = window.innerWidth;
    pH = pedidoCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizePedido);
  resizePedido();

  function makePPetal() {
    return { x: rand(0, pW), y: rand(0, pH), size: rand(2, 6), speedY: rand(0.1, 0.35), speedX: rand(-0.2, 0.2), alpha: rand(0.2, 0.6) };
  }
  const P_COUNT = reduceMotion ? 0 : 40;
  for (let i = 0; i < P_COUNT; i++) pPetals.push(makePPetal());

  function drawPedidoPetals() {
    if (currentScene === "pedido" && !reduceMotion) {
      pCtx.clearRect(0, 0, pW, pH);
      for (const p of pPetals) {
        p.y -= p.speedY;
        p.x += p.speedX;
        if (p.y < -10) { p.y = pH + 10; p.x = rand(0, pW); }
        if (p.x < -10) p.x = pW + 10;
        if (p.x > pW + 10) p.x = -10;
        pCtx.beginPath();
        pCtx.fillStyle = `rgba(255,111,184,${p.alpha})`;
        pCtx.shadowColor = "rgba(255,63,158,0.8)";
        pCtx.shadowBlur = 8;
        pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pCtx.fill();
      }
    }
    requestAnimationFrame(drawPedidoPetals);
  }
  requestAnimationFrame(drawPedidoPetals);

  /* =========================================================
     FINAL SCENE — celebration burst
  ========================================================= */
  const celebrationCanvas = document.getElementById("celebrationCanvas");
  const cCtx = celebrationCanvas.getContext("2d");
  let cW, cH, bursts = [];

  function resizeCelebration() {
    cW = celebrationCanvas.width = window.innerWidth;
    cH = celebrationCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCelebration);
  resizeCelebration();

  function spawnBurstParticles(count) {
    const cx = cW / 2, cy = cH * 0.4;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(2, 9);
      bursts.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: rand(2, 6),
        life: 1,
        decay: rand(0.006, 0.014),
        hue: rand(310, 340),
        shape: Math.random() > 0.6 ? "petal" : "dot",
      });
    }
  }

  let celebrationRunning = false;
  function drawCelebration() {
    if (celebrationRunning) {
      cCtx.clearRect(0, 0, cW, cH);
      bursts.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.05; // gravity
        b.vx *= 0.995;
        b.life -= b.decay;
        if (b.life <= 0) return;
        cCtx.save();
        cCtx.globalAlpha = Math.max(0, b.life);
        cCtx.translate(b.x, b.y);
        cCtx.fillStyle = `hsla(${b.hue}, 100%, 75%, 1)`;
        cCtx.shadowColor = `hsla(${b.hue}, 100%, 65%, 0.9)`;
        cCtx.shadowBlur = 8;
        if (b.shape === "petal") {
          cCtx.rotate(b.x * 0.02);
          cCtx.beginPath();
          cCtx.ellipse(0, 0, b.size, b.size * 0.55, 0, 0, Math.PI * 2);
          cCtx.fill();
        } else {
          cCtx.beginPath();
          cCtx.arc(0, 0, b.size * 0.6, 0, Math.PI * 2);
          cCtx.fill();
        }
        cCtx.restore();
      });
      bursts = bursts.filter((b) => b.life > 0 && b.y < cH + 40);
    }
    requestAnimationFrame(drawCelebration);
  }
  requestAnimationFrame(drawCelebration);

  function triggerCelebration() {
    celebrationRunning = !reduceMotion;
    bursts = [];
    if (!reduceMotion) {
      spawnBurstParticles(120);
      setTimeout(() => spawnBurstParticles(70), 350);
      setTimeout(() => spawnBurstParticles(70), 750);
    }
    const l1 = document.getElementById("finalLine1");
    const l2 = document.getElementById("finalLine2");
    l1.classList.remove("is-in");
    l2.classList.remove("is-in");
    void l1.offsetWidth;
    setTimeout(() => l1.classList.add("is-in"), 60);
    setTimeout(() => l2.classList.add("is-in"), 700);
    setTimeout(() => playChime(), 100);
  }

  /* =========================================================
     KEYBOARD ACCESS: Enter/Space works everywhere buttons are
  ========================================================= */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return;
  });
})();
