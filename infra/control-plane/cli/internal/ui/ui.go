package ui

import (
	"fmt"
	"time"

	"github.com/pterm/pterm"
)

// Banner prints the CLI banner
func Banner() {
	s, _ := pterm.DefaultBigText.WithLetters(
		pterm.NewLettersFromStringWithStyle("KB", pterm.NewStyle(pterm.FgCyan)),
		pterm.NewLettersFromStringWithStyle("CTL", pterm.NewStyle(pterm.FgLightMagenta)),
	).Srender()
	pterm.Println(s)

	pterm.DefaultCenter.Println(pterm.LightCyan("Kibamail Infrastructure Installer"))
	pterm.DefaultCenter.Println(pterm.Gray("GitOps-ready Kubernetes Control Plane"))
	pterm.Println()
}

// ComponentHeader prints a styled header for a component installation
func ComponentHeader(name, version string) {
	pterm.Println()
	pterm.DefaultSection.Println(fmt.Sprintf("Installing %s %s", name, pterm.LightCyan(version)))
}

// StartSpinner starts a spinner with the given message
func StartSpinner(message string) (*pterm.SpinnerPrinter, error) {
	return pterm.DefaultSpinner.Start(message)
}

// StopSpinner stops the spinner with success
func StopSpinner(spinner *pterm.SpinnerPrinter, message string) {
	spinner.Success(message)
}

// StopSpinnerFail stops the spinner with failure
func StopSpinnerFail(spinner *pterm.SpinnerPrinter, message string) {
	spinner.Fail(message)
}

// ProgressBar creates and returns a progress bar
func ProgressBar(title string, total int) (*pterm.ProgressbarPrinter, error) {
	return pterm.DefaultProgressbar.WithTotal(total).WithTitle(title).Start()
}

// PrintStep prints a step in the installation process
func PrintStep(step int, total int, message string) {
	pterm.Printf("  %s %s\n",
		pterm.LightBlue(fmt.Sprintf("[%d/%d]", step, total)),
		message,
	)
}

// PrintSuccess prints a success message
func PrintSuccess(message string) {
	pterm.Success.Println(message)
}

// PrintError prints an error message
func PrintError(message string) {
	pterm.Error.Println(message)
}

// PrintWarning prints a warning message
func PrintWarning(message string) {
	pterm.Warning.Println(message)
}

// PrintInfo prints an info message
func PrintInfo(message string) {
	pterm.Info.Println(message)
}

// PrintTable prints data in a table format
func PrintTable(headers []string, data [][]string) {
	tableData := pterm.TableData{headers}
	tableData = append(tableData, data...)
	pterm.DefaultTable.WithHasHeader().WithBoxed().WithData(tableData).Render()
}

// PrintSummary prints the installation summary
func PrintSummary(components []ComponentStatus) {
	pterm.Println()
	pterm.DefaultSection.Println("Installation Summary")

	var data [][]string
	for _, c := range components {
		status := pterm.Green("Installed")
		if !c.Installed {
			if c.Skipped {
				status = pterm.Yellow("Skipped (already installed)")
			} else {
				status = pterm.Red("Failed")
			}
		}
		data = append(data, []string{c.Name, c.Version, status})
	}

	PrintTable([]string{"Component", "Version", "Status"}, data)
}

// ComponentStatus represents the installation status of a component
type ComponentStatus struct {
	Name      string
	Version   string
	Installed bool
	Skipped   bool
}

// Countdown displays a countdown timer
func Countdown(seconds int, message string) {
	for i := seconds; i > 0; i-- {
		pterm.Printf("\r%s %s", message, pterm.LightYellow(fmt.Sprintf("%ds", i)))
		time.Sleep(1 * time.Second)
	}
	pterm.Println()
}
