// Huevómetro
const cfg = window.HUEVOS_CONFIG || {};
const DEMO = !cfg.supabaseUrl || !cfg.supabaseAnonKey;
const TABLAS = ["compras", "consumos", "conteos"];

/* ---------- Datos: Supabase, o localStorage en modo prueba ---------- */
let db;
if (DEMO) {
  const get = (t) => { try { return JSON.parse(localStorage.getItem("huevos_" + t)) || []; } catch { return []; } };
  const set = (t, v) => { try { localStorage.setItem("huevos_" + t, JSON.stringify(v)); } catch {} };
  db = {
    listar: async () => Object.fromEntries(TABLAS.map((t) => [t, get(t)])),
    agregar: async (t, fila) => {
      const r = { id: crypto.randomUUID?.() || String(Date.now()), created_at: new Date().toISOString(), ...fila };
      set(t, [...get(t), r]); return r;
    },
    borrar: async (t, id) => set(t, get(t).filter((r) => r.id !== id)),
  };
} else {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  db = {
    listar: async () => {
      const res = await Promise.all(TABLAS.map((t) => sb.from(t).select("*").order("fecha").order("created_at")));
      const e = res.find((r) => r.error); if (e) throw e.error;
      return Object.fromEntries(TABLAS.map((t, i) => [t, res[i].data]));
    },
    agregar: async (t, fila) => {
      const { data, error } = await sb.from(t).insert(fila).select().single();
      if (error) throw error; return data;
    },
    borrar: async (t, id) => { const { error } = await sb.from(t).delete().eq("id", id); if (error) throw error; },
  };
}

/* ---------- Utilidades ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const hoy = () => new Date().toLocaleDateString("en-CA");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const cuando = (f) => {
  if (f === hoy()) return "Hoy";
  const a = new Date(); a.setDate(a.getDate() - 1);
  if (f === a.toLocaleDateString("en-CA")) return "Ayer";
  const [y, m, d] = f.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const COLORES = ["#FF8A1F", "#5B5BD6", "#1E9E62", "#E0453A", "#0EA5E9", "#D946EF", "#A16207"];
const color = (n) => COLORES[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORES.length];

/* ---------- Estado ---------- */
let datos = { compras: [], consumos: [], conteos: [] };
let c = {};
let yo = localStorage.getItem("huevos_yo") || "";
let verTodo = false;
let prevStock = null;

function calcular() {
  const movs = [
    ...datos.compras.map((r) => ({ ...r, tipo: "compra", tabla: "compras" })),
    ...datos.consumos.map((r) => ({ ...r, tipo: "consumo", tabla: "consumos" })),
    ...datos.conteos.map((r) => ({ ...r, tipo: "conteo", tabla: "conteos" })),
  ].sort((a, b) => a.fecha === b.fecha ? String(a.created_at).localeCompare(String(b.created_at)) : a.fecha.localeCompare(b.fecha));

  // stock = compras − consumos; cada conteo lo reemplaza por el número real
  let stock = 0;
  for (const m of movs) {
    if (m.tipo === "compra") stock += m.cantidad;
    else if (m.tipo === "consumo") stock -= m.cantidad;
    else { m.dif = m.cantidad - stock; stock = m.cantidad; }
  }

  const d7 = new Date(); d7.setDate(d7.getDate() - 6);
  const desde = d7.toLocaleDateString("en-CA");
  const porDia = datos.consumos.filter((x) => x.fecha >= desde).reduce((s, x) => s + x.cantidad, 0) / 7;

  const mes = hoy().slice(0, 7), r = {};
  datos.consumos.filter((x) => x.fecha.startsWith(mes)).forEach((x) => (r[x.quien] = (r[x.quien] || 0) + x.cantidad));

  // ¿la última auditoría encontró faltantes y no hubo compras después?
  const ultimo = movs.filter((m) => m.tipo !== "consumo").at(-1);
  const faltan = ultimo?.tipo === "conteo" && ultimo.dif < 0 ? -ultimo.dif : 0;

  c = { movs, stock, porDia, ranking: Object.entries(r).sort((a, b) => b[1] - a[1]), faltan };
}

