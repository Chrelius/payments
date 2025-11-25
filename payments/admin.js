// Payment Methods - Admin Page Script

const CONFIG_KEY = 'paymentMethodsConfig';
const CONFIG_FILE = 'config.json';

let currentConfig = { paymentMethods: [] };
let editingMethodId = null;
let deletingMethodId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Add button
  document.getElementById('btn-add').addEventListener('click', openAddModal);
  
  // Modal controls
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  
  // Delete modal controls
  document.getElementById('delete-modal-close').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-delete-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-delete-confirm').addEventListener('click', confirmDelete);
  document.getElementById('delete-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDeleteModal();
  });
  
  // Form submission
  document.getElementById('method-form').addEventListener('submit', handleFormSubmit);
  
  // QR image preview
  document.getElementById('method-qr').addEventListener('change', handleQRPreview);
  
  // Export/Import
  document.getElementById('btn-export').addEventListener('click', exportConfig);
  document.getElementById('import-file').addEventListener('change', importConfig);
}

// Load config from localStorage or file
async function loadConfig() {
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
  
  currentConfig = config;
  renderTable();
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

// Render the admin table
function renderTable() {
  const tbody = document.getElementById('methods-table');
  const emptyState = document.getElementById('empty-state');
  const tableContainer = document.querySelector('.admin-table-container');
  
  const methods = currentConfig.paymentMethods || [];
  
  if (methods.length === 0) {
    tableContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  tableContainer.style.display = 'block';
  emptyState.style.display = 'none';
  
  tbody.innerHTML = methods.map(method => createTableRowHTML(method)).join('');
  
  // Attach event listeners
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });
  
  tbody.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', (e) => handleStatusChange(e.target.dataset.id, e.target.value));
  });
}

