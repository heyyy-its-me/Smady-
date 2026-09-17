import json

files_to_check = [
    'ProposalGeneration.json',
    'ManualProposal-AddOn.json',
    'N8N_NODES_COPYPASTE.json',
    'N8N_RAW_JSON_NODES.json'
]

for filename in files_to_check:
    print(f"\n=== {filename} ===")
    try:
        with open(filename, encoding='utf-8') as f:
            data = json.load(f)
        
        for node in data.get('nodes', []):
            node_type = node.get('type', '')
            if 'postgres' in node_type.lower():
                params = node.get('parameters', {})
                query = params.get('query', '')
                print(f"\nNode: {node['name']}")
                print(f"Query: {query[:500]}")
                opts = params.get('options', {})
                if opts:
                    print(f"Options: {opts}")
    except Exception as e:
        print(f"Error reading {filename}: {e}")
