package main

import (
	"os"

	"github.com/kibamail/infra/control-plane/cli/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
