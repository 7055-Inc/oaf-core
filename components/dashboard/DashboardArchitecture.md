# Dashboard Architecture Documentation

## Core Architecture

### 1. Dashboard (Browser Page)
**File:** `pages/dashboard/index.js`
**Responsibilities:**
- Left menu navigation
- Widget desktop (main content area)
- Slide-in overlay system management
- CSS loading (Dashboard.module.css + SlideIn.module.css + global.css)
- Slide-in state management (`openSlideIn`, `closeSlideIn`)

### 2. Slide-In Template System
**Controlled by:** Dashboard
**Styling:** `Dashboard.module.css`
**Structure:**
```jsx
<div className={styles.slideInOverlay}>
  <div className={styles.slideInPanel}>
    <div className={styles.slideInContainer}>
      <div className={styles.slideInHeader}>
        <button className={styles.backButton} onClick={closeSlideIn}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </button>
        <h2 className={styles.slideInTitle}>{slideInContent.title}</h2>
      </div>
      <div className={styles.slideInContent}>
        {renderSlideInContent()}
      </div>
    </div>
  </div>
</div>
```

### 3. Content Styling
**File:** `components/dashboard/SlideIn.module.css`
**Purpose:** Centralized styling for all slide-in content (forms, tables, cards, etc.)
**Loading:** Once by Dashboard, inherited by all slide-ins

## Folder Structure

```
components/dashboard/
├── my-account/
│   ├── MyAccountMenu.js
│   └── components/
│       ├── EditProfile.js
│       ├── ViewProfile.js
│       ├── MyOrders.js
│       ├── ShippingSettings.js
│       └── PaymentManagement.js
├── vendor-tools/
│   ├── VendorToolsMenu.js
│   └── components/
│       ├── ShipOrders.js
│       ├── MyProducts.js
│       └── ManageInventory.js
├── finance/
│   ├── FinanceMenu.js
│   └── components/
│       ├── PaymentManagement.js
│       └── TransactionHistory.js
└── SlideIn.module.css
```

## Implementation Pattern

### Menu Component
```jsx
// MyAccountMenu.js
const MyAccountMenu = ({ openSlideIn }) => {
  return (
    <div>
      <button onClick={() => openSlideIn('edit-profile', { title: 'Edit Profile' })}>
        Edit Profile
      </button>
      <button onClick={() => openSlideIn('view-profile', { title: 'View Profile' })}>
        View Profile
      </button>
    </div>
  );
};
```

### Content Component
```jsx
// EditProfile.js
// Title is handled by slide-in header template in Dashboard
const EditProfile = ({ userData }) => {
  // ONLY edit profile logic and JSX
  return (
    <div>
      {/* Edit profile form content */}
    </div>
  );
};
```

### Dashboard Integration
```jsx
// Dashboard index.js
const renderSlideInContent = () => {
  // Handle My Account slide-ins
  if (slideInContent.type === 'edit-profile') {
    return <EditProfile userData={userData} />;
  }
  if (slideInContent.type === 'view-profile') {
    return <ViewProfile userData={userData} />;
  }
  
  return null;
};
```

## Quick Start Guide for New Developers

### Adding a New Menu Item (Plug & Play)

1. **Create the content component:**
   ```jsx
   // components/dashboard/my-account/components/NewFeature.js
   export default function NewFeature({ userData }) {
     return (
       <div>
         <p>Your feature content here</p>
       </div>
     );
   }
   ```

2. **Add menu button:**
   ```jsx
   // In MyAccountMenu.js, add to the <ul>:
   <li>
     <button 
       className={styles.sidebarLink}
       onClick={() => openSlideIn('new-feature', { title: 'New Feature' })}
     >
       New Feature
     </button>
   </li>
   ```

3. **Register in Dashboard:**
   ```jsx
   // In Dashboard index.js renderSlideInContent():
   if (slideInContent.type === 'new-feature') {
     return <NewFeature userData={userData} />;
   }
   ```

4. **Import the component:**
   ```jsx
   // At top of Dashboard index.js:
   import NewFeature from '../../components/dashboard/my-account/components/NewFeature';
   ```

**That's it!** Your feature automatically gets:
- ✅ Consistent slide-in header with title
- ✅ Back button functionality  
- ✅ Inherited styling from SlideIn.module.css
- ✅ Proper navigation flow

## Benefits

1. **Separation of Concerns**
   - Menu logic separate from content logic
   - Each feature has its own file
   - Related components grouped in folders

2. **Better Organization**
   - Clear folder structure matches user mental model
   - Easy navigation and maintenance
   - Scalable for team development

3. **CSS Inheritance**
   - Dashboard loads SlideIn.module.css once
   - All components inherit styling automatically
   - No duplicate CSS imports needed

4. **Import Strategy**
   ```jsx
   // From Dashboard
   import { MyAccountMenu } from '../components/dashboard/my-account/MyAccountMenu';
   import EditProfile from '../components/dashboard/my-account/components/EditProfile';
   ```

## File Responsibilities

| File | Responsibility | Styling Source |
|------|---------------|----------------|
| `Dashboard.module.css` | Slide-in template, menu, desktop | Dashboard |
| `SlideIn.module.css` | Content styling for all slide-ins | Dashboard |
| `global.css` | Global application styles | Next.js |
| Menu components | ONLY menu building | Inherited |
| Content components | ONLY feature content | Inherited |
