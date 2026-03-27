package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"reflect"
	"strings"

	"text/tabwriter"

	"github.com/mattn/go-isatty"
	"github.com/spf13/cobra"
)

func IsJSON(cmd *cobra.Command) bool {
	if jsonFlag, _ := cmd.Flags().GetBool("json"); jsonFlag {
		return true
	}
	if output, _ := cmd.Flags().GetString("output"); output == "json" {
		return true
	}
	if output, _ := cmd.Flags().GetString("output"); output == "table" {
		return false
	}
	return !isatty.IsTerminal(os.Stdout.Fd()) && !isatty.IsCygwinTerminal(os.Stdout.Fd())
}

func IsQuiet(cmd *cobra.Command) bool {
	quiet, _ := cmd.Flags().GetBool("quiet")
	return quiet
}

func GetFields(cmd *cobra.Command) []string {
	fields, _ := cmd.Flags().GetStringSlice("fields")
	return fields
}

func PrintResult(cmd *cobra.Command, data interface{}) error {
	w := cmd.OutOrStdout()
	if IsQuiet(cmd) {
		return printQuiet(w, data)
	}
	if IsJSON(cmd) {
		return printJSON(w, data, GetFields(cmd))
	}
	return printTable(w, data)
}

func printJSON(w io.Writer, data interface{}, fields []string) error {
	m, err := toMapSlice(data)
	if err != nil {
		raw, err := json.MarshalIndent(data, "", "  ")
		if err != nil {
			return err
		}
		fmt.Fprintln(w, string(raw))
		return nil
	}

	if len(fields) > 0 {
		m = filterFields(m, fields)
	}

	raw, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	fmt.Fprintln(w, string(raw))
	return nil
}

func printTable(w io.Writer, data interface{}) error {
	maps, err := toMapSlice(data)
	if err != nil || len(maps) == 0 {
		raw, _ := json.MarshalIndent(data, "", "  ")
		fmt.Fprintln(w, string(raw))
		return nil
	}

	headers := orderedKeys(maps[0])
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)

	for _, h := range headers {
		fmt.Fprintf(tw, "%s\t", strings.ToUpper(h))
	}
	fmt.Fprintln(tw)

	for _, m := range maps {
		for _, h := range headers {
			fmt.Fprintf(tw, "%v\t", m[h])
		}
		fmt.Fprintln(tw)
	}
	tw.Flush()
	return nil
}

func printQuiet(w io.Writer, data interface{}) error {
	maps, err := toMapSlice(data)
	if err != nil {
		return err
	}
	for _, m := range maps {
		if id, ok := m["id"]; ok {
			fmt.Fprintln(w, id)
		}
	}
	return nil
}

func toMapSlice(data interface{}) ([]map[string]interface{}, error) {
	raw, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	var single map[string]interface{}
	if err := json.Unmarshal(raw, &single); err == nil {
		if _, hasList := single["data"]; hasList {
			if list, ok := single["data"].([]interface{}); ok {
				result := make([]map[string]interface{}, 0, len(list))
				for _, item := range list {
					if m, ok := item.(map[string]interface{}); ok {
						result = append(result, m)
					}
				}
				return result, nil
			}
		}
		return []map[string]interface{}{single}, nil
	}

	var slice []map[string]interface{}
	if err := json.Unmarshal(raw, &slice); err == nil {
		return slice, nil
	}

	return nil, fmt.Errorf("cannot convert %s to map slice", reflect.TypeOf(data))
}

func filterFields(maps []map[string]interface{}, fields []string) []map[string]interface{} {
	fieldSet := make(map[string]bool, len(fields))
	for _, f := range fields {
		fieldSet[strings.TrimSpace(f)] = true
	}

	result := make([]map[string]interface{}, len(maps))
	for i, m := range maps {
		filtered := make(map[string]interface{})
		for k, v := range m {
			if fieldSet[k] {
				filtered[k] = v
			}
		}
		result[i] = filtered
	}
	return result
}

func orderedKeys(m map[string]interface{}) []string {
	priority := []string{"id", "object", "name", "email", "status", "type", "description"}
	seen := make(map[string]bool)
	var keys []string

	for _, k := range priority {
		if _, ok := m[k]; ok {
			keys = append(keys, k)
			seen[k] = true
		}
	}
	for k := range m {
		if !seen[k] && k != "createdAt" && k != "updatedAt" && k != "object" {
			keys = append(keys, k)
		}
	}
	return keys
}
