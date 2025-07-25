# 🆘 Help Center Architecture Documentation

## 📋 **Overview**

This document outlines the complete architecture for the Online Art Festival Help Center system, including help articles, support tickets, dashboard integration, and AI-powered agent assistance.

---

## 🏗️ **System Architecture**

### **Core Components:**
1. **Help Articles** - Extends existing articles system with help-specific filtering
2. **Support Ticket System** - Full ticket tracking with admin/user interfaces  
3. **Dashboard Integration** - User and admin ticket management interfaces
4. **AI Agent Assistant** - Chatbot to help agents craft responses
5. **Email Integration** - Automated notifications using existing email system

### **Design Principles:**
- **Leverage Existing Systems** - Reuse articles infrastructure (80% code reuse)
- **Progressive Enhancement** - Build in phases from basic to advanced features
- **User-Centric Design** - Role-based content and permissions
- **Scalable Architecture** - Support growing content and ticket volume

---

## 📝 **Help Articles System**

### **Implementation Strategy:**
**Extend existing articles system rather than duplicate it**

### **Database Changes:**
```sql
-- Extend existing articles table
ALTER TABLE articles ADD COLUMN article_type ENUM('blog_post', 'help_article', 'announcement') DEFAULT 'blog_post';
ALTER TABLE articles ADD COLUMN help_category VARCHAR(50); -- 'getting-started', 'payments', etc.
ALTER TABLE articles ADD COLUMN target_user_types JSON; -- ['artist', 'promoter', 'community', 'admin']
ALTER TABLE articles ADD COLUMN permissions_required JSON; -- ['can_sell', 'manage_events', etc.]
```

### **Help Categories:**
- **Getting Started** - Onboarding, first steps, account setup
- **Account Management** - Profile, settings, password, verification
- **Artist Tools** - Portfolio, applications, sales, commissions *(artist-only)*
- **Event Management** - Creating events, applications, calendar *(promoter-only)*
- **Payments & Orders** - Checkout, refunds, payouts, billing
- **Technical Support** - Troubleshooting, API docs, integrations

### **Content Filtering Logic:**
```javascript
// Example filtering in API
GET /api/articles?type=help_article&user_type=artist&permissions=can_sell

// Filters applied:
// 1. article_type = 'help_article'
// 2. user_type IN target_user_types OR target_user_types IS NULL (public)
// 3. user_permissions MATCHES permissions_required OR permissions_required IS NULL
```

### **Frontend Pages:**
```
/help                           # Main help center landing
/help/getting-started           # Category pages
/help/account
/help/artist-tools              # Role-specific categories
/help/event-management
/help/payments
/help/technical
/help/search?q=...             # Search results
/help/article/[slug]           # Individual article view
/help/contact                  # Contact/ticket creation
```

### **What We Get For Free:**
- ✅ **Content Creation** - Existing ArticleManagement.js component
- ✅ **WYSIWYG Editor** - Rich text editor with image uploads
- ✅ **Publishing Workflow** - Draft → Published status management
- ✅ **SEO Management** - Meta tags, descriptions, keywords
- ✅ **Full-Text Search** - Existing search infrastructure
- ✅ **Analytics** - View tracking and performance metrics
- ✅ **Permissions** - Role-based content management

---

## 🎫 **Support Ticket System**

### **Database Schema:**
```sql
CREATE TABLE support_tickets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category ENUM('technical', 'billing', 'account', 'artist_tools', 'events', 'general') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'waiting_user', 'resolved', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  assigned_admin_id BIGINT NULL,
  first_response_at TIMESTAMP NULL,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tickets_status (status),
  INDEX idx_tickets_user (user_id),
  INDEX idx_tickets_assigned (assigned_admin_id),
  INDEX idx_tickets_category (category)
);

CREATE TABLE ticket_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  message TEXT NOT NULL,
  is_admin_response BOOLEAN DEFAULT FALSE,
  is_internal_note BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_ticket (ticket_id),
  INDEX idx_messages_user (user_id)
);

CREATE TABLE ticket_attachments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  message_id BIGINT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_attachments_ticket (ticket_id)
);
```

