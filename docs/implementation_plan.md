# EasyNote 后端 + 用户认证系统实现计划

## 概述

将现有的纯前端 EasyNote 应用改造为支持**双模式存储**的完整应用：
- **游客模式**：无需注册，数据存储在本地设备（IndexedDB）
- **登录模式**：邮箱注册登录，数据同步到云端服务器

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EasyNote 双模式架构                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                       前端 (React + Vite)                        │   │
│   │  ┌─────────────────┐    ┌─────────────────────────────────────┐ │   │
│   │  │   AuthContext   │    │         DataService                 │ │   │
│   │  │                 │    │  ┌─────────────────────────────────┐│ │   │
│   │  │  • 用户状态     │───►│  │    存储策略判断                  ││ │   │
│   │  │  • 登录/登出    │    │  │                                  ││ │   │
│   │  │  • Token 管理   │    │  │  isLoggedIn?                    ││ │   │
│   │  └─────────────────┘    │  │     ├─ Yes → API 调用           ││ │   │
│   │                         │  │     └─ No  → IndexedDB          ││ │   │
│   │                         │  └─────────────────────────────────┘│ │   │
│   │                         └─────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                        │                                │
│                    ┌───────────────────┴───────────────────┐            │
│                    │                                       │            │
│                    ▼                                       ▼            │
│   ┌─────────────────────────────┐       ┌─────────────────────────────┐│
│   │   游客模式 (本地存储)        │       │   登录模式 (云端同步)        ││
│   │                             │       │                             ││
│   │   IndexedDB                 │       │   FastAPI 后端              ││
│   │   └─ tasks 表               │       │   └─ /api/auth/*            ││
│   │   └─ settings 表            │       │   └─ /api/tasks/*           ││
│   │                             │       │           │                 ││
│   │   特点:                     │       │           ▼                 ││
│   │   • 无需网络                │       │   SQLite / PostgreSQL       ││
│   │   • 数据仅在当前设备        │       │   └─ users 表               ││
│   │   • 清除浏览器数据=丢失     │       │   └─ tasks 表               ││
│   └─────────────────────────────┘       └─────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 用户流程

### 登录与存储选择

```
用户打开应用
    │
    ▼
检查登录状态 ─────────────────────────────┐
    │                                     │
    │ 未登录                              │ 已登录
    ▼                                     ▼
游客模式                              登录模式
    │                                     │
    ▼                                     ▼
从 IndexedDB 加载数据              从 API 加载数据
    │                                     │
    └─────────────┬───────────────────────┘
                  ▼
              正常使用应用
                  │
                  ▼
              用户操作
            ┌─────┴─────┐
            │           │
   添加/修改任务     点击登录
            │           │
            ▼           ▼
     当前模式?     登录/注册页面
     ┌───┴───┐          │
     │       │          ▼
   游客   登录      验证成功
     │       │          │
     ▼       ▼          ▼
 IndexedDB  API    本地有数据?
                   ┌───┴───┐
                   │       │
                  是      否
                   │       │
                   ▼       ▼
            提示上传?   直接进入
            ┌───┴───┐
            │       │
           是      否
            │       │
            ▼       ▼
        合并上传  忽略本地
```

---

## 项目结构

### 前端改造

```
frontend/                          # 前端项目根目录
├── src/
│   ├── App.tsx                    # [修改] 添加路由和 AuthProvider
│   ├── main.tsx                   # [修改] 入口文件
│   │
│   ├── pages/                     # [新增] 页面组件
│   │   ├── LoginPage.tsx          # 登录页面
│   │   ├── RegisterPage.tsx       # 注册页面
│   │   └── HomePage.tsx           # 主页（现有内容迁移）
│   │
│   ├── contexts/                  # [新增] React Context
│   │   └── AuthContext.tsx        # 用户认证状态管理
│   │
│   ├── services/                  # [新增] 服务层
│   │   ├── api.ts                 # HTTP API 调用封装
│   │   ├── storage.ts             # IndexedDB 本地存储
│   │   └── dataService.ts         # 统一数据服务（自动判断存储位置）
│   │
│   ├── components/                # 现有组件
│   │   ├── ...
│   │   └── UserMenu.tsx           # [新增] 用户菜单（登录/登出）
│   │
│   └── types.ts                   # [修改] 添加用户相关类型
│
├── package.json                   # [修改] 添加依赖
└── vite.config.ts                 # [修改] 配置代理
```

### 后端结构

```
backend/                           # [新增] 后端项目
├── main.py                        # FastAPI 入口
├── config.py                      # 配置管理
├── database.py                    # 数据库连接
│
├── routers/                       # API 路由
│   ├── auth.py                    # 认证相关 API
│   └── tasks.py                   # 任务 CRUD API
│
├── models/                        # 数据模型
│   ├── user.py                    # 用户模型
│   └── task.py                    # 任务模型
│
├── schemas/                       # Pydantic 模式
│   ├── user.py                    # 用户请求/响应模式
│   └── task.py                    # 任务请求/响应模式
│
├── services/                      # 业务逻辑
│   ├── auth_service.py            # 认证服务
│   └── task_service.py            # 任务服务
│
├── utils/                         # 工具函数
│   ├── security.py                # 密码哈希、JWT
│   └── deps.py                    # 依赖注入
│
├── requirements.txt               # Python 依赖
├── .env.example                   # 环境变量示例
└── README.md                      # 后端文档
```

---

## API 设计

### 认证 API

| 方法 | 路径 | 描述 | 请求体 |
|------|------|------|--------|
| POST | `/api/auth/register` | 用户注册 | `{email, password, nickname?}` |
| POST | `/api/auth/login` | 用户登录 | `{email, password}` |
| POST | `/api/auth/logout` | 用户登出 | - |
| GET | `/api/auth/me` | 获取当前用户信息 | - |
| PUT | `/api/auth/password` | 修改密码 | `{old_password, new_password}` |

### 任务 API

| 方法 | 路径 | 描述 | 请求体 |
|------|------|------|--------|
| GET | `/api/tasks` | 获取所有任务 | - |
| POST | `/api/tasks` | 创建任务 | `{text, details?, dueDate, timeframe}` |
| PUT | `/api/tasks/{id}` | 更新任务 | `{text?, details?, dueDate?, ...}` |
| DELETE | `/api/tasks/{id}` | 删除任务 | - |
| POST | `/api/tasks/batch` | 批量创建任务 | `{tasks: [...]}` |
| POST | `/api/tasks/sync` | 同步本地数据（登录后上传） | `{tasks: [...]}` |

---

## 数据库设计

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,           -- UUID
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,           -- UUID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    details TEXT,
    due_date TEXT,                 -- YYYY-MM-DD
    timeframe TEXT,                -- 'history', 'today', 'future2', 'later'
    archived BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_timeframe ON tasks(user_id, timeframe);
```

---

## 实现步骤

### Phase 1: 后端搭建 (2-3小时)

- [ ] 1.1 创建后端项目结构
- [ ] 1.2 配置数据库连接 (SQLite)
- [ ] 1.3 实现用户模型和认证 API
- [ ] 1.4 实现任务 CRUD API
- [ ] 1.5 JWT 中间件和权限验证

### Phase 2: 前端本地存储 (1-2小时)

- [ ] 2.1 创建 IndexedDB 存储服务
- [ ] 2.2 将现有 useState 数据持久化到 IndexedDB
- [ ] 2.3 应用启动时从 IndexedDB 加载数据

### Phase 3: 前端认证 UI (2-3小时)

- [ ] 3.1 创建 AuthContext 用户状态管理
- [ ] 3.2 创建登录/注册页面
- [ ] 3.3 添加用户菜单组件
- [ ] 3.4 实现路由保护

### Phase 4: 数据服务统一层 (1-2小时)

- [ ] 4.1 创建统一的 DataService
- [ ] 4.2 根据登录状态自动选择存储位置
- [ ] 4.3 实现登录后本地数据上传提示

### Phase 5: 测试和文档 (1小时)

- [ ] 5.1 本地运行测试
- [ ] 5.2 更新 README 文档

---

## 技术依赖

### 后端 (requirements.txt)

```
fastapi==0.115.0
uvicorn==0.30.0
sqlalchemy==2.0.0
pydantic==2.0.0
python-jose[cryptography]==3.3.0   # JWT
passlib[bcrypt]==1.7.4              # 密码哈希
python-dotenv==1.0.0
python-multipart==0.0.9
```

### 前端新增依赖

```json
{
  "dependencies": {
    "idb": "^8.0.0",              // IndexedDB 封装库
    "react-router-dom": "^6.0.0"  // 路由（如需多页面）
  }
}
```

---

## 验证计划

### 自动测试

1. 后端 API 测试
   ```bash
   cd backend
   pytest tests/
   ```

2. 前端构建验证
   ```bash
   cd frontend
   npm run build
   ```

### 手动测试

1. **游客模式测试**
   - 打开应用，不登录
   - 添加几个任务
   - 刷新页面，确认数据还在
   - 清除浏览器数据，确认数据丢失

2. **登录模式测试**
   - 注册新用户
   - 添加任务
   - 登出再登录，确认数据还在
   - 换一个浏览器登录，确认数据同步

3. **数据迁移测试**
   - 以游客模式添加数据
   - 注册/登录
   - 确认提示"是否上传本地数据到云端"
   - 上传后确认数据合并成功

---

## 注意事项

### 安全考虑
- JWT Token 存储在 localStorage，需要设置合理的过期时间
- 后端密码使用 bcrypt 哈希存储
- API 需要 HTTPS（生产环境）

### 本地存储限制
- IndexedDB 存储空间有限（通常 50MB+）
- 用户清除浏览器数据会丢失本地数据
- 建议在 UI 上明确提示用户这一点

### 后续扩展
- 可以添加"导出数据"功能，即使不注册也能备份
- 未来可接入微信/手机号登录
