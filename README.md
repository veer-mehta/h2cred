# H2Cred

A platform for managing and trading **Green Hydrogen Credits (H2 Credits)**.  
Built to enable transparency, traceability, and efficient lifecycle management in the hydrogen economy.

---

## Overview

H2Cred is a backend-driven system that allows organizations to:

- Issue green hydrogen credits
- Track ownership and transfers
- Maintain company records
- Ensure authenticity and traceability of credits

The system is designed to be scalable and extensible for future integrations such as regulatory systems or blockchain-based verification.

---


## UI Demo

### Overview Page

<p align="center">
<img width="1312" height="930" alt="image" src="https://github.com/user-attachments/assets/3f47954f-15b8-4ec4-bebd-542f5d71f4d0" />
</p>

### Marketplace Page

<p align="center">
<img width="1303" height="998" alt="image" src="https://github.com/user-attachments/assets/acb3dd3b-f613-427c-8a09-fe8b8acdc67f" />
</p>

### Admin Page

<p align="center">
<img width="1287" height="997" alt="image" src="https://github.com/user-attachments/assets/88abf5c7-61cf-492f-9780-d79d88f4ac02" />
</p>

---

## Problem

Green hydrogen is emerging as a key clean energy solution, but currently:

- There is no standardized system for managing hydrogen credits
- Verification and ownership tracking are difficult
- Market transparency is limited

H2Cred provides a structured platform to handle the full lifecycle of hydrogen credits.

---

## Tech Stack

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL

### Architecture
- REST API
- Modular service-based structure

---

## Features

- Authentication and authorization
- Company management
- Credit issuance
- Credit transfer system
- Transaction tracking
- Data validation and structured persistence

---

## Project Structure

```

h2cred/
│── backend/
│   ├── prisma/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── utils/
│
│── README.md

```

---

## Setup and Installation

### 1. Clone the repository

```

git clone [https://github.com/veer-mehta/h2cred.git](https://github.com/veer-mehta/h2cred.git)
cd h2cred

```

### 2. Install dependencies

```

npm install

```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/h2cred"
JWT_SECRET="your_secret"

```

---

### 4. Setup the database

```

npx prisma migrate dev

```

---

### 5. Run the server

```

npm run dev

```

---

## API Overview

| Method | Endpoint      | Description              |
|--------|--------------|--------------------------|
| POST   | /auth/login  | User login               |
| POST   | /company     | Create company           |
| GET    | /credits     | Fetch credits            |
| POST   | /credits     | Issue credit             |
| POST   | /transfer    | Transfer credits         |

---

## Security

- Input validation on API endpoints
- Secure password handling
- Token-based authentication
- ORM-based database access via Prisma

---

## Future Improvements

- Blockchain-based verification
- Smart contract integration
- Credit marketplace
- Analytics and reporting dashboard
- Regulatory integration

