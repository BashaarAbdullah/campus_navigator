from flask import Blueprint, render_template, request, jsonify, current_app
import os
import json
import re
import shutil
from flask_login import current_user, login_required
from utils.decorators import admin_required

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/admin')

@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    return render_template('admin/dashboard.html')

@admin_bp.route('/map_editor')
@login_required
@admin_required
def map_editor():
    map_name = request.args.get('map', 'campus')
    floor = request.args.get('floor', '1')

    # Validate and sanitize floor input
    try:
        floor = str(max(1, int(floor)))
    except ValueError:
        floor = '1'

    if map_name.startswith('building_'):
        building = map_name.split('_')[1]
        map_type = 'building'
        
        # Get available floors
        available_floors = self.get_available_floors(building)
        
        # Verify map file exists
        map_path = f'maps/building_{building}_floor{floor}.svg'
        if not os.path.exists(os.path.join(current_app.static_folder, map_path)):
            floor = '1'
            map_path = f'maps/building_{building}_floor1.svg'
            
        data_file = f'building_{building}_floor{floor}_nodes.json'
    else:
        map_type = 'campus'
        map_path = 'maps/campus.svg'
        data_file = 'campus_nodes.json'
        available_floors = ['1']

    # Load node data
    data_path = os.path.join(current_app.config['DATA_FOLDER'], data_file)
    nodes, edges = self.load_map_data(data_path)

    return render_template('admin/map_editor.html',
                         map_name=map_name,
                         map_type=map_type,
                         map_path=map_path,
                         nodes=nodes,
                         edges=edges,
                         current_floor=floor,
                         available_floors=available_floors)

def get_available_floors(building):
    """Get all valid floors for a building"""
    floors = set()
    maps_dir = os.path.join(current_app.static_folder, 'maps')
    
    try:
        for filename in os.listdir(maps_dir):
            if filename.startswith(f'building_{building}_floor') and filename.endswith('.svg'):
                parts = filename.split('_floor')[1].split('.')
                if parts[0].isdigit():
                    floors.add(parts[0])
    except FileNotFoundError:
        pass
    
    return sorted(floors.union({'1'}), key=int)  # Always include floor 1

def load_map_data(data_path):
    """Load map data with error handling"""
    try:
        with open(data_path, 'r') as f:
            data = json.load(f)
            return data.get('nodes', {}), data.get('edges', {})
    except (FileNotFoundError, json.JSONDecodeError):
        return {}, {}

@admin_bp.route('/api/save_map', methods=['POST'])
@login_required
@admin_required
def save_map():
    data = request.get_json()
    map_name = data.get('map', '').strip()
    
    if not re.match(r'^[\w-]+$', map_name):
        return jsonify({'error': 'Invalid map name'}), 400

    data_path = os.path.join(current_app.config['DATA_FOLDER'], f'{map_name}_nodes.json')
    
    try:
        with open(data_path, 'w') as f:
            json.dump({
                'nodes': data.get('nodes', {}),
                'edges': data.get('edges', {})
            }, f, indent=2)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/add_floor', methods=['POST'])
@login_required
@admin_required
def add_floor():
    data = request.get_json()
    building = data.get('building')
    floor = data.get('floor')
    
    if not building or not floor:
        return jsonify({'error': 'Missing parameters'}), 400

    try:
        # Create new SVG file
        src_path = os.path.join(current_app.static_folder, f'maps/building_{building}_floor1.svg')
        dest_path = os.path.join(current_app.static_folder, f'maps/building_{building}_floor{floor}.svg')
        
        if os.path.exists(src_path):
            shutil.copyfile(src_path, dest_path)
        else:
            with open(dest_path, 'w') as f:
                f.write('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"></svg>')

        # Create new data file
        data_path = os.path.join(current_app.config['DATA_FOLDER'], f'building_{building}_floor{floor}_nodes.json')
        with open(data_path, 'w') as f:
            json.dump({'nodes': {}, 'edges': {}}, f)
            
        return jsonify({'success': True, 'new_floor': floor})
    except Exception as e:
        return jsonify({'error': str(e)}), 500