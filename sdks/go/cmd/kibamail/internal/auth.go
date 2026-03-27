package internal

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
	"github.com/zalando/go-keyring"
)

const (
	KeyringService = "kibamail"
	KeyringAccount = "api-key"
)

func Resolve(cmd *cobra.Command) (string, string, error) {
	if key, _ := cmd.Flags().GetString("api-key"); key != "" {
		return key, "flag", nil
	}
	if key := os.Getenv("KIBAMAIL_API_KEY"); key != "" {
		return key, "env", nil
	}
	if key, err := keyring.Get(KeyringService, KeyringAccount); err == nil && key != "" {
		return key, "keyring", nil
	}
	return "", "", fmt.Errorf("not authenticated — run: kibamail auth login --api-key <key>")
}

func ResolveForLogin(cmd *cobra.Command) (string, error) {
	if key, _ := cmd.Flags().GetString("api-key"); key != "" {
		return key, nil
	}
	if key := os.Getenv("KIBAMAIL_API_KEY"); key != "" {
		return key, nil
	}
	if stat, _ := os.Stdin.Stat(); stat.Mode()&os.ModeCharDevice == 0 {
		scanner := bufio.NewScanner(os.Stdin)
		if scanner.Scan() {
			key := strings.TrimSpace(scanner.Text())
			if key != "" {
				return key, nil
			}
		}
	}
	return "", fmt.Errorf("provide API key via --api-key flag, KIBAMAIL_API_KEY env, or piped stdin")
}

func StoreKey(apiKey string) error {
	return keyring.Set(KeyringService, KeyringAccount, apiKey)
}

func DeleteKey() error {
	return keyring.Delete(KeyringService, KeyringAccount)
}

func GetStoredKey() (string, error) {
	return keyring.Get(KeyringService, KeyringAccount)
}

func MaskKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "****" + key[len(key)-4:]
}
