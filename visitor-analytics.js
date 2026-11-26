// Optional, first-party metrics. No names, phone numbers, addresses, product IDs or payment details.
import {getApps} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {getAuth,signInAnonymously} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {getFirestore,doc,setDoc,increment} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
const KEY='styvoa.analytics.preference.v1',CLICK='styvoa.analytics.click.v1';
const read=(s,k)=>{try{return s.getItem(k)}catch{return null}};
const save=(s,k,v)=>{try{s.setItem(k,v)}catch{}};
const remove=(s,k)=>{try{s.removeItem(k)}catch{}};
let enabled=false,started=false,busy=false,observer,timer,auth,db,metricUid='',counts={pageViews:0,impressions:0,productClicks:0,checkoutViews:0};
const day=()=>Math.floor((Date.now()+19800000)/86400000);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function bump(k,n=1){if(!enabled)return;counts[k]=Math.min(40,counts[k]+n);schedule()}
function schedule(){if(!timer)timer=setTimeout(()=>{timer=null;void flush()},3000)}
async function flush(){
 if(!enabled||busy||!auth||!db||auth.currentUser?.uid!==metricUid||!Object.values(counts).some(Boolean))return;
 busy=true;const batch=counts;counts={pageViews:0,impressions:0,productClicks:0,checkoutViews:0};
 const d=day(),ref=doc(db,'visitor_metrics',metricUid+'-'+d);
 try{await setDoc(ref,{uid:metricUid,day:d,pageViews:increment(batch.pageViews),impressions:increment(batch.impressions),productClicks:increment(batch.productClicks),checkoutViews:increment(batch.checkoutViews)},{merge:true})}catch{/* Nonessential analytics must never interrupt shopping. */}
 finally{busy=false;if(Object.values(counts).some(Boolean))schedule()}
}
function productLink(a){try{const u=new URL(a.href,location.href);return u.origin===location.origin&&u.pathname==='/product.html'&&!!u.searchParams.get('id')}catch{return false}}
const seen=new Set();
function scan(){if(!observer)return;for(const a of document.querySelectorAll('a[href]')){if(productLink(a)&&!seen.has(a))observer.observe(a)}}
let mutation;
async function enable(){
 if(started)return;started=true;enabled=true;save(localStorage,KEY,'yes');
 try{let app;for(let i=0;i<40;i++){app=getApps().find(a=>a.name==='[DEFAULT]');if(app)break;await pause(250)}
 if(!app||!enabled)return;auth=getAuth(app);await auth.authStateReady();if(!enabled)return;
 if(!auth.currentUser)await signInAnonymously(auth);if(!enabled||!auth.currentUser)return;metricUid=auth.currentUser.uid;db=getFirestore(app);
 bump('pageViews');if(location.pathname==='/checkout.html')bump('checkoutViews');
 if(read(sessionStorage,CLICK)==='1'){remove(sessionStorage,CLICK);bump('productClicks')}
 void flush();
 if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{for(const x of entries){if(x.isIntersecting&&x.intersectionRatio>=.5&&!seen.has(x.target)){seen.add(x.target);observer.unobserve(x.target);bump('impressions')}}},{threshold:.5});scan();mutation=new MutationObserver(scan);mutation.observe(document.body,{childList:true,subtree:true})}
 }catch{/* Optional metrics never block site use. */}
}
document.addEventListener('click',e=>{if(!enabled||!auth||auth.currentUser?.uid!==metricUid)return;const a=e.target?.closest?.('a[href]');if(a&&productLink(a)){if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&a.target!=='_blank')save(sessionStorage,CLICK,'1');else bump('productClicks')}},{capture:true});
function disable(){enabled=false;save(localStorage,KEY,'no');remove(sessionStorage,CLICK);observer?.disconnect();mutation?.disconnect();clearTimeout(timer);timer=null;counts={pageViews:0,impressions:0,productClicks:0,checkoutViews:0};}
function mount(){
 const section=document.createElement('aside');section.setAttribute('aria-label','Optional site analytics');section.style.cssText='max-width:1100px;margin:12px auto;padding:12px 18px;font:14px system-ui;color:inherit';
 const p=document.createElement('span');const yes=document.createElement('button'),no=document.createElement('button');yes.type=no.type='button';yes.textContent='Allow optional analytics';no.textContent='No thanks';
 const label=()=>{let v=read(localStorage,KEY);p.textContent=v==='yes'?'Optional analytics enabled. ':v==='no'?'Optional analytics disabled. ':'Help improve Styvoa with optional browsing statistics. If allowed, a guest session may be created; shopping works either way. ';yes.hidden=v==='yes';no.hidden=v==='no';no.textContent=v==='yes'?'Disable analytics':'No thanks'};
 for(const b of [yes,no])b.style.cssText='font:inherit;padding:6px 10px;margin:4px;cursor:pointer;border:1px solid #b5c3b8;border-radius:6px;background:#f7f8f4;color:#244637';
 yes.onclick=()=>{if(started&&!enabled){save(localStorage,KEY,'yes');location.reload();return}void enable();label()};no.onclick=()=>{disable();label()};section.append(p,yes,no);document.body.append(section);label();if(read(localStorage,KEY)==='yes')void enable();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
