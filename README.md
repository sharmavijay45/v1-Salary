# 💰 LastMoment Salary Management System

A comprehensive web application for managing employee attendance and salary calculations with AI-powered insights.

## 🌟 Features

### 👨‍💼 Admin Dashboard
- **Excel Upload**: Upload attendance sheets and automatically process employee data
- **User Management**: Migrate users from main company database
- **Salary Calculations**: Automatic salary calculation based on attendance (8000/month base, 26 days required)
- **AI Analysis**: Groq AI-powered insights on attendance patterns and performance
- **Bulk Operations**: Expose salary data to multiple users at once
- **Feedback Management**: Review and respond to employee queries
- **Report Generation**: Download comprehensive salary and attendance reports
- **Real-time Analytics**: Charts and statistics for workforce management

### 👨‍💻 User Dashboard
- **Personal Attendance**: View detailed attendance records and hours worked
- **Salary Breakdown**: See calculated salary based on attendance
- **Performance Metrics**: Attendance percentage and trends
- **Feedback System**: Submit queries or disputes about salary calculations
- **Visual Analytics**: Charts showing personal performance trends

### 🔐 Security & Authentication
- **Role-based Access**: Separate admin and user interfaces
- **JWT Authentication**: Secure token-based authentication
- **Route Protection**: Protected routes based on user roles
- **Session Management**: Automatic logout on token expiration

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Tailwind CSS**: Beautiful, modern interface
- **Framer Motion**: Smooth animations and transitions
- **Real-time Notifications**: Toast notifications for user feedback
- **Loading States**: Elegant loading animations

## 🔧 Solution to Login Issues

### Why Users Can't Login Initially
The system uses two separate MongoDB databases:
1. **Source Database** (`blackhole_db`): Contains existing user data from your main company system
2. **Target Database** (`salary_blackhole`): New database specifically for salary management

**Users cannot login initially because their accounts need to be migrated from the source to the target database.**

### How to Fix Login Issues
1. **First-time Setup**: The system will automatically show an admin setup screen if no admin exists
2. **Create Admin Account**: Set up the first admin user who can manage the system
3. **Migrate Users**: Admin must migrate users from the main database using the migration tools
4. **Users Can Login**: After migration, users can login with their existing credentials

### Migration Process
- **Bulk Migration**: Import all users at once from the main database
- **Individual Sync**: Sync specific users by email address
- **Automatic Updates**: System handles password hashing and data formatting

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Groq API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LastMomentSalary
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   cd ..
   ```


4. **Start the application**

   **Option A: Using startup scripts**
   ```bash
   # Windows
   start.bat

   # Linux/Mac
   chmod +x start.sh
   ./start.sh
   ```

   **Option B: Manual start**
   ```bash
   # Terminal 1 - Start backend
   cd server
   npm run dev

   # Terminal 2 - Start frontend
   cd client
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 📊 Usage Guide

### First Time Setup

1. **Access Admin Dashboard**
   - Login with admin credentials
   - Go to "Settings" tab
   - Click "Migrate Users from Main Database" to import existing users

2. **Upload Attendance Data**
   - Go to "Upload Data" tab
   - Upload Excel file with attendance data
   - System will automatically process and calculate salaries

3. **Review and Expose Data**
   - Go to "Employees" tab
   - Review calculated salaries
   - Adjust salaries if needed
   - Select employees and click "Expose Selected" to make data visible to users

### Excel File Format

The system expects Excel files with the following structure:
- **ID/Employee ID**: Employee identifier
- **Name**: Employee name
- **Dept/Department**: Department name
- **Date columns**: Daily attendance data (can be times like "9:00-17:00" or status like "Present/Absent")

### User Access

Users can:
- View their attendance summary
- See calculated salary breakdown
- Submit feedback or queries about their salary
- View performance trends and analytics

## 🛠️ Technical Architecture

