# Next.js Chat Application

This is a full-stack chat application built with Next.js, Tailwind CSS, Supabase, and TypeScript. It features real-time messaging, user authentication, a responsive pixel-perfect UI, and modern chat features like file/image attachments and user search.

## Features

- 🔐 User authentication with Supabase
- 💬 Real-time messaging with Supabase subscriptions
- 📎 File/image attachment (insert button)
- 📱 Responsive pixel-perfect UI
- 🔍 User search functionality – type in the search bar to find users by name
- 🌐 Deployed and shareable via a universal link

## Test Login Credentials

Two user accounts have been created for testing purposes:

- **User 1**  
  Email: `test@example.com`  
  Password: `password123`

- **User 2**  
  Email: `test2@example.com`  
  Password: `password1234`


---

## Live Demo

👉 **[https://chat-application-h2d4-fe36u1z2k-yagya-sonis-projects.vercel.app/](https://chat-application-h2d4-fe36u1z2k-yagya-sonis-projects.vercel.app/)**  

---


## Getting Started Locally

Follow these steps to set up and run the application locally:

### 1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Install dependencies

Install the project dependencies using your preferred package manager:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Set up environment variables and run the development server

Create a .env.local file in the root of your project and add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
Replace your-supabase-url and your-supabase-anon-key with the actual values from your Supabase project.

### 4. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

