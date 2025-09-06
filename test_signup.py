#!/usr/bin/env python3
"""
Test script for the backend signup endpoint
"""

import requests
import json

def test_signup():
    """Test the signup endpoint"""
    
    url = "http://localhost:8000/api/auth/signup"
    data = {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    }
    
    print("Testing signup endpoint...")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response Body: {json.dumps(response_data, indent=2)}")
        except json.JSONDecodeError:
            print(f"Response Body (raw): {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
        return False
        
    return response.status_code < 400

def test_health():
    """Test the health endpoint"""
    
    url = "http://localhost:8000/health"
    
    print("\n" + "="*50)
    print("Testing health endpoint...")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"Health Status: {response_data.get('status')}")
            print(f"Services: {response_data.get('services')}")
        else:
            print(f"Health check failed: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
        return False
        
    return response.status_code == 200

if __name__ == "__main__":
    print("Backend API Test Script")
    print("="*50)
    
    # Test health first
    health_ok = test_health()
    
    if health_ok:
        # Test signup
        signup_ok = test_signup()
        
        if signup_ok:
            print("\n✅ All tests passed!")
        else:
            print("\n❌ Signup test failed!")
    else:
        print("\n❌ Health check failed - backend may not be running!")
