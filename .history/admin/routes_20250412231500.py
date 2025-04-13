# admin/routes.py
from flask import Blueprint, render_template, request, jsonify, current_app, redirect, url_for
import os
import json
from functools import wraps
from flask_login import current_user, login_required
from utils.decorators import admin_required # import the decorator

# --- Add url_prefix here ---
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Route for /admin/
@admin_bp.route('/')
@admin_required
def dashboard():
    # The print statements from the decorator should run *before* this executes
    print("Executing admin dashboard view", flush=True)
    return render_template('admin/dashboard.html')

# Route for /admin/map_editor
@admin_bp.route('/map_editor')
@admin_required
def map_editor():
    # The print statements from the decorator should run *before* this executes
    print("Executing map_editor view", flush=True)
    map_name = request.args.get('map', 'campus')

    # Determine map type and path
    if map_name.startswith('building_'):
        map_type = 'building'
        building = map_name.split('_')[1]
        map_path = f'maps/building_{building}_floor1.svg'  # Default to floor 1
    else:
        map_type = 'campus'
        map_path = 'maps/campus.svg'

    # Load existing node data
    data_file = f'{map_name}_nodes.json'
    data_path = os.path.join(current_app.config['DATA_FOLDER'], data_file)

    if os.path.exists(data_path):
        with open(data_path, 'r') as f:
            data = json.load(f)
        nodes = data.get('nodes', {})
        edges = data.get('edges', {})
    else:
        nodes = {}
        edges = {}

    return render_template('admin/map_editor.html',
                           map_name=map_name.capitalize(),
                           map_type=map_type,
                           map_path=map_path,
                           nodes=nodes,
                           edges=edges)

# Route for /admin/api/save_map
@admin_bp.route('/api/save_map', methods=['POST'])
@admin_required
def save_map():
    print("Executing save_map API endpoint", flush=True) # Added for debug
    data = request.get_json()
    map_name = data.get('map')
    nodes = data.get('nodes', {})
    edges = data.get('edges', {})

    if not map_name:
        return jsonify({'error': 'Missing map name'}), 400

    # Save to JSON file
    data_file = f'{map_name}_nodes.json'
    data_path = os.path.join(current_app.config['DATA_FOLDER'], data_file)

    try:
        with open(data_path, 'w') as f:
            json.dump({'nodes': nodes, 'edges': edges}, f, indent=2)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route for /admin/save_map_data
@admin_bp.route('/save_map_data', methods=['POST'])
@admin_required
def save_map_data():
    print("Executing save_map_data endpoint", flush=True) # Added for debug
    map_name = request.form.get('map_name')
    nodes = request.form.get('nodes')
    edges = request.form.get('edges')

    if not all([map_name, nodes, edges]):
        return jsonify({'error': 'Missing data'}), 400

    filename = f"{map_name}_nodes.json"
    filepath = os.path.join(current_app.config['DATA_FOLDER'], filename)

    try:
        data = {
            'nodes': json.loads(nodes),
            'edges': json.loads(edges)
        }
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500