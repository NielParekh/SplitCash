const API_BASE_URL = 'http://localhost:5000/api';

let editingTransactionId = null;

// Show/hide category based on type
function updateCategoryVisibility() {
  const typeEl = document.getElementById('type');
  const groupEl = document.getElementById('categoryGroup');
  const categoryEl = document.getElementById('category');
  if (!typeEl || !groupEl || !categoryEl) return;
  if (typeEl.value === 'expense') {
    groupEl.style.display = '';
    categoryEl.required = true;
  } else {
    groupEl.style.display = 'none';
    categoryEl.required = false;
  }
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Fetch transactions
async function fetchTransactions() {
  try {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    
    const response = await fetch(`${API_BASE_URL}/transactions`);
    const transactions = await response.json();
    
    document.getElementById('loading').style.display = 'none';
    
    if (transactions.length === 0) {
      document.getElementById('emptyState').style.display = 'block';
      document.getElementById('transactionsList').innerHTML = '';
    } else {
      document.getElementById('emptyState').style.display = 'none';
      renderTransactions(transactions);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    document.getElementById('loading').style.display = 'none';
    alert('Failed to load transactions');
  }
}

// Fetch summary
async function fetchSummary() {
  try {
    const response = await fetch(`${API_BASE_URL}/summary`);
    const summary = await response.json();
    
    document.getElementById('totalIncome').textContent = formatCurrency(summary.totalIncome);
    document.getElementById('totalExpenses').textContent = formatCurrency(summary.totalExpenses);
    
    const balanceEl = document.getElementById('balance');
    balanceEl.textContent = formatCurrency(summary.balance);
    balanceEl.className = `summary-value ${summary.balance >= 0 ? 'summary-income' : 'summary-expense'}`;
  } catch (error) {
    console.error('Error fetching summary:', error);
  }
}

// Render transactions
function renderTransactions(transactions) {
  const listEl = document.getElementById('transactionsList');
  listEl.innerHTML = transactions.map(transaction => `
    <div class="transaction-item">
      <div class="transaction-info">
        <div class="transaction-description">${transaction.description}</div>
        <div class="transaction-meta">
          <span>${formatDate(transaction.date)}</span>
          ${transaction.category ? `<span>• ${transaction.category}</span>` : ''}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="transaction-amount ${transaction.type === 'income' ? 'amount-income' : 'amount-expense'}">
          ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
        </span>
        <div class="actions">
          <button class="icon-btn" onclick="editTransaction(${transaction.id})" title="Edit">✏️</button>
          <button class="icon-btn danger" onclick="deleteTransaction(${transaction.id})" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Open add modal
function openAddModal() {
  editingTransactionId = null;
  document.getElementById('modalTitle').textContent = 'Add Transaction';
  document.getElementById('transactionForm').reset();
  document.getElementById('type').value = 'expense';
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  updateCategoryVisibility();
  document.getElementById('modal').style.display = 'flex';
}

// Close modal
function closeModal(event) {
  if (!event || event.target.id === 'modal') {
    document.getElementById('modal').style.display = 'none';
    editingTransactionId = null;
  }
}

// Edit transaction
async function editTransaction(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    const transactions = await response.json();
    const transaction = transactions.find(t => t.id === id);
    
    if (!transaction) {
      alert('Transaction not found');
      return;
    }
    
    editingTransactionId = id;
    document.getElementById('modalTitle').textContent = 'Edit Transaction';
    document.getElementById('type').value = transaction.type;
    updateCategoryVisibility();
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('description').value = transaction.description;
    document.getElementById('category').value = transaction.category || '';
    document.getElementById('date').value = transaction.date;
    document.getElementById('modal').style.display = 'flex';
  } catch (error) {
    console.error('Error loading transaction:', error);
    alert('Failed to load transaction');
  }
}

// Delete transaction
async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      await fetchTransactions();
      await fetchSummary();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to delete transaction');
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    alert('Failed to delete transaction');
  }
}

// Handle form submit
async function handleSubmit(event) {
  event.preventDefault();
  
  const formData = {
    type: document.getElementById('type').value,
    amount: parseFloat(document.getElementById('amount').value),
    description: document.getElementById('description').value,
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
  };
  
  try {
    const url = editingTransactionId 
      ? `${API_BASE_URL}/transactions/${editingTransactionId}`
      : `${API_BASE_URL}/transactions`;
    
    const method = editingTransactionId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    if (response.ok) {
      await fetchTransactions();
      await fetchSummary();
      closeModal();
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to save transaction');
    }
  } catch (error) {
    console.error('Error saving transaction:', error);
    alert('Failed to save transaction');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchTransactions();
  fetchSummary();
  const typeEl = document.getElementById('type');
  if (typeEl) {
    typeEl.addEventListener('change', updateCategoryVisibility);
  }
  updateCategoryVisibility();
});

