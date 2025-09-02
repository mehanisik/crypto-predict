"""CLI commands for the crypto prediction API."""

import click
from flask.cli import with_appcontext
from app import db
from app.models import TrainingSession, ModelConfiguration, Prediction
from app.models.training import TrainingStatus
from app.utils.logger import get_logger

logger = get_logger(__name__)


def register_commands(app):
    """Register CLI commands with the application."""
    
    @app.cli.command('init-db')
    @with_appcontext
    def init_db():
        """Initialize the database."""
        try:
            db.create_all()
            click.echo('Database initialized successfully!')
        except Exception as e:
            click.echo(f'Error initializing database: {e}')
    
    @app.cli.command('seed-db')
    @with_appcontext
    def seed_db():
        """Seed the database with sample data."""
        try:
            # Create sample model configurations
            config1 = ModelConfiguration(
                config_hash='sample_lstm_btc',
                model_type='LSTM',
                ticker='BTC',
                lookback_days=30,
                epochs=100,
                batch_size=32,
                learning_rate=0.001
            )
            
            config2 = ModelConfiguration(
                config_hash='sample_cnn_lstm_eth',
                model_type='CNN-LSTM',
                ticker='ETH',
                lookback_days=30,
                epochs=100,
                batch_size=32,
                learning_rate=0.001
            )
            
            db.session.add(config1)
            db.session.add(config2)
            db.session.commit()
            
            click.echo('Database seeded successfully!')
        except Exception as e:
            click.echo(f'Error seeding database: {e}')
            db.session.rollback()
    
    @app.cli.command('cleanup-sessions')
    @with_appcontext
    def cleanup_sessions():
        """Clean up old training sessions."""
        try:
            # Delete sessions older than 30 days
            from datetime import datetime, timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            old_sessions = TrainingSession.query.filter(
                TrainingSession.created_at < cutoff_date
            ).all()
            
            count = len(old_sessions)
            for session in old_sessions:
                db.session.delete(session)
            
            db.session.commit()
            click.echo(f'Cleaned up {count} old training sessions!')
        except Exception as e:
            click.echo(f'Error cleaning up sessions: {e}')
            db.session.rollback()
    
    @app.cli.command('list-sessions')
    @with_appcontext
    def list_sessions():
        """List all training sessions."""
        try:
            sessions = TrainingSession.query.order_by(TrainingSession.created_at.desc()).all()
            
            if not sessions:
                click.echo('No training sessions found.')
                return
            
            click.echo(f'Found {len(sessions)} training sessions:')
            click.echo('-' * 80)
            
            for session in sessions:
                status_color = 'green' if session.status == TrainingStatus.COMPLETED else 'yellow'
                click.echo(
                    f"ID: {session.id} | "
                    f"Session: {session.session_id} | "
                    f"Ticker: {session.ticker} | "
                    f"Model: {session.model_type} | "
                    f"Status: {click.style(session.status.value, fg=status_color)} | "
                    f"Created: {session.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
                )
        except Exception as e:
            click.echo(f'Error listing sessions: {e}')
    
    @app.cli.command('health-check')
    @with_appcontext
    def health_check():
        """Perform a comprehensive health check."""
        try:
            # Check database connection
            from sqlalchemy import text
            db.session.execute(text('SELECT 1'))
            click.echo(click.style('✅ Database: Healthy', fg='green'))
            
            # Check training sessions
            total_sessions = TrainingSession.query.count()
            active_sessions = TrainingSession.query.filter_by(
                status=TrainingStatus.IN_PROGRESS
            ).count()
            
            click.echo(click.style(f'✅ Training Sessions: {total_sessions} total, {active_sessions} active', fg='green'))
            
            # Check model configurations
            total_configs = ModelConfiguration.query.count()
            click.echo(click.style(f'✅ Model Configurations: {total_configs} total', fg='green'))
            
            # Check predictions
            total_predictions = Prediction.query.count()
            click.echo(click.style(f'✅ Predictions: {total_predictions} total', fg='green'))
            
            click.echo(click.style('\n🎉 All systems are healthy!', fg='green'))
            
        except Exception as e:
            click.echo(click.style(f'❌ Health check failed: {e}', fg='red'))
    
    @app.cli.command('reset-db')
    @with_appcontext
    def reset_db():
        """Reset the database (DANGER: This will delete all data!)."""
        if click.confirm('Are you sure you want to reset the database? This will delete ALL data!'):
            try:
                db.drop_all()
                db.create_all()
                click.echo('Database reset successfully!')
            except Exception as e:
                click.echo(f'Error resetting database: {e}')
    
    logger.info("cli_commands_registered")
