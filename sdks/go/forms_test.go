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
		"email": map[string]interface{}{
			"contactPropertyId":   "email",
			"contactPropertyType": "standard",
			"fieldType":           "string",
		},
		"first_name": map[string]interface{}{
			"contactPropertyId":   "firstName",
			"contactPropertyType": "standard",
			"fieldType":           "string",
		},
	}
}

func TestFormsCreate(t *testing.T) {
	client := setupTest()

	t.Run("should create a form with basic information", func(t *testing.T) {
		result, err := client.Forms.Create(&CreateFormRequest{
			Name:        "Newsletter Signup",
			Description: "Subscribe to our weekly newsletter",
			FieldMapping: map[string]interface{}{
				"email": map[string]interface{}{
					"contactPropertyId":   "email",
					"contactPropertyType": "standard",
					"fieldType":           "string",
				},
			},
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should create a form with complete fields configuration", func(t *testing.T) {
		result, err := client.Forms.Create(&CreateFormRequest{
			Name:        "Contact Form",
			Description: "General contact form",
			FieldMapping: validFormFields(),
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
