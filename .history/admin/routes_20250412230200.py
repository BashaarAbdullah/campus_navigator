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

def get_available_floors(building_name):
    floors = set()
    maps_dir = os.path.join(current_app.static_folder, 'maps')
    if not os.path.exists(maps_dir):
        return ['1']
    
    for filename in os.listdir(maps_dir):
        pattern = f"building_{building_name}_floor(\\d+)\\.svg"
        match = re.match(pattern, filename)
        if match:
            floors.add(match.group(1))
    return sorted(floors, key=int) or ['1']

@admin_bp.route('/map_editor')
@admin_required
def map_editor():
    map_name = request.args.get('map', 'campus')
    floor = request.args.get('floor', '1')

    # Validate floor input
    if not floor.isdigit() or int(floor) < 1:
        floor = '1'

    if map_name.startswith('building_'):
        map_type = 'building'
        building = map_name.split('_')[1]
        map_path = f'maps/building_{building}_floor{floor}.svg'
        data_file = f'building_{building}_floor{floor}_nodes.json'
        available_floors = get_available_floors(building)
        
        # Fallback to floor 1 if SVG doesn't exist
        if not os.path.exists(os.path.join(current_app.static_folder, map_path)):
            floor = '1'
            map_path = f'maps/building_{building}_floor1.svg'
            data_file = f'building_{building}_floor1_nodes.json'
    else:
        map_type = 'campus'
        map_path = 'maps/campus.svg'
        data_file = 'campus_nodes.json'
        available_floors = ['1']

    # Load node data
    data_path = os.path.join(current_app.config['DATA_FOLDER'], data_file)
    nodes = {}
    edges = {}
    
    if os.path.exists(data_path):
        try:
            with open(data_path, 'r') as f:
                data = json.load(f)
                nodes = data.get('nodes', {})
                edges = data.get('edges', {})
        except (json.JSONDecodeError, IOError) as e:
            current_app.logger.error(f"Error loading map data: {str(e)}")

    return render_template('admin/map_editor.html',
                         map_name=map_name,
                         map_type=map_type,
                         map_path=map_path,
                         nodes=nodes,
                         edges=edges,
                         current_floor=floor,
                         available_floors=available_floors)

@admin_bp.route('/api/save_map', methods=['POST'])
@admin_required
def save_map():
    try:
        data = request.get_json()
        if not data or 'map' not in data:
            return jsonify({'error': 'Invalid data'}), 400
            
        map_name = data['map'].strip()
        nodes = data.get('nodes', {})
        edges = data.get('edges', {})
        
        # Validate map name format
        if not re.match(r'^[a-zA-Z0-9_]+$', map_name):
            return jsonify({'error': 'Invalid map name'}), 400
            
        data_file = f'{map_name}_nodes.json'
        data_path = os.path.join(current_app.config['DATA_FOLDER'], data_file)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(data_path), exist_ok=True)
        
        with open(data_path, 'w') as f:
            json.dump({'nodes': nodes, 'edges': edges}, f, indent=2)
            
        return jsonify({'success': True})
    except Exception as e:
        current_app.logger.error(f"Error saving map: {str(e)}")
        return jsonify({'error': str(e)}), 500