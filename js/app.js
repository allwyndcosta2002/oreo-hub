(function(){
"use strict";
/* ---------------- helpers ---------------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pd=s=>{if(!s)return null;const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?new Date(+m[1],+m[2]-1,+m[3]):null;};
const iso=d=>d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`:"";
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const addM=(d,n)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x;};
const fmt=d=>d?d.toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short"}):"—";
const fmtY=d=>d?d.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"}):"—";
const today=()=>{const t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate());};
const days=(a,b)=>Math.round((b-a)/864e5);
const icons=()=>{try{window.lucide&&lucide.createIcons();}catch(e){}};

/* ---------------- state ---------------- */
const KEY="oreoHub.v1";
const DEF={v:1,checks:{},dates:{},done:{},weights:[],alone:[],social:{},notes:[],
  cfg:{pickup:"2026-11-10T10:00",dob:"2026-09-15",momLeaves:"2027-01-15",schedule:"nov",curWeight:2.5,calcAge:8,kcal:3900,wetPct:0,wetKcal:1000,tickProd:"Simparica Trio",vetName:"",vetPhone:""}};
const clone=o=>JSON.parse(JSON.stringify(o));
const DRE=/^\d{4}-\d{2}-\d{2}$/;
const str=(v,n)=>typeof v==="string"?v.slice(0,n):"";
const num=(v,lo,hi)=>{if(v===null||v===""||typeof v==="boolean")return null;v=+v;return Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):null;};
const okId=k=>/^[a-z0-9]{1,12}$/i.test(k);
/* Every value from storage or a restored backup is type-checked and clamped here, so a tampered file can't inject markup. */
function merge(o){const d=clone(DEF);if(!o||typeof o!=="object")return d;
  const obj=v=>v&&typeof v==="object"&&!Array.isArray(v);
  if(obj(o.checks))for(const k in o.checks)if(okId(k)&&o.checks[k]===true)d.checks[k]=true;
  if(obj(o.dates))for(const k in o.dates)if(okId(k)&&DRE.test(o.dates[k]))d.dates[k]=o.dates[k];
  if(obj(o.social))for(const k in o.social){const n=num(o.social[k],0,5);if(okId(k)&&n!==null)d.social[k]=Math.round(n);}
  if(Array.isArray(o.weights))d.weights=o.weights.filter(e=>e&&DRE.test(e.d)&&num(e.kg,0.1,40)!==null).slice(0,500).map(e=>({d:e.d,kg:num(e.kg,0.1,40)}));
  if(Array.isArray(o.alone))d.alone=o.alone.filter(e=>e&&DRE.test(e.d)&&num(e.min,0.1,1440)!==null).slice(0,3000).map((e,i)=>({d:e.d,min:num(e.min,0.1,1440),how:["calm","mild","distress"].includes(e.how)?e.how:"mild",t:Number.isFinite(+e.t)?Math.floor(+e.t):Date.now()+i}));
  if(Array.isArray(o.notes))d.notes=o.notes.filter(e=>e&&typeof e.body==="string").slice(0,2000).map((e,i)=>({t:Number.isFinite(+e.t)?Math.floor(+e.t):Date.now()+i,d:DRE.test(e.d)?e.d:iso(today()),
    cat:["general","vet","health","behaviour","transport","shopping"].includes(e.cat)?e.cat:"general",title:str(e.title,120),body:str(e.body,5000),pin:e.pin===true}));
  const c=obj(o.cfg)?o.cfg:{},D=d.cfg;
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(c.pickup))D.pickup=c.pickup.slice(0,16);
  if(DRE.test(c.dob))D.dob=c.dob;if(DRE.test(c.momLeaves))D.momLeaves=c.momLeaves;
  if(c.schedule==="nov"||c.schedule==="jan")D.schedule=c.schedule;
  [["curWeight",1,14],["calcAge",8,52],["kcal",2500,5000],["wetPct",0,50],["wetKcal",600,1600]].forEach(([k,lo,hi])=>{const n=num(c[k],lo,hi);if(n!==null)D[k]=k==="calcAge"?Math.round(n):n;});
  if(["Simparica Trio","NexGard Spectra","Other (vet-prescribed)"].includes(c.tickProd))D.tickProd=c.tickProd;
  D.vetName=str(c.vetName,80);D.vetPhone=str(c.vetPhone,30);
  return d;}
let storageOK=true;
function load(){try{const r=localStorage.getItem(KEY);if(r)return merge(JSON.parse(r));}catch(e){storageOK=false;}return clone(DEF);}
let S=load();
let saveT;
function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S));storageOK=true;}catch(e){storageOK=false;}
  $("#storageWarn").classList.toggle("hidden",storageOK);},150);}
function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2200);}

