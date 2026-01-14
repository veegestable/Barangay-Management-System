# Barangay Management System - Barangay Thomas Cabili

A comprehensive management system designed for **Barangay Thomas Cabili** in **Iligan City**. This application streamlines barangay operations, enhances resident services, and improves emergency response efficiency.

## 🚀 Features

*   **Emergency Response**: Quick access for residents to report emergencies and for officials to respond.
*   **Resident Management**: Efficient tracking and management of resident records.
*   **Feedback System**: A channel for residents to provide feedback and suggestions.
*   **Announcement Board**: (Implied) Keep residents updated with latest news.
*   **Secure Authentication**: Role-based access for admins and residents.

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React (Create React App)
*   **Styling**: Tailwind CSS
*   **Mapping**: Leaflet / React-Leaflet
*   **Data Visualization**: Chart.js, Recharts
*   **Utilities**: Axios, Html5-qrcode

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB (with Mongoose)
*   **Caching**: Redis
*   **Authentication**: JSON Web Tokens (implied), Bcryptjs

## 📦 Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/veegestable/Barangay-Management-System.git
    ```
2.  Install dependencies for backend:
    ```bash
    cd redis-backend
    npm install
    ```
3.  Install dependencies for frontend:
    ```bash
    cd ../redis-frontend
    npm install
    ```
4.  Setup Environment Variables:
    *   Copy `redis-backend/.env.example` to `redis-backend/.env` and update values.
5.  Run the application:
    *   Backend: `npm start`
    *   Frontend: `npm start`