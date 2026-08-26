const W=1538, H=2048;
const map=L.map("map",{crs:L.CRS.Simple,minZoom:-1.25,maxZoom:2.5,zoomSnap:.25,zoomDelta:.5,zoomControl:true,attributionControl:false,maxBounds:[[-80,-80],[H+80,W+80]],maxBoundsViscosity:.9});
const imageBounds=[[0,0],[H,W]];
L.imageOverlay("noiseisland.png",imageBounds,{opacity:1,interactive:false,zIndex:1}).addTo(map);
map.fitBounds(imageBounds,{padding:[20,20]});
const $=id=>document.getElementById(id),panel=$("infoPanel"),title=$("panelTitle"),kicker=$("panelKicker"),description=$("panelDescription"),artistList=$("artistList");
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function tagText(v){return String(v||"").trim().replace(/^#+/,"").replace(/\s+/g,"").replace(/[^A-Za-z0-9À-ÿ_-]/g,"")}
function tags(a){let t=[];if(a.genre)a.genre.split(/[,;|/]+/).map(x=>x.trim()).filter(Boolean).forEach(x=>t.push("#"+tagText(x)));(a.locationTags||[]).filter(Boolean).forEach(x=>t.push("#"+tagText(x)));return [...new Set(t)].filter(x=>x!="#")}
function card(a){const t=tags(a);return `<article class="artist-card"><div class="artist-name">${esc(a.artist)}</div>${t.length?`<div class="hashtags">${t.map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>`:""}${a.notes?`<div class="artist-note">${esc(a.notes)}</div>`:""}${a.link?`<a class="artist-link" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer">Visit artist link ↗</a>`:`<div class="no-link">No link provided in the spreadsheet.</div>`}</article>`}
function openPanel(){panel.classList.add("open")}
$("closePanel").onclick=()=>panel.classList.remove("open");
$("resetMap").onclick=()=>map.fitBounds(imageBounds,{padding:[20,20]});


const cities={
 Dublin:[1091,1266], Cork:[1824,649], Limerick:[440,580], Galway:[1145,489], Sligo:[0,0],
 Kilkenny:[1436,1026], Dundalk:[764,1227], Belfast:[470,1346], Leitrim:[790,789]
};

fetch("data.json").then(r=>r.json()).then(data=>{
 const byCity=new Map();data.artists.forEach(a=>(a.locations||[]).forEach(c=>{if(!byCity.has(c))byCity.set(c,[]);byCity.get(c).push(a)}));
 function openArtist(a){kicker.textContent="ARTIST";title.textContent=a.artist;description.textContent=a.locationRaw?`Location: ${a.locationRaw}`:"No Ireland location recorded.";artistList.innerHTML=card(a);openPanel();const c=a.locations?.[0];if(c&&cities[c])map.flyTo(cities[c],1.25,{duration:.55})}
 function openCity(name,list){kicker.textContent="ARTISTS IN";title.textContent=name;description.textContent=`${list.length} artist${list.length===1?"":"s"} connected to this place.`;artistList.innerHTML=list.map(card).join("")||"<div class='artist-card'>No artists mapped here.</div>";openPanel();if(cities[name])map.flyTo(cities[name],1.05,{duration:.55});artistList.querySelectorAll(".artist-card").forEach((el,i)=>{el.onclick=e=>{if(!e.target.closest("a"))openArtist(list[i])};el.style.cursor="pointer"})}
 Object.entries(cities).forEach(([name,pos])=>{const list=byCity.get(name)||[];L.marker(pos,{icon:L.divIcon({className:"",iconSize:[1,1],iconAnchor:[0,0],html:`<div class="city-marker"><div class="city-core"></div><div class="city-label">${esc(name)} · ${list.length}</div></div>`}),zIndexOffset:1000}).addTo(map).on("click",()=>openCity(name,list))});
 Object.entries(cities).forEach(([name,cpos])=>{const list=byCity.get(name)||[];const r=48+Math.min(list.length,12)*3;list.forEach((a,i)=>{const angle=-Math.PI/2+i*2.3999632297,ring=1+Math.floor(i/8)*.26,y=cpos[0]+Math.cos(angle)*r*ring,x=cpos[1]+Math.sin(angle)*r*ring;L.polyline([cpos,[y,x]],{color:"#d8ff58",weight:1,opacity:.28,interactive:false}).addTo(map);L.marker([y,x],{icon:L.divIcon({className:"",iconSize:[1,1],iconAnchor:[0,0],html:`<div class="artist-node"><div class="artist-node-dot"></div><div class="artist-node-label">${esc(a.artist)}</div></div>`}),zIndexOffset:300}).addTo(map).on("click",()=>openArtist(a))})});
 let labels=true;$("toggleLabels").onclick=()=>{labels=!labels;$("toggleLabels").classList.toggle("active",labels);document.querySelectorAll(".artist-node-label").forEach(x=>x.classList.toggle("hidden",!labels))};
 const unmapped=data.artists.filter(a=>!(a.locations||[]).length);$("unmappedCount").textContent=unmapped.length;$("unmappedBtn").onclick=()=>{kicker.textContent="OTHER ARTISTS";title.textContent="Unmapped";description.textContent=`${unmapped.length} artists have no recognised map location.`;artistList.innerHTML=unmapped.map(card).join("");openPanel()};
 const searchable=[...Object.keys(cities).map(n=>({type:"city",name:n})),...data.artists.map(a=>({type:"artist",name:a.artist,value:a}))];$("search").addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase(),box=$("searchResults");if(!q){box.classList.remove("open");box.innerHTML="";return}const r=searchable.filter(x=>x.name.toLowerCase().includes(q)).slice(0,12);box.innerHTML=r.map((x,i)=>`<div class="result" data-i="${i}"><strong>${esc(x.name)}</strong><span>${x.type}</span></div>`).join("")||"<div class='result'><strong>No matches</strong></div>";box.classList.add("open");box.querySelectorAll("[data-i]").forEach(el=>el.onclick=()=>{const x=r[Number(el.dataset.i)];if(x.type==="city")openCity(x.name,byCity.get(x.name)||[]);else openArtist(x.value);box.classList.remove("open");$("search").value=""})});
}).catch(err=>{console.error(err);kicker.textContent="ERROR";title.textContent="Data could not load";description.textContent="Check data.json.";openPanel()});