/* ---------------- content: checklists ---------------- */
const LISTS={
 transport:{title:"Transporter",items:[
  ["tr1","Transporter booked; business name, driver's name and mobile saved"],
  ["tr2","Direct solo run, or you know exactly which animals share the van","Every other dog on board is a parvo risk for a C3-only puppy",true],
  ["tr3","Air-conditioned vehicle with temperature monitoring; crates secured","November in the Hunter can top 30 °C",true],
  ["tr4","Crates and van disinfected between animals with a parvo-effective product"],
  ["tr5","Oreo stays crated the whole trip: never put down on grass at rest stops",null,true],
  ["tr6","Estimated time in transit and planned stops agreed","Direct is about 1 hr 45 min; multi-drop runs can take many hours"],
  ["tr7","Water and bedding plan for the trip (absorbent liner in his crate)"],
  ["tr8","Photo or GPS updates during the trip"],
  ["tr9","What the driver does if he's unwell en route, and which vet they'd use"],
  ["tr10","Insurance, terms and payment confirmed in writing"],
  ["tr11","Hand-over at your door or the car park, not a public grassy spot"],
  ["tr12","The breeder has the transporter's details and the dispatch time"]]},
 homekit:{title:"Home kit",items:[
  ["hk1","X-pen set up with grass tray at one end, bed at the other"],
  ["hk2","Crate beside your bed for the first nights"],
  ["hk3","Water bowl + the breeder's food measured for the first meal"],
  ["hk4","Scales ready to weigh him on arrival"],
  ["hk5","Towels, paper towel, enzyme spray, bin bags"],
  ["hk6","Phone charged for arrival photos and video"],
  ["hk7","Honey in the pantry (low-blood-sugar first aid)"],
  ["hk8","Emergency vet numbers saved; own-vet check booked within 72 h",null,true]]},
 handover:{title:"Handover",ready:true,items:[
  ["ho1","Microchip number + NSW Pet Registry ownership transfer started by delivery day","Breeder's BIN (breeder identification number) on the paperwork",true],
  ["ho2","C3 vaccination certificate: vet-signed, with date and batch label",null,true],
  ["ho3","Worming record: brand, dose and dates; when the next one is due"],
  ["ho4","Any flea/tick/heartworm product already given (name + date)","Avoids double-dosing on your first tick chew"],
  ["ho5","Vet health check record from the litter"],
  ["ho6","Sale contract, receipt and health-guarantee terms","Note the deadline for your own vet check"],
  ["ho7","Parents' DNA/health test results","e.g. PRA-prcd, episodic falling, curly coat/dry eye; Cavalier parent's heart (MVD) check"],
  ["ho8","Exact food brand + formula, amounts, meal times, a few days' supply"],
  ["ho9","What surface he toilets on now (grass? paper?)","Helps the switch to your real-grass tray"],
  ["ho10","Blanket rubbed with mum and littermates, travelling in his crate"],
  ["ho11","Weight on dispatch day","Log it on the Vet tab for tick-chew dosing"],
  ["ho13","Originals packed with the transporter in a labelled envelope"],
  ["ho12","Sounds/handling he's already met; sleep habits"]]}
};
const PREP=[
 {id:"sleep",icon:"bed",title:"Sleep & crate",items:[
  ["s1","Crate ~61 cm (24\") with divider","Divider keeps the space small so he won't toilet in one end"],
  ["s2","Crate cover + washable vet-bed"],
  ["s3","Heartbeat-style snuggle toy + wrapped warm water bottle"],
  ["s4","White-noise app or machine (masks Pacific Hwy and lift noise)"],
  ["s5","Crate set up beside your bed for week 1"],
  ["s6","Baby gate(s) for the laundry/bathroom doorway"]]},
 {id:"balcony",icon:"shield-alert",title:"4th-floor balcony & real-grass potty",crit:true,items:[
  ["b1","Measure every gap: under glass, between balusters, beside drains","Anything over ~5 cm counts as passable",true],
  ["b2","UV-stabilised 5 mm HDPE mesh or clear acrylic fixed along the lower balustrade","Zip ties every 15–20 cm, pulled taut so he can't push a bulge through",true],
  ["b3","Clear climbables away from the edge: chairs, planters, storage boxes",null,true],
  ["b4","Balcony door lock or child latch; it can't be left ajar"],
  ["b5","House rule printed on the door: \"Door open = Oreo on lead\"",null,true],
  ["b6","Shade for summer tiles (they burn paws above ~30 °C)"],
  ["b7","X-pen (8 panels, 60–80 cm high) in the laundry or bathroom"],
  ["b8","Two real-grass trays (e.g. Potty Plant-style hydroponic turf) + waterproof base","Rotate; replace turf every 1–3 weeks"],
  ["b9","No fabric pee pads; rugs and bath mats rolled up for now","Fabric teaches \"soft = toilet\""],
  ["b10","Enzyme cleaner stocked (not ammonia-based)"],
  ["b11","Strata/building manager told about the removable balcony mesh"]]},
 {id:"coat",icon:"scissors",title:"Curly coat grooming kit",items:[
  ["g1","Soft slicker brush"],
  ["g2","Metal comb with wide + fine teeth"],
  ["g3","Detangling spray"],
  ["g4","Gentle puppy shampoo + microfibre towel"],
  ["g5","Vet-recommended ear cleaner + cotton balls"],
  ["g6","Nail clippers or quiet grinder + styptic powder"],
  ["g7","Lick mat (for grooming and handling sessions)"],
  ["g8","Groomer shortlisted for a puppy intro visit after vaccines"]]},
 {id:"enrich",icon:"puzzle",title:"Enrichment & feeding",items:[
  ["e1","4 × puppy Kong (rotate frozen ones)"],
  ["e2","Snuffle mat + a beginner puzzle feeder"],
  ["e3","Safe chews (no rawhide, no cooked bones)"],
  ["e4","Stainless bowls; slow-feeder for later"],
  ["e5","Tiny soft training treats + treat pouch"],
  ["e6","Y-front adjustable harness + flat collar + ID tag + 1.8 m lead"],
  ["e7","Puppy sling or pram for pre-vaccine socialisation outings"],
  ["e8","Old phone set up as a pet camera"]]},
 {id:"proof",icon:"plug",title:"Puppy-proofing",items:[
  ["p1","Cables covered or lifted (desk, TV, chargers)"],
  ["p2","Child locks on low cupboards with cleaners or medicines"],
  ["p3","Bins with lids; shoes and socks off the floor"],
  ["p4","Toxic houseplants moved up (e.g. sago palm, lilies, dieffenbachia)"],
  ["p5","Asked building manager about rat bait and snail pellets in common areas",null,true]]},
 {id:"admin",icon:"landmark",title:"NSW admin & strata",items:[
  ["a1","Service NSW login works; NSW Pet Registry account ready"],
  ["a2","Registration $84 paid within 28 days of delivery",null,true],
  ["a3","Owners corporation notified in writing per pet by-law"],
  ["a4","Own-vet health check booked within 72 h of delivery",null,true],
  ["a5","C5 + lepto #1 appointment booked for 10–12 weeks"],
  ["a6","Pet insurance decided before the first vet visit"],
  ["a7","Puppy preschool found (vet-run, cleaned indoor floor)"],
  ["a8","Emergency vet numbers saved in every adult's phone"],
  ["a9","Neighbours given a heads-up note"],
  ["a10","Dog walker or daycare shortlisted for after mid-January"]]}
];
const ALONE=[
 {id:"ph1",title:"Phase 1 · Foundations",span:[0,6],sub:"Week 1 at home",items:[
  ["al1","All meals happen in the pen, door open at first"],
  ["al2","Capturing Calmness: reward settling on his own 5+ times a day"],
  ["al3","3+ micro-separations a day: step behind the gate 5–30 s, come back before any fuss, come back boring"],
  ["al4","Care rota agreed: you do nights and mornings, Mum does midday, shift-worker does evenings"],
  ["al5","Baseline video: film 5 minutes alone so you know his normal"]]},
 {id:"ph2",title:"Phase 2 · Out of sight while everyone's home",span:[7,20],sub:"Weeks 2–3",items:[
  ["al6","2–3 daily \"Home Alone While Everyone Is Home\" sessions: Oreo in the pen with a frozen Kong, door or gate closed, every adult elsewhere, nobody talks to him"],
  ["al7","Build from 2 to 20 minutes using the log (two calm reps before going longer)"],
  ["al8","Open the gate only after a few seconds of quiet; if he's frantic, the session was too long, so halve the next one"],
  ["al9","Defuse departure cues: pick up keys, put on shoes, grab a bag, then sit back down"],
  ["al10","Pet camera on during every session"]]},
 {id:"ph3",title:"Phase 3 · Real departures",span:[21,51],sub:"December",items:[
  ["al11","Once a day the whole household leaves the flat: 5 → 60 minutes (coffee in Waitara, a lap of the car park)"],
  ["al12","Mum takes 2–3 half-days out a week from mid-December"],
  ["al13","Office-day rehearsal: you leave for 2 hours with a frozen Kong"],
  ["al14","Keep reps going through Christmas; NYE plan: someone home, white noise, Kong at 9 pm and midnight"]]},
 {id:"ph4",title:"Phase 4 · Dress rehearsal",span:[52,66],sub:"Early January",items:[
  ["al15","Run the after-mid-January schedule for real at least 3 days a week"],
  ["al16","Mum does no routine care (meals, toilet trips, bedtime) any more"],
  ["al17","Oreo copes calmly with 2–3 hours alone on camera"],
  ["al18","Dog walker or daycare trial booked for after his final vaccine + 14 days"]]},
 {id:"ph5",title:"Phase 5 · Maintenance",span:[67,9999],sub:"From the day Mum leaves",items:[
  ["al19","On WFH days, still do one alone session behind a closed door"],
  ["al20","Know the red flags: drooling, damage at the door, long howling, toileting only when alone, ignoring food when alone. Any of these → vet, and ask about a veterinary behaviourist"]]}
];

