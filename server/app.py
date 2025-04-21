
from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
from models import db, User, Category, Newsletter, UserNewsletter

app = Flask(__name__, static_folder='../dist/public')
CORS(app, supports_credentials=True)

# Config
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SECRET_KEY'] = os.getenv('SESSION_SECRET', 'dev-secret')
db.init_app(app)

# Auth setup
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Serve static files
@app.route('/')
def serve_app():
    return app.send_static_file('index.html')

# Auth Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    if user and check_password_hash(user.password, data['password']):
        login_user(user)
        return jsonify(user.to_dict())
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'})

@app.route('/api/auth/me')
@login_required
def get_current_user():
    return jsonify(current_user.to_dict())

# Newsletter Routes
@app.route('/api/newsletters/featured')
def get_featured_newsletters():
    newsletters = Newsletter.query.filter_by(featured=True).all()
    return jsonify([n.to_dict() for n in newsletters])

@app.route('/api/newsletters/recent')
def get_recent_newsletters():
    newsletters = Newsletter.query.order_by(Newsletter.published_at.desc()).limit(10).all()
    return jsonify([n.to_dict() for n in newsletters])

# Category Routes
@app.route('/api/categories')
def get_categories():
    categories = Category.query.all()
    return jsonify([c.to_dict() for c in categories])

# User Newsletter Routes
@app.route('/api/user/newsletters', methods=['GET'])
@login_required
def get_user_newsletters():
    user_newsletters = UserNewsletter.query.filter_by(user_id=current_user.id).all()
    return jsonify([un.to_dict() for un in user_newsletters])

@app.route('/api/user/newsletters', methods=['POST'])
@login_required
def save_newsletter():
    data = request.json
    user_newsletter = UserNewsletter(
        user_id=current_user.id,
        newsletter_id=data['newsletterId']
    )
    db.session.add(user_newsletter)
    db.session.commit()
    return jsonify(user_newsletter.to_dict())

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)
