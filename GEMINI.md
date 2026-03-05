# Project: Palap

## 1. Project Description

A comprehensive platform offering pet-related services and products. The system supports a multi-role architecture using Supabase for the backend and a modern React stack for the frontend.

## 2. Tech Stack

- **Runtime & Package Manager:** Bun
- **Frontend:** React (TypeScript)
- **Styling:** Tailwind CSS
- **Routing:** TanStack Router (for fully type-safe routing)
- **State Management:** Zustand
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)

## 3. User Roles & Workflows

Role-based access control is managed via Supabase Auth `app_metadata`. Upon login, the system checks the user's role and redirects them to the appropriate application flow.

### 3.1 Customer

- **Flow:** Select Service/Product -> Fill Details -> Payment Page -> Confirmation Page -> Create Order.
- **Features:** \* "Track Order" button to monitor order details and status.
  - Real-time chat system to communicate with the assigned Freelance.

### 3.2 Freelance

- **Flow:** Login -> Role Check (`app_metadata`) -> Redirect to Freelance Dashboard.
- **Pages:** Dashboard, My Job, Messages, Earning, Account Setting.
- **Features:**
  - Real-time chat system to communicate with Customers.
  - Can create and manage their own "Services".

### 3.3 Admin

- **Flow:** Login -> Role Check (`app_metadata`) -> Redirect to Admin Dashboard.
- **Tabs:** \* `Admin`: Manage admin accounts.
  - `Freelance`: Manage freelance accounts.
  - `Payment`: Manage transactions (Pending completion of Customer/Freelance flows).
  - `Shop`: Manage "Products".
  - `Service`: Manage "Services".
- **Features:** \* Exclusive rights to create "Products".
  - Can create and manage "Services" alongside Freelancers.

## 4. Project Directory Structure

Adhere to the following structure for scalability and maintainability:

```text
src/
 ├── assets/       # Static assets like images, icons, and fonts
 ├── components/   # Reusable React components (buttons, modals, layout wrappers)
 ├── routes/       # TanStack Router file-based or code-based route definitions
 ├── stores/       # Zustand state stores (e.g., authStore.ts, orderStore.ts)
 ├── types/        # TypeScript interfaces, types, and Supabase database definitions
 └── utils/        # Helper functions, formatters, and Supabase client initialization
```

## 5. Coding Guidelines & Best Practices

- **Workflow:** Do not run `build` or `dev` commands repeatedly; only use them when essential for final validation or when explicitly required to verify structural changes.

### React & Tailwind CSS

- Write functional components and utilize standard React Hooks.
- Build highly reusable components within the `src/components` directory.
- Strictly use Tailwind CSS utility classes for styling; avoid custom CSS files unless absolutely necessary.

### TanStack Router

- Leverage end-to-end type safety for all routes, search parameters, and loaders.
- Use `beforeLoad` or route loaders for authentication checks and route protection (e.g., preventing a Customer from accessing the Admin dashboard).

### Zustand

- Keep the global state minimal. Only store state that needs to be accessed across completely un-related components (like `userProfile` or `theme`).
- Split stores into modular slices if they grow too large.

### Supabase Backend

- **Authentication:** Ensure the "Confirm email" setting is enabled in the Supabase project dashboard. Users will need to confirm their email address before signing in for the first time so the auth flow and database triggers function properly.
- **Security:** Enforce strict Row Level Security (RLS) policies on all tables so users can only read/write data they are authorized to access.
- **Client:** Export a single, reusable Supabase client instance from `src/utils/supabase.ts`.

## 6. Database Schema (PostgreSQL)

The database utilizes UUIDs as primary keys and enforces referential integrity through foreign keys.

- **Auth & Users:**
  - `profiles`: Extends `auth.users`, storing `email`, `full_name`, `phone_number`, and `role` (customer, freelance, admin).
  - `addresses`: Stores physical locations with coordinates (`lat`, `lng`), linked to profiles.
- **Roles:**
  - `customers`: Links a profile to an `address_id`.
  - `freelances`: Links a profile to `job_category`, `status`, `bio`, and `rating`.
- **Commerce:**
  - `products`: Created by Admins, track inventory (`qty`), `price`, and `pickup_address_id`.
  - `services`: Created by Admins or Freelancers (`created_by`), includes `pickup_address` and `dest_address`.
- **Order Management:**
  - `orders`: The central hub linking `customer_id`, `freelance_id`, `service_id`/`product_id`, and addresses. Tracks `status` and `price`.
  - `transactions`: Payment tracking linked to orders (`amount`, `payment_method`, `status`).
  - `freelance_earnings`: Financial tracking for completed freelance jobs.
- **Communication:**
  - `chat_rooms`: Unique room per `order_id` between a `customer_id` and `freelancer_id`.
  - `chat_messages`: Individual messages with validation ensuring empty strings cannot be sent. Includes an automated trigger (`trg_touch_service_chat_room`) to update the room's `last_message_at` timestamp.
