from flask import Blueprint, render_template, request, jsonify, current_app
import os
import json
import re
from flask_login import current_user, login_required
from utils.decorators import admin_required

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/')
@admin_required
def dashboard():
    return render_template('admin/dashboard.html')

@admin_bp.route('/map_editor')
@admin_required
def map_editor():
    map_name = request.args.get('map', 'campus')
    floor = request.args.get('floor', '1')

    # Validate floor input
    if not floor.isdigit():
        floor = '1'

    if map_name.startswith('building_'):
        map_type = 'building'
        building = map_name.split('_')[1]
        map_path = f'maps/building_{building}_floor{floor}.svg'
        data_file = f'{map_name}_floor{floor}_nodes.json'
        available_floors = get_available_floors(current_app.config['DATA_FOLDER'], map_name)
        
        # Fallback to floor 1 if SVG doesn't exist
        if not os.path.exists(os.path.join(current_app.static_folder, map_path)):
            map_path = f'maps/building_{building}_floor1.svg'
    else:
        map_type = 'campus'
        map_path = 'maps/campus.svg'
        data_file = f'{map_name}_nodes.json'
        available_floors = ['1']

    # Load or initialize node data
    data_path = os.path.join(current_app.config['DATA_FOLDER'], data_file)
    nodes = {}
    edges = {}

    if os.path.exists(data_path):
        try:
            with open(data_path, 'r') as f:
                data = json.load(f)
                nodes = data.get('nodes', {})
                edges = data.get('edges', {})
        except (json.JSONDecodeError, IOError):
            pass

    return render_template('admin/map_editor.html',
                         map_name=map_name.capitalize(),
                         map_type=map_type,
                         map_path=map_path,
                         nodes=nodes,
                         edges=edges,
                         current_floor=floor,
                         available_floors=available_floors)

def get_available_floors(data_folder, map_name):
    floors = set(['1'])  # Always include floor 1 as default
    try:
        for filename in os.listdir(data_folder):
            if filename.startswith(f"{map_name}_floor") and filename.endswith("_nodes.json"):
                match = re.match(r'.*_floor(\d+)_.*', filename)
                if match and match.group(1).isdigit():
                    floors.add(match.group(1))
    except (FileNotFoundError, PermissionError):
        pass
    return sorted(floors, key=int)

@admin_bp.route('/api/save_map', methods=['POST'])
@admin_required
def save_map():
    data = request.get_json()
    map_name = data.get('map', '').strip()
    nodes = data.get('nodes', {})
    edges = data.get('edges', {})

    if not map_name or not re.match(r'^[a-zA-Z0-9_\-]+$', map_name):
        return jsonify({'error': 'Invalid map name'}), 400

    data_file = f'{map_name}_nodes.json'
    data_path = os.path.join(current_app.config['DATA_FOLDER'], data_file)

    try:
        with open(data_path, 'w') as f:
            json.dump({'nodes': nodes, 'edges': edges}, f, indent=2)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500