/* schedules */
const SCHED={
 nov:{note:"Meal 4 drops at about 12 weeks: fold it into dinner. Home-alone reps run while everyone is still home.",rows:[
  ["06:00","Wake → carried to grass tray","You","potty"],
  ["06:10","Breakfast (meal 1) in pen → toilet","You","meal"],
  ["06:30","Play, 3-min training (name game, sit), 2-min brush","You","train"],
  ["07:00","Nap in pen, laundry door closed while family has breakfast","—","alone"],
  ["09:00","Wake → toilet → calm play","Mum","potty"],
  ["09:20","Carried socialisation outing (sling/pram), e.g. Waitara station from a distance","Mum","train"],
  ["10:00","Nap in pen, nobody in the room","—","nap"],
  ["11:45","Wake → toilet → lunch (meal 2) → short game","You (lunch break)","meal"],
  ["12:30","Nap","—","nap"],
  ["14:30","Wake → toilet → play","Mum","potty"],
  ["15:00","Meal 3 in a frozen Kong; whole household leaves the flat (alone rep)","Everyone out","alone"],
  ["15:30","Nap","—","nap"],
  ["17:30","Wake → toilet → handling, line-brushing, training","Shift worker / You","train"],
  ["18:30","Meal 4 → toilet","Shift worker","meal"],
  ["19:00","Capturing Calmness on his mat during family dinner","Anyone","train"],
  ["19:30","Nap","—","nap"],
  ["21:30","Toilet, quiet play, tick check","You","potty"],
  ["22:30","Last toilet → crate beside your bed","You","potty"],
  ["~02:30","Silent toilet trip (first ~2 weeks only)","You","potty"]]},
 jan:{note:"At 4–6 months, keep any stretch alone to about 3–4 hours before a toilet break. Ground walks only from 14 days after the final C5.",rows:[
  ["06:30","Wake → toilet (grass tray, or lift down once vaccinated)","You","potty"],
  ["06:45","Breakfast in a puzzle feeder","You","meal"],
  ["07:00","Short sniffy walk, 15–20 min","You","train"],
  ["07:30","5-min training → settle in pen with a chew","You","train"],
  ["08:30","Work starts. WFH: Oreo in pen behind a closed door. Office: frozen Kong + camera","—","alone"],
  ["12:00","WFH: toilet, play, meal 2. Office: dog walker or daycare visit","You / walker","meal"],
  ["12:45","Back in pen, nap","—","alone"],
  ["15:00","Toilet + 10-min sniff break (WFH days)","You","potty"],
  ["17:30","Walk or sniffari, then training","You / shift worker","train"],
  ["18:30","Dinner (meal 3) → calm time on mat","Anyone","meal"],
  ["21:30","Last toilet, tick check → bed","You","potty"]]}
};

const SOCIAL=[
 ["Waitara soundscape",[["w1","Trains arriving at Waitara station (from a distance)"],["w2","Station PA announcements"],["w3","Pacific Hwy buses and trucks"],["w4","Motorbikes"],["w5","Ambulance sirens (Hornsby Hospital is close)"],["w6","Garbage truck on your street"],["w7","Building lift ride + lift chime"],["w8","Intercom buzzer and door knocks"],["w9","Car-park roller door and echoes"]]],
 ["Household",[["h1","Vacuum cleaner (off → on at a distance)"],["h2","Hair dryer (prepares him for grooming dryers)"],["h3","Blender and coffee grinder"],["h4","Washing machine spin"],["h5","Dropped pot or pan"],["h6","Teams calls and phone ringtones"]]],
 ["People",[["pp1","Men with beards, hats and sunglasses"],["pp2","Couriers in hi-vis with parcels"],["pp3","Open umbrellas"],["pp4","Children (calm, supervised, at a distance)"],["pp5","Elderly people with walking frames"],["pp6","Bikes, scooters and skateboards"]]],
 ["Handling & surfaces",[["hs1","Paws, nails and between toes"],["hs2","Ears and mouth (vet-check rehearsal)"],["hs3","Collar grab → treat"],["hs4","Towel dry and brush"],["hs5","Tiles, rubber mat, wobble cushion"],["hs6","Car rides (short, ending somewhere nice)"]]],
 ["Summer specials",[["ss1","Fireworks recording (NYE!) at low volume during meals"],["ss2","Thunderstorm recording"],["ss3","Sprinklers and hoses"]]]
];

const TOX=[
 ["Chocolate & cocoa","danger","Theobromine: vomiting, racing heart, seizures. Dark and baking chocolate are worst; watch Christmas and Easter treats."],
 ["Grapes, raisins, sultanas, currants","danger","Can cause kidney failure even in small amounts. Hidden in Christmas pudding, fruit cake, hot cross buns and trail mix."],
 ["Xylitol (birch sugar)","danger","Sugar-free gum, mints, some peanut butters and toothpaste. Crashes blood sugar within minutes; can cause liver failure."],
 ["Onion, garlic, leek, chives","danger","Damage red blood cells, including powders in gravy, stock, sausages and takeaway."],
 ["Macadamia nuts","danger","Weakness, wobbly back legs, tremors, fever."],
 ["Alcohol","danger","Even small amounts drop blood sugar and body temperature in a 2–3 kg puppy."],
 ["Caffeine (coffee, tea bags, pods, energy drinks)","danger","Restlessness, racing heart, tremors. Used coffee pods and grounds count."],
 ["Cooked bones (BBQ, roast chook, chops)","danger","Splinter and cause blockages or perforations."],
 ["Ham, fat trimmings, crackling, sausages","danger","High fat can trigger pancreatitis: a common Christmas emergency."],
 ["Corn cobs","danger","Classic intestinal blockage."],
 ["Raw bread or pizza dough","danger","Expands in the stomach and produces alcohol."],
 ["Mouldy food & compost","danger","Mould toxins cause tremors and seizures within hours."],
 ["Stone-fruit pits & mango seeds","danger","Blockage risk; pits also contain cyanogenic compounds."],
 ["Snail & slug pellets","danger","Metaldehyde causes severe seizures. Check strata gardens."],
 ["Rat & mouse bait","danger","Anticoagulants cause bleeding days later. Ask about building pest control."],
 ["Human medicines (ibuprofen, paracetamol, antidepressants, ADHD meds)","danger","Small doses can be fatal for a puppy. Keep handbags zipped and off the floor."],
 ["Nicotine (cigarettes, vapes, gum)","danger","Vomiting, tremors, collapse."],
 ["Button batteries","danger","Burn through the gut within hours. X-ray needed."],
 ["Wild mushrooms","danger","Pop up in parks after summer rain; some cause liver failure."],
 ["Sago palm","danger","Common garden plant; every part can cause liver failure."],
 ["Nutmeg","danger","Found in eggnog and baking; causes tremors and disorientation."],
 ["Salt dough, play dough, rock salt","danger","Salt poisoning: vomiting, tremors, seizures."],
 ["Avocado","caution","Low toxin risk in dogs, but the stone blocks guts and the fat upsets stomachs."],
 ["Blue cheese","caution","Mould compounds can cause tremors in large amounts."],
 ["Milk, ice cream","caution","Lactose often causes diarrhoea."],
 ["Peanut butter","caution","Fine only if xylitol-free and unsalted; read the label every time."],
 ["Apple cores & seeds","caution","Flesh is fine; the core is a choking risk and seeds contain cyanogenic compounds."],
 ["Cherries","caution","Flesh OK in tiny amounts; pits and stems are the problem."],
 ["Tomato (green parts)","caution","Ripe flesh OK; leaves, stems and green tomatoes can upset stomachs."],
 ["Raw meat & raw bones","caution","Bacterial risk and a fracture or choking risk. Discuss with your vet before feeding."],
 ["Carrot","safe","Raw or cooked; great frozen for teething."],
 ["Apple (no core or seeds)","safe","Thin slices as treats."],
 ["Blueberries","safe","Bite-size training treats."],
 ["Banana","safe","Small pieces; high in sugar."],
 ["Watermelon (seedless, no rind)","safe","Hydrating summer treat."],
 ["Strawberries","safe","Small pieces."],
 ["Cucumber","safe","Very low calorie crunch."],
 ["Green beans","safe","Plain, cooked or raw."],
 ["Pumpkin (plain cooked)","safe","Good Kong filler; can firm up soft stools."],
 ["Sweet potato (plain cooked)","safe","Small amounts."],
 ["Chicken (plain cooked, boneless, skinless)","safe","High-value reward for vet visits."],
 ["Egg (plain cooked)","safe","No butter, salt or onion."],
 ["Salmon (plain cooked, boneless)","safe","No skin seasoning."],
 ["Plain Greek yoghurt","safe","Unsweetened and xylitol-free; a teaspoon as a Kong seal."],
 ["Rice (plain cooked)","safe","Bland diet base if your vet suggests one."],
 ["Mango flesh (no seed)","safe","Small amounts."],
 ["Zucchini & broccoli","safe","Small cooked pieces."]
];

