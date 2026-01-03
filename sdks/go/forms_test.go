package kibamail

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// validFormFields returns a valid fields object that matches the OpenAPI spec
// This is a complex nested structure as required by the API
func validFormFields() map[string]interface{} {
	return map[string]interface{}{
		"id":      "form_fields_1",
		"version": 1,
		"title":   "Newsletter Signup Form",
		"pages": []map[string]interface{}{
			{
				"id": "page_1",
				"sections": []map[string]interface{}{
					{
						"id":               "section_1",
						"collapsible":      false,
						"defaultCollapsed": false,
						"fields": []map[string]interface{}{
							{
								"id":    "field_email",
								"type":  "email",
								"name":  "email",
								"label": "Email Address",
								"appearance": map[string]interface{}{
									"width":         "full",
									"labelPosition": "top",
									"size":          "default",
								},
							},
						},
					},
				},
			},
		},
		"settings": map[string]interface{}{
			"submitButton": map[string]interface{}{
				"text":        "Subscribe",
				"loadingText": "Subscribing...",
				"variant":     "default",
				"size":        "default",
				"fullWidth":   true,
				"position":    "center",
			},
			"successAction": map[string]interface{}{
				"type":    "message",
				"message": "Thank you for subscribing!",
			},
			"showProgressBar":             false,
			"allowSaveAndContinue":        false,
			"preventDuplicateSubmissions": false,
			"theme": map[string]interface{}{
				"mode":   "light",
				"radius": "0.5rem",
				"colors": map[string]interface{}{
					"background":          "#ffffff",
					"foreground":          "#000000",
					"card":                "#ffffff",
					"cardForeground":      "#000000",
					"popover":             "#ffffff",
					"popoverForeground":   "#000000",
					"primary":             "#007bff",
					"primaryForeground":   "#ffffff",
					"secondary":           "#6c757d",
					"secondaryForeground": "#ffffff",
					"muted":               "#f8f9fa",
					"mutedForeground":     "#6c757d",
					"accent":              "#e9ecef",
					"accentForeground":    "#000000",
					"destructive":         "#dc3545",
					"border":              "#dee2e6",
					"input":               "#dee2e6",
					"ring":                "#007bff",
				},
				"font": map[string]interface{}{
					"family": "Inter",
					"url":    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
				},
				"body":      map[string]interface{}{},
				"container": map[string]interface{}{},
			},
		},
		"styling": map[string]interface{}{
			"layout":       "stacked",
			"labelStyle":   "floating",
			"borderRadius": "md",
			"spacing":      "default",
		},
	}
}

func TestFormsCreate(t *testing.T) {
	client := setupTest()

	t.Run("should create a form with basic information", func(t *testing.T) {
		// Only name is required for form creation
		result, err := client.Forms.Create(&CreateFormRequest{
			Name:        "Newsletter Signup",
			Description: "Subscribe to our weekly newsletter",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should create a form with complete fields configuration", func(t *testing.T) {
		result, err := client.Forms.Create(&CreateFormRequest{
			Name:        "Contact Form",
			Description: "General contact form",
			Fields:      validFormFields(),
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestFormsList(t *testing.T) {
	client := setupTest()

	t.Run("should list forms with default pagination", func(t *testing.T) {
		result, err := client.Forms.List(nil)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should list forms with custom limit", func(t *testing.T) {
		limit := 50
		result, err := client.Forms.List(&ListOptions{Limit: &limit})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})
}

func TestFormsGet(t *testing.T) {
	client := setupTest()

	t.Run("should retrieve a form by ID", func(t *testing.T) {
		formId := "form_test_12345"
		result, err := client.Forms.Get(formId)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestFormsUpdate(t *testing.T) {
	client := setupTest()

	t.Run("should update a form's basic information", func(t *testing.T) {
		formId := "form_test_12345"
		result, err := client.Forms.Update(formId, &UpdateFormRequest{
			Name:        "Updated Form",
			Description: "Updated description",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should update a form's name only", func(t *testing.T) {
		formId := "form_test_12345"
		result, err := client.Forms.Update(formId, &UpdateFormRequest{
			Name: "New Form Name",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestFormsDelete(t *testing.T) {
	client := setupTest()

	t.Run("should delete a form by ID", func(t *testing.T) {
		formId := "form_test_12345"
		err := client.Forms.Delete(formId)

		require.NoError(t, err)
	})
}
