# Toggle Button Implementation - Food Availability Manager

## Overview
Implemented a complete toggle button system for managing food availability in the kitchen, with quantity tracking and automatic out-of-stock management.

## Changes Made

### 1. Backend - Data Model
**File: `backend/models/menuModel.js`**
- Added `quantity` field to track food stock levels (default: 0)
- Existing `isAvailable` field used for availability status

```javascript
quantity: { type: Number, default: 0 } // Quantity of the food item
```

### 2. Backend - Controller
**File: `backend/controllers/menuController.js`**
- Added `toggleAvailability` controller function that:
  - Toggles the `isAvailable` status
  - Updates quantity when provided
  - **Automatically sets food to out-of-stock when quantity reaches 0**
  - Validates that item belongs to the restaurant

```javascript
export const toggleAvailability = async (req, res) => {
    // Toggles availability and updates quantity
    // Auto out-of-stock when quantity = 0
}
```

### 3. Backend - Routes
**File: `backend/routes/menuRoutes.js`**
- Added new route: `PUT /api/menu/:id/toggle-availability`
- Requires authentication and restaurant role

```javascript
menuRouter.put('/:id/toggle-availability', toggleAvailability);
```

### 4. Frontend - Component Logic
**File: `frontend/src/pages/RestaurantDashboard.js`**
- Added `togglingId` state to track loading state during toggle
- Added `handleToggleAvailability()` function to toggle availability
- Added `handleQuantityChange()` function to update quantity
- Both functions call the backend API and update UI immediately

Features:
- Toggle button changes color based on status (Green = Available, Orange = Unavailable)
- Quantity input field to manage stock levels
- Real-time updates to UI after API call

### 5. Frontend - Styling
**File: `frontend/src/pages/Dashboard.css`**
- Added styles for `.toggle-btn` with two states:
  - `.toggle-btn.available` - Green button for available items
  - `.toggle-btn.unavailable` - Orange button for unavailable items
- Added styles for `.menu-item-quantity`:
  - Quantity input field with number input
  - Disabled state while request is in progress
- Hover effects and transitions for better UX

## Features

✅ **Toggle Availability**: One-click toggle between available/unavailable
✅ **Quantity Management**: Set and adjust stock quantity
✅ **Auto Out-of-Stock**: Automatically marks items as unavailable when quantity = 0
✅ **Available/Out-of-Stock Lists**: Display counts in dashboard stats
✅ **Real-time Updates**: UI updates immediately after API calls
✅ **Loading States**: Buttons disabled during API requests
✅ **Restaurant-Specific**: Each restaurant can only manage their own items

## How to Use

1. **Toggle Availability**:
   - Click the green "✅ Available" button to make food unavailable
   - Click the orange "❌ Unavailable" button to make food available again

2. **Manage Quantity**:
   - Enter the available quantity in the "Quantity" input field
   - When quantity reaches 0, the item automatically becomes unavailable
   - Update quantity anytime to reflect current stock

3. **View Status**:
   - Check the stats cards at the top to see:
     - Total items
     - Active (available) items
     - Out of stock items

## API Endpoint

```
PUT /api/menu/:id/toggle-availability
Content-Type: application/json

{
    "isAvailable": true,
    "quantity": 10
}

Response:
{
    "success": true,
    "data": {
        "_id": "...",
        "name": "...",
        "isAvailable": true,
        "quantity": 10,
        ...
    }
}
```

## Testing

1. Start the backend server: `npm start`
2. Start the frontend: `npm start`
3. Log in as a restaurant
4. Go to Menu Management
5. Try toggling items and updating quantities
6. Observe the availability status and stats update in real-time