/* ---------------- rendering: checklists ---------------- */
function ckHTML([id,t,tip,crit]){
  return `<label class="ck si" for="ck-${id}"><input type="checkbox" id="ck-${id}" data-ck="${id}" ${S.checks[id]?"checked":""}><span><span class="t">${esc(t)}</span>${crit?'<span class="crit">critical</span>':""}${tip?`<span class="tip">${esc(tip)}</span>`:""}</span></label>`;
}
function renderLists(){
  for(const k in LISTS){const el=$(`[data-list="${k}"]`);if(el)el.innerHTML=LISTS[k].items.map(ckHTML).join("");}
  $("#prepGroups").innerHTML=PREP.map(g=>`<div class="card${g.crit?" alert":""}" data-group="${g.id}">
    <div class="grp-head"><h3 class="!mb-0"><i data-lucide="${g.icon}"></i>${esc(g.title)}</h3><span class="grp-count" data-count="${g.id}"></span></div>
    <div class="bar light mb-2"><span data-gbar="${g.id}" style="width:0%"></span></div>
    ${g.items.map(ckHTML).join("")}</div>`).join("");
  renderPhases();
}
function phaseIndex(){
  const p=pd(S.cfg.pickup),m=pd(S.cfg.momLeaves),t=today();
  if(!p)return 0;const d=days(p,t);
  if(m&&t>=m)return 4;
  for(let i=0;i<ALONE.length;i++){const [a,b]=ALONE[i].span;if(d>=a&&d<=b)return i;}
  return d<0?0:3;
}
function renderPhases(){
  const now=phaseIndex(),p=pd(S.cfg.pickup),m=pd(S.cfg.momLeaves);
  $("#phases").innerHTML=ALONE.map((ph,i)=>{
    let when=ph.sub;
    if(p&&i<4){const a=add(p,ph.span[0]);let b=add(p,Math.min(ph.span[1],400));if(i===3&&m)b=add(m,-1);when+=` · ${fmt(a)} – ${fmt(b)}`;}
    if(i===4&&m)when+=` · ${fmt(m)}`;
    return `<div class="phase${i===now?" now":""}"><div class="flex justify-between gap-2 flex-wrap items-center"><strong class="display text-lg">${esc(ph.title)}</strong>
      <span class="pill ${i===now?"acc":"mute"}">${i===now?"Now · ":""}${esc(when)}</span></div>${ph.items.map(ckHTML).join("")}</div>`;}).join("");
}
function allIds(groups){return groups.flatMap(g=>g.items.map(i=>i[0]));}
function updateProgress(){
  const sets={transport:LISTS.transport.items.map(i=>i[0]),homekit:LISTS.homekit.items.map(i=>i[0]),handover:LISTS.handover.items.map(i=>i[0]),alone:allIds(ALONE)};
  PREP.forEach(g=>sets[g.id]=g.items.map(i=>i[0]));
  for(const k in sets){const n=sets[k].filter(id=>S.checks[id]).length,tot=sets[k].length;
    $$(`[data-count="${k}"]`).forEach(e=>e.textContent=`${n}/${tot}`);
    const gb=$(`[data-gbar="${k}"]`);if(gb)gb.style.width=(100*n/tot)+"%";}
  const ready=[...sets.transport,...sets.homekit,...sets.handover,...allIds(PREP)];
  const n=ready.filter(id=>S.checks[id]).length,pct=Math.round(100*n/ready.length);
  $("#readyTxt").textContent=`${pct}% · ${n}/${ready.length} tasks`;
  $("#readyBar span").style.width=pct+"%";$("#readyBar").setAttribute("aria-valuenow",pct);
}

/* ---------------- dashboard ---------------- */
function vaxPlan(){
  const dob=pd(S.cfg.dob)||new Date(2026,8,15),p=pd(S.cfg.pickup);
  const L1=pd(S.dates.lepto1),C5f=pd(S.dates.c5b);
  const plan=[
   {id:"c3",name:"C3 (parvo, distemper, hepatitis)",by:"The breeder's vet",from:add(dob,42),to:add(dob,56)},
   {id:"vetchk",name:"Own-vet health check",by:"Your vet",from:p||add(dob,56),to:add(p||add(dob,56),3)},
   {id:"c5a",name:"C5 #1 (adds kennel cough)",by:"Your vet",from:add(dob,70),to:add(dob,84)},
   {id:"lepto1",name:"Leptospirosis #1",by:"Same visit as C5 #1",from:add(dob,70),to:add(dob,84)},
   {id:"lepto2",name:"Leptospirosis #2",by:"2–4 weeks after lepto #1",from:L1?add(L1,14):add(dob,84),to:L1?add(L1,28):add(dob,112)},
   {id:"c5b",name:"C5 final puppy dose",by:"At or after 16 weeks (WSAVA)",from:add(dob,112),to:add(dob,126)},
   {id:"annual",name:"First annual booster (C5 + lepto)",by:"12 months after final dose",from:addM(C5f||add(dob,112),12),to:add(addM(C5f||add(dob,112),12),28)}
  ];
  return plan;
}
function parkDay(){const C5f=pd(S.dates.c5b);const dob=pd(S.cfg.dob)||new Date(2026,8,15);return add(C5f||add(dob,112),14);}
function renderTimeline(){
  const dob=pd(S.cfg.dob)||new Date(2026,8,15),p=pd(S.cfg.pickup),m=pd(S.cfg.momLeaves),t=today();
  const L1=pd(S.dates.lepto1);
  const ev=[
   [p,"Delivery to Waitara","8 weeks old · pet transport from the breeder"],
   [p&&add(p,3),"Own-vet health check deadline","Within 72 h of delivery"],
   [add(dob,70),"C5 #1 + Lepto #1 window opens","10–12 weeks"],
   [p&&add(p,28),"NSW registration late-fee date","Pay the $84 before this"],
   [L1?add(L1,14):add(dob,84),"Lepto #2 window opens","2–4 weeks after lepto #1"],
   [add(dob,84),"Socialisation window starts closing","12–16 weeks: carried outings matter most now"],
   [new Date(2026,11,31),"New Year's Eve fireworks","Someone home with him; white noise + Kong"],
   [add(dob,112),"Final C5 (16 weeks)","WSAVA recommends the last puppy dose at 16 weeks or later"],
   [m,"The Mid-January Cliff","Mum leaves; separation protocol should be at Phase 5"],
   [parkDay(),"Parks & ground walks","14 days after final C5"],
   [add(dob,182),"6 months: desexing deadline (or vet letter)","Avoids the $198 additional registration fee"]
  ].filter(e=>e[0]).sort((a,b)=>a[0]-b[0]);
  let nextFound=false;
  $("#timeline").innerHTML=ev.map(([d,ti,sub])=>{
    const past=d<t;let cls=past?"past":"";
    if(!past&&!nextFound){cls="now";nextFound=true;}
    const wk=Math.floor(days(dob,d)/7);
    return `<div class="tl-item ${cls} si"><div class="tl-date">${fmt(d)}<div class="muted text-xs">${wk} wks old</div></div>
      <div><div class="tl-title font-bold">${esc(ti)}${cls==="now"?' <span class="pill acc">next</span>':""}</div><div class="muted text-sm">${esc(sub)}</div></div></div>`;}).join("");
}
function tick(){
  const p=S.cfg.pickup?new Date(S.cfg.pickup):null;const now=new Date();
  const dob=pd(S.cfg.dob);
  if(dob){const d=days(dob,today());$("#ageNow").textContent=d<0?"Not born yet":`Oreo is ${Math.floor(d/7)} wks ${d%7} d old`;}
  if(!p||isNaN(p)){return;}
  let diff=p-now;
  const lbl=["days","hrs","min","sec"];
  if(diff>0){["#cdD","#cdH","#cdM","#cdS"].forEach((id,i)=>$(id).nextElementSibling.textContent=lbl[i]);$("#cdTitle").textContent="Delivery countdown";$("#cdSub").textContent=`ETA ${p.toLocaleString("en-AU",{weekday:"long",day:"numeric",month:"long",hour:"numeric",minute:"2-digit"})} · pet transport from the breeder`;
    const D=Math.floor(diff/864e5);diff-=D*864e5;const H=Math.floor(diff/36e5);diff-=H*36e5;const M=Math.floor(diff/6e4);diff-=M*6e4;const s=Math.floor(diff/1e3);
    $("#cdD").textContent=D;$("#cdH").textContent=String(H).padStart(2,"0");$("#cdM").textContent=String(M).padStart(2,"0");$("#cdS").textContent=String(s).padStart(2,"0");}
  else{const d=Math.floor((now-p)/864e5);$("#cdTitle").textContent="Oreo is home";$("#cdSub").textContent=`Day ${d+1} in Waitara`;
    const m=pd(S.cfg.momLeaves);const toM=m?days(today(),m):null;
    $("#cdD").textContent=d+1;$("#cdD").nextElementSibling.textContent="days home";
    $("#cdH").textContent=toM!==null&&toM>0?toM:"–";$("#cdH").nextElementSibling.textContent="to mid-Jan";
    $("#cdM").textContent=String(S.alone.length);$("#cdM").nextElementSibling.textContent="alone reps";
    $("#cdS").textContent=S.weights.length?S.weights[S.weights.length-1].kg:"–";$("#cdS").nextElementSibling.textContent="kg";}
}

