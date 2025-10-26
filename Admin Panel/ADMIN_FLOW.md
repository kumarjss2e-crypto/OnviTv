# Onvi Player - Admin Panel Flow

## 🔐 ADMIN PANEL COMPLETE FLOW

### **Platform:** Web-based Admin Dashboard
### **Access:** admin.onviplayer.com (or subdomain)
### **Tech Stack:** React.js + Firebase Admin SDK

---

## 🎯 ADMIN ROLES & PERMISSIONS

### **1. Super Admin**
- Full access to everything
- Can create/delete other admins
- Can modify system settings
- Can delete users
- Can access all features

### **2. Admin**
- Manage users (suspend/ban)
- Manage content
- View analytics
- Send notifications
- Process payments
- Cannot delete other admins
- Cannot modify system settings

### **3. Moderator**
- Review reports
- Moderate content
- View user information
- Limited analytics access
- Cannot manage users
- Cannot access payments

---

## 📱 ADMIN AUTHENTICATION FLOW

```
Admin Login Page
  ├─ Email
  ├─ Password
  ├─ "Remember me" checkbox
  └─ Login Button
      ↓
  Verify credentials (Firebase Auth)
      ↓
  Check admin role in Firestore
      ↓
  If admin → Dashboard
  If not admin → Error "Unauthorized"
      ↓
  Log activity (activityLogs collection)
```

### **Two-Factor Authentication (Optional)**
```
After password verification
  ↓
Send 2FA code to email/phone
  ↓
Enter 2FA code
  ↓
Verify code
  ↓
Grant access → Dashboard
```

---

## 🏠 DASHBOARD (HOME) FLOW

### **Dashboard Layout:**

```
Sidebar Navigation
  ├─ Dashboard (Home)
  ├─ Users
  ├─ Content
  │   ├─ Global Playlists
  │   ├─ Featured Content
  │   └─ Categories
  ├─ Subscriptions
  │   ├─ Plans
  │   └─ Payments
  ├─ Analytics
  ├─ Notifications
  ├─ Reports
  ├─ Settings
  └─ Logs

Top Bar
  ├─ Search (global)
  ├─ Notifications bell
  ├─ Admin profile dropdown
  │   ├─ My Profile
  │   ├─ Settings
  │   └─ Logout
  └─ Quick actions button
```

### **Dashboard Widgets:**

```
Dashboard Screen
  ├─ Stats Cards (Top Row)
  │   ├─ Total Users
  │   │   ├─ Count
  │   │   ├─ Change % (vs last month)
  │   │   └─ Sparkline chart
  │   ├─ Active Users (today)
  │   ├─ Total Revenue (this month)
  │   └─ Premium Subscribers
  │
  ├─ Charts (Middle Section)
  │   ├─ User Growth Chart (line chart)
  │   │   └─ Filter: 7d, 30d, 90d, 1y
  │   ├─ Revenue Chart (bar chart)
  │   └─ Content Views Chart
  │
  ├─ Recent Activity (Left Column)
  │   ├─ New user signups
  │   ├─ New subscriptions
  │   ├─ Content uploads
  │   └─ Reports submitted
  │
  ├─ Quick Stats (Right Column)
  │   ├─ Total Playlists
  │   ├─ Total Channels
  │   ├─ Total Movies
  │   ├─ Total Series
  │   ├─ Pending Reports
  │   └─ Active Downloads
  │
  └─ System Status
      ├─ Server status
      ├─ Database status
      ├─ Storage usage
      └─ API status
```

---

## 👥 USER MANAGEMENT FLOW

### **Users List Screen:**

```
Users Screen
  ├─ Header
  │   ├─ "Users" title
  │   ├─ Total count
  │   ├─ Export button (CSV/Excel)
  │   └─ Add User button (manual)
  │
  ├─ Filters & Search
  │   ├─ Search by name/email/ID
  │   ├─ Filter by:
  │   │   ├─ Status (Active/Banned/Suspended)
  │   │   ├─ Subscription (Free/Premium/VIP)
  │   │   ├─ Registration date
  │   │   └─ Last active
  │   └─ Sort by:
  │       ├─ Name (A-Z)
  │       ├─ Registration date
  │       ├─ Last active
  │       └─ Watch time
  │
  └─ Users Table
      ├─ Columns:
      │   ├─ Avatar
      │   ├─ Name
      │   ├─ Email
      │   ├─ Subscription
      │   ├─ Status badge
      │   ├─ Registration date
      │   ├─ Last active
      │   └─ Actions (...)
      │
      └─ Pagination
          └─ 25/50/100 per page
```