### **API Endpoints:**
```javascript
// Ticket Management
GET    /api/tickets              # Admin: All tickets (with filtering)
GET    /api/tickets/my           # User: My tickets only
POST   /api/tickets              # Create new ticket
GET    /api/tickets/:id          # Get ticket details + message thread
POST   /api/tickets/:id/reply    # Add reply to ticket
PUT    /api/tickets/:id/status   # Update ticket status/assignment
POST   /api/tickets/:id/attachments  # Upload attachments
DELETE /api/tickets/:id/attachments/:attachmentId  # Remove attachment

// AI Integration
POST   /api/tickets/:id/ai-suggest  # Get AI-suggested response
POST   /api/tickets/:id/ai-feedback # Provide feedback on AI suggestion

// Analytics
GET    /api/tickets/stats        # Ticket statistics (admin only)
GET    /api/tickets/analytics    # Response times, resolution rates
```

### **Ticket Status Flow:**
```
open → in_progress → waiting_user → resolved → closed
  ↓         ↓            ↓           ↓
  ↓    (can reopen)  (can reopen)   ↓
  ↓         ↓            ↓           ↓
  →→→→→→→→→→ resolved ←←←←←←←←←←←←←←
```

### **Permission Model:**
- **Users**: Can create tickets, view own tickets, reply to own tickets
- **Admins**: Can view all tickets, assign tickets, update status, add internal notes
- **Super Admins**: Can delete tickets, access analytics, manage system settings

---

## 🎛️ **Dashboard Integration**

### **User Dashboard: `/dashboard/tickets`**

**Tab Structure:**
- **My Tickets Tab**: 
  - Open tickets (red badge if admin replied)
  - In Progress tickets 
  - Resolved/Closed tickets
- **Create Ticket Tab**: 
  - Category selection
  - Priority selection (hidden for regular users)
  - File attachment support
  - Context integration (auto-fill if coming from specific page)

**Features:**
- Real-time status updates
- Unread message indicators
- Quick reply functionality
- Attachment preview/download
- Ticket search and filtering

### **Admin Dashboard: `/dashboard/admin/tickets`**

**Tab Structure:**
- **Queue Tab**: 
  - New unassigned tickets
  - Overdue tickets (no response in 24h)
  - High priority tickets
  - Auto-refresh every 60 seconds
- **My Assigned Tab**: 
  - Tickets assigned to current admin
  - Response time tracking
  - Status management
- **All Tickets Tab**: 
  - System-wide view with advanced filtering
  - Bulk actions (assign, close, priority change)
  - Export functionality
- **Analytics Tab**: 
  - Response time metrics
  - Resolution rate trends
  - Category distribution
  - Admin performance metrics

**Admin Features:**
- **Assignment System**: Drag-and-drop or dropdown assignment
- **Internal Notes**: Admin-only notes not visible to users
- **Bulk Actions**: Select multiple tickets for status updates
- **Quick Responses**: Saved templates for common responses
- **Escalation Alerts**: Notifications for high-priority or overdue tickets

---

## 🤖 **AI Agent Assistant System**

### **Core Functionality:**
**Help agents craft better responses by analyzing ticket context and suggesting solutions**

### **AI Workflow:**
```
1. Admin opens ticket to respond
2. AI analyzes:
   - Ticket subject and messages
   - User profile and history
   - Similar resolved tickets
   - Relevant help articles
3. AI generates suggested response
4. Admin sees: [✨ AI Suggestion] [Accept] [Edit & Send] [Ignore]
5. Admin choice gets logged for AI learning
```

### **Technical Architecture:**

**AI Service Components:**
- **Vector Database**: Store help articles + successful ticket resolutions as searchable embeddings
- **Context Analyzer**: Extract key information from ticket thread
- **Knowledge Retriever**: Find most relevant help articles and past solutions
- **Response Generator**: Craft contextual response using LLM
- **Confidence Scorer**: Rate how confident AI is in the suggestion

