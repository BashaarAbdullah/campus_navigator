from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
from dotenv import load_dotenv
from config import Config

# Load environment variables
load_dotenv()

# Flask-Login, SQLAlchemy, and Flask-Migrate Setup
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from models import db, User
from flask_migrate import Migrate

# Blueprints
from auth.routes import auth_bp
from main.routes import main_bp
from admin.routes import admin_bp

# PathFinder Utility
from utils.pathfinder import PathFinder

# Create App Factory
login_manager = LoginManager()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure data folder
    app.config['DATA_FOLDER'] = os.path.join(app.root_path, 'data')

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    migrate.init_app(app, db)

    @login_manager.user_loader
    def load_user(user_id):
        print(f"Loading user with ID: {user_id}")  # Added print statement
        return User.query.get(int(user_id))

    # Register blueprints (Correct Order)
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(admin_bp)

    # Initialize PathFinder with app context
    with app.app_context():
        app.pathfinder = PathFinder(app)  # Pass the app instance

        # Create tables
        db.create_all()

    return app

def create_initial_admin():
    with app.app_context():
        if User.query.count() == 0:
            admin = User(email='admin@example.com', is_admin=True, role='admin')
            admin.set_password('admin123')  # Change this in production!
            db.session.add(admin)
            db.session.commit()

# Create and run the app
app = create_app()

# API: Find Path
@app.route('/api/find_path')
def find_path():
    start = request.args.get('start')
    end = request.args.get('end')

    if not start or not end:
        return jsonify({'error': 'Missing start or end parameters'}), 400

    path = app.pathfinder.find_path(start, end)

    if not path:
        return jsonify({'error': 'No path found'}), 404

    return jsonify(path)

# Regular Routes (Removed duplicates)
@app.route('/')
def start():
    return render_template('main/start.html')

if __name__ == '__main__':
    # Run the app
    app.run(debug=True)