/*********************************************
 * Stato e UI references
 *********************************************/
let availableCredits = 100;
const creditsText = document.getElementById('creditsText');
const creditsProgressBar = document.getElementById('creditsProgressBar');

// Navbar
const navbarItems = document.querySelectorAll('.navbar-item');
const sections = document.querySelectorAll('.section');

// Overlay
const loadingOverlay = document.getElementById('loadingOverlay');

/*********************************************
 * Inizializzazione
 *********************************************/
function updateCreditsBar() {
  if (availableCredits < 0) availableCredits = 0;
  creditsText.textContent = `Crediti rimanenti: ${availableCredits.toFixed(2)}`;
  const percent = (availableCredits / 100) * 100;
  creditsProgressBar.style.width = `${percent}%`;
}
updateCreditsBar();

// Navbar switch
navbarItems.forEach(item => {
  item.addEventListener('click', () => {
    navbarItems.forEach(i => i.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    item.classList.add('active');
    const sectionId = item.getAttribute('data-section');
    document.getElementById(sectionId).classList.add('active');
  });
});

/*********************************************
 * Overlay
 *********************************************/
function showOverlay() {
  loadingOverlay.classList.remove('hidden');
}
function hideOverlay() {
  loadingOverlay.classList.add('hidden');
}

/*********************************************
 * Rilevazione token
 *********************************************/
function getApiToken() {
  return document.getElementById('apiToken').value.trim();
}

/*********************************************
 * Funzione generica per Stability AI
 *********************************************/
async function callStabilityEndpoint(url, fields, acceptType = 'image/*') {
  const apiToken = getApiToken();
  if (!apiToken) {
    throw new Error("Inserisci la chiave di accesso prima!");
  }

  // Creiamo un FormData
  const formData = new FormData();
  for (const k in fields) {
    formData.append(k, fields[k]);
  }

  showOverlay();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': acceptType
      },
      body: formData
    });
    if (!res.ok) {
      const errBuf = await res.arrayBuffer();
      throw new Error(`Errore API: ${res.status} - ${new TextDecoder().decode(errBuf)}`);
    }
    // Aggiorniamo i crediti reali
    await refreshCredits();
    // Ritorno immagine o json
    if (acceptType === 'image/*') {
      return await res.blob();
    } else {
      return await res.json();
    }
  } finally {
    hideOverlay();
  }
}

/*********************************************
 * Refresh dei crediti
 *********************************************/
async function refreshCredits() {
  const apiToken = getApiToken();
  if (!apiToken) return; // se non c'è, skip

  try {
    const r = await fetch("https://api.stability.ai/v1/user/balance", {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });
    if (!r.ok) {
      console.warn("Non riesco a recuperare i crediti dal server!");
      return;
    }
    const data = await r.json();
    // data.credits es: 0.63
    // personalizziamo la scalatura
    availableCredits = data.credits * 10;
    updateCreditsBar();
  } catch (err) {
    console.warn("Errore refresh crediti:", err.message);
  }
}

/*********************************************
 * Sezione Generate (Ispirazioni)
 *********************************************/
const genBtn = document.getElementById('genBtn');
genBtn.addEventListener('click', async () => {
  const outEl = document.getElementById('genOutput');
  const prompt = document.getElementById('genPrompt').value.trim();
  if (!prompt) {
    outEl.textContent = "Scrivi un prompt, ad es: 'Salone in stile retrò'!";
    return;
  }
  outEl.textContent = "Creazione ispirazioni...";

  try {
    // Esempio: /v2beta/stable-image/generate/core
    const blob = await callStabilityEndpoint(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      { prompt },
      "image/*"
    );
    const objURL = URL.createObjectURL(blob);
    outEl.innerHTML = `<img src="${objURL}" alt="Ispirazione" style="max-width:100%">`;
  } catch (err) {
    outEl.textContent = err.message;
  }
});

/*********************************************
 * Sezione Edit: Inpaint, Outpaint
 *********************************************/
// Inpaint
document.getElementById('inpaintBtn').addEventListener('click', async () => {
  const outEl = document.getElementById('inpaintOutput');
  const imageFile = document.getElementById('inpaintImage').files[0];
  const maskFile = document.getElementById('inpaintMask').files[0];
  if (!imageFile) {
    outEl.textContent = "Carica l’immagine da modificare!";
    return;
  }
  outEl.textContent = "Ritocco in corso...";

  try {
    const blob = await callStabilityEndpoint(
      "https://api.stability.ai/v2beta/stable-image/edit/inpaint",
      {
        image: imageFile,
        mask: maskFile || ""
      },
      "image/*"
    );
    const objURL = URL.createObjectURL(blob);
    outEl.innerHTML = `<img src="${objURL}" alt="Inpaint" style="max-width:100%">`;
  } catch (err) {
    outEl.textContent = err.message;
  }
});

