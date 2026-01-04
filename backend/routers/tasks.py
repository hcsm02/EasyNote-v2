"""
任务相关 API 路由
处理任务的 CRUD 操作
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from utils.deps import get_db, get_current_user
from models.user import User
from models.task import Task
from schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskBatchCreate,
    TaskSync,
    TaskResponse,
    TaskListResponse,
    TaskBatchResponse,
)
from schemas.user import MessageResponse
import uuid

# 创建路由器
router = APIRouter(prefix="/tasks", tags=["任务"])


@router.get("", response_model=TaskListResponse)
async def get_tasks(
    timeframe: Optional[str] = Query(None, description="时间分类过滤"),
    archived: Optional[bool] = Query(None, description="归档状态过滤"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的所有任务
    
    可选过滤条件：
    - timeframe: 时间分类 (history, today, future2, later)
    - archived: 是否归档
    """
    query = db.query(Task).filter(Task.user_id == current_user.id)
    
    # 应用过滤条件
    if timeframe is not None:
        query = query.filter(Task.timeframe == timeframe)
    if archived is not None:
        query = query.filter(Task.archived == archived)
    
    # 按创建时间倒序排列
    tasks = query.order_by(Task.created_at.desc()).all()
    
    return TaskListResponse(
        tasks=[TaskResponse.model_validate(task) for task in tasks],
        total=len(tasks)
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    创建新任务
    """
    new_task = Task(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        text=task_data.text,
        details=task_data.details,
        start_date=task_data.start_date,
        due_date=task_data.due_date,
        timeframe=task_data.timeframe.value if task_data.timeframe else None,
        archived=task_data.archived
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return TaskResponse.model_validate(new_task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取单个任务详情
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    更新任务
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    # 更新字段（只更新提供的字段）
    if task_data.text is not None:
        task.text = task_data.text
    if task_data.details is not None:
        task.details = task_data.details
    if task_data.start_date is not None:
        task.start_date = task_data.start_date
    if task_data.due_date is not None:
        task.due_date = task_data.due_date
    if task_data.timeframe is not None:
        task.timeframe = task_data.timeframe.value
    if task_data.archived is not None:
        task.archived = task_data.archived
    
    db.commit()
    db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    删除任务
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    db.delete(task)
    db.commit()
    
    return MessageResponse(message="任务已删除")


@router.post("/batch", response_model=TaskBatchResponse, status_code=status.HTTP_201_CREATED)
async def create_tasks_batch(
    batch_data: TaskBatchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    批量创建任务
    """
    task_ids = []
    
    for task_data in batch_data.tasks:
        new_task = Task(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            text=task_data.text,
            details=task_data.details,
            start_date=task_data.start_date,
            due_date=task_data.due_date,
            timeframe=task_data.timeframe.value if task_data.timeframe else None,
            archived=task_data.archived
        )
        db.add(new_task)
        task_ids.append(new_task.id)
    
    db.commit()
    
    return TaskBatchResponse(
        success=True,
        created_count=len(task_ids),
        task_ids=task_ids
    )


@router.post("/sync", response_model=TaskBatchResponse, status_code=status.HTTP_201_CREATED)
async def sync_tasks(
    sync_data: TaskSync,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    同步本地任务到云端
    
    用于用户登录后上传本地数据
    
    合并策略：
    - merge: 合并本地和云端数据（保留两边的任务）
    - replace: 用本地数据替换云端数据
    """
    task_ids = []
    
    # 如果是替换模式，先删除现有任务
    if sync_data.merge_strategy == "replace":
        db.query(Task).filter(Task.user_id == current_user.id).delete()
    
    print(f"🔄 [Sync] User {current_user.id} syncing {len(sync_data.tasks)} tasks. Strategy: {sync_data.merge_strategy}")
    
    # 添加新任务
    for task_data in sync_data.tasks:
        # 去重逻辑：如果提供了 ID 且已存在，或者内容（文本+日期）完全一致且属于该用户，则跳过
        existing_task = None
        
        # 1. 优先通过 ID 检查
        if task_data.id:
            existing_task = db.query(Task).filter(
                Task.id == task_data.id,
                Task.user_id == current_user.id
            ).first()
            
        # 2. 如果 ID 不匹配且是 merge 模式，通过内容检查
        if not existing_task and sync_data.merge_strategy == "merge":
            existing_task = db.query(Task).filter(
                Task.user_id == current_user.id,
                Task.text == task_data.text,
                Task.due_date == task_data.due_date,
                Task.archived == task_data.archived
            ).first()
            
        if existing_task:
            # 如果已存在，记录 ID 但不新建
            task_ids.append(existing_task.id)
            print(f"⏭️ [Sync] Task already exists: {task_data.text[:20]}...")
            continue
            
        # 创建新任务
        new_task = Task(
            id=task_data.id if task_data.id and len(task_data.id) == 36 else str(uuid.uuid4()),
            user_id=current_user.id,
            text=task_data.text,
            details=task_data.details,
            start_date=task_data.start_date,
            due_date=task_data.due_date,
            timeframe=task_data.timeframe.value if task_data.timeframe else None,
            archived=task_data.archived
        )
        db.add(new_task)
        task_ids.append(new_task.id)
        print(f"✨ [Sync] Created/Merged task: {task_data.text[:20]}...")
    
    db.commit()
    print(f"✅ [Sync] Successfully committed {len(task_ids)} tasks for user {current_user.id}")
    
    return TaskBatchResponse(
        success=True,
        created_count=len(task_ids),
        task_ids=task_ids
    )


@router.delete("", response_model=MessageResponse)
async def delete_all_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    删除当前用户的所有任务
    """
    deleted_count = db.query(Task).filter(Task.user_id == current_user.id).delete()
    db.commit()
    
    return MessageResponse(message=f"已删除 {deleted_count} 个任务")
