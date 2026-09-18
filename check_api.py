import requests
import json

# Get a test auth token
auth_resp = requests.post(
    "https://smady.onrender.com/auth/register",
    json={"email": "testdebug@test.com", "password": "testpass123"}
)

if auth_resp.status_code == 200:
    token = auth_resp.json().get("access_token")
    print(f"Token: {token}\n")
    
    # Get proposals
    props_resp = requests.get(
        "https://smady.onrender.com/api/proposals",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if props_resp.status_code == 200:
        data = props_resp.json()
        # Find proposal 27
        for p in data.get("review_queue", []):
            if p.get("id") == 27:
                print("Proposal 27 from API:")
                print(json.dumps(p, indent=2))
                break
    else:
        print(f"API error: {props_resp.status_code}")
        print(props_resp.text)
else:
    print(f"Auth error: {auth_resp.status_code}")
    print(auth_resp.text)