// Outpaint
document.getElementById('outpaintBtn').addEventListener('click', async () => {
  const outEl = document.getElementById('outpaintOutput');
  const imageFile = document.getElementById('outpaintImage').files[0];
  const direction = document.getElementById('outpaintDirection').value;
  if (!imageFile) {
    outEl.textContent = "Carica l’immagine di base!";
    return;
  }
  outEl.textContent = "Outpainting in corso...";

  try {
    const blob = await callStabilityEndpoint(
      "https://api.stability.ai/v2beta/stable-image/edit/outpaint",
      {
        image: imageFile,
        direction
      },
      "image/*"
    );
    const objURL = URL.createObjectURL(blob);
    outEl.innerHTML = `<img src="${objURL}" alt="Outpaint" style="max-width:100%">`;
  } catch (err) {
    outEl.textContent = err.message;
  }
});

/*********************************************
 * Sezione Upscale
 *********************************************/
document.getElementById('upscaleFastBtn').addEventListener('click', async () => {
  const outEl = document.getElementById('upscaleFastOutput');
  const imageFile = document.getElementById('upscaleFastImage').files[0];
  if (!imageFile) {
    outEl.textContent = "Seleziona un'immagine per l'upscale!";
    return;
  }
  outEl.textContent = "Miglioramento...";

  try {
    const blob = await callStabilityEndpoint(
      "https://api.stability.ai/v2beta/stable-image/upscale/fast",
      { image: imageFile },
      "image/*"
    );
    const objURL = URL.createObjectURL(blob);
    outEl.innerHTML = `<img src="${objURL}" alt="Upscale" style="max-width:100%">`;
  } catch (err) {
    outEl.textContent = err.message;
  }
});

/*********************************************
 * Sezione Control: Sketch, Structure, Style
 *********************************************/
// Sketch
document.getElementById('sketchBtn').addEventListener('click', async () => {
  const outEl = document.getElementById('sketchOutput');
  const imageFile = document.getElementById('sketchImage').files[0];
  const prompt = document.getElementById('sketchPrompt').value.trim();
  const strength = document.getElementById('sketchStrength').value.trim();
  if (!imageFile) {
    outEl.textContent = "Carica il tuo sketch!";
    return;
  }
  outEl.textContent = "Trasformazione sketch...";

  try {
    const blob = await callStabilityEndpoint(
      "https://api.stability.ai/v2beta/stable-image/control/sketch",
      {
        image: imageFile,
        prompt: prompt || "",
        control_strength: strength || "0.6"
      },
      "image/*"
    );
    const objURL = URL.createObjectURL(blob);
    outEl.innerHTML = `<img src="${objURL}" alt="Sketch result" style="max-width:100%">`;
  } catch (err) {
    outEl.textContent = err.message;
  }
});

// Structure
document.getElementById('structureBtn').addEventListener('click', async () => {
  const outEl = document.getElementById('structureOutput');
  const imageFile = document.getElementById('structureImage').files[0];
  const prompt = document.getElementById('structurePrompt').value.trim();
  const strength = document.getElementById('structureStrength').value.trim();
  if (!imageFile) {
    outEl.textContent = "Carica l'immagine di base!";
    return;
  }
  outEl.textContent = "Mantenimento struttura...";

  try {
    const blob = await callStabilityEndpoint(
      "https://api.stability.ai/v2beta/stable-image/control/structure",
      {
        image: imageFile,
        prompt: prompt || "",
        control_strength: strength || "0.7"
      },
      "image/*"
    );
    const objURL = URL.createObjectURL(blob);
    outEl.innerHTML = `<img src="${objURL}" alt="Structure" style="max-width:100%">`;
  } catch (err) {
    outEl.textContent = err.message;
  }
});

// Style
document.getElementById('styleBtn').addEventListener('click', async () => {
  const outEl = document.getElementById('styleOutput');
  const imageFile = document.getElementById('styleImage').files[0];
  const prompt = document.getElementById('stylePrompt').value.trim();
  if (!imageFile) {
    outEl.textContent = "Carica l'immagine su cui applicare lo stile!";
    return;
  }
  outEl.textContent = "Applicazione stile...";

  try {
    const blob = await callStabilityEndpoint(
      "https://api.stability.ai/v2beta/stable-image/control/style",
      {
        image: imageFile,
        prompt: prompt || ""
      },
      "image/*"
    );
    const objURL = URL.createObjectURL(blob);
    outEl.innerHTML = `<img src="${objURL}" alt="Style" style="max-width:100%">`;
  } catch (err) {
    outEl.textContent = err.message;
  }
});

/*********************************************
 * Sezione Crediti
 *********************************************/
document.getElementById('refreshBalanceBtn').addEventListener('click', async () => {
  const outEl = document.getElementById('balanceOutput');
  outEl.textContent = "Verifico i tuoi crediti...";
  
  showOverlay();
  try {
    const apiToken = getApiToken();
    if (!apiToken) {
      throw new Error("Inserisci la chiave di accesso!");
    }
    const r = await fetch("https://api.stability.ai/v1/user/balance", {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Errore: ${r.status} - ${errText}`);
    }
    const data = await r.json();
    outEl.textContent = `Crediti disponibili: ${data.credits.toFixed(2)}`;
    availableCredits = data.credits * 10; // map real credits to local range
    updateCreditsBar();
  } catch (err) {
    outEl.textContent = err.message;
  } finally {
    hideOverlay();
  }
});
