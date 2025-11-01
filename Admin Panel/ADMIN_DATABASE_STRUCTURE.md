# Onvi Player - Admin Panel Database Structure

## 🔐 Admin-Specific Collections

### 15. **admins** Collection
Stores admin user information and permissions.

```
admins/{adminId}
├── userId: string (reference to users collection)
├── email: string
├── displayName: string
├── role: string ("super_admin" | "admin" | "moderator")
├── permissions: object
│   ├── manageUsers: boolean
│   ├── managePlaylists: boolean
│   ├── manageContent: boolean
│   ├── viewAnalytics: boolean
│   ├── manageSubscriptions: boolean
│   ├── sendNotifications: boolean
│   ├── manageSettings: boolean
│   └── viewLogs: boolean
├── createdAt: timestamp
├── createdBy: string (admin who created this admin)
├── lastLogin: timestamp
└── isActive: boolean
```

---

### 16. **globalPlaylists** Collection
Admin-managed playlists available to all users.

```
globalPlaylists/{playlistId}
├── name: string
├── description: string
├── type: string ("m3u" | "xtream")
├── createdBy: string (admin userId)
├── createdAt: timestamp
├── updatedAt: timestamp
├── isActive: boolean
├── isPremium: boolean (requires premium subscription)
├── order: number
├── thumbnail: string (URL)
├── category: string ("sports" | "movies" | "news" | "entertainment")
├── m3uConfig: object (if type === "m3u")
│   ├── url: string
│   └── lastFetched: timestamp
├── xtreamConfig: object (if type === "xtream")
│   ├── serverUrl: string
│   ├── username: string
│   ├── password: string (encrypted)
│   └── lastFetched: timestamp
└── stats: object
    ├── totalUsers: number
    ├── totalChannels: number
    ├── totalMovies: number
    ├── totalSeries: number
    └── totalViews: number
```

---

### 17. **subscriptionPlans** Collection
Admin-defined subscription plans.

```
subscriptionPlans/{planId}
├── name: string ("free" | "premium" | "vip")
├── displayName: string
├── description: string
├── price: number
├── currency: string ("USD" | "EUR" | etc.)
├── billingCycle: string ("monthly" | "yearly" | "lifetime")
├── duration: number (days)
├── features: array<string>
├── limits: object
│   ├── maxPlaylists: number
│   ├── maxDevices: number
│   ├── maxDownloads: number
│   └── maxConcurrentStreams: number
├── allowDownloads: boolean
├── allowCatchup: boolean
├── adFree: boolean
├── hdQuality: boolean
├── priority: number (for sorting)
├── isActive: boolean
├── isPopular: boolean
├── createdAt: timestamp
└── updatedAt: timestamp
```

---

### 18. **payments** Collection
Tracks user payments and transactions.

```
payments/{paymentId}
├── userId: string
├── planId: string (reference to subscriptionPlans)
├── amount: number
├── currency: string
├── paymentMethod: string ("card" | "paypal" | "stripe" | "google_pay" | "apple_pay")
├── status: string ("pending" | "completed" | "failed" | "refunded" | "cancelled")
├── transactionId: string (from payment provider)
├── createdAt: timestamp
├── completedAt: timestamp (optional)
├── refundedAt: timestamp (optional)
├── subscriptionStartDate: timestamp
├── subscriptionEndDate: timestamp
├── isRecurring: boolean
└── metadata: object
    ├── paymentProvider: string
    ├── receiptUrl: string
    ├── invoiceNumber: string
    ├── customerEmail: string
    └── billingAddress: object
```

---

### 19. **notifications** Collection
Admin-sent push notifications.

```
notifications/{notificationId}
├── title: string
├── message: string
├── type: string ("announcement" | "update" | "promotion" | "alert" | "maintenance")
├── priority: string ("low" | "medium" | "high" | "urgent")
├── targetAudience: string ("all" | "premium" | "free" | "specific" | "inactive")
├── targetUserIds: array<string> (if targetAudience === "specific")
├── imageUrl: string (optional)
├── actionUrl: string (optional, deep link)
├── actionButton: string (optional, button text)
├── createdBy: string (admin userId)
├── createdAt: timestamp
├── scheduledFor: timestamp (optional, for scheduled notifications)
├── sentAt: timestamp (optional)
├── expiresAt: timestamp (optional)
├── status: string ("draft" | "scheduled" | "sending" | "sent" | "cancelled" | "failed")
└── stats: object
    ├── totalTargeted: number
    ├── totalSent: number
    ├── totalDelivered: number
    ├── totalOpened: number
    ├── totalClicked: number
    └── failedDeliveries: number
```

---

