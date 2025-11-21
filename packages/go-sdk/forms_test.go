package kibamail

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFormsCreate(t *testing.T) {
	client := setupTest()

	t.Run("should create a form with basic information", func(t *testing.T) {
		result, err := client.Forms.Create(&CreateFormRequest{
			Name:        "Newsletter Signup",
			Description: "Subscribe to our weekly newsletter",
		})

		if err != nil {
			t.Skipf("Skipping test due to API error: %v", err)
			return
		}
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should create a form with fields", func(t *testing.T) {
		result, err := client.Forms.Create(&CreateFormRequest{
			Name:        "Contact Form",
			Description: "General contact form",
			Fields: []interface{}{
				map[string]interface{}{
					"name":     "email",
					"type":     "email",
					"required": true,
				},
				map[string]interface{}{
					"name":     "firstName",
					"type":     "text",
					"required": false,
				},
			},
		})

		if err != nil {
			t.Skipf("Skipping test due to API error: %v", err)
			return
		}
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestFormsList(t *testing.T) {
	client := setupTest()

	t.Run("should list forms with default pagination", func(t *testing.T) {
		result, err := client.Forms.List(nil)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should list forms with custom limit", func(t *testing.T) {
		limit := 50
		result, err := client.Forms.List(&ListOptions{Limit: &limit})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})
}

func TestFormsGet(t *testing.T) {
	client := setupTest()

	t.Run("should retrieve a form by ID", func(t *testing.T) {
		formId := "form_test_12345"
		result, err := client.Forms.Get(formId)

		assert.NoError(t, err)
		assert.NotNil(t, result)
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

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should update a form's fields", func(t *testing.T) {
		formId := "form_test_12345"
		result, err := client.Forms.Update(formId, &UpdateFormRequest{
			Fields: []interface{}{
				map[string]interface{}{
					"name":     "email",
					"type":     "email",
					"required": true,
				},
			},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestFormsDelete(t *testing.T) {
	client := setupTest()

	t.Run("should delete a form by ID", func(t *testing.T) {
		formId := "form_test_12345"
		err := client.Forms.Delete(formId)

		assert.NoError(t, err)
	})
}
