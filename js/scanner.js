/* ============================================================
   SCANNER & FOOD IDENTIFICATION
   Handles: Camera, Barcode, OCR, AI Classification
============================================================ */

class ScannerManager {
  constructor() {
    this.model = null;
    this.cameraStream = null;
    this.html5Qr = null;
    this.scannerRunning = false;
    this.analyzing = false;
    this.lastPrediction = null;
    this.barcodeBusy = false;
  }

  /* ===== INITIALIZATION ===== */
  async initModel() {
    if (this.model) return; // Already loaded
    
    try {
      document.getElementById('aiStatus').innerHTML = `
        <div class="flex gap-3 items-center">
          <div class="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-base">⏳</div>
          <div>
            <p class="font-semibold text-slate-800">Carregando MobileNet...</p>
            <p class="text-xs text-slate-400 mt-0.5">Otimizado para dispositivos móveis</p>
          </div>
        </div>
      `;
      
      this.model = await mobilenet.load();
      this.logStatus('✅ Modelo carregado');
      return true;
    } catch (error) {
      console.error('MobileNet load error:', error);
      this.showError('Falha ao carregar modelo de IA', error.message);
      return false;
    }
  }

  async initTesseract() {
    if (!window.Tesseract) {
      this.showError('OCR não disponível', 'Tesseract.js não carregado');
      return null;
    }
    
    try {
      const result = await Tesseract.recognize(
        document.getElementById('aiCanvas'),
        'por'
      );
      return result.data.text;
    } catch (error) {
      console.error('OCR error:', error);
      return null;
    }
  }

  /* ===== CAMERA ===== */
  async startCamera() {
    if (this.scannerRunning) return;
    
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = document.getElementById('aiCamera');
      video.srcObject = this.cameraStream;
      
      this.scannerRunning = true;
      
      // Auto-capture frames for analysis
      this.setupAutoCapture();
      return true;
    } catch (error) {
      console.error('Camera error:', error);
      this.showError('Câmera não disponível', error.message);
      return false;
    }
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.scannerRunning = false;
  }

  /* ===== AUTO-CAPTURE & CLASSIFICATION ===== */
  setupAutoCapture() {
    const video = document.getElementById('aiCamera');
    const canvas = document.getElementById('aiCanvas');
    const ctx = canvas.getContext('2d');
    
    const captureInterval = setInterval(() => {
      if (!this.scannerRunning) {
        clearInterval(captureInterval);
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
    }, 500);
  }

  async captureAndClassify() {
    if (!this.model || this.analyzing) return;
    
    this.analyzing = true;
    try {
      document.getElementById('analysisProgress').classList.remove('hidden');
      document.getElementById('analysisProgressText').textContent = 'Analisando imagem...';
      
      const canvas = document.getElementById('aiCanvas');
      const predictions = await this.model.classify(canvas);
      
      if (!predictions || predictions.length === 0) {
        this.showError('Nenhum item identificado', 'Tente uma imagem mais clara');
        return;
      }
      
      // Get top prediction
      const topPred = predictions[0];
      this.lastPrediction = {
        name: this.formatFoodName(topPred.className),
        confidence: Math.round(topPred.probability * 100),
        raw: topPred,
        timestamp: new Date()
      };
      
      // Try to enrich with Open Food Facts
      await this.enrichPredictionWithOFF();
      
      // Display prediction
      this.showPrediction();
    } catch (error) {
      console.error('Classification error:', error);
      this.showError('Erro na análise', error.message);
    } finally {
      this.analyzing = false;
      document.getElementById('analysisProgress').classList.add('hidden');
    }
  }

  async enrichPredictionWithOFF() {
    if (!this.lastPrediction) return;
    
    try {
      const response = await fetch(
        `${OPEN_FOOD_FACTS_SEARCH}?search_terms=${encodeURIComponent(this.lastPrediction.name)}&json=1`
      );
      const data = await response.json();
      
      if (data.products && data.products.length > 0) {
        const product = data.products[0];
        this.lastPrediction.offMatch = {
          name: product.product_name || this.lastPrediction.name,
          barcode: product.code,
          expiryDays: this.estimateExpiryDays(product)
        };
      }
    } catch (error) {
      console.warn('Open Food Facts lookup failed:', error);
      // Non-critical - prediction still works
    }
  }

  formatFoodName(raw) {
    return raw
      .split(',')[0]
      .toLowerCase()
      .replace(/[^a-záéíóúàãõ\s]/g, '')
      .trim();
  }

  showPrediction() {
    if (!this.lastPrediction) return;
    
    const box = document.getElementById('predictionBox');
    document.getElementById('predictionName').textContent = 
      this.lastPrediction.offMatch?.name || this.lastPrediction.name;
    document.getElementById('predictionConfidence').textContent = 
      `Confiança: ${this.lastPrediction.confidence}%`;
    document.getElementById('predictionIcon').textContent = 
      this.getIconForFood(this.lastPrediction.name);
    
    box.classList.remove('hidden');
  }

  getIconForFood(foodName) {
    const icons = {
      'banana': '🍌', 'maçã': '🍎', 'pão': '🍞', 'queijo': '🧀',
      'leite': '🥛', 'ovo': '🥚', 'frango': '🍗', 'peixe': '🐟',
      'tomate': '🍅', 'alface': '🥬', 'cenoura': '🥕'
    };
    
    for (const [key, icon] of Object.entries(icons)) {
      if (foodName.includes(key)) return icon;
    }
    return '🥫';
  }

  /* ===== BARCODE SCANNER ===== */
  async startBarcodeScanner() {
    if (this.barcodeBusy) return;
    this.barcodeBusy = true;
    
    try {
      if (!this.html5Qr) {
        this.html5Qr = new Html5Qrcode('reader');
      }
      
      const reader = document.getElementById('reader');
      reader.classList.remove('hidden');
      
      await this.html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => this.handleBarcodeSuccess(decodedText),
        (error) => console.warn('Barcode scan error:', error)
      );
    } catch (error) {
      console.error('Barcode scanner start error:', error);
      this.showError('Barcode scanner unavailable', error.message);
    } finally {
      this.barcodeBusy = false;
    }
  }

  async stopBarcodeScanner() {
    if (this.html5Qr) {
      try {
        await this.html5Qr.stop();
        document.getElementById('reader').classList.add('hidden');
      } catch (error) {
        console.warn('Barcode stop error:', error);
      }
    }
  }

  async handleBarcodeSuccess(barcode) {
    await this.stopBarcodeScanner();
    
    try {
      const response = await fetch(`${OPEN_FOOD_FACTS_PRODUCT}${barcode}`);
      const data = await response.json();
      
      if (data.status === 1 && data.product) {
        this.lastPrediction = {
          name: data.product.product_name || 'Produto desconhecido',
          confidence: 100,
          barcode: barcode,
          source: 'barcode',
          offMatch: {
            name: data.product.product_name,
            barcode: barcode,
            expiryDays: this.estimateExpiryDays(data.product)
          }
        };
        this.showPrediction();
      } else {
        this.showError('Produto não encontrado', `Código: ${barcode}`);
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      this.showError('Erro na busca', error.message);
    }
  }

  /* ===== UTILITY ===== */
  estimateExpiryDays(product) {
    // Heuristic based on category/type
    const categories = product.categories_tags || [];
    const defaults = {
      'en:fresh-milk': 7,
      'en:yogurt': 21,
      'en:cheese': 60,
      'en:bread': 3,
      'en:fruit': 7,
      'en:vegetable': 14
    };
    
    for (const cat of categories) {
      if (defaults[cat]) return defaults[cat];
    }
    
    return 30; // Default
  }

  logStatus(msg) {
    console.log(`[Scanner] ${msg}`);
  }

  showError(title, msg) {
    const status = document.getElementById('aiStatus');
    status.innerHTML = `
      <div class="flex gap-3 items-center">
        <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-base">⚠️</div>
        <div>
          <p class="font-semibold text-red-700">${title}</p>
          <p class="text-xs text-slate-500 mt-0.5">${msg}</p>
        </div>
      </div>
    `;
  }

  cleanup() {
    this.stopCamera();
    this.stopBarcodeScanner();
  }
}

