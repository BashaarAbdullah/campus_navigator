from flask import Blueprint, render_template, request, flash, redirect, url_for
from flask_login import login_required, current_user  # Import current_user
from models import db, Feedback
from utils.pathfinder import PathFinder

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def start():
    return render_template('main/start.html')

@main_bp.route('/home')
@login_required
def home():
    print(f"Current user: {current_user}")  # Debugging print
    print(f"Is authenticated: {current_user.is_authenticated}")  # Debugging print
    return render_template('main/home.html')

@main_bp.route('/map')
@login_required
def map():
    print(f"Current user: {current_user}")  # Debugging print
    print(f"Is authenticated: {current_user.is_authenticated}")  # Debugging print
    return render_template('main/map.html')

@main_bp.route('/submit_contact', methods=['POST'])
def submit_contact():
    name = request.form.get('name')
    email = request.form.get('email')
    message = request.form.get('message')

    flash('Thank you for your feedback! We will get back to you soon.', 'success')
    return redirect(url_for('main.home') + '#contact')

@main_bp.route('/waypoint')
@login_required
def waypoint():
    print(f"Current user: {current_user}")  # Debugging print
    print(f"Is authenticated: {current_user.is_authenticated}")  # Debugging print
    campus_nodes = [
        {"id": "main_gate", "name": "Main Gate"},
        {"id": "library", "name": "Library"},
        {"id": "cafeteria", "name": "Cafeteria"},
        {"id": "building_A_entrance", "name": "Building A Entrance"},
        {"id": "building_B_entrance", "name": "Building B Entrance"},
        {"id": "building_C_entrance", "name": "Building C Entrance"},
        {"id": "building_AD_entrance", "name": "Admin Building Entrance"}
    ]

    buildings = ['A', 'B', 'C', 'AD']

    return render_template('main/waypoint.html',
                           campus_nodes=campus_nodes,
                           buildings=buildings)