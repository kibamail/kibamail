package kibamail

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTopicsCreate(t *testing.T) {
	client := setupTest()

	t.Run("should create a topic with basic information", func(t *testing.T) {
		result, err := client.Topics.Create(&CreateTopicRequest{
			Name:        "Product Updates",
			Description: "Latest features and improvements",
			Visibility:  "PUBLIC",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should create a topic with default opt-in", func(t *testing.T) {
		result, err := client.Topics.Create(&CreateTopicRequest{
			Name:         "Newsletter",
			Description:  "Weekly newsletter",
			Visibility:   "PUBLIC",
			DefaultOptIn: true,
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestTopicsList(t *testing.T) {
	client := setupTest()

	t.Run("should list topics with default pagination", func(t *testing.T) {
		result, err := client.Topics.List(nil)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should list topics with custom limit", func(t *testing.T) {
		limit := 50
		result, err := client.Topics.List(&ListOptions{Limit: &limit})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})
}

func TestTopicsGet(t *testing.T) {
	client := setupTest()

	t.Run("should retrieve a topic by ID", func(t *testing.T) {
		topicId := "topic_test_12345"
		result, err := client.Topics.Get(topicId)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestTopicsUpdate(t *testing.T) {
	client := setupTest()

	t.Run("should update a topic's basic information", func(t *testing.T) {
		topicId := "topic_test_12345"
		result, err := client.Topics.Update(topicId, &UpdateTopicRequest{
			Name:        "Updated Topic",
			Description: "Updated description",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should update a topic's visibility", func(t *testing.T) {
		topicId := "topic_test_12345"
		result, err := client.Topics.Update(topicId, &UpdateTopicRequest{
			Visibility: "PRIVATE",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestTopicsDelete(t *testing.T) {
	client := setupTest()

	t.Run("should delete a topic by ID", func(t *testing.T) {
		topicId := "topic_test_12345"
		err := client.Topics.Delete(topicId)

		require.NoError(t, err)
	})
}