/* ---------------- schedule ---------------- */
function renderSched(){
  const k=S.cfg.schedule in SCHED?S.cfg.schedule:"nov";
  $$("[data-sched]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.sched===k)));
  const kinds={potty:"Toilet",meal:"Meal",nap:"Nap",train:"Train/play",alone:"Alone rep"};
  $("#schedTbl").innerHTML=`<thead><tr><th>Time</th><th>What happens</th><th>On duty</th></tr></thead><tbody>${SCHED[k].rows.map(r=>
    `<tr class="si ${r[3]==="alone"?"al":r[3]==="nap"?"hl":""}"><td class="time">${r[0]}</td><td>${esc(r[1])} <span class="pill ${r[3]==="alone"?"warn":r[3]==="nap"?"acc":"mute"} ml-1">${kinds[r[3]]}</span></td><td class="muted">${esc(r[2])}</td></tr>`).join("")}</tbody>`;
  $("#schedNote").textContent=SCHED[k].note;
}

/* ---------------- alone log ---------------- */
function renderAlone(){
  const L=S.alone.slice().sort((a,b)=>b.d.localeCompare(a.d)||b.t-a.t);
  const t=today(),wk=add(t,-6);
  const week=S.alone.filter(e=>{const d=pd(e.d);return d&&d>=wk&&d<=t;});
  const calm=S.alone.filter(e=>e.how==="calm");
  const longest=calm.reduce((m,e)=>Math.max(m,+e.min),0);
  const last2=L.slice(0,2);
  let next=2;
  if(L.length){const cur=+L[0].min;if(L[0].how==="distress")next=Math.max(0.5,cur/2);else if(last2.length===2&&last2.every(e=>e.how==="calm")&&+last2[1].min>=cur)next=Math.round(cur*1.5*2)/2;else next=cur;}
  $("#aloneStats").innerHTML=`<div><b>${week.length}</b><span>reps in the last 7 days (aim 14+)</span></div><div><b>${longest}</b><span>longest calm rep (min)</span></div>
   <div><b>${next}</b><span>suggested next rep (min)</span></div><div><b>${S.alone.filter(e=>e.how==="distress").length}</b><span>distressed reps logged</span></div>`;
  const lab={calm:'<span class="pill ok">Calm</span>',mild:'<span class="pill warn">Mild</span>',distress:'<span class="pill danger">Distressed</span>'};
  $("#aloneTbl").innerHTML=L.length?`<thead><tr><th>Date</th><th>Minutes</th><th>Coped</th><th></th></tr></thead><tbody>${L.slice(0,30).map(e=>
    `<tr><td>${fmtY(pd(e.d))}</td><td class="num">${esc(e.min)}</td><td>${lab[e.how]||""}</td><td class="text-right"><button class="ibtn" data-del-alone="${esc(e.t)}" aria-label="Delete entry"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button></td></tr>`).join("")}</tbody>`
   :`<tbody><tr><td class="muted">No reps yet. Day 1 target: three 30-second gaps behind the gate.</td></tr></tbody>`;
}

/* ---------------- social ---------------- */
function renderSocial(){
  let done=0,tot=0;
  $("#socGrid").innerHTML=SOCIAL.map(([g,items])=>`<div class="mb-3"><h4 class="display font-bold mt-2 mb-1">${esc(g)}</h4>${items.map(([id,t])=>{
    const n=S.social[id]||0;tot++;if(n>=3)done++;
    return `<div class="soc si"><div class="lbl">${esc(t)}</div><div class="dots" aria-label="${n} exposures">${[0,1,2,3,4].map(i=>`<i class="${i<n?"on":""}"></i>`).join("")}</div>
      <button class="ibtn" data-soc="${id}" data-d="-1" aria-label="Remove exposure">−</button><button class="ibtn" data-soc="${id}" data-d="1" aria-label="Add exposure">+</button></div>`;}).join("")}</div>`).join("");
  $("#socCount").textContent=`${done}/${tot} at 3+`;
}

/* ---------------- calculator ---------------- */
function ageWeeksToday(){const dob=pd(S.cfg.dob);if(!dob)return 8;return Math.min(52,Math.max(8,Math.floor(days(dob,today())/7)));}
function calc(){
  const kg=+S.cfg.curWeight,age=+S.cfg.calcAge,kc=+S.cfg.kcal||3900,wp=(+S.cfg.wetPct||0)/100,wk=+S.cfg.wetKcal||1000;
  const rer=70*Math.pow(kg,0.75);const f=age<16?3:age<26?2.5:2;const mer=rer*f;
  const meals=age<=12?4:age<=26?3:2;
  const food=mer*0.9;const dry=food*(1-wp)/kc*1000,wet=food*wp/wk*1000;
  return {kg,age,rer,f,mer,meals,dry,wet,treat:mer*0.1};
}
function renderCalc(){
  const c=calc();
  $("#cWeight").value=S.cfg.curWeight;$("#cWeightV").textContent=(+S.cfg.curWeight).toFixed(1);
  $("#cAge").value=S.cfg.calcAge;$("#cAgeV").textContent=S.cfg.calcAge;
  $("#cKcal").value=S.cfg.kcal;$("#cWet").value=S.cfg.wetPct;$("#cWetV").textContent=S.cfg.wetPct;$("#cWetKcal").value=S.cfg.wetKcal;
  $("#calcOut").innerHTML=`<div><b>${Math.round(c.mer)}</b><span>kcal per day (× ${c.f} resting)</span></div>
   <div><b>${Math.round(c.dry)} g</b><span>kibble per day${c.wet?` + ${Math.round(c.wet)} g wet`:""}</span></div>
   <div><b>${c.meals} × ${Math.round(c.dry/c.meals)} g</b><span>meals per day${c.wet?` (+${Math.round(c.wet/c.meals)} g wet each)`:""}</span></div>
   <div><b>${Math.round(c.treat)}</b><span>kcal for treats (10%; already deducted)</span></div>`;
  const steps=[["Days 1–2",.75],["Days 3–4",.5],["Days 5–6",.25],["Day 7+",0]];
  $("#transTbl").innerHTML=`<thead><tr><th>Days</th><th>Breeder's food</th><th>New food</th></tr></thead><tbody>${steps.map(([d,o])=>
    `<tr class="si"><td class="time">${d}</td><td class="num">${Math.round(o*100)}% · ${Math.round(c.dry*o)} g</td><td class="num">${Math.round((1-o)*100)}% · ${Math.round(c.dry*(1-o))} g</td></tr>`).join("")}</tbody>`;
}

/* ---------------- toxic ---------------- */
let toxFilter="all";
function renderTox(){
  const q=($("#toxQ").value||"").trim().toLowerCase();
  const lab={danger:'<span class="pill danger">Dangerous</span>',caution:'<span class="pill warn">Caution</span>',safe:'<span class="pill ok">Safe in small plain amounts</span>'};
  const rows=TOX.filter(r=>(toxFilter==="all"||r[1]===toxFilter)&&(!q||(r[0]+" "+r[2]).toLowerCase().includes(q)));
  $("#toxList").innerHTML=rows.length?rows.map(r=>`<div class="tox si"><div>${lab[r[1]]}</div><div><strong>${esc(r[0])}</strong><div class="muted text-sm">${esc(r[2])}</div></div></div>`).join("")
    :`<p class="muted p-2">Not in the list. If unsure, don't feed it, and ask your vet or the Animal Poisons Helpline.</p>`;
}

/* ---------------- vet ---------------- */
function statusPill(done,from,to){const t=today();
  if(done)return '<span class="pill ok">Done</span>';
  if(t>to)return '<span class="pill danger">Overdue</span>';
  if(t>=from)return '<span class="pill warn">Due now</span>';
  const d=days(t,from);return `<span class="pill mute">in ${d} d</span>`;}
function dateRow(id,name,by,from,to){
  const done=S.dates[id]||"";
  return `<tr class="si"><td><strong>${esc(name)}</strong><div class="muted text-xs">${esc(by)}</div></td>
   <td class="num whitespace-nowrap">${fmt(from)}${to&&+to!==+from?` –<br>${fmt(to)}`:""}</td>
   <td><input class="inp" type="date" data-date="${id}" value="${esc(done)}" aria-label="${esc(name)} date given" style="min-width:140px"></td>
   <td>${statusPill(!!done,from,to||from)}</td></tr>`;}
function renderVet(){
  const head='<thead><tr><th>Item</th><th>Due window</th><th>Date given</th><th>Status</th></tr></thead>';
  $("#vaxTbl").innerHTML=head+"<tbody>"+vaxPlan().map(v=>dateRow(v.id,v.name,v.by,v.from,v.to)).join("")+"</tbody>";
  const dob=pd(S.cfg.dob)||new Date(2026,8,15);
  const w=[];
  [8,10,12].forEach(n=>w.push([`w${n}`,`Week ${n}`,n===8?"Breeder may give this; check handover":"Every 2 weeks to 12 wks",add(dob,n*7)]));
  [4,5,6].forEach(m=>w.push([`wm${m}`,`Month ${m}`,"Monthly to 6 months",addM(dob,m)]));
  [9,12].forEach(m=>w.push([`wm${m}`,`Month ${m}`,"Then every 3 months for life",addM(dob,m)]));
  $("#wormTbl").innerHTML=head+"<tbody>"+w.map(([id,n,by,d])=>dateRow(id,n,by,d,add(d,3))).join("")+"</tbody>";
  const p=pd(S.cfg.pickup)||add(dob,56);
  const tk=[];for(let i=0;i<7;i++){const d=addM(p,i);tk.push([`tk${i}`,`${S.cfg.tickProd} #${i+1}`,i===0?"First dose: confirm with breeder/vet":"Same date each month",d]);}
  $("#tickTbl").innerHTML=head+"<tbody>"+tk.map(([id,n,by,d])=>dateRow(id,n,by,d,add(d,2))).join("")+"</tbody>";
  $("#tickProd").value=S.cfg.tickProd;
}

/* ---------------- weights ---------------- */
function renderWeights(){
  const W=S.weights.slice().sort((a,b)=>a.d.localeCompare(b.d));
  const dob=pd(S.cfg.dob)||new Date(2026,8,15);
  $("#wTbl").innerHTML=W.length?`<thead><tr><th>Date</th><th>Age</th><th>kg</th><th>Tick-chew band</th><th></th></tr></thead><tbody>${W.slice().reverse().map(e=>{
    const d=pd(e.d),wk=Math.floor(days(dob,d)/7),kg=+e.kg;
    const band=S.cfg.tickProd==="NexGard Spectra"?(kg<2?"Too light (min 2 kg)":kg<=3.5?"2–3.5 kg":kg<=7.5?"3.6–7.5 kg":kg<=15?"7.6–15 kg":"15.1+ kg")
      :(kg<1.25?"Too light (min 1.25 kg)":kg<=2.5?"1.25–2.5 kg":kg<=5?"2.6–5 kg":kg<=10?"5.1–10 kg":"10.1+ kg");
    return `<tr><td>${fmtY(d)}</td><td class="num">${wk} wk</td><td class="num"><strong>${kg.toFixed(2)}</strong></td><td class="text-sm">${band}</td>
      <td class="text-right"><button class="ibtn" data-del-w="${esc(e.d)}" aria-label="Delete weight"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button></td></tr>`;}).join("")}</tbody>`
    :`<tbody><tr><td class="muted">No weights yet. Log the breeder's dispatch weight, then weigh him on arrival.</td></tr></tbody>`;
  // chart
  const box=$("#wChart");
  if(!W.length){box.innerHTML="";return;}
  const Wd=Math.max(300,Math.round(box.clientWidth||600)),Hd=Wd<500?200:250,ml=34,mr=14,mt=14,mb=28;
  const pts=W.map(e=>({x:days(dob,pd(e.d))/7,y:+e.kg,d:e.d}));
  const xMin=8,xMax=Math.max(20,Math.ceil(Math.max(...pts.map(p=>p.x))+2));
  const bandAt=x=>{const f=Math.min(1,Math.max(0,(x-8)/(52-8)));return [2+f*(7-2),3+f*(12-3)];};
  const yMax=Math.max(4,Math.ceil(Math.max(...pts.map(p=>p.y),bandAt(xMax)[1])+0.5));
  const X=x=>ml+(x-xMin)/(xMax-xMin)*(Wd-ml-mr),Y=y=>mt+(1-y/yMax)*(Hd-mt-mb);
  const yt=[];const step=yMax<=6?1:2;for(let v=0;v<=yMax;v+=step)yt.push(v);
  const xt=[];const xs=xMax-xMin<=16?2:4;for(let v=xMin;v<=xMax;v+=xs)xt.push(v);
  const bandPath=`M${X(xMin)},${Y(bandAt(xMin)[1])} L${X(xMax)},${Y(bandAt(xMax)[1])} L${X(xMax)},${Y(bandAt(xMax)[0])} L${X(xMin)},${Y(bandAt(xMin)[0])} Z`;
  const line=pts.map((p,i)=>`${i?"L":"M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const area=line+` L${X(pts[pts.length-1].x).toFixed(1)},${Y(0)} L${X(pts[0].x).toFixed(1)},${Y(0)} Z`;
  const last=pts[pts.length-1];
  box.innerHTML=`<svg class="chart" viewBox="0 0 ${Wd} ${Hd}" width="100%" role="img" aria-label="Oreo's weight by age in weeks">
    ${yt.map(v=>`<line class="grid" x1="${ml}" x2="${Wd-mr}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${ml-6}" y="${Y(v)+4}" text-anchor="end">${v}</text>`).join("")}
    ${xt.map(v=>`<text x="${X(v)}" y="${Hd-10}" text-anchor="middle">${v}w</text>`).join("")}
    <path class="band" d="${bandPath}"/>
    ${pts.length>1?`<path class="area" d="${area}"/><path class="line" d="${line}"/>`:""}
    ${pts.map((p,i)=>`<g><circle class="pt${i===pts.length-1?" end":""}" cx="${X(p.x)}" cy="${Y(p.y)}" r="5"/><circle class="hit" cx="${X(p.x)}" cy="${Y(p.y)}" r="16"><title>${fmtY(pd(p.d))}: ${p.y.toFixed(2)} kg (${Math.floor(p.x)} wk)</title></circle></g>`).join("")}
    <text x="${Math.min(X(last.x)+8,Wd-mr-60)}" y="${Y(last.y)-10}" style="fill:var(--ink);font-weight:700;font-size:13px">${last.y.toFixed(2)} kg</text>
    <text x="${ml}" y="${mt+2}" dy="-2">kg</text>
  </svg>`;
}

/* ---------------- tabs & search ---------------- */
let curTab="home";
function showTab(t){curTab=t;setTimeout(()=>{if(t==="vet")renderWeights(),icons();},0);$$(".tab").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===t)));
  $$(".panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===t));
  try{if(location.hash!=="#"+t)history.replaceState(null,"","#"+t);}catch(e){}}
function runSearch(){
  const q=$("#q").value.trim().toLowerCase();
  $$(".hide-s").forEach(e=>e.classList.remove("hide-s"));
  if(!q){document.body.classList.remove("searching");$("#searchInfo").classList.add("hidden");return;}
  document.body.classList.add("searching");
  let hits=0;
  $$(".panel").forEach(panel=>{
    let any=false;
    $$(".card, .lede",panel).forEach(card=>{
      if(card.parentElement.closest(".card"))return;
      const items=$$(".si",card);
      const head=($("h3",card)||{}).textContent||"";
      if(head.toLowerCase().includes(q)){any=true;hits+=Math.max(1,items.length);return;}
      if(items.length){let n=0;items.forEach(it=>{const m=it.textContent.toLowerCase().includes(q);it.classList.toggle("hide-s",!m);if(m)n++;});
        $$(".phase",card).forEach(ph=>{ph.classList.toggle("hide-s",!$$(".si:not(.hide-s)",ph).length);});
        $$("[data-group], .mb-3",card).forEach(g=>{if($$(".si",g).length)g.classList.toggle("hide-s",!$$(".si:not(.hide-s)",g).length);});
        if(n){any=true;hits+=n;}else card.classList.add("hide-s");}
      else{const m=card.textContent.toLowerCase().includes(q);card.classList.toggle("hide-s",!m);if(m){any=true;hits++;}}
    });
    panel.classList.toggle("hide-s",!any);
  });
  const info=$("#searchInfo");info.classList.remove("hidden");
  info.textContent=hits?`${hits} match${hits===1?"":"es"} for "${$("#q").value.trim()}" across all tabs. Clear the search to go back.`:`Nothing matches "${$("#q").value.trim()}". Try a shorter word.`;
}

/* ---------------- modal: backup / restore / reset ---------------- */
function openModal(title,html){$("#mTitle").textContent=title;$("#mBody").innerHTML=html;$("#modal").classList.add("open");icons();}
function closeModal(){$("#modal").classList.remove("open");}
function exportUI(){
  const json=JSON.stringify(Object.assign({exported:new Date().toISOString()},S),null,1);
  openModal("Backup Oreo's data",`<p class="muted text-sm mb-2">Copy this text somewhere safe (Notes, email to yourself). Restore pastes it back on any device.</p>
   <textarea class="inp" id="expTxt" rows="9" readonly>${esc(json)}</textarea>
   <div class="flex gap-2 flex-wrap mt-3"><button class="btn primary" id="expCopy" type="button"><i data-lucide="copy"></i>Copy</button>
   <button class="btn" id="expDl" type="button"><i data-lucide="download"></i>Download .json</button></div>
   <p class="muted text-xs mt-2">If Download is refused on your device, Copy always works.</p>`);
  $("#expCopy").onclick=async()=>{try{await navigator.clipboard.writeText(json);toast("Copied backup");}catch(e){const t=$("#expTxt");t.focus();t.select();toast("Select-all is on: copy manually");}};
  $("#expDl").onclick=async()=>{const fn=`oreo-hub-backup-${iso(today())}.json`;
    try{const dl=window.claude&&typeof claude.use==="function"?await claude.use("downloads"):null;
      if(dl){await dl.save({filename:fn,data:json});toast("Saved");return;}}catch(e){toast("Save cancelled: use Copy instead");return;}
    try{const b=new Blob([json],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=fn;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast("Download started");}catch(e){toast("Download blocked here: use Copy");}};
}
function importUI(){
  openModal("Restore from backup",`<p class="muted text-sm mb-2">Paste a backup, or choose a backup file. This replaces what's on this device.</p>
   <textarea class="inp" id="impTxt" rows="8" placeholder='{"v":1, ...}'></textarea>
   <input type="file" id="impFile" accept=".json,application/json" class="mt-2 text-sm">
   <p class="text-sm mt-2 hidden" id="impErr" style="color:var(--danger)"></p>
   <div class="flex gap-2 mt-3"><button class="btn primary" id="impGo" type="button"><i data-lucide="upload"></i>Restore</button></div>`);
  $("#impFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$("#impTxt").value=r.result;};r.readAsText(f);};
  $("#impGo").onclick=()=>{try{const o=JSON.parse($("#impTxt").value);if(!o||o.v!==1||!o.cfg)throw new Error("not an Oreo backup");
      S=merge(o);delete S.exported;save();renderAll();closeModal();toast("Restored");}
    catch(e){const el=$("#impErr");el.textContent="That doesn't look like an Oreo Hub backup. Paste the whole text, starting with {.";el.classList.remove("hidden");}};
}
function resetUI(){
  openModal("Reset all progress?",`<p class="mb-3">This clears every tick, date, weight and log on this device. Take a backup first if you might want it back.</p>
   <div class="flex gap-2 flex-wrap"><button class="btn" id="rsBackup" type="button"><i data-lucide="download"></i>Backup first</button><button class="btn danger" id="rsGo" type="button"><i data-lucide="rotate-ccw"></i>Yes, reset</button></div>`);
  $("#rsBackup").onclick=exportUI;
  $("#rsGo").onclick=()=>{S=clone(DEF);try{localStorage.removeItem(KEY);}catch(e){}save();renderAll();closeModal();toast("Reset done");};
}

/* ---------------- events ---------------- */
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.matches("[data-ck]")){S.checks[t.dataset.ck]=t.checked;if(!t.checked)delete S.checks[t.dataset.ck];save();updateProgress();return;}
  if(t.matches("[data-date]")){if(t.value)S.dates[t.dataset.date]=t.value;else delete S.dates[t.dataset.date];save();renderVet();renderTimeline();icons();return;}
  if(t.matches("[data-cfg]")){const k=t.dataset.cfg;S.cfg[k]=t.type==="range"||t.type==="number"?+t.value:t.value;save();
    if(["pickup","dob","momLeaves"].includes(k)){renderTimeline();renderPhases();renderVet();renderWeights();updateProgress();tick();icons();}
    if(k==="tickProd"){renderVet();renderWeights();icons();}
    if(["curWeight","calcAge","kcal","wetPct","wetKcal"].includes(k))renderCalc();}
});
document.addEventListener("input",e=>{const t=e.target;
  if(t.matches("input[type=range][data-cfg]")){S.cfg[t.dataset.cfg]=+t.value;save();renderCalc();}
  if(t.id==="q")runSearch();
  if(t.id==="toxQ")renderTox();});
document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.matches(".tab")){$("#q").value="";runSearch();showTab(b.dataset.tab);window.scrollTo({top:$(".tabs").offsetTop,behavior:"smooth"});return;}
  if(b.dataset.sched){S.cfg.schedule=b.dataset.sched;save();renderSched();if($("#q").value)runSearch();return;}
  if(b.dataset.tox){toxFilter=b.dataset.tox;$$("[data-tox]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));renderTox();return;}
  if(b.dataset.soc){const id=b.dataset.soc;S.social[id]=Math.max(0,Math.min(5,(S.social[id]||0)+(+b.dataset.d)));save();renderSocial();if($("#q").value)runSearch();return;}
  if(b.dataset.delAlone){S.alone=S.alone.filter(x=>String(x.t)!==b.dataset.delAlone);save();renderAlone();icons();tick();return;}
  if(b.dataset.delW){S.weights=S.weights.filter(x=>x.d!==b.dataset.delW);save();renderWeights();icons();return;}
  if(noteClick(b))return;
  if(b.id==="cAgeToday"){S.cfg.calcAge=ageWeeksToday();save();renderCalc();return;}
});
$("#aloneForm").addEventListener("submit",e=>{e.preventDefault();const d=$("#aloneDate").value,m=+$("#aloneMin").value;if(!d||!(m>0))return;
  S.alone.push({d,min:m,how:$("#aloneHow").value,t:Date.now()});save();renderAlone();icons();tick();toast("Rep logged");});
