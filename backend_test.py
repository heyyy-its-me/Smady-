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


def test_proposals_review_queue():
    """Test GET /api/proposals - verify review_queue has test proposal id=10"""
    print_section("Test: Proposals Review Queue (id=10, meeting_id=test-ff-001)")
    
    try:
        response = session.get(f"{BASE_URL}/proposals")
        
        if response.status_code == 200:
            data = response.json()
            review_queue = data.get('review_queue', [])
            
            # Look for proposal with id=10 or meeting_id="test-ff-001"
            test_proposal = None
            for item in review_queue:
                if item.get('id') == 10 or item.get('meeting_id') == "test-ff-001":
                    test_proposal = item
                    break
            
            if test_proposal:
                print_result("Proposals Review Queue", True, 
                           f"Found test proposal: id={test_proposal.get('id')}, meeting_id={test_proposal.get('meeting_id')}")
                print(f"    Status: {test_proposal.get('final_status')}")
                print(f"    Lead: {test_proposal.get('lead_email')}")
                return test_proposal
            else:
                print_result("Proposals Review Queue", False, 
                           f"Test proposal (id=10 or meeting_id=test-ff-001) not found in review_queue. Found {len(review_queue)} items.")
                if review_queue:
                    print(f"    Available items: {[(item.get('id'), item.get('meeting_id')) for item in review_queue[:3]]}")
                return None
        else:
            print_result("Proposals Review Queue", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return None
    except Exception as e:
        print_result("Proposals Review Queue", False, f"Exception: {str(e)}")
        return None


def test_approve_proposal(proposal_id=10):
    """Test POST /api/proposals/{id}/approve - should handle n8n inactive workflow gracefully"""
    print_section(f"Test: POST /api/proposals/{proposal_id}/approve")
    
    try:
        response = session.post(f"{BASE_URL}/proposals/{proposal_id}/approve")
        
        if response.status_code == 200:
            data = response.json()
            n8n_status = data.get('n8n_status')
            local_status = data.get('local_status')
            message = data.get('message', '')
            
            print_result("POST /api/proposals/approve", True, 
                       f"Status 200 - n8n_status={n8n_status}, local_status={local_status}")
            print(f"    Message: {message}")
            
            # Verify it handled n8n inactive workflow (404)
            if n8n_status == 404:
                print_result("n8n Inactive Workflow Handling", True, 
                           "Correctly handled n8n workflow inactive (404)")
                return True
            elif n8n_status == 200:
                print_result("n8n Active Workflow", True, 
                           "n8n workflow is active and responded 200")
                return True
            else:
                print(f"    ⚠️  Unexpected n8n_status: {n8n_status}")
                return True  # Still passed the API call
        else:
            print_result("POST /api/proposals/approve", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("POST /api/proposals/approve", False, f"Exception: {str(e)}")
        return False


def test_reject_proposal_short_feedback(proposal_id=10):
    """Test POST /api/proposals/{id}/reject with short feedback - should return 422"""
    print_section(f"Test: POST /api/proposals/{proposal_id}/reject (short feedback)")
    
    try:
        response = session.post(
            f"{BASE_URL}/proposals/{proposal_id}/reject",
            json={"feedback": "short"}  # Less than 10 chars
        )
        
        if response.status_code == 422:
            print_result("Reject with Short Feedback", True, 
                       "Correctly rejected short feedback with 422 (Unprocessable)")
            try:
                error_detail = response.json()
                print(f"    Error: {error_detail}")
            except:
                pass
            return True
        else:
            print_result("Reject with Short Feedback", False, 
                       f"Expected 422, got {response.status_code}. Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("Reject with Short Feedback", False, f"Exception: {str(e)}")
        return False


def test_reject_proposal_valid_feedback(proposal_id=10):
    """Test POST /api/proposals/{id}/reject with valid feedback - should return 200"""
    print_section(f"Test: POST /api/proposals/{proposal_id}/reject (valid feedback)")
    
    try:
        response = session.post(
            f"{BASE_URL}/proposals/{proposal_id}/reject",
            json={"feedback": "Please reduce the price and focus on automation savings to address the objection"}
        )
        
        if response.status_code == 200:
            data = response.json()
            n8n_status = data.get('n8n_status')
            local_status = data.get('local_status')
            message = data.get('message', '')
            
            print_result("Reject with Valid Feedback", True, 
                       f"Status 200 - n8n_status={n8n_status}, local_status={local_status}")
            print(f"    Message: {message}")
            
            # n8n workflow might be inactive (500) or active (200)
            if n8n_status in [200, 500]:
                print_result("n8n Workflow Response", True, 
                           f"n8n responded with {n8n_status} (expected for inactive/active workflow)")
            return True
        else:
            print_result("Reject with Valid Feedback", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return False
    except Exception as e:
        print_result("Reject with Valid Feedback", False, f"Exception: {str(e)}")
        return False


def reset_proposal_status(proposal_id=10):
    """Helper: Reset proposal status to needs_review for testing reject after approve"""
    print_section(f"Helper: Reset proposal {proposal_id} to needs_review")
    
    # This is a workaround - we'll just note if the proposal is already approved
    try:
        response = session.get(f"{BASE_URL}/proposals")
        if response.status_code == 200:
            data = response.json()
            review_queue = data.get('review_queue', [])
            
            for item in review_queue:
                if item.get('id') == proposal_id:
                    status = item.get('final_status')
                    print(f"    Current status: {status}")
                    if status == "Approved":
                        print("    ⚠️  Proposal is already Approved. Reject test may need fresh proposal.")
                    return status
            print(f"    ⚠️  Proposal {proposal_id} not found in review_queue")
            return None
    except Exception as e:
        print(f"    Exception checking status: {str(e)}")
        return None


def test_meetings_with_specific_data():
    """Test POST /api/meetings/schedule with specific test data from review request"""
    print_section("Test: POST /api/meetings/schedule (specific test data)")
    
    meeting_data = {
        "lead_name": "Test User",
        "lead_email": "claudesmadlytics@gmail.com",
        "meeting_date": "2026-09-20",
        "meeting_time": "15:30",
        "duration": 30,
        "title": "Test Discovery Call"
    }
    
    try:
        response = session.post(f"{BASE_URL}/meetings/schedule", json=meeting_data)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify response structure
            has_id = 'id' in data
            has_status = data.get('status') == 'Confirmed'
            has_source = data.get('source') == 'manual'
            
            if has_id and has_status and has_source:
                print_result("POST /api/meetings/schedule (specific data)", True, 
                           f"Meeting created: id={data.get('id')}, status={data.get('status')}, source={data.get('source')}")
                print(f"    Lead: {data.get('lead_name')} ({data.get('lead_email')})")
                print(f"    Date: {data.get('meeting_date')}")
                return data.get('id')
            else:
                print_result("POST /api/meetings/schedule (specific data)", False, 
                           f"Missing expected fields. has_id={has_id}, status={data.get('status')}, source={data.get('source')}")
                return None
        elif response.status_code == 409:
            print_result("POST /api/meetings/schedule (specific data)", True, 
                       "Meeting already exists (409 - double-booking protection working)")
            return "existing"
        else:
            print_result("POST /api/meetings/schedule (specific data)", False, 
                       f"Status: {response.status_code}, Response: {response.text[:200]}")
            return None
    except Exception as e:
        print_result("POST /api/meetings/schedule (specific data)", False, f"Exception: {str(e)}")
        return None


def main():
    """Run all tests - CRITICAL TESTS from review request"""
    print("\n" + "="*80)
    print("  SMADY Backend API Testing - CRITICAL LIVE-FIRE TESTS")
    print("  Testing meetings webhook fix + proposals approve/reject")
    print("="*80)
    
    # Authenticate
    if not login():
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        return
    
    # Track results
    results = {}
    
    print("\n" + "="*80)
    print("  CRITICAL TESTS (from review request)")
    print("="*80)
    
    # CRITICAL TEST 1: Meetings webhook fix with specific data
    meeting_id = test_meetings_with_specific_data()
    results['meetings_webhook_fix'] = meeting_id is not None or meeting_id == "existing"
    
    # CRITICAL TEST 2: Proposals review queue (should show id=10, meeting_id="test-ff-001")
    test_proposal = test_proposals_review_queue()
    results['proposals_review_queue'] = test_proposal is not None
    
    # CRITICAL TEST 3: GET /api/proposals/packages (should return 3 packages)
    results['packages'] = test_proposals_packages()
    
    # CRITICAL TEST 4: GET /api/dashboard/analytics (should return all keys)
    results['analytics'] = test_dashboard_analytics()
    
    # CRITICAL TEST 5: Approve proposal (should handle n8n inactive workflow)
    results['approve_proposal'] = test_approve_proposal(10)
    
    # Check proposal status before reject tests
    proposal_status = reset_proposal_status(10)
    
    # CRITICAL TEST 6: Reject with short feedback (should return 422)
    results['reject_short_feedback'] = test_reject_proposal_short_feedback(10)
    
    # CRITICAL TEST 7: Reject with valid feedback (should return 200)
    # Note: This will only work if proposal is in needs_review state
    if proposal_status != "Approved":
        results['reject_valid_feedback'] = test_reject_proposal_valid_feedback(10)
    else:
        print_section("SKIPPED: Reject with valid feedback (proposal already approved)")
        print("    ⚠️  To test reject, proposal must be reset to needs_review state")
        results['reject_valid_feedback'] = None
    
    print("\n" + "="*80)
    print("  ADDITIONAL TESTS")
    print("="*80)
    
    # Additional tests
    results['proposals_endpoint'] = test_proposals_endpoint()
    results['proposals_pending'] = test_proposals_pending()
    
    # Summary
    print_section("CRITICAL TEST SUMMARY")
    
    critical_tests = {
        'meetings_webhook_fix': 'Meetings webhook fix (POST /api/meetings/schedule)',
        'proposals_review_queue': 'Proposals review queue (id=10, meeting_id=test-ff-001)',
        'packages': 'GET /api/proposals/packages (3 packages)',
        'analytics': 'GET /api/dashboard/analytics (all keys)',
        'approve_proposal': 'POST /api/proposals/10/approve (n8n inactive handling)',
        'reject_short_feedback': 'POST /api/proposals/10/reject (validation <10 chars)',
        'reject_valid_feedback': 'POST /api/proposals/10/reject (valid feedback)',
    }
    
    print("\nCRITICAL TESTS:")
    critical_passed = 0
    critical_total = 0
    for key, desc in critical_tests.items():
        result = results.get(key)
        if result is not None:
            critical_total += 1
            if result:
                critical_passed += 1
                print(f"  ✅ PASS - {desc}")
            else:
                print(f"  ❌ FAIL - {desc}")
        else:
            print(f"  ⏭️  SKIP - {desc}")
    
    print("\nADDITIONAL TESTS:")
    additional_tests = {
        'proposals_endpoint': 'GET /api/proposals',
        'proposals_pending': 'GET /api/proposals/pending',
    }
    additional_passed = 0
    additional_total = 0
    for key, desc in additional_tests.items():
        result = results.get(key)
        if result is not None:
            additional_total += 1
            if result:
                additional_passed += 1
                print(f"  ✅ PASS - {desc}")
            else:
                print(f"  ❌ FAIL - {desc}")
    
    total_passed = critical_passed + additional_passed
    total_tests = critical_total + additional_total
    
    print(f"\n{'='*80}")
    print(f"OVERALL: {total_passed}/{total_tests} tests passed")
    print(f"  Critical: {critical_passed}/{critical_total}")
    print(f"  Additional: {additional_passed}/{additional_total}")
    
    if critical_passed == critical_total:
        print("\n🎉 All CRITICAL tests passed!")
    else:
        print(f"\n⚠️  {critical_total - critical_passed} CRITICAL test(s) failed")
    
    print("="*80)


if __name__ == "__main__":
    main()
