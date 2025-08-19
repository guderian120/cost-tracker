// app_api.js - Frontend wired to backend API under /api
class CostTracker {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.checkAuthState();
  }

  setupEventListeners() {
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      this.showRegisterForm();
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById('registerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    document.getElementById('logout-btn').addEventListener('click', () => this.logout());

    document.querySelectorAll('.tab-btn').forEach((btn) =>
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab))
    );

    document.getElementById('expense-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addExpense();
    });

    document.getElementById('budget-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.updateBudget();
    });

    document.getElementById('filter-category').addEventListener('change', () => this.loadExpenses());
    document.getElementById('filter-month').addEventListener('change', () => this.loadExpenses());
    document.getElementById('clear-filters').addEventListener('click', () => {
      document.getElementById('filter-category').value = '';
      document.getElementById('filter-month').value = '';
      this.loadExpenses();
    });

    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
  }

  checkAuthState() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.showApp();
    } else {
      this.showAuth();
    }
  }

  showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
  }

  showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
  }

  async handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) return this.showMessage('Please enter both username and password', 'error');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      this.currentUser = { id: data.id, username: data.username };
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      this.showApp();
      this.showMessage('Login successful!', 'success');
    } catch (err) {
      this.showMessage(err.message || 'Login failed', 'error');
    }
  }

  async handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    if (!username || !password || !confirmPassword)
      return this.showMessage('Please fill in all fields', 'error');
    if (password !== confirmPassword)
      return this.showMessage('Passwords do not match', 'error');
    if (password.length < 4)
      return this.showMessage('Password must be at least 4 characters long', 'error');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      this.showMessage('Registration successful! Please log in.', 'success');
      this.showLoginForm();
      document.getElementById('registerForm').reset();
    } catch (err) {
      this.showMessage(err.message || 'Registration failed', 'error');
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.showAuth();
    this.showMessage('Logged out successfully', 'success');
  }

  showAuth() {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
  }

  showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('welcome-user').textContent = `Welcome, ${this.currentUser.username}!`;
    this.loadDashboard();
    this.populateMonthFilter();
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    if (tabName === 'dashboard') this.loadDashboard();
    else if (tabName === 'expenses') this.loadExpenses();
    else if (tabName === 'projections') this.loadProjections();
  }

  async addExpense() {
    const description = document.getElementById('expense-description').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    if (!description || !amount || !category || !date)
      return this.showMessage('Please fill in all fields', 'error');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: this.currentUser.id, description, amount, category, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add expense');
      this.showMessage('Expense added successfully!', 'success');
      document.getElementById('expense-form').reset();
      document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
      if (document.getElementById('dashboard').classList.contains('active')) this.loadDashboard();
    } catch (err) {
      this.showMessage(err.message || 'Failed to add expense', 'error');
    }
  }

  async loadDashboard() {
    const monthStr = new Date().toISOString().slice(0, 7);
    try {
      const [summaryRes, budgetRes, recentRes] = await Promise.all([
        fetch(`/api/stats/summary?user_id=${this.currentUser.id}&monthStr=${monthStr}`),
        fetch(`/api/budgets/current?user_id=${this.currentUser.id}&month=${new Date().toLocaleString('default', { month: 'long' })}&year=${new Date().getFullYear()}`),
        fetch(`/api/stats/recent?user_id=${this.currentUser.id}`)
      ]);
      const summary = await summaryRes.json();
      const budgetData = await budgetRes.json();
      const recent = await recentRes.json();

      const monthlyTotal = summary.monthlyTotal || 0;
      const totalExpenses = summary.allTimeTotal || 0;
      const monthlyBudget = budgetData.monthly_budget || 0;
      const remainingBudget = monthlyBudget - monthlyTotal;

      document.getElementById('monthly-total').textContent = `₵${Number(monthlyTotal).toFixed(2)}`;
      document.getElementById('total-expenses').textContent = `₵${Number(totalExpenses).toFixed(2)}`;
      document.getElementById('monthly-budget').textContent = `₵${Number(monthlyBudget).toFixed(2)}`;
      document.getElementById('remaining-budget').textContent = `₵${Number(remainingBudget).toFixed(2)}`;
      document.getElementById('remaining-budget').style.color = remainingBudget < 0 ? '#e74c3c' : '#27ae60';

      const list = document.getElementById('recent-expenses-list');
      if (!Array.isArray(recent) || recent.length === 0) list.innerHTML = '<p>No expenses recorded yet.</p>';
      else list.innerHTML = recent.map((e) => `
        <div class="expense-item">
          <div class="expense-info">
            <strong>${e.description}</strong>
            <span class="expense-category">${e.category}</span>
          </div>
          <div class="expense-details">
            <span class="expense-amount">₵${Number(e.amount).toFixed(2)}</span>
            <span class="expense-date">${e.date}</span>
          </div>
        </div>`).join('');
    } catch (err) {
      this.showMessage('Failed to load dashboard data', 'error');
    }
  }

  async loadExpenses() {
    const category = document.getElementById('filter-category').value;
    const month = document.getElementById('filter-month').value;
    try {
      const url = new URL('/api/expenses', window.location.origin);
      url.searchParams.set('user_id', this.currentUser.id);
      if (category) url.searchParams.set('category', category);
      if (month) url.searchParams.set('month', month);
      const res = await fetch(url.toString());
      const expenses = await res.json();

      const list = document.getElementById('expenses-list');
      if (!Array.isArray(expenses) || expenses.length === 0) {
        list.innerHTML = '<p>No expenses found.</p>';
        return;
      }

      list.innerHTML = `
        <div class="expenses-header">
          <div>Description</div>
          <div>Category</div>
          <div>Amount</div>
          <div>Date</div>
          <div>Actions</div>
        </div>
        ${expenses.map((e) => `
          <div class="expense-row">
            <div class="expense-desc">${e.description}</div>
            <div class="expense-category">${e.category}</div>
            <div class="expense-amount">₵${Number(e.amount).toFixed(2)}</div>
            <div class="expense-date">${e.date}</div>
            <div class="expense-actions">
              <button class="delete-btn" onclick="app.deleteExpense(${e.id})">Delete</button>
            </div>
          </div>
        `).join('')}
      `;
    } catch (err) {
      this.showMessage('Failed to load expenses', 'error');
    }
  }

  async deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await fetch(`/api/expenses/${id}?user_id=${this.currentUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete expense');
      this.showMessage('Expense deleted successfully!', 'success');
      this.loadExpenses();
      if (document.getElementById('dashboard').classList.contains('active')) this.loadDashboard();
    } catch (err) {
      this.showMessage(err.message || 'Failed to delete expense', 'error');
    }
  }

  async updateBudget() {
    const amount = parseFloat(document.getElementById('monthly-budget-input').value);
    if (!amount || amount <= 0) return this.showMessage('Please enter a valid budget amount', 'error');
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: this.currentUser.id, monthly_budget: amount, month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update budget');
      this.showMessage('Budget updated successfully!', 'success');
      document.getElementById('monthly-budget-input').value = '';
      this.loadProjections();
      if (document.getElementById('dashboard').classList.contains('active')) this.loadDashboard();
    } catch (err) {
      this.showMessage(err.message || 'Failed to update budget', 'error');
    }
  }

  async loadProjections() {
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    const monthStr = now.toISOString().slice(0, 7);
    const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
    const day = now.getDate();

    try {
      const [budgetRes, summaryRes, catRes] = await Promise.all([
        fetch(`/api/budgets/current?user_id=${this.currentUser.id}&month=${monthName}&year=${year}`),
        fetch(`/api/stats/summary?user_id=${this.currentUser.id}&monthStr=${monthStr}`),
        fetch(`/api/stats/category?user_id=${this.currentUser.id}&monthStr=${monthStr}`)
      ]);
      const budget = await budgetRes.json();
      const summary = await summaryRes.json();
      const categories = await catRes.json();

      const monthlyBudget = Number(budget.monthly_budget) || 0;
      const total = Number(summary.monthlyTotal) || 0;
      const dailyAvg = day > 0 ? total / day : 0;
      const projected = dailyAvg * daysInMonth;
      const progress = monthlyBudget > 0 ? (total / monthlyBudget) * 100 : 0;

      const fill = document.getElementById('progress-fill');
      const text = document.getElementById('progress-text');
      fill.style.width = Math.min(progress, 100) + '%';
      fill.style.backgroundColor = progress > 100 ? '#e74c3c' : progress > 80 ? '#f39c12' : '#27ae60';
      text.textContent = `${progress.toFixed(1)}% of budget used`;

      document.getElementById('daily-average').textContent = `₵${dailyAvg.toFixed(2)}`;
      document.getElementById('projected-total').textContent = `₵${projected.toFixed(2)}`;

      const chart = document.getElementById('category-chart');
      if (!Array.isArray(categories) || categories.length === 0) chart.innerHTML = '<p>No expenses recorded this month.</p>';
      else chart.innerHTML = categories.map((c) => {
        const pct = total > 0 ? (Number(c.total) / total) * 100 : 0;
        return `
          <div class="category-item">
            <div class="category-info">
              <span class="category-name">${c.category}</span>
              <span class="category-amount">₵${Number(c.total).toFixed(2)} (${pct.toFixed(1)}%)</span>
            </div>
            <div class="category-bar">
              <div class="category-fill" style="width:${pct}%;"></div>
            </div>
          </div>`;
      }).join('');
    } catch (err) {
      this.showMessage('Failed to load projections', 'error');
    }
  }

  async populateMonthFilter() {
    try {
      const res = await fetch(`/api/expenses?user_id=${this.currentUser.id}`);
      const all = await res.json();
      const months = Array.from(new Set(all.map((e) => String(e.date).slice(0, 7))))
        .filter(Boolean)
        .sort()
        .reverse();
      const select = document.getElementById('filter-month');
      select.innerHTML = '<option value="">All Months</option>';
      for (const m of months) {
        const date = new Date(m + '-01');
        const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        select.innerHTML += `<option value="${m}">${label}</option>`;
      }
    } catch (err) {
      // silent
    }
  }

  showMessage(message, type) {
    const el = document.getElementById('message');
    el.textContent = message;
    el.className = `message ${type}`;
    el.style.display = 'block';
    setTimeout(() => (el.style.display = 'none'), 5000);
  }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new CostTracker();
});