$("#wForm").addEventListener("submit",e=>{e.preventDefault();const d=$("#wDate").value,kg=+$("#wKg").value;if(!d||!(kg>0))return;
  S.weights=S.weights.filter(x=>x.d!==d);S.weights.push({d,kg});S.weights.sort((a,b)=>a.d.localeCompare(b.d));
  S.cfg.curWeight=Math.min(14,Math.max(1,Math.round(kg*10)/10));save();renderWeights();renderCalc();icons();$("#wKg").value="";toast("Weight saved · calculator updated");});
$("#btnExport").onclick=exportUI;$("#btnImport").onclick=importUI;$("#btnReset").onclick=resetUI;
$("#mClose").onclick=closeModal;$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
let rzT;window.addEventListener("resize",()=>{clearTimeout(rzT);rzT=setTimeout(renderWeights,200);});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if($(`[data-panel="${h}"]`))showTab(h);});

/* ---------------- notes ---------------- */
const NOTE_CATS=[["general","General"],["vet","Vet question"],["health","Health & symptoms"],["behaviour","Behaviour & training"],["transport","Transport & breeder"],["shopping","Shopping"]];
const catName=k=>(NOTE_CATS.find(c=>c[0]===k)||NOTE_CATS[0])[1];
let noteFilter="all",noteEdit=null;
function renderNotes(){
  const sel=$("#noteCat");if(!sel.options.length)sel.innerHTML=NOTE_CATS.map(([k,n])=>`<option value="${k}">${n}</option>`).join("");
  const counts={};S.notes.forEach(n=>counts[n.cat]=(counts[n.cat]||0)+1);
  $("#noteFilters").innerHTML=[["all","All"],...NOTE_CATS].filter(([k])=>k==="all"||counts[k]).map(([k,n])=>
    `<button type="button" data-nf="${k}" aria-pressed="${noteFilter===k}">${n} <span class="num muted">${k==="all"?S.notes.length:counts[k]}</span></button>`).join("");
  const L=S.notes.filter(n=>noteFilter==="all"||n.cat===noteFilter).slice().sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)||(b.d||"").localeCompare(a.d||"")||b.t-a.t);
  const pc={vet:"acc",health:"danger",behaviour:"warn",transport:"mute",shopping:"mute",general:"mute"};
  $("#noteList").innerHTML=L.length?L.map(n=>`<article class="note si" style="background:var(--surface-2)">
     <div class="flex justify-between gap-2 items-start flex-wrap">
       <div class="flex gap-2 items-center flex-wrap">${n.pin?'<span class="pill acc">Pinned</span>':""}<span class="pill ${pc[n.cat]||"mute"}">${esc(catName(n.cat))}</span><span class="muted text-sm num">${fmtY(pd(n.d))}</span></div>
       <div class="flex gap-1"><button class="ibtn" type="button" data-note-edit="${esc(n.t)}" aria-label="Edit note"><i data-lucide="pencil" style="width:15px;height:15px"></i></button>
       <button class="ibtn" type="button" data-note-del="${esc(n.t)}" aria-label="Delete note"><i data-lucide="trash-2" style="width:15px;height:15px"></i></button></div>
     </div>
     ${n.title?`<div class="font-bold mt-2">${esc(n.title)}</div>`:""}
     <div class="mt-1" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(n.body)}</div>
   </article>`).join("")
   :`<p class="muted">${S.notes.length?"No notes of this type yet.":"No notes yet. Ideas: questions for the first vet visit, what the transporter confirmed, how the first night went."}</p>`;
  $("#noteCopyAll").disabled=!S.notes.length;
}
function resetNoteForm(){noteEdit=null;$("#noteForm").reset();$("#noteDate").value=iso(today());$("#noteFormTitle").textContent="New note";$("#noteCancel").classList.add("hidden");}
$("#noteForm").addEventListener("submit",e=>{e.preventDefault();const body=$("#noteBody").value.trim();if(!body)return;
  const rec={d:$("#noteDate").value||iso(today()),cat:$("#noteCat").value,title:$("#noteTitle").value.trim(),body,pin:$("#notePin").checked};
  if(noteEdit!==null){const n=S.notes.find(x=>x.t===noteEdit);if(n)Object.assign(n,rec,{u:Date.now()});toast("Note updated");}
  else{S.notes.push(Object.assign({t:Date.now()},rec));toast("Note saved");}
  save();resetNoteForm();renderNotes();icons();});
