# User Management Service - Low Level Design

## 1. Service Overview

### 1.1 Service Details
- **Service Name**: User Management Service
- **Port**: 3001
- **Database**: PostgreSQL
- **Framework**: Node.js with Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **API Style**: RESTful APIs

### 1.2 Core Responsibilities
- User authentication and session management
- Role-based authorization (RBAC)
- User profile management
- Password management and security
- User registration and onboarding
- Role and permission management

## 2. Architecture Design

### 2.1 Service Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        User Management Service                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      API Layer                                   │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │   │
│  │  │ Auth Controller │ │ User Controller │ │ Role Controller │    │   │
│  │  │                 │ │                 │ │                 │    │   │
│  │  │ - Login         │ │ - Profile Mgmt  │ │ - Role Assign   │    │   │
│  │  │ - Register      │ │ - User CRUD     │ │ - Permission    │    │   │
│  │  │ - Logout        │ │ - Search Users  │ │ - RBAC Rules    │    │   │
│  │  │ - Token Verify  │ │ - User Status   │ │ - Role Hierarchy│    │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Business Logic Layer                          │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │   │
│  │  │  Auth Service   │ │  User Service   │ │  Role Service   │    │   │
│  │  │                 │ │                 │ │                 │    │   │
│  │  │ - JWT Generate  │ │ - User Creation │ │ - Role Creation │    │   │
│  │  │ - JWT Validate  │ │ - Profile Update│ │ - Permission    │    │   │
│  │  │ - Password Hash │ │ - User Search   │ │   Assignment    │    │   │
│  │  │ - Session Mgmt  │ │ - Status Change │ │ - Role Validation│    │   │
│  │  │ - Rate Limiting │ │ - Bulk Ops      │ │ - Hierarchy Mgmt│    │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │                Security & Validation                        │   │
│  │  │ - Input Validation    - Password Policy                     │   │
│  │  │ - SQL Injection Guard - Rate Limiting                       │   │
│  │  │ - XSS Protection      - Account Lockout                     │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   Data Access Layer                             │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │   │
│  │  │ User Repository │ │ Role Repository │ │Session Repository│    │   │
│  │  │                 │ │                 │ │                 │    │   │
│  │  │ - User CRUD     │ │ - Role CRUD     │ │ - Session CRUD  │    │   │
│  │  │ - Query Builder │ │ - Permission    │ │ - Token Storage │    │   │
│  │  │ - Relationships │ │   Management    │ │ - Cache Mgmt    │    │   │
│  │  │ - Soft Deletes  │ │ - Role Queries  │ │ - Cleanup Jobs  │    │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Data Storage Layer                         │   │
│  │  ┌─────────────────────────┐      ┌─────────────────────────┐    │   │
│  │  │    PostgreSQL Database  │      │      Redis Cache        │    │   │
│  │  │                         │      │                         │    │   │
│  │  │ - Users Table           │      │ - Active Sessions       │    │   │
│  │  │ - Roles Table           │      │ - JWT Blacklist         │    │   │
│  │  │ - Permissions Table     │      │ - Rate Limit Counters   │    │   │
│  │  │ - User_Roles Table      │      │ - Password Reset Tokens │    │   │
│  │  │ - Role_Permissions      │      │ - Email Verification    │    │   │
│  │  │ - User_Sessions Table   │      │ - Temporary Data        │    │   │
│  │  └─────────────────────────┘      └─────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. Database Design