### Frontend (React + Vite)
- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **Recharts**: Data visualization
- **React Router**: Client-side routing
- **Axios**: HTTP client

### Backend (Node.js + Express)
- **Express.js**: Web framework
- **MongoDB**: Database with Mongoose ODM
- **JWT**: Authentication
- **Multer**: File upload handling
- **XLSX**: Excel file processing
- **Groq AI**: AI-powered analytics
- **bcryptjs**: Password hashing

### Database Structure
- **Users Collection**: Employee information and authentication
- **Attendance Collection**: Processed attendance and salary data
- **Feedback Collection**: User feedback and admin responses

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | Main database connection | Required |
| `GET_DETAIL_MONGO_URI` | Source database for user migration | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `GROQ_API_KEY` | Groq AI API key | Required |
| `DEFAULT_SALARY` | Base monthly salary | 8000 |
| `REQUIRED_DAYS_PER_MONTH` | Required working days | 26 |
| `PORT` | Server port | 5000 |

### Salary Calculation Logic

```javascript
const salaryPercentage = (daysPresent / requiredDays) * 100;
const calculatedSalary = (daysPresent / requiredDays) * baseSalary;
```

- Base salary: ₹8,000/month
- Required days: 26 days/month
- Salary is calculated proportionally based on attendance

## 🤖 AI Features

The system uses Groq AI to provide:
- **Attendance Pattern Analysis**: Identify trends and outliers
- **Department Performance**: Compare department-wise metrics
- **Risk Assessment**: Flag employees with concerning patterns
- **Recommendations**: Actionable insights for HR management
- **Performance Categorization**: Classify employees by performance levels

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Access Control**: Admin/User role separation
- **Input Validation**: Server-side validation for all inputs
- **CORS Configuration**: Controlled cross-origin requests
- **Password Hashing**: bcrypt for secure password storage
- **Route Protection**: Protected routes with middleware

## 📱 Responsive Design

The application is fully responsive and works on:
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Touch-friendly interface for smartphones

## 🚀 Deployment

### Production Build

```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```

### Environment Setup for Production

Update the following in production:
- Use production MongoDB URI
- Set `NODE_ENV=production`
- Use secure JWT secret
- Configure proper CORS origins
- Set up SSL/HTTPS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the code comments
- Contact the development team

---

**Built with ❤️ for efficient salary management**
Admin Dashboard:
Upload Excel attendance sheet.
View processed attendance data (days present, hours worked, salary).
Expose data to users.
Handle user feedback and adjust salaries.
Download final report as CSV.
View Grok API insights.


User Dashboard:
View attendance and salary details (if exposed).
Submit feedback or salary disputes.
Visualize hours worked with Recharts.


Salary Calculation: ₹8000 for 26 days; prorated based on attendance.
MongoDB: Stores user data, attendance records, and feedback.
Grok API: Generates attendance insights.

Setup
Prerequisites

Node.js
MongoDB
Grok API key

Installation

Clone the repository:
git clone <repository-url>
cd attendance-salary-system


Backend Setup:
cd server
npm install
cp .env.example .env

Update .env with your MONGO_URI, JWT_SECRET, and GROK_API_KEY.

Frontend Setup:
cd ../client
npm install


Run the Application:

Backend:cd server
npm run dev


Frontend:cd client
npm run dev




Access the Application:

Frontend: http://localhost:3000
Backend: http://localhost:5000



Usage

Login: Use email and password from the MongoDB "Users" collection.
Admin:
Upload an Excel sheet (format similar to "33_StandardReport_JULY.xlsx").
View processed data and Grok insights.
Expose data to users, adjust salaries based on feedback, and download the final report.


User:
View attendance and salary details once exposed.
Submit feedback or disputes.



Notes

Ensure the MongoDB "Users" collection has fields: _id, name, email, password (hashed), department, role.
The Excel sheet must follow the provided format for accurate parsing.
Secure the .env file and do not commit it to version control.
