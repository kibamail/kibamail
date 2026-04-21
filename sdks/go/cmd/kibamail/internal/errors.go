package internal

import (
	"encoding/json"
	"errors"
	"fmt"

	kibamail "github.com/kibamail/kibamail/sdks/go"
	"github.com/spf13/cobra"
)

type CLIError struct {
	Code             string                       `json:"code"`
	Message          string                       `json:"message"`
	Hint             string                       `json:"hint,omitempty"`
	RequestID        string                       `json:"request_id,omitempty"`
	Retryable        bool                         `json:"retryable"`
	ExitCode         int                          `json:"exit_code"`
	ValidationErrors []kibamail.APIValidationError `json:"validation_errors,omitempty"`
}

func (e *CLIError) Error() string {
	return e.Message
}

func HandleError(cmd *cobra.Command, err error) {
	FormatError(cmd, err)
}

func FormatError(cmd *cobra.Command, err error) *CLIError {
	if err == nil {
		return nil
	}

	cliErr := classifyError(err)

	if IsJSON(cmd) {
		envelope := map[string]interface{}{
			"error": cliErr,
		}
		raw, _ := json.MarshalIndent(envelope, "", "  ")
		fmt.Fprintln(cmd.ErrOrStderr(), string(raw))
	} else {
		fmt.Fprintf(cmd.ErrOrStderr(), "Error: %s\n", cliErr.Message)
		if cliErr.Hint != "" {
			fmt.Fprintf(cmd.ErrOrStderr(), "Hint:  %s\n", cliErr.Hint)
		}
		for _, ve := range cliErr.ValidationErrors {
			fmt.Fprintf(cmd.ErrOrStderr(), "  - %s: %s\n", ve.Field, ve.Message)
		}
	}

	return cliErr
}

func classifyError(err error) *CLIError {
	// Structured API errors from the SDK — preserves code, hint, validation details
	var apiErr *kibamail.APIError
	if errors.As(err, &apiErr) {
		return &CLIError{
			Code:             apiErr.Code,
			Message:          apiErr.Message,
			Hint:             apiErr.Hint,
			RequestID:        apiErr.RequestID,
			Retryable:        apiErr.Code == "RATE_LIMIT_EXCEEDED",
			ExitCode:         statusToExitCode(apiErr.StatusCode),
			ValidationErrors: apiErr.ValidationErrors,
		}
	}

	// Rate limit errors (separate type in the SDK)
	var rateLimitErr *kibamail.RateLimitError
	if errors.As(err, &rateLimitErr) {
		return &CLIError{
			Code:      "RATE_LIMIT_EXCEEDED",
			Message:   rateLimitErr.Message,
			Hint:      "Wait for the duration in the retry-after header before retrying.",
			Retryable: true,
			ExitCode:  7,
		}
	}

	// Unstructured errors (network failures, etc.)
	return &CLIError{
		Code:     "ERROR",
		Message:  err.Error(),
		Hint:     "An unexpected error occurred. Check your network connection and try again.",
		ExitCode: 1,
	}
}

func statusToExitCode(status int) int {
	switch {
	case status == 401 || status == 403:
		return 4
	case status == 404:
		return 3
	case status == 409:
		return 5
	case status == 422:
		return 6
	case status == 429:
		return 7
	default:
		return 1
	}
}