### **User Detail Flow:**

```
Click user row → User Detail Page
  ├─ User Info Card
  │   ├─ Avatar
  │   ├─ Name
  │   ├─ Email
  │   ├─ Phone (if provided)
  │   ├─ Registration date
  │   ├─ Last login
  │   ├─ Status badge
  │   └─ Quick Actions:
  │       ├─ Edit User
  │       ├─ Suspend User
  │       ├─ Ban User
  │       ├─ Delete User
  │       └─ Send Email
  │
  ├─ Subscription Info
  │   ├─ Current plan
  │   ├─ Start date
  │   ├─ Expiry date
  │   ├─ Auto-renew status
  │   ├─ Payment method
  │   └─ Actions:
  │       ├─ Upgrade/Downgrade
  │       ├─ Extend subscription
  │       └─ Cancel subscription
  │
  ├─ Statistics
  │   ├─ Total watch time
  │   ├─ Total playlists
  │   ├─ Total favorites
  │   ├─ Total downloads
  │   └─ Active devices
  │
  ├─ Playlists Tab
  │   └─ List of user's playlists
  │       ├─ Name
  │       ├─ Type
  │       ├─ Channels count
  │       └─ Actions (View/Delete)
  │
  ├─ Watch History Tab
  │   └─ Recent watched content
  │       ├─ Content name
  │       ├─ Type
  │       ├─ Watch date
  │       └─ Progress
  │
  ├─ Devices Tab
  │   └─ Registered devices
  │       ├─ Device name
  │       ├─ OS
  │       ├─ Last active
  │       └─ Remove device
  │
  ├─ Payment History Tab
  │   └─ All transactions
  │       ├─ Date
  │       ├─ Amount
  │       ├─ Plan
  │       ├─ Status
  │       └─ Invoice
  │
  └─ Activity Logs Tab
      └─ User actions
          ├─ Timestamp
          ├─ Action
          ├─ IP address
          └─ Device
```

### **User Actions:**

**Suspend User:**
```
Click "Suspend User"
  ↓
Confirmation dialog
  ├─ Reason dropdown
  ├─ Duration (days)
  ├─ Notes (optional)
  └─ Confirm button
      ↓
  Update user.isActive = false
      ↓
  Log activity
      ↓
  Send email notification to user
      ↓
  Success toast
```

**Ban User:**
```
Click "Ban User"
  ↓
Confirmation dialog
  ├─ Reason dropdown
  ├─ Permanent/Temporary
  ├─ Notes (optional)
  └─ Confirm button
      ↓
  Update user.isBanned = true
      ↓
  Revoke all sessions
      ↓
  Log activity
      ↓
  Send email notification
      ↓
  Success toast
```

---

## 📺 CONTENT MANAGEMENT FLOW

### **Global Playlists:**

```
Content → Global Playlists
  ↓
Global Playlists Screen
  ├─ Header
  │   ├─ "Global Playlists" title
  │   ├─ Total count
  │   └─ "Add Playlist" button
  │
  ├─ Playlists Grid/List
  │   ├─ Thumbnail
  │   ├─ Name
  │   ├─ Description
  │   ├─ Type (M3U/Xtream)
  │   ├─ Channels count
  │   ├─ Users count
  │   ├─ Status (Active/Inactive)
  │   ├─ Premium badge
  │   └─ Actions:
  │       ├─ Edit
  │       ├─ View Details
  │       ├─ Toggle Active
  │       └─ Delete
  │
  └─ Filters
      ├─ Type
      ├─ Status
      └─ Premium/Free
```

### **Add Global Playlist Flow:**