// Create HTML for a table row
function createTableRowHTML(method) {
  const qrHTML = method.qrImage 
    ? `<img src="${escapeHtml(method.qrImage)}" alt="QR" class="qr-thumb">`
    : '<span style="color: #999; font-size: 0.85rem;">No QR</span>';
  
  return `
    <tr>
      <td>${escapeHtml(method.label)}</td>
      <td>${escapeHtml(method.accountName)}</td>
      <td>${escapeHtml(method.accountNumber)}</td>
      <td>${qrHTML}</td>
      <td>
        <select class="status-select" data-id="${escapeHtml(method.id)}" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
          <option value="available" ${method.status === 'available' ? 'selected' : ''}>Available</option>
          <option value="not-available" ${method.status === 'not-available' ? 'selected' : ''}>Not Available</option>
          <option value="hidden" ${method.status === 'hidden' ? 'selected' : ''}>Hidden</option>
        </select>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-primary btn-edit" data-id="${escapeHtml(method.id)}">Edit</button>
          <button class="btn btn-danger btn-delete" data-id="${escapeHtml(method.id)}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

// Open add modal
function openAddModal() {
  editingMethodId = null;
  document.getElementById('modal-title').textContent = 'Add Payment Method';
  document.getElementById('method-form').reset();
  document.getElementById('qr-preview').innerHTML = '';
  document.getElementById('modal-overlay').classList.add('active');
}

// Open edit modal
function openEditModal(id) {
  const method = currentConfig.paymentMethods.find(m => m.id === id);
  if (!method) return;
  
  editingMethodId = id;
  document.getElementById('modal-title').textContent = 'Edit Payment Method';
  document.getElementById('method-id').value = method.id;
  document.getElementById('method-label').value = method.label;
  document.getElementById('method-account-name').value = method.accountName;
  document.getElementById('method-account-number').value = method.accountNumber;
  document.getElementById('method-status').value = method.status;
  
  // Show existing QR
  const qrPreview = document.getElementById('qr-preview');
  if (method.qrImage) {
    qrPreview.innerHTML = `<img src="${escapeHtml(method.qrImage)}" alt="QR Preview">`;
  } else {
    qrPreview.innerHTML = '';
  }
  
  document.getElementById('modal-overlay').classList.add('active');
}

// Close modal
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  editingMethodId = null;
}

// Open delete confirmation modal
function openDeleteModal(id) {
  deletingMethodId = id;
  document.getElementById('delete-modal-overlay').classList.add('active');
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById('delete-modal-overlay').classList.remove('active');
  deletingMethodId = null;
}

// Confirm delete
function confirmDelete() {
  if (!deletingMethodId) return;
  
  currentConfig.paymentMethods = currentConfig.paymentMethods.filter(m => m.id !== deletingMethodId);
  saveConfigToStorage(currentConfig);
  renderTable();
  closeDeleteModal();
  showToast('Payment method deleted successfully', 'success');
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const label = document.getElementById('method-label').value.trim();
  const accountName = document.getElementById('method-account-name').value.trim();
  const accountNumber = document.getElementById('method-account-number').value.trim();
  const status = document.getElementById('method-status').value;
  const qrFile = document.getElementById('method-qr').files[0];
  
  if (!label || !accountName || !accountNumber) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  let qrImage = '';
  
  // Handle QR image
  if (qrFile) {
    qrImage = await readFileAsDataURL(qrFile);
  } else if (editingMethodId) {
    // Keep existing QR if editing and no new file selected
    const existingMethod = currentConfig.paymentMethods.find(m => m.id === editingMethodId);
    qrImage = existingMethod ? existingMethod.qrImage : '';
  }
  
  if (editingMethodId) {
    // Update existing method
    const index = currentConfig.paymentMethods.findIndex(m => m.id === editingMethodId);
    if (index !== -1) {
      currentConfig.paymentMethods[index] = {
        ...currentConfig.paymentMethods[index],
        label,
        accountName,
        accountNumber,
        qrImage,
        status
      };
    }
    showToast('Payment method updated successfully', 'success');
  } else {
    // Add new method
    const newMethod = {
      id: generateId(),
      label,
      accountName,
      accountNumber,
      qrImage,
      status
    };
    currentConfig.paymentMethods.push(newMethod);
    showToast('Payment method added successfully', 'success');
  }
  
  saveConfigToStorage(currentConfig);
  renderTable();
  closeModal();
}

// Handle QR image preview
function handleQRPreview(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const qrPreview = document.getElementById('qr-preview');
    qrPreview.innerHTML = `<img src="${event.target.result}" alt="QR Preview">`;
  };
  reader.readAsDataURL(file);
}

// Handle status change from table dropdown
function handleStatusChange(id, newStatus) {
  const method = currentConfig.paymentMethods.find(m => m.id === id);
  if (method) {
    method.status = newStatus;
    saveConfigToStorage(currentConfig);
    showToast('Status updated successfully', 'success');
  }
}

// Export config as JSON file
function exportConfig() {
  const dataStr = JSON.stringify(currentConfig, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'config.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showToast('Config exported successfully', 'success');
}

// Import config from JSON file
function importConfig(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedConfig = JSON.parse(event.target.result);
      
      // Validate structure
      if (!importedConfig.paymentMethods || !Array.isArray(importedConfig.paymentMethods)) {
        throw new Error('Invalid config structure');
      }
      
      // Validate each method has required fields and valid status
      const validStatuses = ['available', 'not-available', 'hidden'];
      for (const method of importedConfig.paymentMethods) {
        if (!method.id || !method.label || !method.accountName || !method.accountNumber) {
          throw new Error('Invalid payment method structure');
        }
        if (method.status && !validStatuses.includes(method.status)) {
          throw new Error('Invalid status value: ' + method.status);
        }
        // Default to 'available' if status is missing
        if (!method.status) {
          method.status = 'available';
        }
      }
      
      currentConfig = importedConfig;
      saveConfigToStorage(currentConfig);
      renderTable();
      showToast('Config imported successfully', 'success');
    } catch (error) {
      showToast('Invalid config file: ' + error.message, 'error');
    }
  };
  reader.readAsText(file);
  
  // Reset file input
  e.target.value = '';
}

// Read file as data URL
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
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