### 3.1 Entity Relationship Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Database Schema Design                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐         ┌─────────────────┐                       │
│  │     USERS       │         │   USER_ROLES    │                       │
│  │─────────────────│         │─────────────────│                       │
│  │ • id (PK)       │◄────────┤ • user_id (FK)  │                       │
│  │ • email         │         │ • role_id (FK)  │                       │
│  │ • password_hash │         │ • company_id    │                       │
│  │ • first_name    │         │ • assigned_by   │                       │
│  │ • last_name     │         │ • assigned_at   │                       │
│  │ • phone         │         │ • is_active     │                       │
│  │ • profile_image │         └─────────────────┘                       │
│  │ • is_verified   │                   │                               │
│  │ • is_active     │                   │                               │
│  │ • last_login_at │                   │                               │
│  │ • created_at    │                   ▼                               │
│  │ • updated_at    │         ┌─────────────────┐                       │
│  └─────────────────┘         │      ROLES      │                       │
│           │                  │─────────────────│                       │
│           │                  │ • id (PK)       │                       │
│           │                  │ • name          │                       │
│           │                  │ • description   │                       │
│           │                  │ • is_active     │                       │
│           │                  │ • created_at    │                       │
│           │                  │ • updated_at    │                       │
│           │                  └─────────────────┘                       │
│           │                           │                                │
│           │                           │                                │
│           │                           ▼                                │
│           │                  ┌─────────────────┐                       │
│           │                  │ ROLE_PERMISSIONS│                       │
│           │                  │─────────────────│                       │
│           │                  │ • role_id (FK)  │                       │
│           │                  │ • permission_id │                       │
│           │                  │ • created_at    │                       │
│           │                  └─────────────────┘                       │
│           │                           │                                │
│           │                           │                                │
│           │                           ▼                                │
│           │                  ┌─────────────────┐                       │
│           │                  │  PERMISSIONS    │                       │
│           │                  │─────────────────│                       │
│           │                  │ • id (PK)       │                       │
│           │                  │ • name          │                       │
│           │                  │ • resource      │                       │
│           │                  │ • action        │                       │
│           │                  │ • description   │                       │
│           │                  │ • created_at    │                       │
│           │                  └─────────────────┘                       │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ USER_SESSIONS   │                                                   │
│  │─────────────────│                                                   │
│  │ • id (PK)       │                                                   │
│  │ • user_id (FK)  │                                                   │
│  │ • token_hash    │                                                   │
│  │ • device_info   │                                                   │
│  │ • ip_address    │                                                   │
│  │ • user_agent    │                                                   │
│  │ • expires_at    │                                                   │
│  │ • is_active     │                                                   │
│  │ • created_at    │                                                   │
│  │ • last_accessed │                                                   │
│  └─────────────────┘                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4. API Design

### 4.1 API Endpoints Overview
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           API Endpoints                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Authentication APIs                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST /auth/login           - User login                         │   │
│  │ POST /auth/register        - User registration                  │   │
│  │ POST /auth/logout          - User logout                        │   │
│  │ POST /auth/refresh         - Refresh JWT token                  │   │
│  │ POST /auth/forgot-password - Forgot password request           │   │
│  │ POST /auth/reset-password  - Reset password with token         │   │
│  │ POST /auth/verify-email    - Verify email address              │   │
│  │ GET  /auth/me             - Get current user profile           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  User Management APIs                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GET    /users              - List users (with pagination)      │   │
│  │ GET    /users/{id}         - Get user by ID                    │   │
│  │ PUT    /users/{id}         - Update user profile               │   │
│  │ DELETE /users/{id}         - Soft delete user                  │   │
│  │ PUT    /users/{id}/status  - Update user status (active/inactive) │ │
│  │ GET    /users/{id}/roles   - Get user roles                    │   │
│  │ POST   /users/search       - Search users with filters         │   │
│  │ POST   /users/bulk         - Bulk user operations              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Role Management APIs                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ GET    /roles              - List all roles                    │   │
│  │ POST   /roles              - Create new role                   │   │
│  │ GET    /roles/{id}         - Get role details                  │   │
│  │ PUT    /roles/{id}         - Update role                       │   │
│  │ DELETE /roles/{id}         - Delete role                       │   │
│  │ GET    /roles/{id}/permissions - Get role permissions          │   │
│  │ POST   /roles/{id}/permissions - Assign permissions to role    │   │
│  │ DELETE /roles/{id}/permissions/{permissionId} - Remove permission │ │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  User Role Assignment APIs                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POST   /users/{id}/roles   - Assign role to user               │   │
│  │ DELETE /users/{id}/roles/{roleId} - Remove role from user      │   │
│  │ PUT    /users/{id}/roles/{roleId}/status - Update role status  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Role-Based Access Control Matrix
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RBAC Permission Matrix                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│           │ Administrator │  Manager  │ Employee │                      │
│ Resource  │      Role     │   Role    │   Role   │ Description          │
│───────────┼───────────────┼───────────┼──────────┼──────────────────────┤
│           │               │           │          │                      │
│ Users     │               │           │          │                      │
│ • Create  │       ✓       │     ✓     │    ✗     │ Create user accounts │
│ • Read    │       ✓       │     ✓     │    ✓     │ View user profiles   │
│ • Update  │       ✓       │     ✓     │    ✗*    │ Update user info     │
│ • Delete  │       ✓       │     ✗     │    ✗     │ Delete user accounts │
│ • Status  │       ✓       │     ✓     │    ✗     │ Change user status   │
│           │               │           │          │                      │
│ Roles     │               │           │          │                      │
│ • Create  │       ✓       │     ✗     │    ✗     │ Create roles         │
│ • Read    │       ✓       │     ✓     │    ✓     │ View role info       │
│ • Update  │       ✓       │     ✗     │    ✗     │ Modify roles         │
│ • Delete  │       ✓       │     ✗     │    ✗     │ Delete roles         │
│ • Assign  │       ✓       │     ✓     │    ✗     │ Assign roles to users│
│           │               │           │          │                      │
│ Company   │               │           │          │                      │
│ • Manage  │       ✓       │     ✓*    │    ✗     │ Company management   │
│ • Policies│       ✓       │     ✓     │    ✓     │ View company policies│
│ • Reports │       ✓       │     ✓     │    ✗     │ Generate reports     │
│           │               │           │          │                      │
│ System    │               │           │          │                      │
│ • Config  │       ✓       │     ✗     │    ✗     │ System configuration │
│ • Audit   │       ✓       │     ✓     │    ✗     │ View audit logs      │
│ • Monitor │       ✓       │     ✗     │    ✗     │ System monitoring    │
│           │               │           │          │                      │
│ * Limited to own profile or team members                                │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5. Security Architecture