```
Click "Add Playlist"
  ↓
Add Playlist Modal
  ├─ Basic Info
  │   ├─ Name
  │   ├─ Description
  │   ├─ Thumbnail upload
  │   ├─ Category
  │   └─ Premium toggle
  │
  ├─ Source Type
  │   ├─ M3U/M3U8 URL
  │   └─ Xtream Codes
  │
  ├─ M3U Configuration
  │   ├─ URL input
  │   └─ Test URL button
  │
  ├─ Xtream Configuration
  │   ├─ Server URL
  │   ├─ Username
  │   ├─ Password
  │   └─ Test Connection button
  │
  └─ Save Button
      ↓
  Validate inputs
      ↓
  Parse playlist/Fetch from Xtream
      ↓
  Save to globalPlaylists collection
      ↓
  Extract channels/movies/series
      ↓
  Success toast → Refresh list
```

### **Featured Content Management:**

```
Content → Featured Content
  ↓
Featured Content Screen
  ├─ Sections
  │   ├─ Hero Banner (1 item)
  │   ├─ Trending (10 items)
  │   ├─ Recommended (10 items)
  │   └─ New Releases (10 items)
  │
  ├─ Each Section Shows:
  │   ├─ Current featured items
  │   ├─ Drag to reorder
  │   └─ "Add Content" button
  │
  └─ Add Content Flow:
      ├─ Search content
      ├─ Select from list
      ├─ Set position
      ├─ Set start/end date
      ├─ Premium toggle
      └─ Save
```

---

## 💳 SUBSCRIPTION MANAGEMENT FLOW

### **Subscription Plans:**

```
Subscriptions → Plans
  ↓
Plans Screen
  ├─ Current Plans Grid
  │   ├─ Free Plan Card
  │   │   ├─ Name
  │   │   ├─ Price ($0)
  │   │   ├─ Features list
  │   │   ├─ Active users count
  │   │   └─ Edit button
  │   ├─ Premium Plan Card
  │   └─ VIP Plan Card
  │
  └─ "Create New Plan" button
```

### **Create/Edit Plan Flow:**

```
Click "Create Plan" or "Edit"
  ↓
Plan Editor Modal
  ├─ Basic Info
  │   ├─ Plan name
  │   ├─ Display name
  │   ├─ Description
  │   ├─ Price
  │   ├─ Currency
  │   └─ Billing cycle (Monthly/Yearly)
  │
  ├─ Features
  │   ├─ Max playlists
  │   ├─ Max devices
  │   ├─ Max downloads
  │   ├─ Max concurrent streams
  │   ├─ HD quality toggle
  │   ├─ 4K quality toggle
  │   ├─ Downloads toggle
  │   ├─ Catch-up TV toggle
  │   ├─ Ad-free toggle
  │   └─ Priority support toggle
  │
  ├─ Display Settings
  │   ├─ Popular badge toggle
  │   ├─ Display order
  │   └─ Active toggle
  │
  └─ Save Button
      ↓
  Validate inputs
      ↓
  Save to subscriptionPlans collection
      ↓
  Success toast
```

### **Payments Management:**

```
Subscriptions → Payments
  ↓
Payments Screen
  ├─ Stats Cards
  │   ├─ Total Revenue (this month)
  │   ├─ New Subscriptions
  │   ├─ Renewals
  │   └─ Refunds
  │
  ├─ Filters
  │   ├─ Date range
  │   ├─ Status
  │   ├─ Plan
  │   └─ Payment method
  │
  └─ Payments Table
      ├─ Columns:
      │   ├─ Transaction ID
      │   ├─ User
      │   ├─ Plan
      │   ├─ Amount
      │   ├─ Payment method
      │   ├─ Status
      │   ├─ Date
      │   └─ Actions
      │
      └─ Actions:
          ├─ View Details
          ├─ Download Invoice
          ├─ Process Refund
          └─ Mark as Failed
```

### **Refund Flow:**

```
Click "Process Refund"
  ↓
Refund Modal
  ├─ Transaction details
  ├─ Refund amount (editable)
  ├─ Reason dropdown
  ├─ Notes
  └─ Confirm button
      ↓
  Process refund via payment gateway
      ↓
  Update payment status
      ↓
  Update user subscription
      ↓
  Log activity
      ↓
  Send email to user
      ↓
  Success toast
```

---

## 📊 ANALYTICS FLOW