### 20. **analytics** Collection
Platform-wide analytics and statistics (daily aggregation).

```
analytics/{date} (format: YYYY-MM-DD)
├── date: timestamp
├── users: object
│   ├── totalUsers: number
│   ├── newUsers: number
│   ├── activeUsers: number (logged in today)
│   ├── premiumUsers: number
│   ├── freeUsers: number
│   ├── bannedUsers: number
│   └── churnedUsers: number
├── content: object
│   ├── totalPlaylists: number
│   ├── totalGlobalPlaylists: number
│   ├── totalChannels: number
│   ├── totalMovies: number
│   ├── totalSeries: number
│   └── totalEpisodes: number
├── engagement: object
│   ├── totalWatchTime: number (minutes)
│   ├── averageSessionDuration: number (minutes)
│   ├── totalSessions: number
│   ├── totalViews: number
│   ├── totalFavorites: number
│   └── totalDownloads: number
├── revenue: object
│   ├── totalRevenue: number
│   ├── newSubscriptions: number
│   ├── renewals: number
│   ├── cancellations: number
│   ├── refunds: number
│   └── averageRevenuePerUser: number
├── topContent: array<object>
│   ├── contentId: string
│   ├── contentName: string
│   ├── contentType: string
│   ├── views: number
│   └── watchTime: number
└── deviceStats: object
    ├── android: number
    ├── ios: number
    ├── web: number
    └── tv: number
```

---

### 21. **activityLogs** Collection
Tracks admin and system activities for audit trail.

```
activityLogs/{logId}
├── userId: string (admin or system)
├── userEmail: string
├── userRole: string
├── action: string ("create" | "update" | "delete" | "login" | "suspend" | "ban" | etc.)
├── resource: string ("user" | "playlist" | "content" | "settings" | "notification")
├── resourceId: string
├── description: string
├── changes: object (before/after values)
├── ipAddress: string
├── userAgent: string
├── location: string (optional)
├── timestamp: timestamp
├── severity: string ("info" | "warning" | "critical")
└── metadata: object (additional context)
```

---

### 22. **reports** Collection
User-submitted reports and admin moderation.

```
reports/{reportId}
├── reportedBy: string (userId)
├── reporterEmail: string
├── contentType: string ("channel" | "movie" | "series" | "user" | "playlist")
├── contentId: string
├── reason: string ("inappropriate" | "broken_link" | "spam" | "copyright" | "adult_content" | "other")
├── description: string
├── priority: string ("low" | "medium" | "high")
├── status: string ("pending" | "under_review" | "resolved" | "dismissed" | "escalated")
├── createdAt: timestamp
├── reviewedBy: string (admin userId, optional)
├── reviewedAt: timestamp (optional)
├── resolution: string (optional)
├── actionTaken: string (optional)
└── metadata: object
    ├── contentName: string
    ├── contentUrl: string
    ├── playlistId: string
    ├── screenshots: array<string>
    └── additionalInfo: string
```

---

### 23. **systemSettings** Collection
Global system configuration (admin-only).

```
systemSettings/config
├── appInfo: object
│   ├── appName: string
│   ├── appVersion: string
│   ├── minAppVersion: string
│   ├── latestAppVersion: string
│   ├── forceUpdate: boolean
│   └── updateMessage: string
├── maintenance: object
│   ├── enabled: boolean
│   ├── message: string
│   ├── startTime: timestamp
│   ├── endTime: timestamp
│   └── affectedServices: array<string>
├── features: object
│   ├── registrationEnabled: boolean
│   ├── guestModeEnabled: boolean
│   ├── socialLoginEnabled: boolean
│   ├── catchupEnabled: boolean
│   ├── downloadEnabled: boolean
│   ├── parentalControlEnabled: boolean
│   ├── multiScreenEnabled: boolean
│   ├── offlineMode: boolean
│   └── chromecastEnabled: boolean
├── limits: object
│   ├── maxPlaylistsPerUser: number
│   ├── maxDevicesPerUser: number
│   ├── maxDownloadsPerUser: number
│   ├── maxConcurrentStreams: number
│   ├── maxFileSize: number (MB)
│   └── sessionTimeout: number (minutes)
├── content: object
│   ├── defaultVideoQuality: string
│   ├── supportedFormats: array<string>
│   ├── epgUpdateInterval: number (hours)
│   ├── cacheExpiry: number (hours)
│   └── thumbnailQuality: string
├── security: object
│   ├── passwordMinLength: number
│   ├── requireEmailVerification: boolean
│   ├── twoFactorEnabled: boolean
│   ├── maxLoginAttempts: number
│   ├── lockoutDuration: number (minutes)
│   └── sessionDuration: number (days)
├── notifications: object
│   ├── enabled: boolean
│   ├── welcomeNotification: boolean
│   ├── subscriptionReminders: boolean
│   └── contentUpdateNotifications: boolean
└── integrations: object
    ├── analyticsEnabled: boolean
    ├── crashReportingEnabled: boolean
    ├── paymentGateways: array<string>
    └── socialLoginProviders: array<string>
```

