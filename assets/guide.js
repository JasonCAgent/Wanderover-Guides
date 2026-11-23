/* Shared guidebook engine: every property page uses this file. Edit once, all guides update. */

const $ = s => document.querySelector(s);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-");
document.title = GUIDE.name;
$("#propName").textContent = GUIDE.name;
$("#propAddr").textContent = "📍 " + GUIDE.address + " · Hosted by " + GUIDE.hosts;
$("#ciTime").textContent = GUIDE.checkIn;
$("#coTime").textContent = GUIDE.checkOut;
$("#wifiName").textContent = GUIDE.wifi.name;
$("#wifiPass").textContent = GUIDE.wifi.password;
$("#dirBtn").href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(GUIDE.address);
$("#textBtn").href = "sms:" + GUIDE.phone;
$("#callBtn").href = "tel:" + (GUIDE.callPhone || GUIDE.phone);
$("#printBtn").onclick = () => { document.querySelectorAll("details").forEach(d=>d.open=true); window.print(); };

// Info sections
$("#info").innerHTML = GUIDE.sections.map(s => `
  <details data-sec>
    <summary>${s.title}</summary>
    ${s.topics.map(t => `<div class="topic" id="t-${slug(t.t)}" data-text="${(t.t+' '+t.d.replace(/<[^>]+>/g,' ')).toLowerCase().replace(/"/g,'')}"><h3>${t.t}</h3>${t.d}</div>`).join("")}
  </details>`).join("");

$("#search").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll("details[data-sec]").forEach(d => {
    let any = false;
    d.querySelectorAll(".topic").forEach(t => { const hit = !q || t.dataset.text.includes(q); t.classList.toggle("hidden", !hit); any = any || hit; });
    d.classList.toggle("hidden", !any); d.open = !!q && any;
  });
});

function openTopic(name){
  showView("info");
  const el = document.getElementById("t-" + slug(name));
  if (!el) return;
  el.closest("details").open = true;
  el.scrollIntoView({behavior:"smooth", block:"start"});
}

// Guest-journey moments (Pre-arrival, Check-in, ...)
const momentNames = Object.keys(GUIDE.moments);
function setMoment(m){
  document.querySelectorAll("#moments button").forEach(b => b.classList.toggle("on", b.textContent === m));
  $("#tagline").textContent = GUIDE.moments[m].tagline;
  $("#quick").innerHTML = GUIDE.moments[m].topics.map(t => `<a href="#" data-t="${t}">${t}</a>`).join("");
  $("#quick").querySelectorAll("a").forEach(a => a.onclick = e => { e.preventDefault(); openTopic(a.dataset.t); });
}
$("#moments").innerHTML = momentNames.map(m => `<button>${m}</button>`).join("");
$("#moments").querySelectorAll("button").forEach(b => b.onclick = () => { setMoment(b.textContent); showView("home"); });
// Optional: link with ?stay=checkin etc. to open on a moment; default is Pre-arrival
const stay = new URLSearchParams(location.search).get("stay");
setMoment({checkin:"Check-in",during:"During your stay",checkout:"Check-out"}[stay] || "Pre-arrival");

// Bottom tabs
let mapReady = false;
function showView(v){
  document.querySelectorAll("section.view").forEach(s => s.classList.toggle("on", s.id === "view-" + v));
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("on", b.dataset.view === v));
  if (v === "map") initMap();
  window.scrollTo(0,0);
}
document.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => showView(b.dataset.view));

// Local guide map (OpenStreetMap, free, no account)
const cats = ["All", ...new Set(GUIDE.places.map(p=>p[1]))];
let map, markers = [];
function initMap(){
  if (mapReady || !window.L) { if (map) map.invalidateSize(); return; }
  mapReady = true;
  map = L.map("map").setView([GUIDE.lat, GUIDE.lng], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:18, attribution:"© OpenStreetMap"}).addTo(map);
  L.marker([GUIDE.lat, GUIDE.lng]).addTo(map).bindPopup("<strong>🏠 " + GUIDE.name + "</strong><br>You're staying here");
  renderPlaces("All");
}
function renderPlaces(cat){
  markers.forEach(m => map && map.removeLayer(m)); markers = [];
  const list = GUIDE.places.filter(p => cat === "All" || p[1] === cat);
  $("#places").innerHTML = list.map(p => {
    const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p[0] + " " + p[2] + "," + p[3]);
    return `<li><div><strong>${p[0]}</strong><small>${p[4] ? p[4] : p[1]}</small></div><a href="${url}" target="_blank" rel="noopener">Open ↗</a></li>`;
  }).join("");
  if (map) list.forEach(p => markers.push(L.circleMarker([p[2],p[3]],{radius:7,color:"#3ed9cc",weight:2,fillOpacity:.7}).addTo(map).bindPopup(`<strong>${p[0]}</strong><br>${p[4]||p[1]}`)));
  document.querySelectorAll("#filters button").forEach(b => b.classList.toggle("on", b.textContent === cat));
}
$("#filters").innerHTML = cats.map(c => `<button>${c}</button>`).join("");
$("#filters").querySelectorAll("button").forEach(b => b.onclick = () => renderPlaces(b.textContent));
renderPlaces("All");

// Live weather (Open-Meteo, free, no key)
(async () => {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${GUIDE.lat}&longitude=${GUIDE.lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America%2FPhoenix&forecast_days=5`);
    const d = (await r.json()).daily;
    const icon = c => c===0?"☀️":c<=2?"🌤️":c===3?"☁️":c<=48?"🌫️":c<=67?"🌧️":c<=77?"🌨️":c<=82?"🌦️":"⛈️";
    $("#weather").innerHTML = d.time.map((t,i) => `<div><div>${new Date(t+"T12:00").toLocaleDateString("en-US",{weekday:"short"})}</div><div style="font-size:1.4rem">${icon(d.weathercode[i])}</div><div>${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</div></div>`).join("");
  } catch { $("#weather").innerHTML = '<div style="text-align:left">Forecast unavailable offline. <a href="https://forecast.weather.gov/MapClick.php?lat=34.1404&lon=-109.9729" target="_blank" rel="noopener">Check weather.gov</a></div>'; }
})();
