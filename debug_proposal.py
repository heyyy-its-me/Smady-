import json

with open('Proposal.json', encoding='utf-8') as f:
    data = json.load(f)

print("All Postgres nodes:")
for node in data['nodes']:
    node_type = node.get('type', '')
    if 'postgres' in node_type.lower():
        params = node.get('parameters', {})
        query = params.get('query', '')
        print(f"\nNode: {node['name']} ({node['id']})")
        print(f"Query: {query[:300]}")
        
        # Check if using userId
        options = params.get('options', {})
        if options:
            print(f"Options: {options}")
        
        params_list = params.get('queryParameters', {})
        if params_list:
            print(f"Params: {params_list}")