```
Analytics Dashboard
  ├─ Date Range Selector
  │   ├─ Today
  │   ├─ Last 7 days
  │   ├─ Last 30 days
  │   ├─ Last 90 days
  │   └─ Custom range
  │
  ├─ Overview Stats
  │   ├─ Total Users
  │   ├─ New Users
  │   ├─ Active Users
  │   ├─ Premium Users
  │   ├─ Total Revenue
  │   ├─ Total Watch Time
  │   └─ Total Views
  │
  ├─ Charts Section
  │   ├─ User Growth Chart
  │   │   └─ Line chart (daily/weekly/monthly)
  │   ├─ Revenue Chart
  │   │   └─ Bar chart
  │   ├─ Engagement Chart
  │   │   └─ Watch time trends
  │   └─ Content Performance
  │       └─ Top viewed content
  │
  ├─ Geographic Distribution
  │   ├─ World map
  │   └─ Country breakdown table
  │
  ├─ Device Statistics
  │   ├─ Pie chart
  │   │   ├─ Android
  │   │   ├─ iOS
  │   │   ├─ Web
  │   │   └─ TV
  │   └─ Percentage breakdown
  │
  ├─ Top Content
  │   ├─ Most watched channels
  │   ├─ Most watched movies
  │   └─ Most watched series
  │
  └─ Export Options
      ├─ Export as PDF
      ├─ Export as CSV
      └─ Schedule email report
```

---

## 🔔 NOTIFICATIONS FLOW

```
Notifications Screen
  ├─ Header
  │   ├─ "Notifications" title
  │   └─ "Create Notification" button
  │
  ├─ Tabs
  │   ├─ All
  │   ├─ Scheduled
  │   ├─ Sent
  │   └─ Drafts
  │
  └─ Notifications List
      ├─ Each notification shows:
      │   ├─ Title
      │   ├─ Message preview
      │   ├─ Target audience
      │   ├─ Status
      │   ├─ Scheduled time
      │   ├─ Sent time
      │   ├─ Stats (sent/delivered/opened)
      │   └─ Actions (Edit/Delete/Duplicate)
      │
      └─ Click notification → View details
```

### **Create Notification Flow:**

```
Click "Create Notification"
  ↓
Notification Editor
  ├─ Basic Info
  │   ├─ Title
  │   ├─ Message
  │   ├─ Type (Announcement/Update/Promotion/Alert)
  │   └─ Priority (Low/Medium/High/Urgent)
  │
  ├─ Targeting
  │   ├─ Target audience:
  │   │   ├─ All users
  │   │   ├─ Premium users
  │   │   ├─ Free users
  │   │   ├─ Inactive users
  │   │   └─ Specific users (select)
  │   └─ User count preview
  │
  ├─ Content
  │   ├─ Image upload (optional)
  │   ├─ Action URL (deep link)
  │   └─ Action button text
  │
  ├─ Scheduling
  │   ├─ Send now
  │   ├─ Schedule for later
  │   │   ├─ Date picker
  │   │   └─ Time picker
  │   └─ Expiry date (optional)
  │
  ├─ Preview
  │   └─ Mobile notification preview
  │
  └─ Actions
      ├─ Save as Draft
      ├─ Schedule
      └─ Send Now
          ↓
      Validate inputs
          ↓
      Save to notifications collection
          ↓
      Send via Firebase Cloud Messaging
          ↓
      Track delivery & opens
          ↓
      Success toast
```

---

## 🚨 REPORTS & MODERATION FLOW

```
Reports Screen
  ├─ Stats Cards
  │   ├─ Pending Reports
  │   ├─ Under Review
  │   ├─ Resolved
  │   └─ Dismissed
  │
  ├─ Filters
  │   ├─ Status
  │   ├─ Content type
  │   ├─ Reason
  │   └─ Date range
  │
  └─ Reports Table
      ├─ Columns:
      │   ├─ Report ID
      │   ├─ Reported by
      │   ├─ Content type
      │   ├─ Content name
      │   ├─ Reason
      │   ├─ Priority
      │   ├─ Status
      │   ├─ Date
      │   └─ Actions
      │
      └─ Click report → Report Detail
```

### **Report Detail Flow:**

