const API_BASE_URL = '/api';

let editingTransactionId = null;
let charts = {
  incomeExpenses: null,
  category: null,
  balance: null,
  categoryTrend: null
};

// Category icons mapping
const categoryIcons = {
  'Food': '🍔',
  'Rent': '🏠',
  'Travel': '✈️',
  'Misc': '📦'
};

// Set transaction type (for toggle buttons)
function setType(type) {
  document.getElementById('type').value = type;
  
  // Update toggle button styles
  const expenseBtn = document.getElementById('typeExpense');
  const incomeBtn = document.getElementById('typeIncome');
  
  expenseBtn.classList.remove('active');
  incomeBtn.classList.remove('active');
  
  if (type === 'expense') {
    expenseBtn.classList.add('active');
  } else {
    incomeBtn.classList.add('active');
  }
  
  updateCategoryVisibility();
}

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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

// Get icon for transaction
function getTransactionIcon(transaction) {
  if (transaction.type === 'income') {
    return '💰';
  }
  return categoryIcons[transaction.category] || '💸';
}

// Render transactions
function renderTransactions(transactions) {
  const listEl = document.getElementById('transactionsList');
  listEl.innerHTML = transactions.map(transaction => `
    <div class="transaction-item">
      <div class="transaction-icon ${transaction.type}">
        ${getTransactionIcon(transaction)}
      </div>
      <div class="transaction-info">
        <div class="transaction-description">${transaction.category || (transaction.type === 'income' ? 'Income' : 'Expense')}</div>
        <div class="transaction-meta">
          <span>${formatDate(transaction.date)}</span>
        </div>
      </div>
      <span class="transaction-amount ${transaction.type === 'income' ? 'amount-income' : 'amount-expense'}">
        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
      </span>
      <div class="transaction-actions">
        <button class="icon-btn" onclick="editTransaction(${transaction.id})" title="Edit">✏️</button>
        <button class="icon-btn danger" onclick="deleteTransaction(${transaction.id})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Open add modal
function openAddModal() {
  editingTransactionId = null;
  document.getElementById('modalTitle').textContent = 'Add an expense';
  document.getElementById('submitBtn').textContent = 'Save';
  document.getElementById('transactionForm').reset();
  document.getElementById('type').value = 'expense';
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  setType('expense');
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
    document.getElementById('modalTitle').textContent = 'Edit transaction';
    document.getElementById('submitBtn').textContent = 'Save changes';
    document.getElementById('type').value = transaction.type;
    setType(transaction.type);
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('category').value = transaction.category || 'Misc';
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
      // Refresh stats if stats tab is active
      if (document.getElementById('statsTab').classList.contains('active')) {
        await loadStats();
      }
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
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
  };
  
  try {
    const url = editingTransactionId 
      ? `${API_BASE_URL}/transactions/${editingTransactionId}`
      : `${API_BASE_URL}/transactions`;
    
    const method = editingTransactionId ? 'PATCH' : 'POST';
    
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
      // Refresh stats if stats tab is active
      if (document.getElementById('statsTab').classList.contains('active')) {
        await loadStats();
      }
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

// Tab switching
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(tabName === 'transactions' ? 'Transactions' : 'Stats')) {
      btn.classList.add('active');
    }
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  if (tabName === 'transactions') {
    document.getElementById('transactionsTab').classList.add('active');
  } else if (tabName === 'stats') {
    document.getElementById('statsTab').classList.add('active');
    loadStats();
  }
}

// Load and render all stats charts
async function loadStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    const transactions = await response.json();
    
    if (transactions.length === 0) {
      // Show empty state for charts
      return;
    }
    
    renderIncomeExpensesChart(transactions);
    renderCategoryChart(transactions);
    renderBalanceChart(transactions);
    renderCategoryTrendChart(transactions);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Chart 1: Income vs Expenses Over Time (Line Chart)
function renderIncomeExpensesChart(transactions) {
  const ctx = document.getElementById('incomeExpensesChart');
  if (!ctx) return;
  
  // Group by month
  const monthlyData = {};
  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    if (t.type === 'income') {
      monthlyData[monthKey].income += t.amount;
    } else {
      monthlyData[monthKey].expenses += t.amount;
    }
  });
  
  const sortedMonths = Object.keys(monthlyData).sort();
  const monthLabels = sortedMonths.map(m => {
    const [year, month] = m.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });
  
  if (charts.incomeExpenses) {
    charts.incomeExpenses.destroy();
  }
  
  charts.incomeExpenses = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Income',
        data: sortedMonths.map(m => monthlyData[m].income),
        borderColor: '#FCB116',
        backgroundColor: 'rgba(252, 177, 22, 0.2)',
        tension: 0.4,
        fill: true
      }, {
        label: 'Expenses',
        data: sortedMonths.map(m => monthlyData[m].expenses),
        borderColor: '#FF7623',
        backgroundColor: 'rgba(255, 118, 35, 0.2)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      color: '#FCB116',
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#FCB116'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#121826',
          titleColor: '#FCB116',
          bodyColor: '#e0e0e0',
          borderColor: '#FCB116',
          borderWidth: 2,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#FCB116'
          },
          grid: {
            color: 'rgba(252, 177, 22, 0.1)'
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#FCB116',
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          },
          grid: {
            color: 'rgba(252, 177, 22, 0.1)'
          }
        }
      }
    }
  });
}

// Chart 2: Expenses by Category (Pie Chart)
function renderCategoryChart(transactions) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  
  const expenses = transactions.filter(t => t.type === 'expense');
  const categoryTotals = {};
  
  expenses.forEach(t => {
    const category = t.category || 'Other';
    categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
  });
  
  const categories = Object.keys(categoryTotals);
  const amounts = categories.map(c => categoryTotals[c]);
  
  if (charts.category) {
    charts.category.destroy();
  }
  
  const colors = {
    'Food': '#FF7623',
    'Rent': '#FCB116',
    'Travel': '#02458D',
    'Misc': '#FF7623'
  };
  
  charts.category = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: categories,
      datasets: [{
        data: amounts,
        backgroundColor: categories.map(c => colors[c] || '#95a5a6'),
        borderWidth: 2,
        borderColor: '#02458D'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      color: '#FCB116',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#FCB116'
          }
        },
        tooltip: {
          backgroundColor: '#121826',
          titleColor: '#FCB116',
          bodyColor: '#e0e0e0',
          borderColor: '#FCB116',
          borderWidth: 2,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return label + ': $' + value.toFixed(2) + ' (' + percentage + '%)';
            }
          }
        }
      }
    }
  });
}

// Chart 3: Monthly Balance Trend (Line Chart)
function renderBalanceChart(transactions) {
  const ctx = document.getElementById('balanceChart');
  if (!ctx) return;
  
  // Group by month and calculate running balance
  const monthlyData = {};
  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    if (t.type === 'income') {
      monthlyData[monthKey].income += t.amount;
    } else {
      monthlyData[monthKey].expenses += t.amount;
    }
  });
  
  const sortedMonths = Object.keys(monthlyData).sort();
  let runningBalance = 0;
  const balances = sortedMonths.map(m => {
    runningBalance += monthlyData[m].income - monthlyData[m].expenses;
    return runningBalance;
  });
  
  const monthLabels = sortedMonths.map(m => {
    const [year, month] = m.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });
  
  if (charts.balance) {
    charts.balance.destroy();
  }
  
  charts.balance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: [{
        label: 'Balance',
        data: balances,
        borderColor: '#02458D',
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return null;
          }
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(2, 69, 141, 0.3)');
          gradient.addColorStop(1, 'rgba(252, 177, 22, 0.05)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      color: '#b0b0b0',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#2a2a2a',
          titleColor: '#e0e0e0',
          bodyColor: '#b0b0b0',
          borderColor: '#3a3a3a',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              const sign = value >= 0 ? '+' : '';
              return 'Balance: ' + sign + '$' + value.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#888'
          },
          grid: {
            color: '#2a2a2a'
          }
        },
        y: {
          ticks: {
            color: '#888',
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          },
          grid: {
            color: function(context) {
              if (context.tick.value === 0) {
                return '#FCB116';
              }
              return 'rgba(252, 177, 22, 0.2)';
            }
          }
        }
      }
    }
  });
}

// Chart 4: Category Spending Over Time (Stacked Area Chart)
function renderCategoryTrendChart(transactions) {
  const ctx = document.getElementById('categoryTrendChart');
  if (!ctx) return;
  
  const expenses = transactions.filter(t => t.type === 'expense');
  const monthlyData = {};
  
  expenses.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {};
    }
    const category = t.category || 'Other';
    monthlyData[monthKey][category] = (monthlyData[monthKey][category] || 0) + t.amount;
  });
  
  const sortedMonths = Object.keys(monthlyData).sort();
  const allCategories = ['Food', 'Rent', 'Travel', 'Misc'];
  const monthLabels = sortedMonths.map(m => {
    const [year, month] = m.split('-');
    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });
  
  const categoryColors = {
    'Food': 'rgba(255, 118, 35, 0.8)',
    'Rent': 'rgba(252, 177, 22, 0.8)',
    'Travel': 'rgba(2, 69, 141, 0.8)',
    'Misc': 'rgba(255, 118, 35, 0.8)'
  };
  
  const borderColors = {
    'Food': 'rgba(255, 118, 35, 1)',
    'Rent': 'rgba(252, 177, 22, 1)',
    'Travel': 'rgba(2, 69, 141, 1)',
    'Misc': 'rgba(255, 118, 35, 1)'
  };
  
  const datasets = allCategories.map(category => ({
    label: category,
    data: sortedMonths.map(m => monthlyData[m][category] || 0),
    backgroundColor: categoryColors[category] || 'rgba(149, 165, 166, 0.8)',
    borderColor: borderColors[category] || 'rgba(149, 165, 166, 1)',
    borderWidth: 1
  }));
  
  if (charts.categoryTrend) {
    charts.categoryTrend.destroy();
  }
  
  charts.categoryTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: monthLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      color: '#FCB116',
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#FCB116'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#121826',
          titleColor: '#FCB116',
          bodyColor: '#e0e0e0',
          borderColor: '#FCB116',
          borderWidth: 2,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': $' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: '#888'
          },
          grid: {
            color: '#2a2a2a'
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: '#888',
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          },
          grid: {
            color: '#2a2a2a'
          }
        }
      }
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchTransactions();
  fetchSummary();
});
