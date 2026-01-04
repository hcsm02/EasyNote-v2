import sqlite3
import os
from config import get_settings

def migrate():
    settings = get_settings()
    # 提取数据库文件路径 (兼容 sqlite:///./test.db 格式)
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    
    if not os.path.exists(db_path):
        print(f"📭 数据库文件不存在，跳过迁移: {db_path}")
        return

    print(f"🔍 正在检查数据库迁移: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 获取 tasks 表的现有列
        cursor.execute("PRAGMA table_info(tasks)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # 定义需要检查的列及其类型
        required_columns = {
            "start_date": "TEXT",
            "due_date": "TEXT",
            "timeframe": "TEXT",
            "details": "TEXT",
            "archived": "BOOLEAN DEFAULT 0"
        }

        for col_name, col_type in required_columns.items():
            if col_name not in columns:
                print(f"🏗️ 正在补全缺失的列: {col_name} ({col_type})")
                try:
                    cursor.execute(f"ALTER TABLE tasks ADD COLUMN {col_name} {col_type}")
                except Exception as e:
                    print(f"⚠️ 添加列 {col_name} 失败 (可能已存在): {e}")

        conn.commit()
        print("✅ 数据库迁移检查完成")
    except Exception as e:
        print(f"❌ 迁移过程中发生错误: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