---

### 24. **featuredContent** Collection
Admin-curated featured content for homepage.

```
featuredContent/{featureId}
├── contentType: string ("channel" | "movie" | "series" | "playlist")
├── contentId: string
├── title: string
├── description: string
├── thumbnail: string
├── backdrop: string
├── position: number (for ordering)
├── section: string ("hero" | "trending" | "recommended" | "new")
├── isPremium: boolean
├── startDate: timestamp
├── endDate: timestamp
├── isActive: boolean
├── createdBy: string (admin userId)
├── createdAt: timestamp
└── stats: object
    ├── impressions: number
    ├── clicks: number
    └── ctr: number (click-through rate)
```

---

### 25. **announcements** Collection
Platform-wide announcements and news.

```
announcements/{announcementId}
├── title: string
├── content: string (HTML/Markdown)
├── type: string ("news" | "update" | "promotion" | "alert")
├── priority: string ("low" | "medium" | "high")
├── imageUrl: string (optional)
├── actionUrl: string (optional)
├── actionButtonText: string (optional)
├── targetAudience: string ("all" | "premium" | "free")
├── isActive: boolean
├── isPinned: boolean
├── startDate: timestamp
├── endDate: timestamp (optional)
├── createdBy: string (admin userId)
├── createdAt: timestamp
├── updatedAt: timestamp
└── stats: object
    ├── views: number
    └── clicks: number
```

---

## 🔐 Updated Security Rules (with Admin Access)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin', 'moderator'];
    }
    
    function isSuperAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || isAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
      allow update: if isAdmin(); // Admins can update any user
      allow delete: if isSuperAdmin(); // Only super admins can delete users
    }
    
    // Admin collection - only admins can access
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if isSuperAdmin();
    }
    
    // Global Playlists - admins manage, users read
    match /globalPlaylists/{playlistId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Subscription Plans - admins manage, users read
    match /subscriptionPlans/{planId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Payments - user can read their own, admins can read all
    match /payments/{paymentId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if request.auth != null;
      allow update: if isAdmin();
    }
    
    // Notifications - admins manage, users read their own
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Analytics - admin only
    match /analytics/{date} {
      allow read, write: if isAdmin();
    }
    
    // Activity Logs - admin only
    match /activityLogs/{logId} {
      allow read: if isAdmin();
      allow create: if request.auth != null;
    }
    
    // Reports - users can create, admins can manage
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && 
        (resource.data.reportedBy == request.auth.uid || isAdmin());
      allow update, delete: if isAdmin();
    }
    
    // System Settings - admin only
    match /systemSettings/{document=**} {
      allow read: if request.auth != null;
      allow write: if isSuperAdmin();
    }
    
    // Featured Content - admins manage, users read
    match /featuredContent/{featureId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Announcements - admins manage, users read
    match /announcements/{announcementId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // User playlists, channels, etc. (existing rules)
    match /playlists/{playlistId} {
      allow read: if request.auth != null && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && 
        (resource.data.userId == request.auth.uid || isAdmin());
    }
    
    // Other collections follow similar pattern...
  }
}
```

---

## 📊 Admin Panel Features Supported

### **User Management**
- View all users with filters (active, banned, premium, free)
- Search users by email, name, ID
- View user details (playlists, watch history, devices)
- Suspend/ban users
- Manage subscriptions
- View user analytics

### **Content Management**
- Create/edit/delete global playlists
- Manage featured content
- Review reported content
- Moderate user-submitted content
- Bulk operations

### **Analytics Dashboard**
- Real-time user statistics
- Revenue tracking
- Content performance
- Engagement metrics
- Geographic distribution
- Device statistics

### **Subscription Management**
- Create/edit subscription plans
- View payment history
- Process refunds
- Track renewals and cancellations
- Revenue reports

### **Notifications**
- Send push notifications
- Schedule notifications
- Target specific user groups
- Track notification performance

### **System Settings**
- App configuration
- Feature toggles
- Maintenance mode
- Security settings
- Content limits

### **Activity Logs**
- Audit trail of all admin actions
- System events logging
- Security monitoring

### **Reports & Moderation**
- Review user reports
- Take action on reported content
- Track resolution status

---

## ✅ Admin Database Structure Complete!

All admin panel collections are now defined and ready for implementation.
