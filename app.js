/**********************************************
 * STATO / UI
 **********************************************/
let availableCredits = 100;
const creditsText = document.getElementById('creditsText');
const creditsProgressBar = document.getElementById('creditsProgressBar');

// Navbar
const navbarItems = document.querySelectorAll('.navbar-item');
const sections = document.querySelectorAll('.section');

// Overlay
const loadingOverlay = document.getElementById('loadingOverlay');

/**********************************************
 * INIT E NAV
 **********************************************/
function updateCreditsBar() {
  if (availableCredits < 0) availableCredits = 0;
  creditsText.textContent = `Crediti rimanenti: ${availableCredits.toFixed(2)}`;
  const percent = (availableCredits / 100) * 100;
  creditsProgressBar.style.width = `${percent}%`;
}

// Switch sezione
navbarItems.forEach(item => {
  item.addEventListener('click', () => {
    navbarItems.forEach(i => i.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    item.classList.add('active');
    const sectionId = item.getAttribute('data-section');
    document.getElementById(sectionId).classList.add('active');
  });
});

/**********************************************
 * OVERLAY
 **********************************************/
function showOverlay() {
  loadingOverlay.classList.remove('hidden');
}
function hideOverlay() {
  loadingOverlay.classList.add('hidden');
}

/**********************************************
 * LOCAL STORAGE KEY
 **********************************************/
const saveTokenBtn = document.getElementById('saveTokenBtn');
saveTokenBtn.addEventListener('click', async () => {
  const tokenInput = document.getElementById('apiToken');
  const openAiInput = document.getElementById('openAiKey');
  const apiKey = tokenInput.value.trim();
  const openAiKey = openAiInput.value.trim();

  if (apiKey) {
    localStorage.setItem('stabilityApiKey', apiKey);
  }
  if (openAiKey) {
    localStorage.setItem('openAiKey', openAiKey);
  }
  alert("Chiavi salvate. Aggiorno i crediti (Stability).");
  await refreshCredits();
});

window.addEventListener('load', async () => {
  const storedKey = localStorage.getItem('stabilityApiKey');
  if (storedKey) {
    document.getElementById('apiToken').value = storedKey;
  }
  const storedOpenAi = localStorage.getItem('openAiKey');
  if (storedOpenAi) {
    document.getElementById('openAiKey').value = storedOpenAi;
  }
  await refreshCredits();
  updateCreditsBar();
});

/**********************************************
 * FUNZIONI UTILI
 **********************************************/
function getStabilityKey() {
  return document.getElementById('apiToken').value.trim() || localStorage.getItem('stabilityApiKey') || "";
}
function getOpenAiKey() {
  return document.getElementById('openAiKey').value.trim() || localStorage.getItem('openAiKey') || "";
}

async function refreshCredits() {
  const apiKey = getStabilityKey();
  if (!apiKey) return;
  try {
    showOverlay();
    const r = await fetch("https://api.stability.ai/v1/user/balance", {
      method:'GET',
      headers:{
        'Authorization': `Bearer ${apiKey}`,
        'Accept':'application/json'
      }
    });
    if(!r.ok){
      console.warn("Non riesco a recuperare i crediti dal server.");
      return;
    }
    const data = await r.json();
    availableCredits = data.credits * 10;
    updateCreditsBar();
  }catch(err){
    console.warn("Errore refresh crediti:", err.message);
  }finally{
    hideOverlay();
  }
}

async function callStabilityAI(url, fields) {
  const apiKey = getStabilityKey();
  if(!apiKey) throw new Error("Nessuna Stability Key trovata!");

  const formData = new FormData();
  for(const k in fields){
    formData.append(k, fields[k]);
  }

  showOverlay();
  try{
    const res= await fetch(url, {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/*'
      },
      body: formData
    });
    if(!res.ok){
      const errBuf= await res.arrayBuffer();
      throw new Error(`Errore API: ${res.status} - ${new TextDecoder().decode(errBuf)}`);
    }
    await refreshCredits();
    return await res.blob();
  }finally{
    hideOverlay();
  }
}

/**********************************************
 * GENERA (ULTRA)
 **********************************************/
document.getElementById('genBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('genOutput');
  const promptVal= document.getElementById('genPrompt').value.trim();
  if(!promptVal){
    outEl.textContent="Inserisci un prompt!";
    return;
  }
  outEl.textContent="Generazione (Ultra)...";

  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/generate/ultra",
      {
        "prompt": promptVal,
        "output_format": "webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="Ultra result" style="max-width:100%;">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

/**********************************************
 * EDIT: STYLE, ERASE, MASK
 **********************************************/

// STYLE
document.getElementById('styleBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('styleOutput');
  const file= document.getElementById('styleImage').files[0];
  const prompt= document.getElementById('stylePrompt').value.trim();
  if(!file){
    outEl.textContent="Carica un'immagine base!";
    return;
  }
  outEl.textContent="Applico lo Style...";

  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/control/style",
      {
        "image": file,
        "prompt": prompt||"",
        "output_format": "webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="Style" style="max-width:100%">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

// ERASE
document.getElementById('eraseBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('eraseOutput');
  const imgFile= document.getElementById('eraseImage').files[0];
  const maskFile= document.getElementById('eraseMask').files[0];
  if(!imgFile){
    outEl.textContent="Carica un'immagine da cui cancellare oggetti!";
    return;
  }
  outEl.textContent="Elaborazione Erase...";

  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/edit/erase",
      {
        "image": imgFile,
        "mask": maskFile||"",
        "output_format": "webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="Erase" style="max-width:100%">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

// MASK EDITOR
const refCanvas= document.getElementById('referenceCanvas');
const refCtx= refCanvas.getContext('2d');

const maskCanvas= document.getElementById('maskCanvas');
const maskCtx= maskCanvas.getContext('2d');

maskCtx.fillStyle="#000";
maskCtx.fillRect(0,0,maskCanvas.width,maskCanvas.height);

let drawing=false;
let brushSize=10;
let drawMode="drawWhite";

document.getElementById('maskLoadRefBtn').addEventListener('click',()=>{
  const file= document.getElementById('maskRefImage').files[0];
  if(!file){
    alert("Seleziona un'immagine di riferimento!");
    return;
  }
  const img= new Image();
  img.onload= ()=>{
    refCtx.clearRect(0,0,refCanvas.width,refCanvas.height);
    refCtx.globalAlpha= 0.3;
    refCtx.drawImage(img,0,0,refCanvas.width,refCanvas.height);
    refCtx.globalAlpha=1;
  };
  img.src= URL.createObjectURL(file);
});

maskCanvas.addEventListener('mousedown',(e)=>{drawing=true; drawMask(e);});
maskCanvas.addEventListener('mousemove',drawMask);
maskCanvas.addEventListener('mouseup',()=>{drawing=false;});
maskCanvas.addEventListener('mouseleave',()=>{drawing=false;});

function drawMask(e){
  if(!drawing)return;
  const rect= maskCanvas.getBoundingClientRect();
  const x= e.clientX- rect.left;
  const y= e.clientY- rect.top;

  if(drawMode==='drawWhite'){
    maskCtx.fillStyle="#fff";
  } else {
    maskCtx.fillStyle="#000";
  }
  maskCtx.beginPath();
  maskCtx.arc(x,y,brushSize,0,2*Math.PI);
  maskCtx.fill();
}

document.getElementById('maskBrushSize').addEventListener('input',(e)=>{
  brushSize= parseInt(e.target.value);
});
document.getElementById('maskDrawMode').addEventListener('change',(e)=>{
  drawMode= e.target.value;
});
document.getElementById('maskClearBtn').addEventListener('click',()=>{
  maskCtx.fillStyle="#000";
  maskCtx.fillRect(0,0,maskCanvas.width,maskCanvas.height);
});
document.getElementById('maskExportBtn').addEventListener('click',()=>{
  const dataURL= maskCanvas.toDataURL("image/png");
  const outEl= document.getElementById('maskExportOutput');
  outEl.innerHTML= `
    <p>Maschera esportata (B/N):</p>
    <a href="${dataURL}" download="mask.png" class="modern-button">Scarica Mask</a>
    <br/>
    <img src="${dataURL}" alt="Mask" style="max-width:300px; margin-top:1rem; border:1px solid #777;">
  `;
});

/**********************************************
 * MIGLIORA: removeBG, inpaint, outpaint, upscale
 **********************************************/

// removeBG -> removeBgBtn
document.getElementById('removeBgBtn').addEventListener('click',async()=>{
  const outEl= document.getElementById('removeBgOutput');
  const file= document.getElementById('removeBgImage').files[0];
  if(!file){
    outEl.textContent="Carica l'immagine da cui rimuovere sfondo!";
    return;
  }
  outEl.textContent="Rimozione sfondo...";
  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/edit/remove-background",
      {
        "image": file,
        "output_format": "webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="RemoveBG" style="max-width:100%">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

// inpaint
document.getElementById('inpaintBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('inpaintOutput');
  const imgFile= document.getElementById('inpaintImage').files[0];
  const maskFile= document.getElementById('inpaintMask').files[0];
  if(!imgFile){
    outEl.textContent="Carica l'immagine base.";
    return;
  }
  outEl.textContent="Elaborazione inpaint...";
  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/edit/inpaint",
      {
        "image":imgFile,
        "mask":maskFile||"",
        "output_format":"webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="Inpaint result" style="max-width:100%">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

// outpaint
document.getElementById('outpaintBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('outpaintOutput');
  const imgFile= document.getElementById('outpaintImage').files[0];
  const promptVal= document.getElementById('outpaintPrompt').value.trim();
  const creativityVal= document.getElementById('outpaintCreativity').value.trim()||"0.5";
  const leftVal= document.getElementById('outpaintLeft').value.trim()||"0";
  const rightVal= document.getElementById('outpaintRight').value.trim()||"0";
  const upVal= document.getElementById('outpaintUp').value.trim()||"0";
  const downVal= document.getElementById('outpaintDown').value.trim()||"0";

  if(!imgFile){
    outEl.textContent="Carica l'immagine!";
    return;
  }
  if([leftVal,rightVal,upVal,downVal].every(v=> parseInt(v)===0)){
    outEl.textContent="Specifica almeno un lato>0 per outpaint!";
    return;
  }
  outEl.textContent="Eseguo outpaint...";
  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/edit/outpaint",
      {
        "image": imgFile,
        "prompt": promptVal,
        "creativity": creativityVal,
        "left": leftVal,
        "right": rightVal,
        "up": upVal,
        "down": downVal
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="Outpaint" style="max-width:100%">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

// upscale
document.getElementById('upscaleBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('upscaleOutput');
  const imgFile= document.getElementById('upscaleImage').files[0];
  const promptVal= document.getElementById('upscalePrompt').value.trim();
  if(!imgFile){
    outEl.textContent="Carica un'immagine da upscalare!";
    return;
  }
  outEl.textContent="Upscaling...";

  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/upscale/conservative",
      {
        "image": imgFile,
        "prompt": promptVal||"",
        "output_format":"webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="Upscale" style="max-width:100%">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

/**********************************************
 * SOGNA: VIDEO + 3D
 **********************************************/
// video start
document.getElementById('videoGenBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('videoGenOutput');
  const file= document.getElementById('videoImage').files[0];
  const seedVal= parseInt(document.getElementById('videoSeed').value)||0;
  const cfgVal= parseFloat(document.getElementById('videoCfgScale').value)||1.8;
  const motionVal= parseInt(document.getElementById('videoMotionId').value)||127;

  if(!file){
    outEl.textContent="Carica immagine per video!";
    return;
  }
  outEl.textContent="Avvio generazione video...";

  showOverlay();
  try{
    const apiKey= getStabilityKey();
    if(!apiKey) throw new Error("Nessuna Stability Key.");

    const fd= new FormData();
    fd.append("image", file);
    fd.append("seed", seedVal);
    fd.append("cfg_scale", cfgVal);
    fd.append("motion_bucket_id", motionVal);

    const res= await fetch("https://api.stability.ai/v2beta/image-to-video",{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${apiKey}`
      },
      body:fd
    });
    if(!res.ok){
      const errBuf=await res.arrayBuffer();
      throw new Error(`Errore Video Start: ${res.status} - ${new TextDecoder().decode(errBuf)}`);
    }
    await refreshCredits();
    const data= await res.json();
    outEl.textContent=`Video avviato! generation_id: ${data.id||"???"}`;
  }catch(err){
    outEl.textContent= err.message;
  }finally{
    hideOverlay();
  }
});

// video check
document.getElementById('videoCheckBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('videoCheckOutput');
  const genId= document.getElementById('videoGenId').value.trim();
  if(!genId){
    outEl.textContent="Inserisci un generation_id!";
    return;
  }
  outEl.textContent="Controllo stato video...";

  showOverlay();
  try{
    const apiKey= getStabilityKey();
    if(!apiKey) throw new Error("Nessuna Stability Key.");
    const res= await fetch(`https://api.stability.ai/v2beta/image-to-video/result/${genId}`,{
      method:'GET',
      headers:{
        'Authorization':`Bearer ${apiKey}`,
        'Accept':'video/*'
      }
    });
    if(res.status===202){
      outEl.textContent="Video in progress, riprova tra un po'!";
    }else if(res.status===200){
      const vidBlob= await res.blob();
      const objURL= URL.createObjectURL(vidBlob);
      outEl.innerHTML=`
        <p>Video completato!</p>
        <video src="${objURL}" controls style="max-width:100%;"></video>
      `;
    }else{
      const errJson=await res.json();
      throw new Error(JSON.stringify(errJson));
    }
    await refreshCredits();
  }catch(err){
    outEl.textContent= err.message;
  }finally{
    hideOverlay();
  }
});

// 3D
document.getElementById('threeDBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('threeDOutput');
  const file= document.getElementById('threeDImage').files[0];
  if(!file){
    outEl.textContent="Carica immagine da convertire in 3D!";
    return;
  }
  outEl.textContent="Generazione 3D...";

  showOverlay();
  try{
    const apiKey= getStabilityKey();
    if(!apiKey) throw new Error("Nessuna Stability Key.");

    const fd= new FormData();
    fd.append("image", file);

    const res= await fetch("https://api.stability.ai/v2beta/3d/stable-fast-3d",{
      method:'POST',
      headers:{
        'Authorization':`Bearer ${apiKey}`
      },
      body: fd
    });
    if(!res.ok){
      const errBuf= await res.arrayBuffer();
      throw new Error(`Errore 3D: ${res.status} - ${new TextDecoder().decode(errBuf)}`);
    }
    await refreshCredits();

    const glbBlob= await res.blob();
    outEl.textContent="3D generato! Visualizzato nel viewer sotto.";
    const glbURL= URL.createObjectURL(glbBlob);
    const viewer= document.getElementById('threeDViewer');
    viewer.src= glbURL;
  }catch(err){
    outEl.textContent= err.message;
  }finally{
    hideOverlay();
  }
});

/**********************************************
 * CONTROL (Structure)
 **********************************************/
document.getElementById('structureBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('structureOutput');
  const file= document.getElementById('structureImage').files[0];
  const promptVal= document.getElementById('structurePrompt').value.trim()||"";
  const strengthVal= document.getElementById('structureStrength').value.trim()||"0.7";

  if(!file){
    outEl.textContent="Carica immagine base!";
    return;
  }
  outEl.textContent="Elaborazione Structure...";

  try{
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/control/structure",
      {
        "image": file,
        "prompt": promptVal,
        "control_strength": strengthVal,
        "output_format":"webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML= `<img src="${objURL}" alt="Structure" style="max-width:100%">`;
  }catch(err){
    outEl.textContent= err.message;
  }
});

/**********************************************
 * PREDICI (Questionario + generazione + openAI)
 **********************************************/
document.getElementById('predGenerateBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('predOutput');

  const env= document.getElementById('predEnv').value.trim(); 
  const style= document.getElementById('predStyle').value.trim();
  const colors= document.getElementById('predColors').value.trim();
  const budget= document.getElementById('predBudget').value.trim();
  const notes= document.getElementById('predNotes').value.trim();

  outEl.textContent= "Genero scenari...";

  // Esempio di prompt in inglese
  const stablePrompt = `A ${style} ${env} with ${colors} colors, budget ${budget}, notes: ${notes}. Ultra realistic.`;

  try{
    showOverlay();

    // 1) chiama stability (generate/ultra)
    const blob= await callStabilityAI(
      "https://api.stability.ai/v2beta/stable-image/generate/ultra",
      {
        "prompt": stablePrompt,
        "output_format":"webp"
      }
    );
    const objURL= URL.createObjectURL(blob);
    outEl.innerHTML=`
      <p>Immagine generata con prompt: <em>${stablePrompt}</em></p>
      <img src="${objURL}" alt="Scenario" style="max-width:100%; margin-bottom:1rem;">
    `;

    // 2) chiama openAI per suggerimenti commerciali
    const openAiK= getOpenAiKey();
    if(!openAiK){
      outEl.innerHTML+= `<p style="color:red">Nessuna OpenAI Key trovata. Non posso generare suggerimenti testuali.</p>`;
      return;
    }
    const textPrompt= `You are a professional interior designer. The user wants a ${env} in a ${style} style with ${colors} colors, budget ${budget}. Additional notes: ${notes}. Provide commercial suggestions and creative solutions. Write in italian and use html tags with bolds, br tag, list and so on.`;

    const advice= await callOpenAiText(openAiK, textPrompt);
    outEl.innerHTML+=`
      <h4>Consigli Commerciali (OpenAI):</h4>
      <p>${advice}</p>
    `;
  }catch(err){
    outEl.textContent= err.message;
  }finally{
    hideOverlay();
  }
});

/**********************************************
 * OPENAI COMPLETIONS
 **********************************************/
async function callOpenAiText(openAiKey, prompt){
  const url= "https://api.openai.com/v1/completions";
  const reqData= {
    model: "gpt-3.5-turbo-instruct",
    prompt: prompt,
    max_tokens:2000,
    temperature:0.7
  };
  const headers= {
    "Content-Type":"application/json",
    "Authorization": `Bearer ${openAiKey}`
  };
  
  const resp= await fetch(url, {
    method:'POST',
    headers,
    body: JSON.stringify(reqData)
  });
  if(!resp.ok){
    const errText= await resp.text();
    throw new Error(`OpenAI error: ${resp.status} - ${errText}`);
  }
  const data= await resp.json();
  return data.choices[0].text.trim();
}

/**********************************************
 * CREDITS
 **********************************************/
document.getElementById('refreshBalanceBtn').addEventListener('click', async()=>{
  const outEl= document.getElementById('balanceOutput');
  outEl.textContent="Recupero crediti...";
  showOverlay();
  try{
    await refreshCredits();
    outEl.textContent=`Crediti attuali (0-100): ${availableCredits.toFixed(2)}`;
  }catch(err){
    outEl.textContent= err.message;
  }finally{
    hideOverlay();
  }
});
