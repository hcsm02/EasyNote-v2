# EasyNote 后端

Flask + SQLite 后端服务，提供用户认证和任务管理 API。

## 快速开始

### 1. 创建虚拟环境

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置 SECRET_KEY 等
```

### 4. 启动服务

```bash
# 开发模式
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --port 8000
```

### 5. 访问 API 文档

打开浏览器访问: http://localhost:8000/docs

## API 概览

### 认证 API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| PUT | `/api/auth/password` | 修改密码 |

### 任务 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/tasks` | 获取任务列表 |
| POST | `/api/tasks` | 创建任务 |
| PUT | `/api/tasks/{id}` | 更新任务 |
| DELETE | `/api/tasks/{id}` | 删除任务 |
| POST | `/api/tasks/batch` | 批量创建 |
| POST | `/api/tasks/sync` | 同步本地数据 |

## 项目结构

```
backend/
├── main.py          # FastAPI 入口
├── config.py        # 配置管理
├── database.py      # 数据库连接
├── models/          # 数据模型
├── schemas/         # Pydantic 模式
├── routers/         # API 路由
├── utils/           # 工具函数
├── requirements.txt # 依赖
└── .env.example     # 环境变量示例
```
