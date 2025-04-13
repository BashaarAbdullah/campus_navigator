import json
import heapq
import os
from pathlib import Path

class PathFinder:
    def __init__(self, app):
        self.app = app
        self.data_folder = Path(app.config['DATA_FOLDER'])
        self._ensure_data_folder_exists()
        self._load_or_initialize_graphs()

    def _ensure_data_folder_exists(self):
        """Create data folder if it doesn't exist"""
        self.data_folder.mkdir(exist_ok=True)

    def _load_or_initialize_graphs(self):
        """Load existing graphs or create empty ones"""
        self.campus_graph = self._load_or_create_graph('campus_nodes.json', {
            'nodes': {},
            'edges': {}
        })

        empty_building = {'nodes': {}, 'edges': {}}
        self.building_graphs = {
            'A': self._load_or_create_graph('building_A_nodes.json', empty_building),
            'B': self._load_or_create_graph('building_B_nodes.json', empty_building),
            'C': self._load_or_create_graph('building_C_nodes.json', empty_building),
            'AD': self._load_or_create_graph('building_AD_nodes.json', empty_building)
        }

    def _load_or_create_graph(self, filename, default_data):
        """Load a graph file or create it with default data"""
        filepath = self.data_folder / filename
        try:
            if not filepath.exists():
                with open(filepath, 'w') as f:
                    json.dump(default_data, f, indent=2)
                return default_data

            if os.path.getsize(filepath) == 0: #Check if the file is empty
                return default_data

            with open(filepath, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading {filename}: {e}")
            return default_data

    def dijkstra(self, graph, start, end):
        """Implementation of Dijkstra's algorithm for shortest path"""
        if not graph or start not in graph.get('nodes', {}) or end not in graph.get('nodes', {}):
            return None

        distances = {node: float('infinity') for node in graph['nodes']}
        predecessors = {node: None for node in graph['nodes']}
        distances[start] = 0

        priority_queue = [(0, start)]

        while priority_queue:
            current_distance, current_node = heapq.heappop(priority_queue)
            if current_node == end:
                break
            if current_distance > distances[current_node]:
                continue
            for neighbor, weight in graph['edges'].get(current_node, {}).items():
                distance = current_distance + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    predecessors[neighbor] = current_node
                    heapq.heappush(priority_queue, (distance, neighbor))

        path = []
        current = end
        while current is not None:
            path.insert(0, current)
            current = predecessors.get(current, None)

        if not path or path[0] != start:
            return None

        return {
            'path': path,
            'distance': distances[end],
            'nodes': [graph['nodes'][node] for node in path]
        }

    def find_path(self, start, end):
        """Find path between two points"""
        if not start or not end:
            return None

        # Check campus graph first
        if start in self.campus_graph.get('nodes', {}) and end in self.campus_graph.get('nodes', {}):
            return self.dijkstra(self.campus_graph, start, end)

        # Check building graphs
        for building, graph in self.building_graphs.items():
            building_prefix = f"building_{building}_"
            if start.startswith(building_prefix) and end.startswith(building_prefix):
                if start in graph.get('nodes', {}) and end in graph.get('nodes', {}):
                    return self.dijkstra(graph, start, end)

        # Check building entrances
        if "_entrance" in start and "_entrance" in end:
            return self.dijkstra(self.campus_graph, start, end)

        return None