**API Integration:**
```javascript
POST /api/tickets/:id/ai-suggest
{
  "ticket_id": 123,
  "admin_id": 456
}

Response:
{
  "suggested_response": "Hi John, I see you're having trouble with...",
  "confidence": 0.85,
  "referenced_articles": [
    {
      "title": "Payment Processing Issues",
      "url": "/help/article/payment-issues",
      "relevance": 0.92
    }
  ],
  "similar_tickets": [
    {
      "id": 789,
      "subject": "Similar payment issue",
      "resolution": "Issue resolved by updating billing info"
    }
  ],
  "reasoning": "Similar billing issue pattern detected"
}
```

### **Training Data Sources:**
1. **Help Articles** - All help content from articles system
2. **Resolved Tickets** - Successful ticket resolutions and user feedback
3. **User Documentation** - Existing system documentation
4. **Admin Response Patterns** - Learn individual admin communication styles

### **Learning & Improvement:**
- **Feedback Loop**: Track accepted vs rejected suggestions
- **Quality Scoring**: Monitor customer satisfaction after AI-assisted responses
- **Pattern Recognition**: Identify common issues needing help articles
- **Style Adaptation**: Learn admin communication preferences

### **AI Implementation Phases:**

**Phase 1: Knowledge Base Setup** *(Weeks 1-2)*
- Index help articles into vector database
- Create embeddings for searchable content
- Set up similarity search infrastructure
- Basic prompt templates

**Phase 2: Response Generation** *(Weeks 3-4)*
- Integrate with OpenAI/Claude API
- Build ticket analysis pipeline
- Add confidence scoring
- Create admin interface integration

**Phase 3: Learning System** *(Weeks 5-6)*
- Implement feedback tracking
- Add admin choice analytics
- Build continuous learning pipeline
- Style personalization

**Phase 4: Advanced Features** *(Weeks 7-8)*
- Auto-categorization of tickets
- Proactive article suggestions
- Multi-language support
- Performance optimization

---

## 📧 **Email Integration**

### **Email Triggers:**
- **New Ticket Created** → Notify admin team
- **Admin Replies** → Notify ticket creator
- **Ticket Status Changes** → Notify relevant parties
- **Ticket Resolved** → Request user feedback
- **Overdue Tickets** → Escalation alerts to admin team

### **Integration with Existing Email System:**
```javascript
// Leverage existing email infrastructure
// api-service/src/routes/emails.js

// New email templates needed:
- ticket_created_admin.html
- ticket_reply_user.html  
- ticket_status_changed.html
- ticket_resolved_feedback.html
- ticket_overdue_admin.html
```

### **Email Content Examples:**
- **User Notification**: "Your support ticket #123 has been updated"
- **Admin Alert**: "New high-priority ticket requires attention"
- **Resolution Follow-up**: "Was your issue resolved? Please rate your experience"

---

## 🚀 **Development Phases**

### **Phase 1: Help Articles Extension** *(Week 1)*
- [ ] Extend articles database schema
- [ ] Modify ArticleManagement.js for help-specific fields
- [ ] Create help center landing page (/help)
- [ ] Implement user-type filtering
- [ ] Basic help article display

### **Phase 2: Ticket System Core** *(Weeks 2-3)*
- [ ] Create ticket database tables
- [ ] Implement ticket API endpoints
- [ ] Build user ticket dashboard
- [ ] Build admin ticket management
- [ ] Basic email notifications

### **Phase 3: Dashboard Integration** *(Week 4)*
- [ ] Integrate ticket system into user dashboard
- [ ] Build admin ticket interface with tabs
- [ ] Add real-time updates
- [ ] Implement assignment system
- [ ] Add analytics dashboard

### **Phase 4: AI Agent Assistant** *(Weeks 5-6)*
- [ ] Set up vector database for knowledge base
- [ ] Implement AI suggestion API
- [ ] Add AI interface to admin ticket responses
- [ ] Implement feedback tracking
- [ ] Basic learning system

