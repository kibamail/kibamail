package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/kibamail/cli/internal"
	kibamail "github.com/kibamail/kibamail/packages/go-sdk"
	"github.com/spf13/cobra"
)

var allowedExtensions = map[string]bool{
	".html": true, ".css": true, ".js": true,
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true, ".svg": true,
	".mp4": true, ".webm": true,
	".woff": true, ".woff2": true, ".ttf": true, ".otf": true,
	".pdf": true, ".ico": true,
}

const maxIndividualFileSize = 10 * 1024 * 1024
const maxTotalUploadSize = 50 * 1024 * 1024

func newFormsCmd() *cobra.Command {
	cmd := &cobra.Command{Use: "forms", Short: "Manage forms"}
	cmd.AddCommand(
		newFormsListCmd(),
		newFormsShowCmd(),
		newFormsCreateCmd(),
		newFormsUpdateCmd(),
		newFormsDeleteCmd(),
		newFormsDeployCmd(),
		newFormsPublishCmd(),
		newFormsSubmitCmd(),
		newFormsCreateVersionCmd(),
		newFormsListVersionsCmd(),
	)
	return cmd
}

func newFormsListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "list", Short: "List forms",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			opts := &kibamail.ListOptions{}
			if l, _ := cmd.Flags().GetInt("limit"); l > 0 { opts.Limit = &l }
			result, err := Client.Forms.List(opts)
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
	cmd.Flags().Int("limit", 0, "Maximum number of results")
	return cmd
}

func newFormsShowCmd() *cobra.Command {
	return &cobra.Command{
		Use: "show <id>", Short: "Show a form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.Forms.Get(args[0])
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
}

func newFormsCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "create", Short: "Create a form",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			name, _ := cmd.Flags().GetString("name")

			req := &kibamail.CreateFormRequest{Name: name}
			if v, _ := cmd.Flags().GetString("description"); v != "" { req.Description = v }
			if v, _ := cmd.Flags().GetString("type"); v != "" { req.Type = v }

			if fm, _ := cmd.Flags().GetString("field-mapping"); fm != "" {
				var fieldMapping map[string]interface{}
				if err := json.Unmarshal([]byte(fm), &fieldMapping); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid field-mapping JSON: %w", err))
					return nil
				}
				req.FieldMapping = fieldMapping
			}

			result, err := Client.Forms.Create(req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Created form %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Form name [required]")
	cmd.Flags().String("description", "", "Description")
	cmd.Flags().String("type", "", "Form type: SIGN_UP or SURVEY")
	cmd.Flags().String("field-mapping", "", `Field mapping as JSON, e.g. '{"email":{"contactPropertyId":"email","contactPropertyType":"standard","fieldType":"string"}}'`)
	_ = cmd.MarkFlagRequired("name")
	return cmd
}

func newFormsUpdateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "update <id>", Short: "Update a form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			req := &kibamail.UpdateFormRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" { req.Name = v }

			if fm, _ := cmd.Flags().GetString("field-mapping"); fm != "" {
				var fieldMapping map[string]interface{}
				if err := json.Unmarshal([]byte(fm), &fieldMapping); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid field-mapping JSON: %w", err))
					return nil
				}
				req.FieldMapping = fieldMapping
			}

			if s, _ := cmd.Flags().GetString("settings"); s != "" {
				var settings map[string]interface{}
				if err := json.Unmarshal([]byte(s), &settings); err != nil {
					internal.HandleError(cmd, fmt.Errorf("invalid settings JSON: %w", err))
					return nil
				}
				req.Settings = settings
			}

			if v, _ := cmd.Flags().GetString("seo-title"); v != "" { req.SeoTitle = &v }
			if v, _ := cmd.Flags().GetString("seo-description"); v != "" { req.SeoDescription = &v }
			if v, _ := cmd.Flags().GetString("slug"); v != "" { req.Slug = &v }
			if v, _ := cmd.Flags().GetString("double-opt-in-email-id"); v != "" { req.DoubleOptInEmailId = &v }

			result, err := Client.Forms.Update(args[0], req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Updated form %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Form name")
	cmd.Flags().String("field-mapping", "", "Field mapping as JSON")
	cmd.Flags().String("settings", "", `Settings as JSON, e.g. '{"successAction":{"type":"redirect","url":"https://..."}}'`)
	cmd.Flags().String("seo-title", "", "SEO page title")
	cmd.Flags().String("seo-description", "", "SEO meta description")
	cmd.Flags().String("slug", "", "URL slug")
	cmd.Flags().String("double-opt-in-email-id", "", "Email ID for double opt-in confirmation")
	return cmd
}

func newFormsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use: "delete <id>", Short: "Delete a form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			if err := Client.Forms.Delete(args[0]); err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { cmd.Printf(`{"deleted":true,"id":"%s"}`+"\n", args[0]) } else { cmd.Printf("Deleted form %s\n", args[0]) }
			return nil
		},
	}
}

func newFormsDeployCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "deploy <id>", Short: "Deploy a site bundle to a form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }

			dirPath, _ := cmd.Flags().GetString("path")
			absPath, err := filepath.Abs(dirPath)
			if err != nil {
				internal.HandleError(cmd, fmt.Errorf("invalid path: %w", err))
				return nil
			}

			files, err := collectAndValidateFiles(absPath)
			if err != nil {
				internal.HandleError(cmd, err)
				return nil
			}

			result, err := Client.Forms.Deploy(args[0], files)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }

			cmd.Printf("Deployed %d files (deploy ID: %s)\n", len(result.Files), result.DeployId)
			for _, f := range result.Files {
				cmd.Printf("  %s\n", f.Name)
			}
			return nil
		},
	}
	cmd.Flags().String("path", "", "Path to folder containing site files [required]")
	_ = cmd.MarkFlagRequired("path")
	return cmd
}

func newFormsPublishCmd() *cobra.Command {
	return &cobra.Command{
		Use: "publish <id>", Short: "Publish a form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.Forms.Publish(args[0])
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Published form %s\n", result.ID)
			return nil
		},
	}
}

func newFormsSubmitCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "submit <id>", Short: "Submit data to a published form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			dataStr, _ := cmd.Flags().GetString("data")
			var data map[string]interface{}
			if err := json.Unmarshal([]byte(dataStr), &data); err != nil {
				internal.HandleError(cmd, fmt.Errorf("invalid data JSON: %w", err))
				return nil
			}
			result, err := Client.Forms.Submit(args[0], data)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Created submission %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("data", "", `Submission data as JSON, e.g. '{"email":"user@example.com"}'`)
	_ = cmd.MarkFlagRequired("data")
	return cmd
}

func collectAndValidateFiles(dirPath string) ([]kibamail.FileUpload, error) {
	info, err := os.Stat(dirPath)
	if err != nil {
		return nil, fmt.Errorf("cannot access path %s: %w", dirPath, err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("%s is not a directory", dirPath)
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("cannot read directory %s: %w", dirPath, err)
	}

	var files []kibamail.FileUpload
	var htmlCount int
	var totalSize int64

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		ext := strings.ToLower(filepath.Ext(name))

		if !allowedExtensions[ext] {
			return nil, fmt.Errorf("file '%s' has unsupported extension '%s'", name, ext)
		}

		info, err := entry.Info()
		if err != nil {
			return nil, fmt.Errorf("cannot stat file '%s': %w", name, err)
		}

		if info.Size() > maxIndividualFileSize {
			return nil, fmt.Errorf("file '%s' exceeds maximum size of 10MB", name)
		}

		totalSize += info.Size()

		if ext == ".html" {
			htmlCount++
		}

		f, err := os.Open(filepath.Join(dirPath, name))
		if err != nil {
			return nil, fmt.Errorf("cannot open file '%s': %w", name, err)
		}

		files = append(files, kibamail.FileUpload{
			Name:     name,
			Contents: f,
		})
	}

	if totalSize > maxTotalUploadSize {
		return nil, fmt.Errorf("total upload size exceeds maximum of 50MB")
	}

	if htmlCount == 0 {
		return nil, fmt.Errorf("no .html file found in %s", dirPath)
	}

	if htmlCount > 1 {
		return nil, fmt.Errorf("found %d .html files — exactly one is required", htmlCount)
	}

	return files, nil
}

func newFormsCreateVersionCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use: "create-version <id>", Short: "Create a new version of a form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			req := &kibamail.CreateFormVersionRequest{}
			if v, _ := cmd.Flags().GetString("name"); v != "" { req.Name = v }
			result, err := Client.Forms.CreateVersion(args[0], req)
			if err != nil { internal.HandleError(cmd, err); return nil }
			if internal.IsJSON(cmd) { return internal.PrintResult(cmd, result) }
			cmd.Printf("Created version %s\n", result.ID)
			return nil
		},
	}
	cmd.Flags().String("name", "", "Override form name for this version")
	return cmd
}

func newFormsListVersionsCmd() *cobra.Command {
	return &cobra.Command{
		Use: "versions <id>", Short: "List all versions of a form", Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := requireClient(cmd); err != nil { internal.HandleError(cmd, err); return nil }
			result, err := Client.Forms.ListVersions(args[0])
			if err != nil { internal.HandleError(cmd, err); return nil }
			return internal.PrintResult(cmd, result)
		},
	}
}
