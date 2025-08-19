// Personal Cost Tracker Application
class CostTracker {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.SQL = null;
        this.init();
    }

    async init() {
        await this.initSQL();
        await this.initDatabase();
        this.setupEventListeners();
        this.checkAuthState();
    }

    async initSQL() {
        try {
            this.SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            console.log('SQL.js initialized successfully');
        } catch (error) {
            console.error('Failed to initialize SQL.js:', error);
            this.showMessage('Failed to initialize database engine', 'error');
        }
    }

    async initDatabase() {
        try {
            // Try to load existing database from localStorage
            const savedDB = localStorage.getItem('costTrackerDB');
            if (savedDB) {
                const uint8Array = new Uint8Array(JSON.parse(savedDB));
                this.db = new this.SQL.Database(uint8Array);
            } else {
                this.db = new this.SQL.Database();
                this.createTables();
            }
        } catch (error) {
            console.error('Database initialization failed:', error);
            this.db = new this.SQL.Database();
            this.createTables();
        }
    }

    createTables() {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createExpensesTable = `
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date DATE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;

        const createBudgetsTable = `
            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                monthly_budget REAL NOT NULL,
                month TEXT NOT NULL,
                year INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, month, year)
            )
        `;

        try {
            this.db.run(createUsersTable);
            this.db.run(createExpensesTable);
            this.db.run(createBudgetsTable);
            this.saveDatabase();
            console.log('Database tables created successfully');
        } catch (error) {
            console.error('Failed to create database tables:', error);
        }
    }

    saveDatabase() {
        try {
            const data = this.db.export();
            const buffer = JSON.stringify(Array.from(data));
            localStorage.setItem('costTrackerDB', buffer);
        } catch (error) {
            console.error('Failed to save database:', error);
        }
    }

    // Simple hash function for password (in production, use proper hashing)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    setupEventListeners() {
        // Auth form toggles
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Expense form
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Budget form
        document.getElementById('budget-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBudget();
        });

        // Filters
        document.getElementById('filter-category').addEventListener('change', () => {
            this.loadExpenses();
        });

        document.getElementById('filter-month').addEventListener('change', () => {
            this.loadExpenses();
        });

        document.getElementById('clear-filters').addEventListener('click', () => {
            document.getElementById('filter-category').value = '';
            document.getElementById('filter-month').value = '';
            this.loadExpenses();
        });

        // Set default date to today
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

    handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showMessage('Please enter both username and password', 'error');
            return;
        }

        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
            stmt.bind([username]);
            
            if (stmt.step()) {
                const user = stmt.getAsObject();
                const hashedPassword = this.hashPassword(password);
                
                if (user.password === hashedPassword) {
                    this.currentUser = { id: user.id, username: user.username };
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    this.showApp();
                    this.showMessage('Login successful!', 'success');
                } else {
                    this.showMessage('Invalid password', 'error');
                }
            } else {
                this.showMessage('User not found', 'error');
            }
            stmt.free();
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed', 'error');
        }
    }

    handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;

        if (!username || !password || !confirmPassword) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (password.length < 4) {
            this.showMessage('Password must be at least 4 characters long', 'error');
            return;
        }

        try {
            const hashedPassword = this.hashPassword(password);
            const stmt = this.db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
            stmt.run([username, hashedPassword]);
            stmt.free();

            this.saveDatabase();
            this.showMessage('Registration successful! Please log in.', 'success');
            this.showLoginForm();
            
            // Clear form
            document.getElementById('registerForm').reset();
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                this.showMessage('Username already exists', 'error');
            } else {
                console.error('Registration error:', error);
                this.showMessage('Registration failed', 'error');
            }
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
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        // Load data for specific tabs
        if (tabName === 'dashboard') {
            this.loadDashboard();
        } else if (tabName === 'expenses') {
            this.loadExpenses();
        } else if (tabName === 'projections') {
            this.loadProjections();
        }
    }

    addExpense() {
        const description = document.getElementById('expense-description').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const date = document.getElementById('expense-date').value;

        if (!description || !amount || !category || !date) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            const stmt = this.db.prepare(`
                INSERT INTO expenses (user_id, description, amount, category, date)
                VALUES (?, ?, ?, ?, ?)
            `);
            stmt.run([this.currentUser.id, description, amount, category, date]);
            stmt.free();

            this.saveDatabase();
            this.showMessage('Expense added successfully!', 'success');
            document.getElementById('expense-form').reset();
            document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
            
            // Refresh dashboard if it's the current tab
            if (document.getElementById('dashboard').classList.contains('active')) {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Add expense error:', error);
            this.showMessage('Failed to add expense', 'error');
        }
    }

    loadDashboard() {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        
        try {
            // Monthly total
            let stmt = this.db.prepare(`
                SELECT SUM(amount) as total FROM expenses 
                WHERE user_id = ? AND date LIKE ?
            `);
            stmt.bind([this.currentUser.id, currentMonth + '%']);
            const monthlyResult = stmt.step() ? stmt.getAsObject() : { total: 0 };
            stmt.free();

            // Total expenses
            stmt = this.db.prepare(`
                SELECT SUM(amount) as total FROM expenses 
                WHERE user_id = ?
            `);
            stmt.bind([this.currentUser.id]);
            const totalResult = stmt.step() ? stmt.getAsObject() : { total: 0 };
            stmt.free();

            // Monthly budget
            const currentYear = new Date().getFullYear();
            const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
            
            stmt = this.db.prepare(`
                SELECT monthly_budget FROM budgets 
                WHERE user_id = ? AND month = ? AND year = ?
            `);
            stmt.bind([this.currentUser.id, currentMonthName, currentYear]);
            const budgetResult = stmt.step() ? stmt.getAsObject() : { monthly_budget: 0 };
            stmt.free();

            // Recent expenses
            stmt = this.db.prepare(`
                SELECT * FROM expenses 
                WHERE user_id = ? 
                ORDER BY date DESC, created_at DESC 
                LIMIT 5
            `);
            stmt.bind([this.currentUser.id]);
            const recentExpenses = [];
            while (stmt.step()) {
                recentExpenses.push(stmt.getAsObject());
            }
            stmt.free();

            // Update UI
            const monthlyTotal = monthlyResult.total || 0;
            const totalExpenses = totalResult.total || 0;
            const monthlyBudget = budgetResult.monthly_budget || 0;
            const remainingBudget = monthlyBudget - monthlyTotal;

            document.getElementById('monthly-total').textContent = `$${monthlyTotal.toFixed(2)}`;
            document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
            document.getElementById('monthly-budget').textContent = `$${monthlyBudget.toFixed(2)}`;
            document.getElementById('remaining-budget').textContent = `$${remainingBudget.toFixed(2)}`;
            document.getElementById('remaining-budget').style.color = remainingBudget < 0 ? '#e74c3c' : '#27ae60';

            // Recent expenses list
            const recentList = document.getElementById('recent-expenses-list');
            if (recentExpenses.length === 0) {
                recentList.innerHTML = '<p>No expenses recorded yet.</p>';
            } else {
                recentList.innerHTML = recentExpenses.map(expense => `
                    <div class="expense-item">
                        <div class="expense-info">
                            <strong>${expense.description}</strong>
                            <span class="expense-category">${expense.category}</span>
                        </div>
                        <div class="expense-details">
                            <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
                            <span class="expense-date">${expense.date}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Dashboard loading error:', error);
            this.showMessage('Failed to load dashboard data', 'error');
        }
    }

    loadExpenses() {
        const categoryFilter = document.getElementById('filter-category').value;
        const monthFilter = document.getElementById('filter-month').value;

        try {
            let query = 'SELECT * FROM expenses WHERE user_id = ?';
            const params = [this.currentUser.id];

            if (categoryFilter) {
                query += ' AND category = ?';
                params.push(categoryFilter);
            }

            if (monthFilter) {
                query += ' AND date LIKE ?';
                params.push(monthFilter + '%');
            }

            query += ' ORDER BY date DESC, created_at DESC';

            const stmt = this.db.prepare(query);
            stmt.bind(params);
            
            const expenses = [];
            while (stmt.step()) {
                expenses.push(stmt.getAsObject());
            }
            stmt.free();

            const expensesList = document.getElementById('expenses-list');
            if (expenses.length === 0) {
                expensesList.innerHTML = '<p>No expenses found.</p>';
            } else {
                expensesList.innerHTML = `
                    <div class="expenses-header">
                        <div>Description</div>
                        <div>Category</div>
                        <div>Amount</div>
                        <div>Date</div>
                        <div>Actions</div>
                    </div>
                    ${expenses.map(expense => `
                        <div class="expense-row">
                            <div class="expense-desc">${expense.description}</div>
                            <div class="expense-category">${expense.category}</div>
                            <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                            <div class="expense-date">${expense.date}</div>
                            <div class="expense-actions">
                                <button class="delete-btn" onclick="app.deleteExpense(${expense.id})">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Load expenses error:', error);
            this.showMessage('Failed to load expenses', 'error');
        }
    }

    deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            const stmt = this.db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
            stmt.run([expenseId, this.currentUser.id]);
            stmt.free();

            this.saveDatabase();
            this.showMessage('Expense deleted successfully!', 'success');
            this.loadExpenses();
            
            // Refresh dashboard if it's visible
            if (document.getElementById('dashboard').classList.contains('active')) {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Delete expense error:', error);
            this.showMessage('Failed to delete expense', 'error');
        }
    }

    updateBudget() {
        const budgetAmount = parseFloat(document.getElementById('monthly-budget-input').value);
        
        if (!budgetAmount || budgetAmount <= 0) {
            this.showMessage('Please enter a valid budget amount', 'error');
            return;
        }

        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
        const currentYear = currentDate.getFullYear();

        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO budgets (user_id, monthly_budget, month, year)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run([this.currentUser.id, budgetAmount, currentMonth, currentYear]);
            stmt.free();

            this.saveDatabase();
            this.showMessage('Budget updated successfully!', 'success');
            document.getElementById('monthly-budget-input').value = '';
            this.loadProjections();
            
            // Update dashboard if it's visible
            if (document.getElementById('dashboard').classList.contains('active')) {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Update budget error:', error);
            this.showMessage('Failed to update budget', 'error');
        }
    }

    loadProjections() {
        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
        const currentYear = currentDate.getFullYear();
        const currentMonthStr = currentDate.toISOString().slice(0, 7);
        const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate();
        const currentDay = currentDate.getDate();

        try {
            // Get current month's budget
            let stmt = this.db.prepare(`
                SELECT monthly_budget FROM budgets 
                WHERE user_id = ? AND month = ? AND year = ?
            `);
            stmt.bind([this.currentUser.id, currentMonth, currentYear]);
            const budgetResult = stmt.step() ? stmt.getAsObject() : { monthly_budget: 0 };
            stmt.free();

            // Get current month's expenses
            stmt = this.db.prepare(`
                SELECT SUM(amount) as total FROM expenses 
                WHERE user_id = ? AND date LIKE ?
            `);
            stmt.bind([this.currentUser.id, currentMonthStr + '%']);
            const expensesResult = stmt.step() ? stmt.getAsObject() : { total: 0 };
            stmt.free();

            // Get category breakdown
            stmt = this.db.prepare(`
                SELECT category, SUM(amount) as total FROM expenses 
                WHERE user_id = ? AND date LIKE ?
                GROUP BY category
                ORDER BY total DESC
            `);
            stmt.bind([this.currentUser.id, currentMonthStr + '%']);
            const categoryBreakdown = [];
            while (stmt.step()) {
                categoryBreakdown.push(stmt.getAsObject());
            }
            stmt.free();

            const monthlyBudget = budgetResult.monthly_budget || 0;
            const totalExpenses = expensesResult.total || 0;
            const dailyAverage = currentDay > 0 ? totalExpenses / currentDay : 0;
            const projectedTotal = dailyAverage * daysInMonth;
            const budgetProgress = monthlyBudget > 0 ? (totalExpenses / monthlyBudget) * 100 : 0;

            // Update progress bar
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            
            progressFill.style.width = Math.min(budgetProgress, 100) + '%';
            progressFill.style.backgroundColor = budgetProgress > 100 ? '#e74c3c' : budgetProgress > 80 ? '#f39c12' : '#27ae60';
            progressText.textContent = `${budgetProgress.toFixed(1)}% of budget used`;

            // Update stats
            document.getElementById('daily-average').textContent = `$${dailyAverage.toFixed(2)}`;
            document.getElementById('projected-total').textContent = `$${projectedTotal.toFixed(2)}`;

            // Update category chart
            const categoryChart = document.getElementById('category-chart');
            if (categoryBreakdown.length === 0) {
                categoryChart.innerHTML = '<p>No expenses recorded this month.</p>';
            } else {
                categoryChart.innerHTML = categoryBreakdown.map(category => {
                    const percentage = totalExpenses > 0 ? (category.total / totalExpenses) * 100 : 0;
                    return `
                        <div class="category-item">
                            <div class="category-info">
                                <span class="category-name">${category.category}</span>
                                <span class="category-amount">$${category.total.toFixed(2)} (${percentage.toFixed(1)}%)</span>
                            </div>
                            <div class="category-bar">
                                <div class="category-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('Load projections error:', error);
            this.showMessage('Failed to load projections', 'error');
        }
    }

    populateMonthFilter() {
        try {
            const stmt = this.db.prepare(`
                SELECT DISTINCT strftime('%Y-%m', date) as month 
                FROM expenses 
                WHERE user_id = ? 
                ORDER BY month DESC
            `);
            stmt.bind([this.currentUser.id]);
            
            const months = [];
            while (stmt.step()) {
                months.push(stmt.getAsObject());
            }
            stmt.free();

            const filterMonth = document.getElementById('filter-month');
            filterMonth.innerHTML = '<option value="">All Months</option>';
            
            months.forEach(month => {
                const date = new Date(month.month + '-01');
                const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                filterMonth.innerHTML += `<option value="${month.month}">${monthName}</option>`;
            });
        } catch (error) {
            console.error('Populate month filter error:', error);
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';

        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CostTracker();
});
