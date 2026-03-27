package cmd

import "encoding/json"

func parseJSON(s string, v interface{}) error {
	return json.Unmarshal([]byte(s), v)
}
