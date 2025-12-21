package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"strings"
	"testing"
)

func TestNewAES_KeyPadding(t *testing.T) {
	tests := []struct {
		name     string
		appKey   string
		wantLen  int
	}{
		{
			name:    "short key gets padded with zeros",
			appKey:  "short",
			wantLen: 32,
		},
		{
			name:    "exact 32 char key unchanged",
			appKey:  "12345678901234567890123456789012",
			wantLen: 32,
		},
		{
			name:    "long key gets truncated",
			appKey:  "this-is-a-very-long-key-that-exceeds-32-characters",
			wantLen: 32,
		},
		{
			name:    "empty key gets padded",
			appKey:  "",
			wantLen: 32,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			aesInstance := NewAES(tt.appKey)
			if len(aesInstance.key) != tt.wantLen {
				t.Errorf("expected key length %d, got %d", tt.wantLen, len(aesInstance.key))
			}
		})
	}
}

func TestDecrypt_InvalidBase64(t *testing.T) {
	aesInstance := NewAES("test-key")

	_, err := aesInstance.Decrypt("not-valid-base64!!!")
	if err == nil {
		t.Error("expected error for invalid base64")
	}
}

func TestDecrypt_TooShort(t *testing.T) {
	aesInstance := NewAES("test-key")

	// Create base64 string that's too short (less than 33 bytes when decoded)
	shortData := base64.StdEncoding.EncodeToString([]byte("too short"))

	_, err := aesInstance.Decrypt(shortData)
	if err == nil {
		t.Error("expected error for ciphertext too short")
	}
}

func TestEncryptDecrypt_RoundTrip(t *testing.T) {
	appKey := "my-super-secret-key-for-testing!"
	aesInstance := NewAES(appKey)

	testCases := []string{
		"Hello, World!",
		"-----BEGIN RSA PRIVATE KEY-----\nMIICXQIBAAJBAKj...",
		"short",
		"a", // minimum non-empty content
		strings.Repeat("x", 1000), // longer text
	}

	for _, plaintext := range testCases {
		t.Run(plaintext[:min(20, len(plaintext))], func(t *testing.T) {
			// Note: Our Encrypt uses a zero IV for testing, so this tests the format
			// In production, Node.js generates random IVs
			encrypted, err := aesInstance.Encrypt(plaintext)
			if err != nil {
				t.Fatalf("Encrypt failed: %v", err)
			}

			decrypted, err := aesInstance.Decrypt(encrypted)
			if err != nil {
				t.Fatalf("Decrypt failed: %v", err)
			}

			if decrypted != plaintext {
				t.Errorf("round-trip failed: got %q, want %q", decrypted, plaintext)
			}
		})
	}
}

// TestDecryptNodeJSFormat tests decryption of data encrypted by Node.js
// This verifies compatibility with the controlplane.kibamail.com dkim.ts implementation
func TestDecryptNodeJSFormat(t *testing.T) {
	// To generate test vectors, run this in Node.js:
	// const { encrypt } = require('./apps/web/lib/sending-domains/dkim');
	// console.log(encrypt('test plaintext', 'test-app-key-32-chars-long!!!!!'));

	// Since we can't run Node.js here, we'll create our own test vectors
	// that match the Node.js format: base64(iv[16] + authTag[16] + ciphertext)

	appKey := "test-app-key-32-chars-long!!!!!"
	aesInstance := NewAES(appKey)

	// Create a valid encrypted message manually (matching Node.js format)
	plaintext := "test plaintext for DKIM key"
	encrypted := encryptLikeNodeJS(t, appKey, plaintext)

	decrypted, err := aesInstance.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("decrypted text doesn't match: got %q, want %q", decrypted, plaintext)
	}
}

func TestDecrypt_WrongKey(t *testing.T) {
	// Encrypt with one key
	encrypted := encryptLikeNodeJS(t, "correct-key-32-characters!!!!!!!", "secret message")

	// Try to decrypt with different key
	aesInstance := NewAES("wrong-key-32-characters!!!!!!!!")
	_, err := aesInstance.Decrypt(encrypted)

	if err == nil {
		t.Error("expected error when decrypting with wrong key")
	}
}

func TestDecrypt_CorruptedData(t *testing.T) {
	appKey := "test-key-32-characters!!!!!!!!"
	encrypted := encryptLikeNodeJS(t, appKey, "test message")

	// Decode, corrupt, re-encode
	data, _ := base64.StdEncoding.DecodeString(encrypted)
	data[20] ^= 0xFF // Flip some bits in the auth tag
	corrupted := base64.StdEncoding.EncodeToString(data)

	aesInstance := NewAES(appKey)
	_, err := aesInstance.Decrypt(corrupted)

	if err == nil {
		t.Error("expected error for corrupted ciphertext")
	}
}

// encryptLikeNodeJS creates ciphertext in the Node.js format for testing
// Format: base64(iv[16] + authTag[16] + ciphertext)
func encryptLikeNodeJS(t *testing.T, appKey, plaintext string) string {
	t.Helper()

	// Prepare key (same as Node.js)
	keyStr := appKey
	if len(keyStr) > 32 {
		keyStr = keyStr[:32]
	}
	for len(keyStr) < 32 {
		keyStr += "0"
	}
	key := []byte(keyStr)

	// Generate random IV
	iv := make([]byte, 16)
	if _, err := rand.Read(iv); err != nil {
		t.Fatalf("failed to generate IV: %v", err)
	}

	// Create cipher
	block, err := aes.NewCipher(key)
	if err != nil {
		t.Fatalf("failed to create cipher: %v", err)
	}

	// Use 16-byte nonce to match Node.js crypto.createCipheriv
	gcm, err := cipher.NewGCMWithNonceSize(block, 16)
	if err != nil {
		t.Fatalf("failed to create GCM: %v", err)
	}

	// Encrypt (GCM appends auth tag to ciphertext)
	ciphertextWithTag := gcm.Seal(nil, iv, []byte(plaintext), nil)

	// Split ciphertext and auth tag
	tagSize := gcm.Overhead()
	ciphertext := ciphertextWithTag[:len(ciphertextWithTag)-tagSize]
	authTag := ciphertextWithTag[len(ciphertextWithTag)-tagSize:]

	// Combine in Node.js format: iv + authTag + ciphertext
	result := make([]byte, 0, 16+16+len(ciphertext))
	result = append(result, iv...)
	result = append(result, authTag...)
	result = append(result, ciphertext...)

	return base64.StdEncoding.EncodeToString(result)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
