import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'transactions.json');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize empty database if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
}

interface Transaction {
  id: number;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category: string | null;
  date: string;
  created_at: string;
}

function readTransactions(): Transaction[] {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading transactions:', error);
    return [];
  }
}

function writeTransactions(transactions: Transaction[]): void {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error('Error writing transactions:', error);
    throw error;
  }
}

let nextId = 1;

// Initialize nextId based on existing transactions
function initializeNextId(): void {
  const transactions = readTransactions();
  if (transactions.length > 0) {
    nextId = Math.max(...transactions.map(t => t.id)) + 1;
  }
}

initializeNextId();

const db = {
  getAll: (filter?: { type?: string; month?: string; year?: string }): Transaction[] => {
    let transactions = readTransactions();

    if (filter) {
      if (filter.type) {
        transactions = transactions.filter(t => t.type === filter.type);
      }
      if (filter.year && filter.month) {
        transactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getFullYear().toString() === filter.year &&
                 (date.getMonth() + 1).toString().padStart(2, '0') === filter.month.padStart(2, '0');
        });
      } else if (filter.year) {
        transactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getFullYear().toString() === filter.year;
        });
      }
    }

    return transactions.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  getById: (id: number): Transaction | undefined => {
    const transactions = readTransactions();
    return transactions.find(t => t.id === id);
  },

  create: (transaction: Omit<Transaction, 'id' | 'created_at'>): Transaction => {
    const transactions = readTransactions();
    const newTransaction: Transaction = {
      ...transaction,
      id: nextId++,
      created_at: new Date().toISOString(),
    };
    transactions.push(newTransaction);
    writeTransactions(transactions);
    return newTransaction;
  },

  update: (id: number, updates: Partial<Omit<Transaction, 'id' | 'created_at'>>): Transaction | null => {
    const transactions = readTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    transactions[index] = {
      ...transactions[index],
      ...updates,
    };
    writeTransactions(transactions);
    return transactions[index];
  },

  delete: (id: number): boolean => {
    const transactions = readTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return false;

    transactions.splice(index, 1);
    writeTransactions(transactions);
    return true;
  },

  getSummary: (filter?: { month?: string; year?: string }): { totalIncome: number; totalExpenses: number; balance: number } => {
    let transactions = readTransactions();

    if (filter) {
      if (filter.year && filter.month) {
        transactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getFullYear().toString() === filter.year &&
                 (date.getMonth() + 1).toString().padStart(2, '0') === filter.month.padStart(2, '0');
        });
      } else if (filter.year) {
        transactions = transactions.filter(t => {
          const date = new Date(t.date);
          return date.getFullYear().toString() === filter.year;
        });
      }
    }

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  },
};

export default db;
