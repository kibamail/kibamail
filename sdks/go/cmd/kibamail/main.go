package main

import (
	"os"

	"github.com/kibamail/cli/cmd"
)

var (
	version = "dev"
	commit  = "none"
)

func main() {
	root := cmd.NewRootCmd(version, commit)
	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}
