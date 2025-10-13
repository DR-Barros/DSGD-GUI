import pytest
import auth.hashing as hashing

def test_hash_password():
    password = "mysecretpassword"
    hashed = hashing.hash_password(password)
    assert hashed != password  
    assert not hashing.verify_password("wrongpassword", hashed) 
    
def test_verify_password():
    password = "mysecretpassword"
    hashed = hashing.hash_password(password)
    assert hashed != password  
    assert hashing.verify_password(password, hashed)
    assert not hashing.verify_password("wrongpassword", hashed)  
    
def test_two_equal_passwords():
    password = "anotherpassword"
    hashed1 = hashing.hash_password(password)
    hashed2 = hashing.hash_password(password)
    assert hashed1 != hashed2  # Los hashes deben ser diferentes debido al salting
    assert hashing.verify_password(password, hashed1)
    assert hashing.verify_password(password, hashed2)
    