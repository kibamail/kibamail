package kibamail

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestContactsCreate(t *testing.T) {
	client := setupTest()

	t.Run("should create a contact with basic information", func(t *testing.T) {
		result, err := client.Contacts.Create(&CreateContactRequest{
			Email:     "john.doe@example.com",
			FirstName: "John",
			LastName:  "Doe",
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should create a contact with custom properties", func(t *testing.T) {
		result, err := client.Contacts.Create(&CreateContactRequest{
			Email:     "jane.smith@example.com",
			FirstName: "Jane",
			LastName:  "Smith",
			Properties: map[string]interface{}{
				"Company": "Acme Inc",
				"Plan":    "Enterprise",
			},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should create a contact with topics", func(t *testing.T) {
		result, err := client.Contacts.Create(&CreateContactRequest{
			Email:     "subscriber@example.com",
			FirstName: "New",
			LastName:  "Subscriber",
			Topics:    []string{"topic_newsletter", "topic_updates"},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestContactsList(t *testing.T) {
	client := setupTest()

	t.Run("should list contacts with default pagination", func(t *testing.T) {
		result, err := client.Contacts.List(nil)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should list contacts with custom limit", func(t *testing.T) {
		limit := 50
		result, err := client.Contacts.List(&ListOptions{Limit: &limit})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should list contacts with cursor pagination", func(t *testing.T) {
		limit := 20
		after := "contact_abc123"
		result, err := client.Contacts.List(&ListOptions{
			Limit: &limit,
			After: &after,
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})
}

func TestContactsGet(t *testing.T) {
	client := setupTest()

	t.Run("should retrieve a contact by ID", func(t *testing.T) {
		contactId := "contact_test_12345"
		result, err := client.Contacts.Get(contactId)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestContactsUpdate(t *testing.T) {
	client := setupTest()

	t.Run("should update a contact's basic information", func(t *testing.T) {
		contactId := "contact_test_12345"
		result, err := client.Contacts.Update(contactId, &UpdateContactRequest{
			FirstName: "Updated",
			LastName:  "Name",
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should update a contact's custom properties", func(t *testing.T) {
		contactId := "contact_test_12345"
		result, err := client.Contacts.Update(contactId, &UpdateContactRequest{
			Properties: map[string]interface{}{
				"Plan":           "Pro",
				"Monthly Spend":  99.99,
			},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should update a contact's topic subscriptions", func(t *testing.T) {
		contactId := "contact_test_12345"
		result, err := client.Contacts.Update(contactId, &UpdateContactRequest{
			Topics: []string{"topic_newsletter"},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestContactsDelete(t *testing.T) {
	client := setupTest()

	t.Run("should delete a contact by ID", func(t *testing.T) {
		contactId := "contact_test_12345"
		err := client.Contacts.Delete(contactId)

		assert.NoError(t, err)
	})
}

func TestContactsSearch(t *testing.T) {
	client := setupTest()

	t.Run("should search contacts with simple filter", func(t *testing.T) {
		result, err := client.Contacts.Search(&SearchContactRequest{
			Conditions: map[string]interface{}{
				"$and": []map[string]interface{}{
					{
						"field":    "status",
						"operator": "eq",
						"value":    "SUBSCRIBED",
					},
				},
			},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should search contacts with complex filters", func(t *testing.T) {
		result, err := client.Contacts.Search(&SearchContactRequest{
			Conditions: map[string]interface{}{
				"$and": []interface{}{
					map[string]interface{}{
						"field":    "status",
						"operator": "eq",
						"value":    "SUBSCRIBED",
					},
					map[string]interface{}{
						"$or": []map[string]interface{}{
							{
								"field":    "Plan",
								"operator": "eq",
								"value":    "Enterprise",
							},
							{
								"field":    "Plan",
								"operator": "eq",
								"value":    "Pro",
							},
						},
					},
				},
			},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should search contacts with pagination", func(t *testing.T) {
		result, err := client.Contacts.Search(&SearchContactRequest{
			Conditions: map[string]interface{}{
				"$and": []map[string]interface{}{
					{
						"field":    "email",
						"operator": "contains",
						"value":    "@example.com",
					},
				},
			},
		})

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})
}