### 5.1 Authentication Flow Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                        │
│  │   Client    │                                                        │
│  │ (Web/Mobile)│                                                        │
│  └─────────────┘                                                        │
│         │                                                               │
│         │ 1. Login Request                                              │
│         │ POST /auth/login                                              │
│         │ { email, password }                                           │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ API Gateway │                                                        │
│  │             │                                                        │
│  └─────────────┘                                                        │
│         │                                                               │
│         │ 2. Forward Request                                            │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │User Mgmt Svc│                                                        │
│  │             │                                                        │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │
│  │ │              Authentication Process                             │ │
│  │ │                                                                 │ │
│  │ │ 3. Validate Input                                               │ │
│  │ │    ├─ Email format validation                                   │ │
│  │ │    ├─ Password strength check                                   │ │
│  │ │    └─ Rate limiting check                                       │ │
│  │ │                                                                 │ │
│  │ │ 4. Database Query                                               │ │
│  │ │    ├─ Find user by email                                        │ │
│  │ │    ├─ Check account status                                      │ │
│  │ │    └─ Verify password hash                                      │ │
│  │ │                                                                 │ │
│  │ │ 5. Generate JWT Token                                           │ │
│  │ │    ├─ Create access token (15 min)                              │ │
│  │ │    ├─ Create refresh token (7 days)                             │ │
│  │ │    └─ Store session in Redis                                    │ │
│  │ │                                                                 │ │
│  │ │ 6. Update Login Tracking                                        │ │
│  │ │    ├─ Update last_login_at                                      │ │
│  │ │    ├─ Log login event                                           │ │
│  │ │    └─ Send notification (optional)                              │ │
│  │ └─────────────────────────────────────────────────────────────────┘ │
│  └─────────────┘                                                        │
│         │                                                               │
│         │ 7. Return Response                                            │
│         │ {                                                             │
│         │   access_token: "jwt...",                                     │
│         │   refresh_token: "jwt...",                                    │
│         │   user: {...},                                               │
│         │   permissions: [...]                                         │
│         │ }                                                             │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │   Client    │                                                        │
│  │ (Web/Mobile)│                                                        │
│  └─────────────┘                                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Authorization Flow Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Authorization Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                        │
│  │   Client    │                                                        │
│  │             │                                                        │
│  └─────────────┘                                                        │
│         │                                                               │
│         │ 1. API Request with JWT                                       │
│         │ Authorization: Bearer jwt_token                               │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │ API Gateway │                                                        │
│  │             │                                                        │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │
│  │ │                JWT Validation                                   │ │
│  │ │                                                                 │ │
│  │ │ 2. Extract & Validate JWT                                       │ │
│  │ │    ├─ Token format validation                                   │ │
│  │ │    ├─ Signature verification                                    │ │
│  │ │    ├─ Expiration check                                          │ │
│  │ │    └─ Blacklist verification                                    │ │
│  │ │                                                                 │ │
│  │ │ 3. Extract User Context                                         │ │
│  │ │    ├─ User ID                                                   │ │
│  │ │    ├─ User roles                                                │ │
│  │ │    ├─ Company context                                           │ │
│  │ │    └─ Session ID                                                │ │
│  │ └─────────────────────────────────────────────────────────────────┘ │
│  └─────────────┘                                                        │
│         │                                                               │
│         │ 4. Forward with User Context                                  │
│         │ Headers: X-User-ID, X-User-Roles, X-Company-ID              │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │Target Service│                                                       │
│  │             │                                                        │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │
│  │ │              Permission Check                                   │ │
│  │ │                                                                 │ │
│  │ │ 5. Authorization Middleware                                     │ │
│  │ │    ├─ Extract required permission                               │ │
│  │ │    ├─ Check user roles                                          │ │
│  │ │    ├─ Validate resource access                                  │ │
│  │ │    └─ Company boundary check                                    │ │
│  │ │                                                                 │ │
│  │ │ 6. Permission Evaluation                                        │ │
│  │ │    ├─ Role-based permissions                                    │ │
│  │ │    ├─ Resource-level permissions                                │ │
│  │ │    ├─ Company context validation                                │ │
│  │ │    └─ Business rule evaluation                                  │ │
│  │ │                                                                 │ │
│  │ │ 7. Access Decision                                              │ │
│  │ │    ├─ ALLOW: Continue to business logic                         │ │
│  │ │    └─ DENY: Return 403 Forbidden                               │ │
│  │ └─────────────────────────────────────────────────────────────────┘ │
│  └─────────────┘                                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 6. Data Flow Design

