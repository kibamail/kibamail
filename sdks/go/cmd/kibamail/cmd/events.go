package cmd

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/kibamail/cli/internal"
	"github.com/spf13/cobra"
)

func newEventsCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "events", Short: "Fire custom events"}
	cmd.AddCommand(newEventsCreateCmd())
	return cmd
}

func newEventsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Fire a custom event for automation triggers",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil {
				internal.HandleError(cmd, err)
				return nil
			}

			name, _ := cmd.Flags().GetString("name")
			contactID, _ := cmd.Flags().GetString("contact-id")
			propsStr, _ := cmd.Flags().GetString("properties")

			body := map[string]interface{}{
				"eventName": name,
				"contactId": contactID,
			}
			if propsStr != "" {
				var props interface{}
				if err := parseJSON(propsStr, &props); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid --properties JSON: %w", err))
					return nil
				}
				body["properties"] = props
			}

			raw, _ := json.Marshal(body)
			req, err := Client.NewRequest(context.Background(), http.MethodPost, "v1/events", nil)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			req.Body = http.NoBody
			req, _ = http.NewRequestWithContext(context.Background(), http.MethodPost, req.URL.String(), bytes.NewReader(raw))
			req.Header.Set("Content-Type", "application/json")

			apiKey, _, _ := internal.Resolve(cmd)
			req.Header.Set("Authorization", "Bearer "+apiKey)

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}
			defer resp.Body.Close()

			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)

			if resp.StatusCode >= 400 {
				internal.HandleError(cmd, fmt.Errorf("API error %d: %v", resp.StatusCode, result))
				return nil
			}

			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().String("name", "", "Event name [required]")
	cmd.Flags().String("contact-id", "", "Contact ID [required]")
	cmd.Flags().String("properties", "", "Event properties as JSON")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("contact-id")
	return cmd
}
