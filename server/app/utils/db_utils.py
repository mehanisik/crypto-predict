"""Database utility functions for Neon PostgreSQL operations."""

from typing import Any, Dict, List, Optional, Type
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from contextlib import contextmanager
from app import db
from app.utils.logger import get_logger

logger = get_logger(__name__)


@contextmanager
def get_db_session():
    session = db.session
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error("database_session_error", error=str(e), exc_info=True)
        raise
    finally:
        session.close()


def execute_query(query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    try:
        with get_db_session() as session:
            result = session.execute(text(query), params or {})
            return [dict(row._mapping) for row in result]
    except SQLAlchemyError as e:
        logger.error("query_execution_failed", 
                    query=query,
                    params=params,
                    error=str(e))
        raise


def bulk_insert(model_class: Type, data_list: List[Dict[str, Any]]) -> bool:
    try:
        with get_db_session() as session:
            objects = [model_class(**data) for data in data_list]
            session.bulk_save_objects(objects)
            session.commit()
            
            logger.info("bulk_insert_successful", 
                       model=model_class.__name__,
                       count=len(data_list))
            return True
            
    except (SQLAlchemyError, IntegrityError) as e:
        logger.error("bulk_insert_failed", 
                    model=model_class.__name__,
                    error=str(e))
        return False


def safe_delete(model_class: Type, filter_criteria: Dict[str, Any]) -> int:
    try:
        with get_db_session() as session:
            query = session.query(model_class)
            
            for key, value in filter_criteria.items():
                if hasattr(model_class, key):
                    query = query.filter(getattr(model_class, key) == value)
            
            count = query.count()
            query.delete()
            session.commit()
            
            logger.info("safe_delete_successful", 
                       model=model_class.__name__,
                       criteria=filter_criteria,
                       deleted_count=count)
            
            return count
            
    except SQLAlchemyError as e:
        logger.error("safe_delete_failed", 
                    model=model_class.__name__,
                    criteria=filter_criteria,
                    error=str(e))
        return 0


def get_connection_info() -> Dict[str, Any]:
    try:
        engine = db.engine
        url = engine.url
        
        return {
            'host': url.host,
            'port': url.port,
            'database': url.database,
            'username': url.username,
            'driver': url.drivername,
            'pool_size': engine.pool.size(),
            'pool_checked_in': engine.pool.checkedin(),
            'pool_checked_out': engine.pool.checkedout()
        }
    except Exception as e:
        logger.error("connection_info_failed", error=str(e))
        return {}


def check_database_health() -> Dict[str, Any]:
    try:
        with get_db_session() as session:
            result = session.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()
            
            if row and row.health_check == 1:
                return {
                    'status': 'healthy',
                    'message': 'Database connection successful',
                    'timestamp': 'now'
                }
            else:
                return {
                    'status': 'unhealthy',
                    'message': 'Database query failed',
                    'timestamp': 'now'
                }
                
    except Exception as e:
        return {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}',
            'timestamp': 'now'
        }


def optimize_table(table_name: str) -> bool:
    try:
        query = f"VACUUM ANALYZE {table_name}"
        execute_query(query)
        
        logger.info("table_optimization_successful", table_name=table_name)
        return True
        
    except SQLAlchemyError as e:
        logger.error("table_optimization_failed", 
                    table_name=table_name,
                    error=str(e))
        return False


def get_table_stats(table_name: str) -> Optional[Dict[str, Any]]:
    try:
        query = """
        SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation,
            most_common_vals,
            most_common_freqs
        FROM pg_stats 
        WHERE tablename = :table_name
        """
        
        results = execute_query(query, {'table_name': table_name})
        
        if results:
            return {
                'table_name': table_name,
                'columns': len(results),
                'stats': results
            }
        return None
        
    except SQLAlchemyError as e:
        logger.error("table_stats_failed", 
                    table_name=table_name,
                    error=str(e))
        return None


def create_index_if_not_exists(table_name: str, column_name: str, 
                              index_name: Optional[str] = None) -> bool:
    try:
        if not index_name:
            index_name = f"idx_{table_name}_{column_name}"
        
        check_query = """
        SELECT 1 FROM pg_indexes 
        WHERE indexname = :index_name
        """
        
        existing = execute_query(check_query, {'index_name': index_name})
        
        if existing:
            logger.info("index_already_exists", 
                       table_name=table_name,
                       column_name=column_name,
                       index_name=index_name)
            return True
        
        create_query = f"""
        CREATE INDEX {index_name} 
        ON {table_name} ({column_name})
        """
        
        execute_query(create_query)
        
        logger.info("index_created", 
                   table_name=table_name,
                   column_name=column_name,
                   index_name=index_name)
        return True
        
    except SQLAlchemyError as e:
        logger.error("index_creation_failed", 
                    table_name=table_name,
                    column_name=column_name,
                    error=str(e))
        return False