### 6.1 User Registration Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Registration Flow                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     1. Registration Request                            │
│  │   Client    │────────────────────────────────┐                       │
│  └─────────────┘                                │                       │
│                                                 ▼                       │
│                                        ┌─────────────┐                  │
│                                        │User Mgmt Svc│                  │
│                                        └─────────────┘                  │
│                                                 │                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Registration Processing                             │   │
│  │                                                                 │   │
│  │ 2. Input Validation                                             │   │
│  │    ├─ Email format & uniqueness                                 │   │
│  │    ├─ Password strength validation                              │   │
│  │    ├─ Required field validation                                 │   │
│  │    └─ Rate limiting check                                       │   │
│  │                                                                 │   │
│  │ 3. User Creation                                                │   │
│  │    ├─ Hash password (bcrypt)                                    │   │
│  │    ├─ Generate verification token                               │   │
│  │    ├─ Create user record                                        │   │
│  │    └─ Assign default role                                       │   │
│  │                                                                 │   │
│  │ 4. Post-Registration Actions                                    │   │
│  │    ├─ Send verification email ────┐                             │   │
│  │    ├─ Create user wallet          │                             │   │
│  │    ├─ Initialize preferences      │                             │   │
│  │    └─ Log registration event      │                             │   │
│  └─────────────────────────────────────┼───────────────────────────┘   │
│                                        │                               │
│                                        ▼                               │
│                                ┌─────────────┐                         │
│                                │Notification │                         │
│                                │   Service   │                         │
│                                └─────────────┘                         │
│                                        │                               │
│                                        │ 5. Send Email                 │
│                                        ▼                               │
│                                ┌─────────────┐                         │
│                                │Email Service│                         │
│                                │ (SendGrid)  │                         │
│                                └─────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 7. Integration Design

### 7.1 Inter-Service Communication
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Inter-Service Communication                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐                                                    │
│  │ User Management │                                                    │
│  │    Service      │                                                    │
│  └─────────────────┘                                                    │
│           │                                                             │
│           │ User Events                                                 │
│           │ ┌─ UserCreated                                              │
│           │ ├─ UserUpdated                                              │
│           │ ├─ UserDeactivated                                          │
│           │ ├─ RoleAssigned                                             │
│           │ └─ UserLoggedIn                                             │
│           ▼                                                             │
│  ┌─────────────────┐                                                    │
│  │ Message Queue   │                                                    │
│  │ (RabbitMQ)      │                                                    │
│  └─────────────────┘                                                    │
│           │                                                             │
│           │ Event Distribution                                          │
│           ├──────────────────┬──────────────────┬─────────────────────┐ │
│           ▼                  ▼                  ▼                     ▼ │
│  ┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│  │   Company       ││   Wallet        ││  Notification   ││  Expense        │
│  │   Service       ││   Service       ││   Service       ││   Service       │
│  └─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘
│           │                  │                  │                     │
│           │ Actions          │ Actions          │ Actions             │ Actions
│           │ ├─ Link User     │ ├─ Create Wallet │ ├─ Send Welcome     │ ├─ Setup Profile
│           │ └─ Update Team   │ └─ Initialize    │ ├─ Verification     │ └─ Default Categories
│           │                  │   Budget         │ └─ Role Notification│
│           │                  │                  │                     │
│           ▼                  ▼                  ▼                     ▼
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │                      Event Processing                                   │
│  │                                                                         │
│  │ Synchronous APIs (Direct Service Calls)                                │
│  │ ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ │ GET /auth/validate-token    - Token validation for other services   │ │
│  │ │ GET /users/{id}/permissions - Get user permissions                  │ │
│  │ │ GET /users/{id}/roles       - Get user roles                       │ │
│  │ │ POST /users/bulk-validate   - Validate multiple users              │ │
│  │ └─────────────────────────────────────────────────────────────────────┘ │
│  │                                                                         │
│  │ Asynchronous Events (Message Queue)                                    │
│  │ ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ │ UserCreatedEvent     - Trigger welcome flow                        │ │
│  │ │ UserUpdatedEvent     - Update cached user data                     │ │
│  │ │ UserDeactivatedEvent - Cleanup user resources                      │ │
│  │ │ RoleAssignedEvent    - Update permissions cache                    │ │
│  │ │ LoginEvent           - Security monitoring                         │ │
│  │ └─────────────────────────────────────────────────────────────────────┘ │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 8. Performance Design

