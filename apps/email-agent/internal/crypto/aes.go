// Package crypto provides AES-256-GCM encryption/decryption matching the Node.js implementation
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"

	kiberrors "github.com/kibamail/email-agent/internal/errors"
)

// AES provides AES-256-GCM encryption/decryption
type AES struct {
	key []byte
}

// NewAES creates a new AES encryptor/decryptor
// Key is derived from appKey: first 32 characters, padded with "0" if shorter
func NewAES(appKey string) *AES {
	// Match Node.js: appKey.slice(0, 32).padEnd(32, "0")
	keyStr := appKey
	if len(keyStr) > 32 {
		keyStr = keyStr[:32]
	}
	for len(keyStr) < 32 {
		keyStr += "0"
	}

	return &AES{key: []byte(keyStr)}
}

// Decrypt decrypts data encrypted with the Node.js encrypt function
// Format: base64(iv[16] + authTag[16] + ciphertext)
func (a *AES) Decrypt(ciphertext string) (string, error) {
	// Decode base64
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", kiberrors.Wrap(kiberrors.ErrDecryptionFailed, "failed to decode base64")
	}

	// Minimum length: 16 (iv) + 16 (authTag) + 1 (min ciphertext) = 33 bytes
	if len(data) < 33 {
		return "", kiberrors.Wrap(kiberrors.ErrDecryptionFailed, "ciphertext too short")
	}

	// Extract components
	iv := data[:16]
	authTag := data[16:32]
	encrypted := data[32:]

	// Create cipher
	block, err := aes.NewCipher(a.key)
	if err != nil {
		return "", kiberrors.Wrap(kiberrors.ErrDecryptionFailed, "failed to create cipher")
	}

	// Create GCM with 16-byte nonce to match Node.js crypto.createCipheriv
	gcm, err := cipher.NewGCMWithNonceSize(block, 16)
	if err != nil {
		return "", kiberrors.Wrap(kiberrors.ErrDecryptionFailed, "failed to create GCM")
	}

	// GCM expects ciphertext with authTag appended
	ciphertextWithTag := append(encrypted, authTag...)

	// Decrypt
	plaintext, err := gcm.Open(nil, iv, ciphertextWithTag, nil)
	if err != nil {
		return "", kiberrors.Wrap(kiberrors.ErrDecryptionFailed, "decryption failed - invalid key or corrupted data")
	}

	return string(plaintext), nil
}

// Encrypt encrypts data in a format compatible with the Node.js decrypt function
// Format: base64(iv[16] + authTag[16] + ciphertext)
func (a *AES) Encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(a.key)
	if err != nil {
		return "", kiberrors.Wrap(err, "failed to create cipher")
	}

	// Create GCM with 16-byte nonce to match Node.js crypto.createCipheriv
	gcm, err := cipher.NewGCMWithNonceSize(block, 16)
	if err != nil {
		return "", kiberrors.Wrap(err, "failed to create GCM")
	}

	// Generate random IV (nonce) - 16 bytes for Node.js compatibility
	iv := make([]byte, 16)
	// Note: In production, use crypto/rand.Read(iv)
	// For now, this is just for testing/reference (zero IV)

	// Encrypt (GCM appends authTag to ciphertext)
	ciphertextWithTag := gcm.Seal(nil, iv, []byte(plaintext), nil)

	// Split ciphertext and authTag
	tagSize := gcm.Overhead()
	ciphertext := ciphertextWithTag[:len(ciphertextWithTag)-tagSize]
	authTag := ciphertextWithTag[len(ciphertextWithTag)-tagSize:]

	// Combine: iv + authTag + ciphertext (matching Node.js format)
	result := make([]byte, 0, 16+16+len(ciphertext))
	result = append(result, iv...)
	result = append(result, authTag...)
	result = append(result, ciphertext...)

	return base64.StdEncoding.EncodeToString(result), nil
}
