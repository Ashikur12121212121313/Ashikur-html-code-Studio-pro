const $=id=>document.getElementById(id);
const names={html:"index.html",css:"style.css",js:"script.js"};
const langs={html:"HTML",css:"CSS",js:"JavaScript"};
const defaults={
html:`<!doctype html>
<html>
<head><title>Ashikur Demo</title></head>
<body>
<h1>Hello Ashikur!</h1>
<p>Edit this code and press Preview.</p>
</body>
</html>`,
css:`body { font-family: sans-serif; padding: 30px; }
h1 { color: #5b55d9; }`,
js:`console.log("Ashikur HTML Code Studio");`
};
let files=JSON.parse(localStorage.getItem("ashikur70k_files")||"null")||structuredClone(defaults);
let versions=JSON.parse(localStorage.getItem("ashikur70k_versions")||"{}");
let current="html", timer, zoom=12, rowH=18.6, raf=0;

function persist(){localStorage.setItem("ashikur70k_files",JSON.stringify(files));}
function snapshot(){
 const arr=versions[current]||[];
 arr.push({time:new Date().toLocaleString(),text:files[current]});
 versions[current]=arr.slice(-30);
 localStorage.setItem("ashikur70k_versions",JSON.stringify(versions));
}
function loadFile(){
 $("editor").value=files[current]||"";
 $("fileName").textContent=names[current];$("mode").textContent=langs[current];
 document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.file===current));
 renderLarge(); quick();
}
function lineArray(){return $("editor").value.split("\n")}
function renderLarge(){
 const lines=lineArray(), n=lines.length;
 $("lineCount").textContent=n.toLocaleString()+" lines";
 $("chars").textContent=$("editor").value.length.toLocaleString()+" chars";
 $("spacer").style.height=(n*rowH)+"px";
 $("gutter").style.height=Math.max(1,n*rowH)+"px";
 drawVisible();
 updateCursor();
}
function drawVisible(){
 const area=$("scrollArea"), lines=lineArray(), total=lines.length;
 const start=Math.max(0,Math.floor(area.scrollTop/rowH)-25);
 const count=Math.min(total-start,Math.ceil(area.clientHeight/rowH)+50);
 const frag=document.createDocumentFragment(), gf=document.createDocumentFragment();
 for(let i=start;i<start+count;i++){
   const r=document.createElement("div");r.className="row";r.style.position="absolute";r.style.top=(i*rowH)+"px";r.textContent=lines[i]??"";frag.appendChild(r);
   const g=document.createElement("div");g.style.position="absolute";g.style.top=(i*rowH)+"px";g.textContent=i+1;gf.appendChild(g);
 }
 $("rows").replaceChildren(frag);$("rows").style.height=(total*rowH)+"px";
 $("gutter").replaceChildren(gf);
 $("rows").style.transform="translateZ(0)";
}
function updateCursor(){
 const t=$("editor"), p=t.selectionStart, before=t.value.slice(0,p), ln=before.split("\n").length;
 const last=before.lastIndexOf("\n"), col=p-(last+1)+1;
 $("cursor").textContent=`Ln ${ln}, Col ${col}`;$("pos").textContent=`Ln ${ln}`;
}
function save(){
 files[current]=$("editor").value;persist();$("state").textContent="Saved";setTimeout(()=>$("state").textContent="Ready",800);
}
function inputChanged(){
 files[current]=$("editor").value;
 clearTimeout(timer);timer=setTimeout(()=>{snapshot();save()},900);
 if(!raf)raf=requestAnimationFrame(()=>{renderLarge();raf=0});
}
function setLine(n){
 const lines=lineArray(), target=Math.max(1,Math.min(n,lines.length));
 let p=0;for(let i=0;i<target-1;i++)p+=lines[i].length+1;
 $("editor").focus();$("editor").setSelectionRange(p,p);
 const y=(target-1)*rowH;$("scrollArea").scrollTop=y;updateCursor();
}
function preview(){
 files[current]=$("editor").value;persist();
 const html=files.html||"",css=files.css||"",js=files.js||"";
 const safe=js.replace(/<\/script/gi,"<\\/script");
 $("preview").srcdoc=html.replace(/<\/head>/i,`<style>${css}</style></head>`).replace(/<\/body>/i,`<script>${safe}<\/script></body>`);
 $("editorView").classList.add("hidden");$("previewView").classList.remove("hidden");
}
function modal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
function copy(s){navigator.clipboard?.writeText(s);$("state").textContent="Copied"}
function insert(s){
 const t=$("editor"),a=t.selectionStart,b=t.selectionEnd;t.setRangeText(s,a,b,"end");inputChanged();t.focus()
}
function quick(){
 const sets={
 html:["<",">","</>","{}","()","[]",'""',"''","=",";","<div>","</div>","class=\"\"","id=\"\"","href=\"\"","src=\"\""],
 css:["{","}",";",":","#",".","@media","!important"],
 js:["{","}","(",")","[","]","=>","===","&&","||",";"]
 };
 $("quick").innerHTML=(sets[current]||sets.html).map(x=>`<button data-q="${encodeURIComponent(x)}">${x.replace(/</g,"&lt;")}</button>`).join("");
 $("quick").querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>insert(decodeURIComponent(b.dataset.q)));
}
function checkCode(){
 const c=$("editor").value, out=[];
 if(current==="html"){
   const open=[...c.matchAll(/<([a-z][\\w-]*)(?:\\s[^>]*)?>/gi)].map(x=>x[1].toLowerCase()).filter(x=>!["meta","link","img","input","br","hr","source","area","base","embed","param","track","wbr"].includes(x));
   const close=[...c.matchAll(/<\\/([a-z][\\w-]*)>/gi)].map(x=>x[1].toLowerCase());
   const stack=[];
   open.forEach(x=>stack.push(x));
   close.forEach(x=>{if(stack.at(-1)===x)stack.pop();else out.push({type:"error",line:findLine(c,`</${x}>`),msg:`Possible tag mismatch: </${x}>`,sol:`Make sure the opening <${x}> and closing </${x}> tags match.`})});
   if(stack.length)out.push({type:"warning",line:findLine(c,`<${stack.at(-1)}`),msg:`Possible unclosed tag: <${stack.at(-1)}>`,sol:`Add </${stack.at(-1)}> at the correct location.`});
 }
 if(current==="css"){
   const open=(c.match(/{/g)||[]).length, close=(c.match(/}/g)||[]).length;
   if(open!==close)out.push({type:"error",line:1,msg:`CSS braces are unbalanced (${open} { vs ${close} }).`,sol:"Check each CSS block and match every { with }."});
 }
 if(current==="js"){try{new Function(c)}catch(e){out.push({type:"error",line:guessJsLine(e.message),msg:e.message,sol:"Check quotes, brackets, commas, semicolons, and the code around this line."})}}
 if(!out.length)out.push({type:"ok",line:1,msg:"No basic errors detected.",sol:"The built-in checker found no obvious problem."});
 modal("🧪 Code Check",out.map((x,i)=>`<div class="result ${x.type}"><button data-line="${x.line}">Line ${x.line}</button> <b>${x.type==="ok"?"✅":x.type==="error"?"❌":"⚠️"} ${esc(x.msg)}</b><p class="note">Solution: ${esc(x.sol)}</p></div>`).join(""));
 $("modalBody").querySelectorAll("[data-line]").forEach(b=>b.onclick=()=>{setLine(+b.dataset.line);closeModal()});
}
function findLine(text,needle){const p=text.indexOf(needle);return p<0?1:text.slice(0,p).split("\n").length}
function guessJsLine(msg){const m=String(msg).match(/line (\\d+)/i);return m?+m[1]:1}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function findReplace(){
 modal("🔎 Find / Replace",`<div class="form"><input id="fq" placeholder="Find"><input id="rq" placeholder="Replace"></div><div class="form"><button class="primary" id="findNext">Find Next</button><button class="primary" id="replaceAll">Replace All</button></div>`);
 $("findNext").onclick=()=>{const q=$("fq").value;if(!q)return;let p=$("editor").value.indexOf(q,$("editor").selectionEnd);if(p<0)p=$("editor").value.indexOf(q);if(p<0)return alert("Not found");$("editor").focus();$("editor").setSelectionRange(p,p+q.length);setLine($("editor").value.slice(0,p).split("\n").length)};
 $("replaceAll").onclick=()=>{const q=$("fq").value;if(!q)return; snapshot();$("editor").value=$("editor").value.split(q).join($("rq").value);inputChanged();closeModal()};
}
function parts(){
 const n=Math.max(1,parseInt(prompt("Lines per Part:","100"))||100), a=lineArray(), list=[];
 for(let i=0;i<a.length;i+=n)list.push({no:list.length+1,start:i+1,end:Math.min(i+n,a.length),text:a.slice(i,i+n).join("\n")});
 modal("✂️ Split & Copy",`<p class="note">${list.length.toLocaleString()} parts · ${a.length.toLocaleString()} lines · each Part has one-click Copy.</p>`+list.map((p,i)=>`<div class="part"><span>Part ${p.no} · Lines ${p.start.toLocaleString()}–${p.end.toLocaleString()}</span><button data-copy="${i}">📋 Copy</button></div>`).join(""));
 $("modalBody").querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copy(list[+b.dataset.copy].text));
}
function historyTool(){
 const h=versions[current]||[];
 modal("🕘 Version History",h.length?h.map((v,i)=>`<div class="history"><b>Version ${i+1}</b><div class="note">${v.time}</div><button data-restore="${i}">Restore</button></div>`).join(""):"<p class='note'>No saved versions yet.</p>");
 $("modalBody").querySelectorAll("[data-restore]").forEach(b=>b.onclick=()=>{files[current]=h[+b.dataset.restore].text;persist();loadFile();closeModal()});
}
function review(){
 const old=prompt("Paste the older version to compare with the current code:");
 if(old===null)return;
 const a=old.split("\n"),b=$("editor").value.split("\n"),m=Math.max(a.length,b.length),d=[];
 for(let i=0;i<m;i++)if(a[i]!==b[i])d.push(`Line ${i+1}\\n- ${a[i]??""}\\n+ ${b[i]??""}`);
 modal("👀 Review / Diff",d.length?`<div class="diff">${esc(d.join("\\n\\n"))}</div>`:"<div class='result ok'>No differences found.</div>");
}
function download(){
 const blob=new Blob([$("editor").value],{type:"text/plain"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=names[current];a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)
}
function backup(){
 modal("💾 Backup / Restore",`<button class="primary" id="makeBackup">Create JSON Backup</button> <button class="primary" id="chooseBackup">Restore Backup</button><input id="backupFile" type="file" accept=".json" hidden><p class="note">Backup contains the three project files.</p>`);
 $("makeBackup").onclick=()=>{const b=new Blob([JSON.stringify({files,versions},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="ashikur-70k-backup.json";a.click()};
 $("chooseBackup").onclick=()=>$("backupFile").click();
 $("backupFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);files=x.files||x;versions=x.versions||{};persist();localStorage.setItem("ashikur70k_versions",JSON.stringify(versions));loadFile();closeModal()}catch{alert("Invalid backup file")}};r.readAsText(f)}
}
function stats(){const all=Object.values(files).join("\n"),lines=all.split("\n").length;modal("📊 Code Statistics",`<div class="result ok"><b>Current file:</b> ${names[current]}</div><div class="result"><b>Current lines:</b> ${lineArray().length.toLocaleString()}</div><div class="result"><b>Current characters:</b> ${$("editor").value.length.toLocaleString()}</div><div class="result"><b>Project lines:</b> ${lines.toLocaleString()}</div>`)}
function display(){
 modal("🔎 Zoom / Compact",`<div class="form"><button id="minus">A−</button><button id="plus">A+</button><button id="compact">Compact</button><button id="normal">Normal</button></div><p class="note">Large-file mode keeps the full source text in the editor while only drawing visible line rows. Scrolling does not delete source lines.</p>`);
 $("minus").onclick=()=>setZoom(zoom-1);$("plus").onclick=()=>setZoom(zoom+1);$("compact").onclick=()=>{document.body.classList.add("compact");rowH=14;renderLarge()};$("normal").onclick=()=>{document.body.classList.remove("compact");rowH=18.6;renderLarge()}
}
function setZoom(z){zoom=Math.max(8,Math.min(24,z));$("editor").style.fontSize=zoom+"px";$("rows").style.fontSize=zoom+"px";$("gutter").style.fontSize=zoom+"px";rowH=document.body.classList.contains("compact")?14:zoom*1.55;renderLarge()}
function project(){modal("🗂️ Project / File Manager",`<div class="part"><span>🌐 index.html</span><button data-open="html">Open</button></div><div class="part"><span>🎨 style.css</span><button data-open="css">Open</button></div><div class="part"><span>⚙️ script.js</span><button data-open="js">Open</button></div><p class="note">Use the Download and Backup tools to save the project to your phone.</p>`);$("modalBody").querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{current=b.dataset.open;loadFile();closeModal()})}
async function source(){
 modal("🌐 Public HTML Source",`<div class="form"><input id="url" placeholder="https://example.com"><button class="primary" id="loadUrl">Load HTML</button></div><p class="note">Only browser-accessible public HTML can be fetched. CORS/security rules may block many websites. Server-side/private source is not exposed.</p>`);
 $("loadUrl").onclick=async()=>{try{const u=$("url").value.trim();if(!/^https?:\\/\\//i.test(u))throw Error();const r=await fetch(u);if(!r.ok)throw Error();files.html=await r.text();current="html";persist();loadFile();closeModal()}catch{alert("The browser could not fetch this site's HTML. CORS or site security may be blocking it.")}}
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{snapshot();current=b.dataset.file;loadFile()});
$("editor").addEventListener("input",inputChanged);
["keyup","click","select"].forEach(e=>$("editor").addEventListener(e,updateCursor));
$("editor").addEventListener("scroll",()=>{$("scrollArea").scrollTop=$("editor").scrollTop;updateCursor()});
$("scrollArea").addEventListener("scroll",()=>{if(Math.abs($("editor").scrollTop-$("scrollArea").scrollTop)>2)$("editor").scrollTop=$("scrollArea").scrollTop;drawVisible()});
$("saveBtn").onclick=()=>{snapshot();save()};$("runBtn").onclick=preview;$("navPreview").onclick=preview;$("refreshBtn").onclick=preview;
$("closePreview").onclick=()=>{$("previewView").classList.add("hidden");$("editorView").classList.remove("hidden")};
$("browserBtn").onclick=()=>{const w=window.open();if(w){w.document.write($("preview").srcdoc);w.document.close()}};
$("themeBtn").onclick=()=>document.body.classList.toggle("light");
$("toolsBtn").onclick=()=>$("drawer").classList.add("open");$("navTools").onclick=()=>$("drawer").classList.add("open");$("closeTools").onclick=()=>$("drawer").classList.remove("open");
$("modalClose").onclick=closeModal;$("navEdit").onclick=()=>{$("previewView").classList.add("hidden");$("editorView").classList.remove("hidden")};
$("undoBtn").onclick=()=>document.execCommand("undo");$("redoBtn").onclick=()=>document.execCommand("redo");$("findBtn").onclick=findReplace;
$("navFiles").onclick=project;
const toolMap={check:checkCode,review,find:findReplace,goto:()=>setLine(parseInt(prompt("Go to line:","1"))||1),parts,history:historyTool,download,project,backup,stats,source,display};
document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>toolMap[b.dataset.tool]?.());
loadFile();
