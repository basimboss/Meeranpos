// add_mobile.js - add & edit form and scanner for the form

// sell date toggle
const sellOption = document.getElementById('sellOption');
const sellDateSection = document.getElementById('sellDateSection');
document.querySelectorAll("input[name='status']").forEach(r => {
  r.addEventListener('change', () => {
    sellDateSection.style.display = sellOption.checked ? 'block' : 'none';
  });
});

// prefill if editing
document.addEventListener('DOMContentLoaded', () => {
  const editIndex = localStorage.getItem('editMobileIndex');
  if (editIndex !== null) {
    const mobiles = JSON.parse(localStorage.getItem('mobiles')) || [];
    const m = mobiles[editIndex];
    if (m) {
      document.getElementById('mobileName').value = m.name || '';
      document.getElementById('purchaseFrom').value = m.from || '';
      document.getElementById('purchaseDate').value = m.date || '';
      document.getElementById('imei').value = m.imei || '';
      document.getElementById('description').value = m.desc || '';
      document.getElementById('barcodeId').value = m.barcode || '';
      document.querySelectorAll("input[name='status']").forEach(r => r.checked = (r.value === m.status));
      sellDateSection.style.display = (m.status === 'Sell') ? 'block' : 'none';
      if (m.sellDate) document.getElementById('sellDate').value = m.sellDate;
    }
  }
});

// form submit (add or edit)
document.getElementById('mobileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const mobileData = {
    name: document.getElementById('mobileName').value,
    from: document.getElementById('purchaseFrom').value,
    date: document.getElementById('purchaseDate').value,
    imei: document.getElementById('imei').value,
    desc: document.getElementById('description').value,
    status: document.querySelector("input[name='status']:checked").value,
    sellDate: document.getElementById('sellDate').value,
    barcode: document.getElementById('barcodeId').value
  };
  let mobiles = JSON.parse(localStorage.getItem('mobiles')) || [];
  const editIndex = localStorage.getItem('editMobileIndex');
  if (editIndex !== null) {
    mobiles[editIndex] = mobileData;
    localStorage.removeItem('editMobileIndex');
  } else {
    mobiles.push(mobileData);
  }
  localStorage.setItem('mobiles', JSON.stringify(mobiles));

  // redirect to home to show the saved mobile
  window.location.href = 'home.html';
});

// ===== Scanner on add_mobile page (opens overlay, scans, writes barcodeId) =====
const addScanBtn = document.getElementById('scanBarcodeBtn');
const addScannerScreen = document.getElementById('addScannerScreen');
const addVideo = document.getElementById('addCameraFeed');
const addCanvas = document.getElementById('addBarcodeCanvas');
const addCtx = addCanvas.getContext('2d');
let addScanning = false;
let addAnim = null;

addScanBtn.addEventListener('click', startAddScanner);
document.getElementById('addCloseScannerBtn')?.addEventListener('click', stopAddScanner);

function startAddScanner() {
  addScannerScreen.style.display = 'flex';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Camera not supported');
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      addVideo.srcObject = stream;
      addVideo.play();
      addScanning = true;
      addTick();
    })
    .catch(err => {
      alert('Camera access denied or not available.');
      console.error(err);
    });
}

function stopAddScanner() {
  addScanning = false;
  if (addAnim) cancelAnimationFrame(addAnim);
  const s = addVideo.srcObject;
  if (s) s.getTracks().forEach(t => t.stop());
  addVideo.srcObject = null;
  addScannerScreen.style.display = 'none';
}

function addTick() {
  if (!addScanning) return;
  if (addVideo.readyState === addVideo.HAVE_ENOUGH_DATA) {
    addCanvas.width = addVideo.videoWidth;
    addCanvas.height = addVideo.videoHeight;
    addCtx.drawImage(addVideo, 0, 0, addCanvas.width, addCanvas.height);
    const imageData = addCtx.getImageData(0,0,addCanvas.width, addCanvas.height);
    const code = jsQR(imageData.data, addCanvas.width, addCanvas.height);
    if (code && code.data) {
      // fill barcode field and stop
      document.getElementById('barcodeId').value = code.data.toString();
      stopAddScanner();
      return;
    }
  }
  addAnim = requestAnimationFrame(addTick);
}