### 8.1 Caching Strategy
```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Caching Architecture                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Redis Cache Layers                           │   │
│  │                                                                 │   │
│  │  L1 Cache - Application Level (5 minutes TTL)                  │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • Active user sessions                                      │   │
│  │  │ • JWT token blacklist                                       │   │
│  │  │ • Rate limiting counters                                    │   │
│  │  │ • Recent login attempts                                     │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  L2 Cache - User Data (15 minutes TTL)                         │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • User profiles (frequently accessed)                       │   │
│  │  │ • User permissions                                          │   │
│  │  │ • Role definitions                                          │   │
│  │  │ • Company user lists                                        │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  L3 Cache - Reference Data (1 hour TTL)                        │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • Permission definitions                                    │   │
│  │  │ • System roles                                              │   │
│  │  │ • Configuration settings                                    │   │
│  │  │ • Lookup data                                               │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Cache Strategies                             │   │
│  │                                                                 │   │
│  │  Write-Through Strategy                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ 1. Write to Database                                        │   │
│  │  │ 2. Update Cache                                             │   │
│  │  │ 3. Return Response                                          │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  Cache-Aside Strategy (Read)                                   │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ 1. Check Cache                                              │   │
│  │  │ 2. If miss, query Database                                  │   │
│  │  │ 3. Store in Cache                                           │   │
│  │  │ 4. Return Response                                          │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  Cache Invalidation                                             │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • Event-driven invalidation                                 │   │
│  │  │ • TTL-based expiration                                      │   │
│  │  │ • Manual invalidation APIs                                  │   │
│  │  │ • Pattern-based invalidation                                │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Database Optimization
```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Database Optimization                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Indexing Strategy                           │   │
│  │                                                                 │   │
│  │  Primary Indexes                                                │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • users.id (Primary Key - UUID)                             │   │
│  │  │ • users.email (Unique Index)                                │   │
│  │  │ • roles.id (Primary Key - UUID)                             │   │
│  │  │ • permissions.id (Primary Key - UUID)                       │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  Performance Indexes                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • users.email_password_hash (Composite for login)           │   │
│  │  │ • users.company_id_is_active (Filter active users)          │   │
│  │  │ • users.created_at (Pagination & sorting)                   │   │
│  │  │ • user_roles.user_id_company_id (Role lookups)              │   │
│  │  │ • user_sessions.user_id_is_active (Active sessions)         │   │
│  │  │ • user_sessions.token_hash (Token validation)               │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  Full-Text Search Indexes                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • users.full_name_tsvector (Name search)                    │   │
│  │  │ • users.email_tsvector (Email search)                       │   │
│  │  │ • roles.name_description_tsvector (Role search)             │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  Query Optimization                             │   │
│  │                                                                 │   │
│  │  Connection Pool Configuration                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • Min Connections: 5                                        │   │
│  │  │ • Max Connections: 20                                       │   │
│  │  │ • Connection Timeout: 30 seconds                            │   │
│  │  │ • Idle Timeout: 10 minutes                                  │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  Prepared Statements                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • User login query                                          │   │
│  │  │ • User profile fetch                                        │   │
│  │  │ • Role permission lookup                                    │   │
│  │  │ • Session validation                                        │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  │                                                                 │   │
│  │  Read Replica Strategy                                          │   │
│  │  ┌─────────────────────────────────────────────────────────────│   │
│  │  │ • Master: Write operations                                  │   │
│  │  │ • Replica 1: User profile reads                             │   │
│  │  │ • Replica 2: Role & permission reads                       │   │
│  │  │ • Replica 3: Reporting queries                              │   │
│  │  └─────────────────────────────────────────────────────────────│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```