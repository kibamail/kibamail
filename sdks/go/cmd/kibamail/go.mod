module github.com/kibamail/cli

go 1.25.1

replace github.com/kibamail/kibamail/packages/go-sdk => ../../

require (
	github.com/kibamail/kibamail/packages/go-sdk v0.0.0-00010101000000-000000000000
	github.com/mattn/go-isatty v0.0.20
	github.com/spf13/cobra v1.10.2
	github.com/zalando/go-keyring v0.2.8
)

require (
	github.com/danieljoos/wincred v1.2.3 // indirect
	github.com/godbus/dbus/v5 v5.2.2 // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/spf13/pflag v1.0.9 // indirect
	golang.org/x/sys v0.30.0 // indirect
)
