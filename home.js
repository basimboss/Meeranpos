// home.js - loads list, filter, search, scanner and actions

// helper: escape html
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ======================================================================================
// State and DOM refs
const listContainer = document.getElementById('mobileList');
const filterButtons = document.querySelectorAll('.mobile-options button');
const searchInput = document.getElementById('searchinput');
const searchBtn = document.getElementById('searchBtn');

let currentFilter = 'all';
let currentSearch = '';

// ======================================================================================
// Load and render mobiles
function loadMobileList() {
  const mobiles = JSON.parse(localStorage.getItem('mobiles')) || [];
  listContainer.innerHTML = '';

  // filter
  const filtered = mobiles.filter(m => {
    if (currentFilter === 'all') return true;
    const st = (m.status || '').toString().trim().toLowerCase();
    if (currentFilter === 'sold') return st === 'sell' || st === 'sold';
    return st === currentFilter;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = "<p style='text-align:center;color:gray'>No mobiles found.</p>";
    return;
  }

  const searchLower = (currentSearch || '').trim().toLowerCase();

  filtered.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = 'mobile-item';
    card.innerHTML = `
      <p class="m-name"><strong>Name:</strong> ${escapeHtml(m.name)}</p>
      <p><strong>From:</strong> ${escapeHtml(m.from)}</p>
      <p><strong>Date:</strong> ${escapeHtml(m.date)}</p>
      <p><strong>Status:</strong> <span class="status-text">${escapeHtml(m.status)}</span></p>
      <p><strong>Barcode:</strong> ${escapeHtml(m.barcode)}</p>
      <div class="action-buttons">
        <button class="sell-btn" ${((m.status||'').toLowerCase()==='sell' || (m.status||'').toLowerCase()==='sold') ? 'disabled' : ''}>💰</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;
    listContainer.appendChild(card);

    // highlight if search matches name (or barcode if you want)
    if (searchLower) {
      const name = (m.name || '').toLowerCase();
      const barcode = (m.barcode || '').toLowerCase();
      if (name.includes(searchLower) || barcode.includes(searchLower)) {
        card.classList.add('highlight');
        // scroll first match into view
        if (!document.querySelector('.mobile-item.scrolled-into-view')) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('scrolled-into-view');
          setTimeout(() => card.classList.remove('scrolled-into-view'), 1200);
        }
      }
    }

    // action handlers
    const sellBtn = card.querySelector('.sell-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    sellBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // find original index and update
      const all = JSON.parse(localStorage.getItem('mobiles')) || [];
      const origIndex = findOriginalIndex(all, m);
      if (origIndex !== -1) {
        all[origIndex].status = 'Sold';
        localStorage.setItem('mobiles', JSON.stringify(all));
        loadMobileList();
      }
    });

    deleteBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const all = JSON.parse(localStorage.getItem('mobiles')) || [];
      const origIndex = findOriginalIndex(all, m);
      if (origIndex !== -1) {
        all.splice(origIndex, 1);
        localStorage.setItem('mobiles', JSON.stringify(all));
        loadMobileList();
      }
    });

    // click card => edit
    card.addEventListener('click', () => {
      const all = JSON.parse(localStorage.getItem('mobiles')) || [];
      const origIndex = findOriginalIndex(all, m);
      if (origIndex !== -1) {
        localStorage.setItem('editMobileIndex', origIndex);
        window.location.href = 'add_mobile.html';
      }
    });
  });
}

// try to find original array index by IMEI/barcode then fallback to match fields
function findOriginalIndex(arr, mobileObj) {
  for (let i=0;i<arr.length;i++){
    if (arr[i].imei && mobileObj.imei && arr[i].imei === mobileObj.imei) return i;
    if (arr[i].barcode && mobileObj.barcode && arr[i].barcode === mobileObj.barcode) return i;
  }
  for (let i=0;i<arr.length;i++){
    if ((arr[i].name || '') === (mobileObj.name || '') &&
        (arr[i].date || '') === (mobileObj.date || '') &&
        (arr[i].from || '') === (mobileObj.from || '')) return i;
  }
  return arr.indexOf(mobileObj);
}

// ======================================================================================
// Filters
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const text = (btn.textContent || btn.innerText || '').toLowerCase();
    if (text.includes('all')) currentFilter = 'all';
    else if (text.includes('stock')) currentFilter = 'stock';
    else if (text.includes('service')) currentFilter = 'service';
    else if (text.includes('sold') || text.includes('sell')) currentFilter = 'sold';
    else currentFilter = 'all';

    // toggle active class
    filterButtons.forEach(b => b.classList.remove('active-filter'));
    btn.classList.add('active-filter');

    loadMobileList();
  });
});

// search
searchBtn.addEventListener('click', () => {
  currentSearch = searchInput.value || '';
  loadMobileList();
});
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    currentSearch = searchInput.value || '';
    loadMobileList();
  }
});

// ======================================================================================
// Scanner (uses jsQR) - opens camera, reads code, finds mobile by barcode
const scannerBtn = document.getElementById('scannerBtn');
const scannerScreen = document.getElementById('scannerScreen');
const video = document.getElementById('cameraFeed');
const canvas = document.getElementById('barcodeCanvas');
const ctx = canvas.getContext('2d');
let scanning = false;
let scanAnimationFrame = null;

scannerBtn?.addEventListener('click', startScanner);
document.getElementById('closeScannerBtn')?.addEventListener('click', stopScanner);

function startScanner() {
  scannerScreen.style.display = 'flex';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera not supported');
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      video.srcObject = stream;
      video.play();
      scanning = true;
      tick();
    })
    .catch(err => {
      alert('Camera access denied or not available.');
      console.error(err);
    });
}

function stopScanner() {
  scanning = false;
  if (scanAnimationFrame) cancelAnimationFrame(scanAnimationFrame);
  const s = video.srcObject;
  if (s) s.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  scannerScreen.style.display = 'none';
}

function tick() {
  if (!scanning) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height);
    if (code && code.data) {
      // found a code
      const scanned = code.data.toString();
      stopScanner();
      // find the mobile by barcode
      const all = JSON.parse(localStorage.getItem('mobiles')) || [];
      const idx = all.findIndex(x => (x.barcode || '').toString() === scanned.toString());
      if (idx !== -1) {
        // go to home list and highlight the item
        currentFilter = 'all';
        currentSearch = '';
        loadMobileList();
        // after rendering, add highlight & scroll
        setTimeout(() => {
          const cards = document.querySelectorAll('.mobile-item');
          for (let c of cards) {
            const btext = c.querySelector('p:nth-child(5)')?.textContent || '';
            if (btext.includes(scanned)) {
              c.classList.add('highlight');
              c.scrollIntoView({behavior:'smooth', block:'center'});
              setTimeout(()=> c.classList.remove('highlight'), 3000);
              break;
            }
          }
        }, 300);
      } else {
        alert('No mobile found with barcode: ' + scanned);
      }
      return;
    }
  }
  scanAnimationFrame = requestAnimationFrame(tick);
}

// ======================================================================================
// Add mobile button navigation
document.getElementById('addMobileBtn')?.addEventListener('click', () => {
  // clear edit index when adding fresh
  localStorage.removeItem('editMobileIndex');
  window.location.href = 'add_mobile.html';
});

// initial render
loadMobileList();