/* ---------- Papá huevo ---------- */
const FRASES = {
  ok: ["Todo en orden 🧐", "Te estoy mirando 👀", "Anotá, eh", "Hoy confío", "Bien ahí 👌"],
  low: ["Quedan pocos…", "Empiezo a sospechar", "¿Alguien va al chino?", "Mmm… 🤨"],
  bad: ["¡¿OTRA VEZ?!", "¡¿Dónde están?!", "¡Esto es un complot!", "¡Exijo explicaciones!"],
  tap: ["¡Ey, que me rompo!", "Frágil 🥚", "¿Pasado por agua? Jamás", "Cuidado conmigo"],
};

function decir(t) {
  const b = $("#bubble");
  b.textContent = t; b.classList.remove("in"); void b.offsetWidth; b.classList.add("in");
}

/* ---------- Render ---------- */
function render() {
  calcular();
  const { stock, porDia, faltan } = c;
  const mood = stock <= 0 || faltan ? "bad" : stock <= 4 ? "low" : "ok";
  $("#hero").dataset.mood = mood;
  decir(rnd(FRASES[mood]));

  const num = $("#num");
  num.textContent = stock;
  if (prevStock !== null && prevStock !== stock) { num.classList.remove("bump"); void num.offsetWidth; num.classList.add("bump"); }
  prevStock = stock;

  const badge = $("#badge");
  badge.className = "badge " + mood;
  badge.textContent = faltan ? `Faltan ${faltan}` : stock < 0 ? "Revisar compras" : stock === 0 ? "Sin huevos" : mood === "low" ? "Quedan pocos" : "Todo en orden";

  $("#meta").textContent = porDia > 0 && stock > 0
    ? `≈ ${Math.max(1, Math.floor(stock / porDia))} días · ${porDia.toFixed(1).replace(".", ",")} por día`
    : "";

  renderNombres(); renderRanking(); renderFeed();
}

function renderNombres() {
  const set = new Set([...datos.consumos].reverse().map((x) => x.quien));
  if (yo) set.add(yo);
  $("#chips-quien").innerHTML = [...set].slice(0, 8)
    .map((n) => `<button type="button" class="chip ${n === yo && !$("#quien").value ? "on" : ""}" data-n="${esc(n)}">${esc(n)}</button>`).join("");
}

function renderRanking() {
  const el = $("#rank");
  if (!c.ranking.length) { el.innerHTML = `<li class="empty">Nadie comió huevos todavía</li>`; return; }
  const max = c.ranking[0][1];
  el.innerHTML = c.ranking.map(([n, k]) => `
    <li>
      <span class="av" style="background:${color(n)}">${esc(n.charAt(0).toUpperCase())}</span>
      <span class="who">${esc(n)}<span class="bar"><i style="width:${(k / max) * 100}%"></i></span></span>
      <span class="n">${k}</span>
    </li>`).join("");
}

function renderFeed() {
  const el = $("#feed");
  const lista = [...c.movs].reverse();
  if (!lista.length) { el.innerHTML = `<li class="empty">Empezá cargando una compra</li>`; return; }
  const vis = verTodo ? lista : lista.slice(0, 8);
  el.innerHTML = vis.map((m) => {
    let ic, t;
    if (m.tipo === "compra") { ic = `<span class="ic compra"><svg><use href="#i-cart"/></svg></span>`; t = `+${m.cantidad} comprados`; }
    else if (m.tipo === "consumo") { ic = `<span class="ic consumo"><svg><use href="#i-pan"/></svg></span>`; t = `${esc(m.quien)} · ${m.cantidad}`; }
    else {
      ic = `<span class="ic conteo ${m.dif < 0 ? "bad" : ""}"><svg><use href="#i-search"/></svg></span>`;
      t = `Conteo: ${m.cantidad}` + (m.dif < 0 ? ` · faltaban ${-m.dif}` : m.dif > 0 ? ` · sobraban ${m.dif}` : " ✓");
    }
    return `<li>${ic}<span class="t">${t}<small>${cuando(m.fecha)}</small></span>
      <button class="del" data-t="${m.tabla}" data-id="${esc(m.id)}" aria-label="Borrar"><svg><use href="#i-trash"/></svg></button></li>`;
  }).join("") + (lista.length > vis.length ? `<li style="display:block;padding:0"><button class="more" id="more">Ver todo (${lista.length})</button></li>` : "");
}

