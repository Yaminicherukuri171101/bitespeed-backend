# BiteSpeed Identity Reconciliation API

This backend service was built as part of the **BiteSpeed Backend Engineering Internship assignment**.  
It identifies and links customer contacts based on shared email and/or phone numbers, consolidating them under a single primary contact.

---

##  Hosted Endpoint

**Base URL:**  https://bitespeed-backend-production.up.railway.app


**Identify Endpoint:**  


**Full URL:**  https://bitespeed-backend-production.up.railway.app/identify


---

## 🛠 Tech Stack

- Node.js  
- Express.js  
- TypeScript  
- Prisma ORM  
- PostgreSQL (Railway)  
- Railway (Deployment)  

---

##  Problem Overview

Customers may place orders using different email addresses or phone numbers.  
If two records share either:

- the same **email**, OR  
- the same **phone number**  

They must be linked together.

### System ensures:
- One **primary contact** per identity cluster  
- All others linked as **secondary**  
- Oldest primary is always retained  
- Consolidated response is returned  

---

## 📥 API Usage

### Endpoint


### Request Body (JSON)
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```
### Response format
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": [
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": [
      "123456"
    ],
    "secondaryContactIds": [2]
  }
}
```

### Logic Flow

- Search for contacts matching email or phoneNumber.

- If no match → create a new primary contact.

- If matches exist:

- Gather the full related contact cluster.

- Identify the oldest primary contact.

- Convert extra primaries to secondary.

- Link them via linkedId.

- Add new secondary if new information is introduced.

- Remove duplicate emails and phone numbers.

- Return consolidated identity.

### Database Schema

Contact Table Fields:

- id (Primary Key)

- email (nullable)

- phoneNumber (nullable)

- linkedId (nullable)

- linkPrecedence ("primary" or "secondary")

- createdAt

- updatedAt

- deletedAt (nullable)

### Example Scenario
Step 1:
```json
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
```

Step 2:
```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```
# Final Response:
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": [
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": [
      "123456"
    ],
    "secondaryContactIds": [2]
  }
}
```

### Local Setup

# Clone repository:
  git clone <your-repo-url>
  cd bitespeed-backend

# Install dependencies:
  npm install
  
# Create .env file:
  DATABSE_URL = postgresql://postgres:imOfQEEjuqAMxUtqySbbiPqDRPtFMhjz@postgres.railway.internal:5432/railway

# Generate Prisma client:
  npx prisma generate
  
# Push schema:
  npx prisma db push

# npx prisma db push
  npm run dev

# Production:
  npm run build
  npm start

### Deployment
 # Hosted on Railway.
 # Start command used:
   npm run build && npm start

### Features Implemented:

- Primary contact creation

- Secondary contact linking

- Merging of multiple primaries

- Oldest primary selection logic

- Duplicate email/phone removal

- Production deployment

- Persistent PostgreSQL storage

- Error handling

### Author
 # Yamini Cherukuri