### **Phase 5: Advanced Features** *(Weeks 7-8)*
- [ ] Advanced analytics and reporting
- [ ] Bulk ticket operations
- [ ] Ticket templates and quick responses
- [ ] AI improvement and personalization
- [ ] Performance optimization

### **Phase 6: Polish & Launch** *(Week 9)*
- [ ] User testing and feedback
- [ ] UI/UX improvements
- [ ] Documentation and training
- [ ] Launch preparation
- [ ] Monitoring and alerting setup

---

## 📊 **Success Metrics**

### **User Experience Metrics:**
- **Help Article Usage**: Views, time on page, helpfulness ratings
- **Search Success Rate**: Users finding relevant articles
- **Ticket Resolution Time**: Average time from creation to resolution
- **User Satisfaction**: Post-resolution feedback scores
- **Self-Service Rate**: Issues resolved via help articles vs tickets

### **Admin Efficiency Metrics:**
- **First Response Time**: Time to first admin response
- **AI Suggestion Acceptance**: Rate of AI suggestions used by admins
- **Ticket Volume Trends**: Growth/reduction in ticket creation
- **Admin Response Quality**: User satisfaction with admin responses
- **Knowledge Gap Identification**: Common issues without help articles

### **System Performance Metrics:**
- **Search Response Time**: Help article search performance
- **AI Response Time**: Speed of AI suggestion generation
- **System Uptime**: Availability of help center and ticket system
- **Database Performance**: Query optimization and scaling

---

## 🔧 **Technical Considerations**

### **Performance:**
- **Caching Strategy**: Cache frequently accessed help articles
- **Search Optimization**: Index help articles for fast full-text search
- **AI Response Caching**: Cache common AI suggestions
- **Database Indexing**: Optimize ticket queries with proper indexes

### **Security:**
- **Permission Validation**: Ensure users only see their own tickets
- **Data Privacy**: Anonymize sensitive data sent to AI services
- **File Upload Security**: Validate and scan ticket attachments
- **Admin Access Control**: Proper role-based admin permissions

### **Scalability:**
- **Database Partitioning**: Plan for large ticket volumes
- **AI Service Scaling**: Handle increased AI suggestion requests
- **Real-time Updates**: Efficient WebSocket or polling for ticket updates
- **Email Queue Management**: Handle high volumes of notification emails

---

## 📋 **Future Enhancements**

### **User-Facing Chatbot:**
After agent-assisted system proves successful, extend to user-facing chatbot that can:
- Answer basic questions using help articles
- Collect initial ticket information
- Escalate complex issues to human agents
- Provide 24/7 basic support

### **Advanced Analytics:**
- Predictive ticket volume forecasting
- Automated ticket categorization and routing
- Sentiment analysis of ticket messages
- Knowledge base optimization recommendations

### **Integration Expansions:**
- CRM system integration for customer history
- Third-party helpdesk tool compatibility
- Mobile app support for ticket management
- API access for external integrations

---

## 📝 **Notes for Development**

### **Key Design Decisions:**
1. **Extend vs Create New**: Chose to extend articles system rather than duplicate
2. **Endpoint Structure**: Used `/tickets` and `/tickets/my` pattern for consistency
3. **AI as Assistant**: AI helps agents rather than replacing them
4. **Progressive Enhancement**: Build core features first, add AI later

### **Critical Success Factors:**
1. **User Adoption**: Help articles must be easily discoverable and useful
2. **Admin Efficiency**: Ticket interface must streamline admin workflow
3. **AI Accuracy**: AI suggestions must be relevant and helpful
4. **System Reliability**: Tickets are critical support infrastructure

### **Potential Risks:**
1. **AI Over-dependence**: Ensure agents maintain human judgment
2. **Content Quality**: Help articles need ongoing maintenance
3. **Ticket Volume**: System must handle growth in support requests
4. **User Experience**: Complex features shouldn't confuse users

---

*This document will be updated as development progresses and requirements evolve.* 