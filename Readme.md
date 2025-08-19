# Personal Cost Tracker

A modern, client-side personal expense tracking application built with HTML, JavaScript, and SQLite. This application allows you to track your expenses, set monthly budgets, and analyze your spending patterns with a beautiful, responsive interface.

## Features

### 🔐 **User Authentication**
- Secure username/password registration and login
- Client-side user data storage with SQLite
- Session persistence with localStorage

### 💰 **Expense Management**
- Add, view, and delete expenses
- Categorize expenses (Food, Transportation, Entertainment, etc.)
- Date-based expense tracking
- Real-time expense calculations

### 📊 **Financial Dashboard**
- Monthly expense totals
- All-time expense tracking
- Budget vs. actual spending comparison
- Recent expenses overview

### 🎯 **Budget Planning & Projections**
- Set monthly budgets
- Track budget progress with visual indicators
- Calculate daily average spending
- Project monthly totals based on current spending
- Category-wise spending breakdown with charts

### 📱 **Modern Interface**
- Responsive design for desktop and mobile
- Clean, intuitive user interface
- Dark mode support
- Print-friendly styles

### 🏪 **Static Website Ready**
- No server required - runs entirely in the browser
- SQLite database stored in browser's localStorage
- Perfect for hosting on static website platforms (GitHub Pages, Netlify, etc.)

## Quick Start

### Option 1: Using Python (Recommended)
```bash
# Navigate to the project directory
cd expenditure_tracking

# Start a local web server
python -m http.server 8000
# or if you have Python 3:
python3 -m http.server 8000

# Open your browser and go to http://localhost:8000
```

### Option 2: Using Node.js
```bash
# Install dependencies (optional)
npm install

# Start the development server
npm run dev
```

### Option 3: Direct File Access
You can also open `index.html` directly in your web browser, though some features may work better with a local server due to CORS restrictions.

## Database Schema

The application uses SQLite with the following tables:

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Expenses Table
```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
)
```

### Budgets Table
```sql
CREATE TABLE budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    monthly_budget REAL NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(user_id, month, year)
)
```

## File Structure

```
expenditure_tracking/
├── index.html          # Main application HTML
├── app.js             # JavaScript application logic
├── styles.css         # CSS styling and responsive design
├── package.json       # Node.js package configuration
└── README.md          # This documentation file
```

## How to Use

### 1. Registration & Login
- Open the application in your web browser
- Create a new account by clicking "Register here"
- Fill in your username and password
- Login with your credentials

### 2. Adding Expenses
- Navigate to the "Add Expense" tab
- Fill in the expense details:
  - Description (e.g., "Lunch at restaurant")
  - Amount (numerical value)
  - Category (select from dropdown)
  - Date (defaults to today)
- Click "Add Expense" to save

### 3. Viewing Expenses
- Go to "View Expenses" tab to see all your expenses
- Use filters to view expenses by category or month
- Delete expenses using the delete button if needed

### 4. Setting Budgets
- Navigate to "Monthly Projections" tab
- Set your monthly budget in the budget form
- View your spending progress and projections

### 5. Dashboard Overview
- The Dashboard tab provides a quick overview of:
  - This month's total expenses
  - All-time expense total
  - Current budget status
  - Recent expenses

## Deployment

Since this is a static web application, you can deploy it to any static hosting service:

### GitHub Pages
1. Push your code to a GitHub repository
2. Enable GitHub Pages in repository settings
3. Your app will be available at `https://username.github.io/repository-name`

### Netlify
1. Drag and drop the project folder to Netlify
2. Your app will be deployed instantly

### Vercel
1. Connect your GitHub repository to Vercel
2. Deploy with zero configuration

## Security Notes

⚠️ **Important**: This application uses a simple client-side hash function for passwords. For production use with sensitive data, consider:
- Using proper password hashing (bcrypt, scrypt, etc.)
- Implementing server-side authentication
- Adding HTTPS encryption
- Using secure session management

## Browser Compatibility

- Chrome 50+
- Firefox 52+
- Safari 10+
- Edge 79+

## Development

### Local Development
```bash
# Clone the repository
git clone <your-repo-url>
cd expenditure_tracking

# Start local server
python -m http.server 8000
```

### Customization
- **Categories**: Modify the category options in `index.html` and update the dropdown menus
- **Styling**: Edit `styles.css` to customize colors, fonts, and layout
- **Features**: Extend `app.js` to add new functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Ensure you're running the application through a web server
3. Verify that your browser supports localStorage and SQL.js

## Future Enhancements

Potential features for future versions:
- [ ] Data export/import functionality
- [ ] Recurring expense tracking
- [ ] Multiple budget categories
- [ ] Expense receipt uploads
- [ ] Advanced reporting and analytics
- [ ] Data backup to cloud storage
- [ ] Multi-currency support

---

**Happy expense tracking! 💰📊**
