# HotStop - Multi-Role Authentication System

A simple MERN stack application with separate login and registration pages for User, Admin, and Restaurant roles.

## Features

- **Role Selection Page**: Choose between User, Admin, or Restaurant
- **Separate Login Pages**: Individual login pages for each role
- **Separate Register Pages**: Individual registration pages for each role
- **Role-based Authentication**: Backend validates user roles during login

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory with:
```
PORT=4000
JWT_SECRET=your_secret_key_here
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
```

4. Start the server:
```bash
npm start
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React app:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Usage

1. **Role Selection**: Visit the home page (`/`) to see three buttons - User, Admin, and Restaurant
2. **Login**: Click any role button to go to that role's login page
3. **Register**: Click "Register here" link on any login page to go to registration
4. **Navigation**: Each role has its own separate login and register pages

## API Endpoints

- `POST /api/auth/register` - Register a new user (requires: name, email, password, role)
- `POST /api/auth/login` - Login user (requires: email, password, role)
- `POST /api/auth/logout` - Logout user

## Project Structure

```
PreFood/
├── backend/
│   ├── config/
│   │   └── mongodb.js
│   ├── controllers/
│   │   └── authController.js
│   ├── models/
│   │   └── userModel.js
│   ├── routes/
│   │   └── authRoutes.js
│   └── server.js
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── RoleSelection.js
    │   │   ├── UserLogin.js
    │   │   ├── UserRegister.js
    │   │   ├── AdminLogin.js
    │   │   ├── AdminRegister.js
    │   │   ├── RestaurantLogin.js
    │   │   └── RestaurantRegister.js
    │   └── App.js
    └── package.json
```

## Notes

- The code is kept simple and intermediate-level friendly
- No complex sections or advanced patterns used
- All pages follow the HotStop orange theme design
- Role validation happens on both frontend and backend