$("#noteCancel").onclick=()=>{resetNoteForm();};
$("#noteCopyAll").onclick=async()=>{
  const L=S.notes.slice().sort((a,b)=>(a.d||"").localeCompare(b.d||""));
  const txt="Oreo — notes\n\n"+L.map(n=>`${fmtY(pd(n.d))} · ${catName(n.cat)}${n.title?" · "+n.title:""}\n${n.body}`).join("\n\n");
  try{await navigator.clipboard.writeText(txt);toast("All notes copied");}
  catch(e){openModal("Copy notes",`<textarea class="inp" rows="12" readonly id="nTxt">${esc(txt)}</textarea><p class="muted text-sm mt-2">Select all and copy.</p>`);}};
function noteClick(b){
  if(b.dataset.nf){noteFilter=b.dataset.nf;renderNotes();icons();return true;}
  if(b.dataset.noteEdit){const n=S.notes.find(x=>String(x.t)===b.dataset.noteEdit);if(!n)return true;noteEdit=n.t;
    $("#noteCat").value=n.cat;$("#noteDate").value=n.d;$("#noteTitle").value=n.title||"";$("#noteBody").value=n.body;$("#notePin").checked=!!n.pin;
    $("#noteFormTitle").textContent="Edit note";$("#noteCancel").classList.remove("hidden");$("#noteBody").focus();
    $("#noteForm").scrollIntoView({behavior:"smooth",block:"center"});return true;}
  if(b.dataset.noteDel){const id=b.dataset.noteDel;const n=S.notes.find(x=>String(x.t)===id);if(!n)return true;
    openModal("Delete this note?",`<p class="mb-3 muted">${esc((n.title||n.body).slice(0,120))}</p><div class="flex gap-2"><button class="btn danger" type="button" id="ndGo"><i data-lucide="trash-2"></i>Delete</button><button class="btn" type="button" id="ndNo">Keep it</button></div>`);
    $("#ndNo").onclick=closeModal;$("#ndGo").onclick=()=>{S.notes=S.notes.filter(x=>String(x.t)!==id);if(noteEdit!==null&&String(noteEdit)===id)resetNoteForm();save();renderNotes();icons();closeModal();toast("Note deleted");};return true;}
  return false;}

/* ---------------- boot ---------------- */
function renderAll(){
  $$("[data-cfg]").forEach(el=>{const v=S.cfg[el.dataset.cfg];if(v!==undefined&&el.type!=="range")el.value=v;});
  renderLists();renderTimeline();renderSched();renderAlone();renderSocial();renderCalc();renderTox();renderVet();renderWeights();renderNotes();updateProgress();tick();icons();
  if($("#q").value)runSearch();
}
$("#aloneDate").value=iso(today());$("#noteDate").value=iso(today());$("#wDate").value=iso(today());
renderAll();
setInterval(tick,1000);
const h=location.hash.slice(1);if(h&&$(`[data-panel="${h}"]`))showTab(h);
$("#storageWarn").classList.toggle("hidden",storageOK);
})();

/* offline app: register the service worker (ignored where unsupported) */
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost")){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{});});}
