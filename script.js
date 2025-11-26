// Payment Methods - Public Page Script

const CONFIG_KEY = 'paymentMethodsConfig';
const CONFIG_FILE = 'config.json';

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  loadPaymentMethods();
});

// Load payment methods from localStorage or config.json
async function loadPaymentMethods() {
  let config = getConfigFromStorage();
  
  if (!config) {
    try {
      const response = await fetch(CONFIG_FILE);
      if (response.ok) {
        config = await response.json();
        saveConfigToStorage(config);
      }
    } catch (error) {
      console.log('Could not load config file, using empty config');
      config = { paymentMethods: [] };
    }
  }
  
  renderPaymentCards(config.paymentMethods || []);
}

// Get config from localStorage
function getConfigFromStorage() {
  const stored = localStorage.getItem(CONFIG_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Save config to localStorage
function saveConfigToStorage(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Render payment cards
function renderPaymentCards(methods) {
  const container = document.getElementById('cards-container');
  const emptyState = document.getElementById('empty-state');
  
  // Filter out hidden methods for public view
  const visibleMethods = methods.filter(m => m.status !== 'hidden');
  
  if (visibleMethods.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  container.innerHTML = visibleMethods.map(method => createCardHTML(method)).join('');
  
  // Attach copy button event listeners
  container.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', handleCopy);
  });
}

// Create HTML for a single payment card
function createCardHTML(method) {
  const statusClass = method.status === 'not-available' ? 'not-available' : '';
  const statusText = getStatusText(method.status);
  const statusBadgeClass = method.status;
  
  const qrHTML = method.qrImage 
    ? `<img src="${escapeHtml(method.qrImage)}" alt="QR Code for ${escapeHtml(method.label)}">`
    : '<span class="no-qr">No QR code available</span>';
  
  return `
    <div class="payment-card ${statusClass}">
      <div class="card-header">
        <span class="card-label">${escapeHtml(method.label)}</span>
        <span class="status-badge ${statusBadgeClass}">${statusText}</span>
      </div>
      <div class="card-content">
        <div class="info-row">
          <span class="info-label">Account Name</span>
          <div class="info-value">
            <span>${escapeHtml(method.accountName)}</span>
            <button class="btn btn-copy" data-copy="${escapeHtml(method.accountName)}">Copy</button>
          </div>
        </div>
        <div class="info-row">
          <span class="info-label">Account Number</span>
          <div class="info-value">
            <span>${escapeHtml(method.accountNumber)}</span>
            <button class="btn btn-copy" data-copy="${escapeHtml(method.accountNumber)}">Copy</button>
          </div>
        </div>
        <div class="qr-container">
          ${qrHTML}
        </div>
      </div>
    </div>
  `;
}

// Get status display text
function getStatusText(status) {
  switch (status) {
    case 'available':
      return 'Available';
    case 'not-available':
      return 'Not Available';
    case 'hidden':
      return 'Hidden';
    default:
      return 'Unknown';
  }
}

// Handle copy button click
async function handleCopy(event) {
  const btn = event.target;
  const textToCopy = btn.dataset.copy;
  
  try {
    await navigator.clipboard.writeText(textToCopy);
    
    // Visual feedback
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
    
    showToast('Copied to clipboard!', 'success');
  } catch (err) {
    // Fallback for older browsers
    fallbackCopy(textToCopy);
    showToast('Copied to clipboard!', 'success');
  }
}

// Fallback copy method for older browsers
function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  document.body.appendChild(textArea);
  textArea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  document.body.removeChild(textArea);
  if (!success) {
    showToast('Failed to copy to clipboard', 'error');
  }
  return success;
}

// Show toast notification
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
