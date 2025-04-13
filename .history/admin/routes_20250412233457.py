from flask import Blueprint, render_template, request, jsonify, current_app, redirect, url_for
import os
import json
import re
import shutil
from flask_login import current_user, login_required
from utils.decorators import admin_required

# Initialize admin blueprint with explicit name
admin_bp = Blueprint('admin_bp', __name__, url_prefix='/admin')

@admin_bp.route('/dashboard')
@login_required
@admin_required
def dashboard():
    """Admin dashboard route"""
    return render_template('admin/dashboard.html')

@admin_bp.route('/map_editor')
@login_required
@admin_required
def map_editor():
    """Map editor route with multi-floor support"""
    map_name = request.args.get('map', 'campus')
    floor = request.args.get('floor', '1')

    # Validate floor input
    if not floor.isdigit() or int(floor) < 1:
        floor = '1'

    if map_name.startswith('building_'):
        building = map_name.split('_')[1]
        map_type = 'building'
        
        # Find all available floors
        maps_dir = os.path.join(current_app.static_folder, 'maps')
        available_floors = set(['1'])  # Always include floor 1
        
        if os.path.exists(maps_dir):
            for filename in os.listdir(maps_dir):
                if filename.startswith(f'building_{building}_floor') and filename.endswith('.svg'):
                    try:
                        floor_num = filename.split('_floor')[1].split('.')[0]
                        if floor_num.isdigit():
                            available_floors.add(floor_num)
                    except (IndexError, AttributeError):
                        continue
        
        available_floors = sorted(available_floors, key=int)
        
        # Set map path with fallback
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
@login_required
@admin_required
def save_map():
    """Save map data endpoint"""
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

@admin_bp.route('/add_floor', methods=['POST'])
@login_required
@admin_required
def add_floor():
    """Add new floor endpoint"""
    try:
        data = request.get_json()
        building = data.get('building')
        floor = data.get('floor')
        
        if not building or not floor:
            return jsonify({'error': 'Missing parameters'}), 400
        
        # Create new SVG file (copy from floor 1)
        src_path = os.path.join(
            current_app.static_folder,
            f'maps/building_{building}_floor1.svg'
        )
        dest_path = os.path.join(
            current_app.static_folder,
            f'maps/building_{building}_floor{floor}.svg'
        )
        
        # Create empty data file
        data_path = os.path.join(
            current_app.config['DATA_FOLDER'],
            f'building_{building}_floor{floor}_nodes.json'
        )
        
        # Copy SVG template if source exists
        if os.path.exists(src_path):
            shutil.copyfile(src_path, dest_path)
        else:
            # Create empty SVG if no template exists
            with open(dest_path, 'w') as f:
                f.write('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"></svg>')
        
        # Create empty data file
        with open(data_path, 'w') as f:
            json.dump({'nodes': {}, 'edges': {}}, f)
        
        return jsonify({'success': True, 'new_floor': floor})
    except Exception as e:
        return jsonify({'error': str(e)}), 500