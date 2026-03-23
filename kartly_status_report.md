# Kartly Platform Status Report
*Generated on: March 23, 2026*

This report outlines the current state of the Kartly SaaS Platform—a multi-tenant QR-based food ordering system. It details the fully functional core systems, features that are partially complete, and components that require attention before a full production launch.

---

## 🟢 Completed & Fully Functional Systems

### 1. Multi-Tenant Architecture & Auth
- **Vendor System:** Vendors can successfully register, log in, and receive secure JWT tokens identifying their unique `vendorId`.
- **Data Isolation:** All database schemas (Menus, Orders, Categories, Customers) are strictly isolated using `isolateTenant` middleware, ensuring vendors only see their own data.

### 2. Vendor Dashboard Engine
- **Menu Management:** Vendors can fully Create, Read, Update, and Delete (CRUD) Categories and Menu Items.
- **Settings Module:** Vendors can natively update their Public Shop Name, Display Name, and critically—their **Merchant UPI ID**.
- **Customer CRM:** The dashboard correctly aggregates customer data (phone, total orders, total spent) based on successful checkouts.

### 3. Real-Time Order System (Sockets)
- **Live Sync:** The backend successfully utilizes `Socket.io` to transmit live `new_order` and `order_status_update` events cleanly between Customers and the targeted Vendor's active dashboard.
- **Hydration Fallback:** The dashboard is fault-tolerant; upon refresh, a specialized `GET /api/vendor/orders/live` endpoint pulls down all active tickets (`PAID`, `CASH_PENDING`), ensuring no single dropped socket skips an order.

### 4. Dynamic Customer Interface
- **Mobile-First Menu:** Customers scanning a QR code arrive at a polished, fast, swiggy-style UI featuring sticky category tabs, veg/non-veg filtering, and a live search bar.
- **Dynamic Cart Modal:** The floating checkout cart correctly handles item incrementing, live subtotal + tax generation, and zero-latency routing.

### 5. Checkout & Frictionless Payments
- **Multi-Factor Checkout:** Customers must explicitly review their cart before hitting the Payment Engine.
- **Direct UPI Routing:** If paying via **UPI App**, Kartly generates an `upi://pay` deep link passing the exact Cart Amount + Vendor UPI ID, entirely bypassing middleman gateways (0% Fees).
- **Secondary Device QR:** If paying via **Scan QR Code**, the UI dynamically mounts a React SVG QR payload, allowing the customer to check out on an iPad and securely scan it with their Phone. 
- **Cash on Counter:** Direct bypass allowing offline payments to post straight to the Kitchen Queue.

---

## 🟡 Partially Working / Needs Polish

### 1. Order Receipt Tracking (`OrderReceipt.jsx`)
- Upon finishing the Checkout flow, the user is navigated to the live Ticket/Receipt UI. While the routing mapping (`/q/:vendorId/receipt/:orderId`) works, the actual `OrderReceipt.jsx` visual interface functionality and live-polling might need visual synchronization to ensure socket connections actively bump the status bar (e.g. `Preparing` -> `Ready`).

### 2. Dynamic QR Download (`generateQR` endpoint)
- The backend successfully dictates the minimum requirements to generate a QR (Requires Active Subscription, 1 Category, 1 Item). The current setup returns the required sub-domain path. 
- The Frontend button is present on the Dashboard Settings pane, but the actual Blob download conversion to give the Vendor a high-res printable `.png` file needs to be verified on the local machine mapping.

---

## 🔴 Not Working / Pending Systems

### 1. Razorpay SaaS Webhooks
- **Current State:** The system manually circumvents the SaaS billing cycle for internal testing via static bypasses.
- **Required Fix:** To automate billing, the backend `webhookLog` and `Payment` handlers need to be securely bound to Razorpay's Production Environment via an ngrok tunnel. We need the system to read the explicit `payment.captured` signature to independently flip the MongoDB `Subscription.status` to `ACTIVE`. 

### 2. Granular Inventory Management
- **Current State:** Following simplified onboarding requests, the backend item-creation logic was disconnected from explicit `inventoryIds`.
- **Required Fix:** The Inventory Dashboard exists, but `deductStock()` and `revertStock()` helper controllers are dormant during checkout. If the business wants to track Kitchen Ingredients (e.g. subtract 150g Rice on Biryani Order), the Menu-to-Inventory mapping schema must be rebuilt and relinked in the Checkout flow.

### 3. Persistent Token Recovery
- **Current State:** Browsers aggressively clear `localStorage` if accessed via strict in-app browsers (like Instagram or standard Camera App). 
- **Required Fix:** We need to ensure that when a customer closes the Camera App, they can scan the QR code 15 minutes later and immediately see *their* live order status, instead of being served a fresh blank menu.

---

## Conclusion
The fundamental objective of Kartly—allowing a vendor to print a QR code, let customers scan it, order food, and pay 0% commission direct-to-vendor via UPI—is **fully operational**. 

The next phases should focus exclusively on SaaS Billing hookups, testing the Kitchen Dashboard across multiple active instances, and polishing the final receipt viewing screens.