/* ---------- Toast ---------- */
let tt;
function toast(msg, err = false) {
  const t = $("#toast");
  t.textContent = msg; t.classList.toggle("err", err); t.classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2400);
}

/* ---------- Hojas ---------- */
function abrir(nombre) {
  $$(".sheet").forEach((s) => s.classList.toggle("on", s.dataset.sheet === nombre));
  $("#scrim").classList.add("on");
  if (nombre === "contar") { $("#contar-cant").value = Math.max(0, c.stock); $("#verdict").hidden = true; $("#contar-btn").textContent = "Comparar"; }
}
function cerrar() { $$(".sheet").forEach((s) => s.classList.remove("on")); $("#scrim").classList.remove("on"); }
$$("[data-open]").forEach((b) => b.addEventListener("click", () => abrir(b.dataset.open)));
$("#scrim").addEventListener("click", cerrar);
document.addEventListener("keydown", (e) => e.key === "Escape" && cerrar());

// Deslizar hacia abajo para cerrar
$$(".sheet").forEach((s) => {
  let y0 = null;
  s.addEventListener("touchstart", (e) => { if (e.target.closest(".grip, h3")) y0 = e.touches[0].clientY; }, { passive: true });
  s.addEventListener("touchmove", (e) => { if (y0 !== null) { const dy = Math.max(0, e.touches[0].clientY - y0); s.style.transform = `translateY(${dy}px)`; } }, { passive: true });
  s.addEventListener("touchend", (e) => {
    if (y0 === null) return;
    const dy = e.changedTouches[0].clientY - y0; s.style.transform = ""; y0 = null;
    if (dy > 80) cerrar();
  });
});

/* ---------- Controles ---------- */
$$(".stepper").forEach((st) => {
  const inp = st.querySelector("input"), min = +st.dataset.min, max = +st.dataset.max;
  st.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    inp.value = Math.min(max, Math.max(min, (parseInt(inp.value, 10) || 0) + +b.dataset.d));
    inp.dispatchEvent(new Event("input"));
  }));
});
["#comi-fecha", "#compra-fecha"].forEach((s) => { $(s).value = hoy(); $(s).max = hoy(); });

$("#chips-quien").addEventListener("click", (e) => {
  const b = e.target.closest("[data-n]"); if (!b) return;
  yo = b.dataset.n; $("#quien").value = ""; renderNombres();
});
$("#quien").addEventListener("input", () => renderNombres());

$("#chips-compra").addEventListener("click", (e) => {
  const b = e.target.closest("[data-n]"); if (!b) return;
  $("#compra-cant").value = b.dataset.n;
  $$("#chips-compra .chip").forEach((x) => x.classList.toggle("on", x === b));
});
$("#compra-cant").addEventListener("input", (e) =>
  $$("#chips-compra .chip").forEach((x) => x.classList.toggle("on", x.dataset.n === e.target.value)));

$("#egg").addEventListener("click", () => {
  const e = $("#egg"); e.classList.remove("tap"); void e.offsetWidth; e.classList.add("tap");
  setTimeout(() => e.classList.remove("tap"), 500);
  decir(rnd(FRASES.tap));
});

async function guardar(form, fn) {
  const btn = form.querySelector("[type=submit]");
  btn.disabled = true;
  try { await fn(); } catch (err) { console.error(err); toast("No se pudo guardar", true); }
  finally { btn.disabled = false; }
}