// Global instance
let scannerManager = new ScannerManager();

/* ===== UI HANDLERS ===== */
async function openScanner() {
  const modal = document.getElementById('scannerModal');
  modal.classList.remove('hidden');
  
  // Initialize model + start camera
  const modelReady = await scannerManager.initModel();
  if (modelReady) {
    await scannerManager.startCamera();
  }
}

function closeScanner() {
  const modal = document.getElementById('scannerModal');
  modal.classList.add('hidden');
  scannerManager.cleanup();
}

async function captureAndClassify() {
  await scannerManager.captureAndClassify();
}

async function startBarcodeScanner() {
  await scannerManager.startBarcodeScanner();
}

function usePrediction() {
  if (!scannerManager.lastPrediction) return;
  
  const prediction = scannerManager.lastPrediction;
  document.getElementById('foodName').value = prediction.offMatch?.name || prediction.name;
  document.getElementById('expiryDate').value = 
    getDefaultExpiryDate(prediction.offMatch?.expiryDays || 30);
  
  document.getElementById('productForm').classList.remove('hidden');
}

function quickSavePrediction() {
  if (!scannerManager.lastPrediction) return;
  
  const pred = scannerManager.lastPrediction;
  const food = {
    id: Date.now(),
    name: pred.offMatch?.name || pred.name,
    quantity: 1,
    storage: 'despensa',
    expiryDate: getDefaultExpiryDate(pred.offMatch?.expiryDays || 30),
    opened: false,
    addedDate: new Date().toISOString(),
    price: 0
  };
  
  addFood(food);
  closeScanner();
  showToast(`✅ ${food.name} adicionado à despensa`);
}

function getDefaultExpiryDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function showToast(msg) {
  console.log(msg); // Implement toast UI
}
