import requests
import json
import sys

# Ensure UTF-8 output encoding for Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://127.0.0.1:8000/api/accounts'

accounts_data = [
    {
        "username": "user_alpha",
        "email": "alpha@example.com",
        "password": "password_alpha_123",
        "display_name": "Alpha Singer"
    },
    {
        "username": "user_beta",
        "email": "beta@example.com",
        "password": "password_beta_456",
        "display_name": "Beta Vocalist"
    },
    {
        "username": "user_gamma",
        "email": "gamma@example.com",
        "password": "password_gamma_789",
        "display_name": "Gamma Rockstar"
    },
    {
        "username": "user_delta",
        "email": "delta@example.com",
        "password": "password_delta_101",
        "display_name": "Delta Diva"
    },
    {
        "username": "user_epsilon",
        "email": "epsilon@example.com",
        "password": "password_epsilon_202",
        "display_name": "Epsilon Legend"
    }
]

def run_tests():
    print("=" * 70)
    print("STARTING AUTOMATED AUTHENTICATION & ACCOUNTS TEST SUITE")
    print("=" * 70)

    results = []

    for i, acc in enumerate(accounts_data, start=1):
        print(f"\n--- [Account {i}/5]: Testing {acc['username']} ({acc['display_name']}) ---")
        
        # 1. Register Account
        reg_res = requests.post(f"{BASE_URL}/register/", json=acc)
        if reg_res.status_code == 400 and 'username' in reg_res.json():
            print(f"[SKIP] User {acc['username']} already exists. Testing login & profile.")
            reg_token = None
        else:
            assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
            reg_data = reg_res.json()
            reg_token = reg_data.get('token')
            print(f"[OK] 1. REGISTER SUCCESS: User ID = {reg_data['user']['id']}, Token = {reg_token[:12]}...")

        # 2. Login via Username
        login_payload = {"username": acc['username'], "password": acc['password']}
        login_res = requests.post(f"{BASE_URL}/login/", json=login_payload)
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        login_data = login_res.json()
        token = login_data['token']
        print(f"[OK] 2. LOGIN (Username) SUCCESS: Token = {token[:12]}...")

        # 3. Login via Email
        email_payload = {"username": acc['email'], "password": acc['password']}
        email_login_res = requests.post(f"{BASE_URL}/login/", json=email_payload)
        assert email_login_res.status_code == 200, f"Email Login failed: {email_login_res.text}"
        print(f"[OK] 3. LOGIN (Email: {acc['email']}) SUCCESS")

        # 4. Fetch Profile via Me Endpoint (/api/accounts/me/)
        headers = {"Authorization": f"Token {token}"}
        me_res = requests.get(f"{BASE_URL}/me/", headers=headers)
        assert me_res.status_code == 200, f"Fetch profile failed: {me_res.text}"
        me_data = me_res.json()
        assert me_data['username'] == acc['username'], "Username mismatch!"
        assert me_data['display_name'] == acc['display_name'], "Display name mismatch!"
        print(f"[OK] 4. PROFILE FETCH SUCCESS: Username = {me_data['username']}, Display Name = '{me_data['display_name']}'")

        # 5. Logout Account
        logout_res = requests.post(f"{BASE_URL}/logout/", headers=headers)
        assert logout_res.status_code == 200, f"Logout failed: {logout_res.text}"
        print(f"[OK] 5. LOGOUT SUCCESS: {logout_res.json()['message']}")

        results.append({
            "account": i,
            "username": acc['username'],
            "display_name": acc['display_name'],
            "email": acc['email'],
            "user_id": me_data['id'],
            "token_sample": f"{token[:12]}...",
            "status": "PASSED"
        })

    # 6. Test Duplicate Registration Prevention
    print("\n--- [Validation Test]: Attempting Duplicate Username Registration ---")
    dup_res = requests.post(f"{BASE_URL}/register/", json=accounts_data[0])
    assert dup_res.status_code == 400, "Duplicate registration should fail!"
    print(f"[OK] 6. DUPLICATE REGISTRATION BLOCKED (Status: {dup_res.status_code}, Msg: {dup_res.json()})")

    # 7. Test Invalid Login Prevention
    print("\n--- [Validation Test]: Attempting Invalid Password Login ---")
    invalid_res = requests.post(f"{BASE_URL}/login/", json={"username": accounts_data[0]['username'], "password": "wrong_password!"})
    assert invalid_res.status_code == 401, "Invalid password login should return 401!"
    print(f"[OK] 7. INVALID CREDENTIALS BLOCKED (Status: {invalid_res.status_code}, Msg: {invalid_res.json()})")

    print("\n" + "=" * 70)
    print("SUMMARY TABLE OF TESTED ACCOUNTS")
    print("=" * 70)
    for r in results:
        print(f"ID: {r['user_id']} | Username: {r['username']:<15} | Display Name: {r['display_name']:<16} | Email: {r['email']:<22} | Status: {r['status']}")
    print("=" * 70)
    print("ALL 5 ACCOUNTS REGISTERED, LOGGED IN, VERIFIED, AND LOGGED OUT SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