/* ---------- Formularios ---------- */
$("#sheet-comi").addEventListener("submit", (e) => {
  e.preventDefault();
  const quien = ($("#quien").value.trim() || yo).slice(0, 30);
  const cantidad = parseInt($("#comi-cant").value, 10);
  if (!quien) { toast("¿Quién sos?", true); $("#quien").focus(); return; }
  if (!(cantidad > 0)) return;
  guardar(e.target, async () => {
    datos.consumos.push(await db.agregar("consumos", { fecha: $("#comi-fecha").value || hoy(), cantidad, quien }));
    yo = quien; localStorage.setItem("huevos_yo", yo); $("#quien").value = ""; $("#comi-fecha").value = hoy();
    cerrar(); render();
    toast(rnd([`Anotado, ${quien} 🍳`, `Papá ya lo sabe, ${quien}`, "Confesión registrada ✍️"]));
  });
});

$("#sheet-compre").addEventListener("submit", (e) => {
  e.preventDefault();
  const cantidad = parseInt($("#compra-cant").value, 10);
  if (!(cantidad > 0)) return;
  guardar(e.target, async () => {
    datos.compras.push(await db.agregar("compras", { fecha: $("#compra-fecha").value || hoy(), cantidad }));
    $("#compra-fecha").value = hoy();
    cerrar(); render(); decir("¡Huevos nuevos! 🥹");
    toast(`+${cantidad} huevos`);
  });
});

$("#sheet-contar").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!$("#verdict").hidden) { cerrar(); return; } // segundo toque = Listo
  const cantidad = parseInt($("#contar-cant").value, 10);
  if (isNaN(cantidad) || cantidad < 0) return;
  const esperado = c.stock;
  guardar(e.target, async () => {
    datos.conteos.push(await db.agregar("conteos", { fecha: hoy(), cantidad }));
    const d = cantidad - esperado, v = $("#verdict");
    if (d === 0) { v.className = "verdict ok"; v.innerHTML = `<b>¡Cierra perfecto!</b><span>Papá puede dormir tranquilo</span>`; }
    else if (d < 0) { v.className = "verdict bad"; v.innerHTML = `<b>Faltan ${-d} 🚨</b><span>Tenía que haber ${esperado}. ¿Alguien no anotó?</span>`; }
    else { v.className = "verdict odd"; v.innerHTML = `<b>Sobran ${d} 🤔</b><span>Tenía que haber ${esperado}. ¿Faltó cargar una compra?</span>`; }
    v.hidden = false; $("#contar-btn").textContent = "Listo";
    render();
    if (d === 0) decir("Sabía que podía confiar 😎");
  });
});

/* ---------- Borrar (dos toques) ---------- */
$("#feed").addEventListener("click", async (e) => {
  if (e.target.id === "more") { verTodo = true; renderFeed(); return; }
  const b = e.target.closest(".del"); if (!b) return;
  if (!b.classList.contains("sure")) {
    $$(".del.sure").forEach((x) => { x.classList.remove("sure"); x.innerHTML = `<svg><use href="#i-trash"/></svg>`; });
    b.classList.add("sure"); b.textContent = "Borrar";
    setTimeout(() => { if (b.isConnected && b.classList.contains("sure")) { b.classList.remove("sure"); b.innerHTML = `<svg><use href="#i-trash"/></svg>`; } }, 3000);
    return;
  }
  b.disabled = true;
  try {
    await db.borrar(b.dataset.t, b.dataset.id);
    datos[b.dataset.t] = datos[b.dataset.t].filter((r) => String(r.id) !== b.dataset.id);
    render(); toast("Borrado");
  } catch (err) { console.error(err); toast("No se pudo borrar", true); b.disabled = false; }
});

/* ---------- Arranque ---------- */
async function cargar() {
  try { datos = await db.listar(); render(); }
  catch (err) { console.error(err); decir("Sin conexión 📡"); toast("Error conectando con Supabase", true); }
}
if (DEMO) $("#demo").hidden = false;
cargar();
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && cargar());
