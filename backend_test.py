#!/usr/bin/env python3
"""
Backend API Testing for SMADY
Tests the new endpoints implemented in the master build prompt.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://smady-outreach-1.preview.emergentagent.com/api"
TEST_EMAIL = "test@smady.ai"
TEST_PASSWORD = "Test123456!"

# Global session
session = requests.Session()
auth_token = None


def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def print_result(test_name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"    {details}")


def login():
    """Authenticate and get token"""
    global auth_token
    print_section("Authentication")
    
    try:
        response = session.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            # Token is set in cookies, extract it
            auth_token = session.cookies.get("access_token")
            
            if auth_token:
                # Also set in Authorization header for API calls
                session.headers.update({"Authorization": f"Bearer {auth_token}"})
                print_result("Login", True, f"User: {data.get('email')}, ID: {data.get('id')}")
                return True
            else:
                print_result("Login", False, "No access_token cookie found in response")
                return False
        else:
            print_result("Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_result("Login", False, f"Exception: {str(e)}")
        return False


def test_proposals_endpoint():
    """Test GET /api/proposals - should return review_queue and app_proposals"""
    print_section("Test: GET /api/proposals")
    
    try:
        response = session.get(f"{BASE_URL}/proposals")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check structure
            has_review_queue = "review_queue" in data
            has_app_proposals = "app_proposals" in data
            
            if has_review_queue and has_app_proposals:
                print_result("GET /api/proposals - Structure", True, 
                           f"review_queue: {len(data['review_queue'])} items, app_proposals: {len(data['app_proposals'])} items")
                
                # For new user, both should be empty or have data
                print(f"    Review Queue Items: {len(data['review_queue'])}")
                print(f"    App Proposals Items: {len(data['app_proposals'])}")
                
                return True
            else:
                print_result("GET /api/proposals - Structure", False, 
                           f"Missing keys. Has review_queue: {has_review_queue}, Has app_proposals: {has_app_proposals}")
                return False
        else:
            print_result("GET /api/proposals", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("GET /api/proposals", False, f"Exception: {str(e)}")
        return False


def test_proposals_packages():
    """Test GET /api/proposals/packages - should return 3 active pricing packages"""
    print_section("Test: GET /api/proposals/packages")
    
    try:
        response = session.get(f"{BASE_URL}/proposals/packages")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list):
                print_result("GET /api/proposals/packages - Type", True, f"Returned {len(data)} packages")
                
                # Check for expected packages
                package_names = [p.get("package_name") for p in data]
                print(f"    Package names: {package_names}")
                
                expected_packages = ["Enterprise", "Starter", "Growth"]
                has_all_packages = all(name in package_names for name in expected_packages)
                
                if has_all_packages:
                    print_result("GET /api/proposals/packages - Content", True, 
                               "All expected packages present (Enterprise, Starter, Growth)")
                    
                    # Print package details
                    for pkg in data:
                        print(f"    - {pkg.get('package_name')}: ${pkg.get('floor_price')}-${pkg.get('ceiling_price')}")
                    
                    return True
                else:
                    print_result("GET /api/proposals/packages - Content", False, 
                               f"Missing expected packages. Found: {package_names}")
                    return False
            else:
                print_result("GET /api/proposals/packages", False, f"Expected list, got {type(data)}")
                return False
        else:
            print_result("GET /api/proposals/packages", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("GET /api/proposals/packages", False, f"Exception: {str(e)}")
        return False


def test_dashboard_analytics():
    """Test GET /api/dashboard/analytics - should return funnel, outreach data, etc."""
    print_section("Test: GET /api/dashboard/analytics")
    
    try:
        response = session.get(f"{BASE_URL}/dashboard/analytics")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for expected keys
            expected_keys = [
                "funnel", "outreach_over_time", "leads_by_country", 
                "leads_by_industry", "meeting_conversion", 
                "campaign_performance", "proposal_quality"
            ]
            
            missing_keys = [key for key in expected_keys if key not in data]
            
            if not missing_keys:
                print_result("GET /api/dashboard/analytics - Structure", True, 
                           "All expected keys present")
                
                # Print summary of data
                print(f"    Funnel stages: {len(data.get('funnel', []))}")
                print(f"    Outreach time periods: {len(data.get('outreach_over_time', []))}")
                print(f"    Countries: {len(data.get('leads_by_country', []))}")
                print(f"    Industries: {len(data.get('leads_by_industry', []))}")
                print(f"    Meeting conversion rate: {data.get('meeting_conversion', {}).get('percent', 0)}%")
                print(f"    Campaigns: {len(data.get('campaign_performance', []))}")
                
                proposal_quality = data.get('proposal_quality', {})
                print(f"    Proposal quality - Needs review: {proposal_quality.get('needs_review_count', 0)}, "
                      f"Sent: {proposal_quality.get('sent_count', 0)}")
                
                return True
            else:
                print_result("GET /api/dashboard/analytics - Structure", False, 
                           f"Missing keys: {missing_keys}")
                return False
        else:
            print_result("GET /api/dashboard/analytics", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("GET /api/dashboard/analytics", False, f"Exception: {str(e)}")
        return False


def test_meetings_schedule():
    """Test POST /api/meetings/schedule with new fields: meeting_time, duration, title"""
    print_section("Test: POST /api/meetings/schedule")
    
    # Test data with new fields
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    meeting_data = {
        "lead_name": "Test Lead",
        "lead_email": "testlead@example.com",
        "meeting_date": tomorrow,
        "meeting_time": "14:30",  # New field: HH:mm format
        "duration": 45,            # New field: minutes
        "title": "Product Demo",   # New field: meeting title
        "notes": "Testing new meeting fields"
    }
    
    try:
        response = session.post(f"{BASE_URL}/meetings/schedule", json=meeting_data)
        
        if response.status_code == 200:
            data = response.json()
            print_result("POST /api/meetings/schedule", True, 
                       f"Meeting created: {data.get('id')}")
            print(f"    Lead: {data.get('lead_name')}")
            print(f"    Date: {data.get('meeting_date')}")
            print(f"    Status: {data.get('status')}")
            return data.get('id')  # Return meeting ID for cleanup
        else:
            print_result("POST /api/meetings/schedule", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return None
    except Exception as e:
        print_result("POST /api/meetings/schedule", False, f"Exception: {str(e)}")
        return None


def test_double_booking_protection(first_meeting_id):
    """Test double-booking protection - should return 409 on conflict"""
    print_section("Test: Double-booking Protection")
    
    if not first_meeting_id:
        print_result("Double-booking Protection", False, "No first meeting to test against")
        return False
    
    # Try to book at the same time
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    conflicting_meeting = {
        "lead_name": "Another Lead",
        "lead_email": "another@example.com",
        "meeting_date": tomorrow,
        "meeting_time": "14:30",  # Same time as first meeting
        "duration": 30,
        "title": "Conflicting Meeting"
    }
    
    try:
        response = session.post(f"{BASE_URL}/meetings/schedule", json=conflicting_meeting)
        
        if response.status_code == 409:
            print_result("Double-booking Protection", True, 
                       "Correctly rejected conflicting meeting with 409")
            print(f"    Response: {response.json().get('detail', 'No detail')}")
            return True
        elif response.status_code == 200:
            print_result("Double-booking Protection", False, 
                       "FAILED: Allowed double-booking (should return 409)")
            return False
        else:
            print_result("Double-booking Protection", False, 
                       f"Unexpected status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("Double-booking Protection", False, f"Exception: {str(e)}")
        return False


def test_proposals_pending():
    """Test GET /api/proposals/pending - backward compatibility endpoint"""
    print_section("Test: GET /api/proposals/pending")
    
    try:
        response = session.get(f"{BASE_URL}/proposals/pending")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list):
                print_result("GET /api/proposals/pending", True, 
                           f"Returned {len(data)} pending proposals")
                return True
            else:
                print_result("GET /api/proposals/pending", False, 
                           f"Expected list, got {type(data)}")
                return False
        else:
            print_result("GET /api/proposals/pending", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("GET /api/proposals/pending", False, f"Exception: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  SMADY Backend API Testing")
    print("  Testing new endpoints from master build prompt")
    print("="*80)
    
    # Authenticate
    if not login():
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        return
    
    # Track results
    results = {}
    
    # Test 1: GET /api/proposals
    results['proposals'] = test_proposals_endpoint()
    
    # Test 2: GET /api/proposals/packages
    results['packages'] = test_proposals_packages()
    
    # Test 3: GET /api/dashboard/analytics
    results['analytics'] = test_dashboard_analytics()
    
    # Test 4: POST /api/meetings/schedule
    meeting_id = test_meetings_schedule()
    results['meetings_schedule'] = meeting_id is not None
    
    # Test 5: Double-booking protection
    results['double_booking'] = test_double_booking_protection(meeting_id)
    
    # Test 6: GET /api/proposals/pending
    results['proposals_pending'] = test_proposals_pending()
    
    # Summary
    print_section("Test Summary")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"Tests Passed: {passed}/{total}")
    print("\nDetailed Results:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} - {test_name}")
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    main()