```
Report Detail Page
  ├─ Report Info
  │   ├─ Report ID
  │   ├─ Submitted by (user)
  │   ├─ Submitted date
  │   ├─ Reason
  │   ├─ Description
  │   ├─ Screenshots (if any)
  │   └─ Priority badge
  │
  ├─ Reported Content
  │   ├─ Content preview
  │   ├─ Content details
  │   ├─ Playlist info
  │   └─ "View Content" button
  │
  ├─ Actions Panel
  │   ├─ Status dropdown
  │   │   ├─ Pending
  │   │   ├─ Under Review
  │   │   ├─ Resolved
  │   │   └─ Dismissed
  │   ├─ Action taken dropdown
  │   │   ├─ Content removed
  │   │   ├─ User warned
  │   │   ├─ User suspended
  │   │   ├─ No action needed
  │   │   └─ Other
  │   ├─ Resolution notes
  │   └─ Save button
  │
  └─ History
      └─ All status changes & actions
```

---

## ⚙️ SYSTEM SETTINGS FLOW

```
Settings Screen
  ├─ Tabs
  │   ├─ General
  │   ├─ Features
  │   ├─ Limits
  │   ├─ Security
  │   └─ Integrations
  │
  ├─ General Tab
  │   ├─ App name
  │   ├─ App version
  │   ├─ Min app version
  │   ├─ Force update toggle
  │   ├─ Update message
  │   ├─ Maintenance mode toggle
  │   ├─ Maintenance message
  │   ├─ Maintenance start time
  │   └─ Maintenance end time
  │
  ├─ Features Tab
  │   ├─ Registration enabled
  │   ├─ Guest mode enabled
  │   ├─ Social login enabled
  │   ├─ Catch-up TV enabled
  │   ├─ Downloads enabled
  │   ├─ Parental controls enabled
  │   ├─ Multi-screen enabled
  │   ├─ Offline mode enabled
  │   └─ Chromecast enabled
  │
  ├─ Limits Tab
  │   ├─ Max playlists per user
  │   ├─ Max devices per user
  │   ├─ Max downloads per user
  │   ├─ Max concurrent streams
  │   ├─ Max file size (MB)
  │   └─ Session timeout (minutes)
  │
  ├─ Security Tab
  │   ├─ Password min length
  │   ├─ Require email verification
  │   ├─ Two-factor enabled
  │   ├─ Max login attempts
  │   ├─ Lockout duration (minutes)
  │   └─ Session duration (days)
  │
  └─ Integrations Tab
      ├─ Analytics enabled
      ├─ Crash reporting enabled
      ├─ Payment gateways
      └─ Social login providers
```

---

## 📋 ACTIVITY LOGS FLOW

```
Logs Screen
  ├─ Filters
  │   ├─ Date range
  │   ├─ Admin user
  │   ├─ Action type
  │   ├─ Resource type
  │   └─ Severity
  │
  └─ Logs Table
      ├─ Columns:
      │   ├─ Timestamp
      │   ├─ Admin user
      │   ├─ Action
      │   ├─ Resource
      │   ├─ Description
      │   ├─ IP address
      │   ├─ Severity badge
      │   └─ View Details
      │
      └─ Export logs (CSV/JSON)
```

---

## 🔑 ADMIN MANAGEMENT FLOW

```
Settings → Admins (Super Admin only)
  ↓
Admins Screen
  ├─ Current Admins List
  │   ├─ Name
  │   ├─ Email
  │   ├─ Role
  │   ├─ Created date
  │   ├─ Last login
  │   ├─ Status
  │   └─ Actions (Edit/Delete)
  │
  └─ "Add Admin" button
      ↓
  Add Admin Modal
      ├─ Email
      ├─ Name
      ├─ Role (Admin/Moderator)
      ├─ Permissions checkboxes
      │   ├─ Manage users
      │   ├─ Manage playlists
      │   ├─ Manage content
      │   ├─ View analytics
      │   ├─ Manage subscriptions
      │   ├─ Send notifications
      │   ├─ Manage settings
      │   └─ View logs
      └─ Create button
          ↓
      Create admin in admins collection
          ↓
      Send invitation email
          ↓
      Log activity
          ↓
      Success toast
```

---

## ✅ ADMIN FLOW COMPLETE!

This document covers every aspect of the admin panel for Onvi Player.

**Both USER_FLOW.md and ADMIN_FLOW.md are now created!** 🎉
