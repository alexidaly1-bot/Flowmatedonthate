'use strict';
/* =========================================================
   FlowMate — Phase 1
   One typed project model; the canvas, editor, checks and
   exports are all views of it.
   ========================================================= */

// ---------- Icons ----------
const ICONS={
 home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 building:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
 bed:'<path d="M3 19V6"/><path d="M3 15h18v4"/><path d="M21 15v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="12" r="1.7"/>',
 chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01"/>',
 gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
 wrench:'<path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3z"/>',
 file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
 alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/>',
 image:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
 bell:'<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>', check:'<path d="M5 12l5 5L20 7"/>',
 chev:'<path d="M9 6l6 6-6 6"/>', chevdown:'<path d="M6 9l6 6 6-6"/>', chevup:'<path d="M6 15l6-6 6 6"/>',
 back:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
 export:'<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
 sparkle:'<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
 layers:'<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/>',
 flow:'<rect x="9" y="3" width="6" height="5" rx="1.5"/><rect x="3" y="16" width="6" height="5" rx="1.5"/><rect x="15" y="16" width="6" height="5" rx="1.5"/><path d="M12 8v4M6 16v-3h12v3"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 diamond:'<path d="M12 2.5l9.5 9.5-9.5 9.5L2.5 12z"/>',
 database:'<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 sliders:'<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
 toggle:'<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
 upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
 send:'<path d="M3 11l18-8-8 18-2-8z"/>',
 save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
 pen:'<path d="M4 20l4-1 11-11-3-3L5 16z"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 link:'<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 cloud:'<path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z"/>',
 book:'<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z"/><path d="M12 6v14"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
 flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
 folder:'<path d="M3 6h6l2 2h10v11H3z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 trace:'<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 12h4l6-6M11 12l6 6"/>',
 input:'<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 10v4"/>',
 dropdown:'<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M14 11l2 2 2-2"/>',
 tab:'<path d="M3 20V9h7V5h11v15z"/>',
 section:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/>',
 component:'<path d="M12 2l4 4-4 4-4-4zM6 8l4 4-4 4-4-4zM18 8l4 4-4 4-4-4zM12 14l4 4-4 4-4-4z"/>',
 tidy:'<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="4" width="7" height="6" rx="1.5"/><rect x="3" y="14" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
 download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
 check2:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
 star:'<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
 play:'<path d="M7 4.5v15l12-7.5z"/>',
 undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
const icon=(n,cls='')=>`<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||ICONS.section}</svg>`;
const ICON_WORDS=[['home','home'],['propert','building'],['room','bed'],['message','chat'],['conversation','chat'],['chat','chat'],['account','user'],['profile','user'],['tenant','users'],['landlord','user'],['notification','bell'],['sound','bell'],['setting','gear'],['repair','wrench'],['maintenance','wrench'],['document','file'],['note','file'],['report','alert'],['damage','alert'],['wrong','alert'],['error','alert'],['photo','image'],['image','image'],['gallery','image'],['sign','lock'],['password','lock'],['login','lock'],['permission','shield'],['allowed','shield'],['upload','upload'],['send','send'],['submit','send'],['save','save'],['add','plus'],['new','plus'],['create','plus'],['back','back'],['return','back'],['try again','back'],['done','check'],['appearance','palette'],['colour','palette'],['overview','grid'],['status','list'],['describe','pen'],['edit','pen'],['search','search'],['date','calendar']];
function autoIcon(text,fallback){const t=(text||'').toLowerCase();for(const[w,i] of ICON_WORDS){if(t.includes(w))return i}return fallback}

// ---------- Vocabulary ----------
const KINDS={
 page:{label:'Page',icon:'section',plain:'A screen that people see in the app, like Home or Profile.'},
 function:{label:'Function',icon:'bolt',plain:'Something the app does behind the scenes, like saving a form or sending a message.'},
 decision:{label:'Decision',icon:'diamond',plain:'A question the app checks before carrying on, like "Is the user signed in?". Each answer leads somewhere different.'},
 setting:{label:'Setting',icon:'sliders',plain:'A switch or value that changes how the app behaves. It can apply to the whole app, one module, one page or one component.'},
 data:{label:'Data',icon:'database',plain:'Information the app keeps, like a property, a repair request or a message.'},
 component:{label:'Component',icon:'component',plain:'A reusable piece of screen (a card, a form, a menu) that appears on more than one page.'},
};
const STATUSES=['Idea','New','Planned','In progress','Review','Blocked','Done','Deprecated'];
const stClass=s=>(STATUSES.includes(s||'Idea')?'':'st-custom ')+'st-'+(s||'Idea').toLowerCase().replace(/\s+/g,'-');
const PAGE_TYPES=['Home / dashboard','Onboarding','Login / registration','Profile','List','Detail','Form','Search','Messaging','Settings','Media gallery','Checkout','Confirmation','Error','Modal','Bottom sheet','Navigation drawer','Custom'];
const PAGE_ICON={'Home / dashboard':'home','Login / registration':'lock','Profile':'user','List':'list','Detail':'file','Form':'pen','Search':'search','Messaging':'chat','Settings':'gear','Media gallery':'image','Confirmation':'check2','Error':'alert','Onboarding':'star'};
const EL_TYPES={button:{label:'Button',act:true,icon:'chev'},link:{label:'Link',act:true,icon:'link'},tab:{label:'Tab',act:true,icon:'tab'},listitem:{label:'List item',act:true,icon:'list'},menuitem:{label:'Menu item',act:true,icon:'list'},toggle:{label:'Toggle switch',act:true,icon:'toggle'},input:{label:'Text field',act:false,icon:'input'},dropdown:{label:'Dropdown',act:false,icon:'dropdown'},image:{label:'Image',act:false,icon:'image'},section:{label:'Section',act:false,icon:'section'}};
const CONN={
 navigate:{label:'Go to page',plain:'Tapping this opens another screen.',col:'--e-nav',dash:''},
 modal:{label:'Open pop-up',plain:'Opens a pop-up or bottom sheet over the current screen.',col:'--e-nav',dash:'8 5'},
 trigger:{label:'Run function',plain:'Starts something the app does, like saving.',col:'--e-fn',dash:''},
 read:{label:'Read data',plain:'Looks up stored information.',col:'--e-data',dash:'2 5'},
 write:{label:'Save data',plain:'Saves or changes stored information.',col:'--e-data',dash:'10 4 2 4'},
 setting:{label:'Change setting',plain:'Turns a setting on or off, or changes its value.',col:'--e-fn',dash:'2 5'},
 condition:{label:'Decision answer',plain:'One answer to a decision, like Yes or No.',col:'--e-cond',dash:''},
 permission:{label:'Permission check',plain:'Only lets certain users through.',col:'--e-perm',dash:'7 5'},
 notify:{label:'Send notification',plain:'Sends someone an alert.',col:'--e-fn',dash:'12 6'},
 background:{label:'Background job',plain:'Runs later or behind the scenes.',col:'--e-data',dash:'12 6'},
 api:{label:'Call outside service',plain:'Talks to another company\'s system (an API).',col:'--e-api',dash:''},
 workflow:{label:'Run shared workflow',plain:'Runs a set of steps that other places also use.',col:'--e-fn',dash:'4 3'},
 back:{label:'Go back',plain:'Returns to the previous screen.',col:'--e-nav',dash:'2 5'},
 error:{label:'Error / fallback',plain:'Where things go if something fails.',col:'--e-err',dash:'7 5'},
 reference:{label:'Uses / depends on',plain:'This relies on the other item, like a setting or component.',col:'--e-ref',dash:'1 5'},
};
const MOD_COLOURS=['coral','gold','oak','rose','sage','clay'];
const ACTIONS=new Set(['navigate','modal','back']);

// ---------- Helpers ----------
const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>[...el.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+'_'+Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-3);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=o=>JSON.parse(JSON.stringify(o));
function ago(t){if(!t)return '';const s=(Date.now()-t)/1000;if(s<60)return 'just now';if(s<3600)return Math.round(s/60)+' min ago';if(s<86400)return Math.round(s/3600)+' h ago';return new Date(t).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}

// ---------- Storage (this device) ----------
const Store={mem:{},ok:true,
 get(k){try{const v=localStorage.getItem(k);return v==null?this.mem[k]??null:v}catch(e){this.ok=false;return this.mem[k]??null}},
 set(k,v){this.mem[k]=v;try{localStorage.setItem(k,v)}catch(e){this.ok=false}},
 del(k){delete this.mem[k];try{localStorage.removeItem(k)}catch(e){}}};

// ---------- State ----------
const S={projects:{},p:null,view:{x:0,y:0,z:.7},sel:null,trace:null,undo:[],redo:[],viewBack:[],panel:null,
 prefs:FMT.sanitize(Object.assign({theme:'auto',textSize:100,complexity:'technical',motion:'auto',lines:'square',thresholds:[.25,.5,.75,1.25,2],contrast:false,sidebar:true},safeJSON(Store.get('fm.prefs')))),linkHide:new Set(),
 zl:4,geo:{},editBefore:null,sheetTall:false};
function savePrefs(){Store.set('fm.prefs',JSON.stringify(S.prefs))}
if(!Array.isArray(S.prefs.thresholds)||S.prefs.thresholds.length!==5||S.prefs.thresholds.some(x=>!(x>0)))S.prefs.thresholds=[.25,.5,.75,1.25,2];
if(!['square','curved'].includes(S.prefs.lines))S.prefs.lines='square';

