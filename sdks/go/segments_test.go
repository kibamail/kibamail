package kibamail

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSegmentsCreate(t *testing.T) {
	client := setupTest()

	t.Run("should create a segment with basic information", func(t *testing.T) {
		result, err := client.Segments.Create(&CreateSegmentRequest{
			Name:        "Enterprise Customers",
			Description: "All contacts on Enterprise plan",
			Conditions: map[string]interface{}{
				"$and": []map[string]interface{}{
					{
						"field":    "Plan",
						"operator": "eq",
						"value":    "Enterprise",
					},
					{
						"field":    "status",
						"operator": "eq",
						"value":    "SUBSCRIBED",
					},
				},
			},
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should create a segment with complex conditions", func(t *testing.T) {
		result, err := client.Segments.Create(&CreateSegmentRequest{
			Name:        "Premium Users",
			Description: "All users on paid plans",
			Conditions: map[string]interface{}{
				"$and": []interface{}{
					map[string]interface{}{
						"$or": []map[string]interface{}{
							{
								"field":    "Plan",
								"operator": "eq",
								"value":    "Pro",
							},
							{
								"field":    "Plan",
								"operator": "eq",
								"value":    "Enterprise",
							},
						},
					},
					map[string]interface{}{
						"field":    "status",
						"operator": "eq",
						"value":    "SUBSCRIBED",
					},
				},
			},
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestSegmentsList(t *testing.T) {
	client := setupTest()

	t.Run("should list segments with default pagination", func(t *testing.T) {
		result, err := client.Segments.List(nil)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should list segments with custom limit", func(t *testing.T) {
		limit := 50
		result, err := client.Segments.List(&ListOptions{Limit: &limit})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})
}

func TestSegmentsGet(t *testing.T) {
	client := setupTest()

	t.Run("should retrieve a segment by ID", func(t *testing.T) {
		segmentId := "segment_test_12345"
		result, err := client.Segments.Get(segmentId)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestSegmentsUpdate(t *testing.T) {
	client := setupTest()

	t.Run("should update a segment's basic information", func(t *testing.T) {
		segmentId := "segment_test_12345"
		result, err := client.Segments.Update(segmentId, &UpdateSegmentRequest{
			Name:        "Updated Segment",
			Description: "Updated description",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})

	t.Run("should update a segment's conditions", func(t *testing.T) {
		segmentId := "segment_test_12345"
		result, err := client.Segments.Update(segmentId, &UpdateSegmentRequest{
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

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotEmpty(t, result.ID)
	})
}

func TestSegmentsDelete(t *testing.T) {
	client := setupTest()

	t.Run("should delete a segment by ID", func(t *testing.T) {
		segmentId := "segment_test_12345"
		err := client.Segments.Delete(segmentId)

		require.NoError(t, err)
	})
}

func TestSegmentsListContacts(t *testing.T) {
	client := setupTest()

	t.Run("should list contacts in a segment", func(t *testing.T) {
		segmentId := "segment_test_12345"
		result, err := client.Segments.ListContacts(segmentId, nil)

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})

	t.Run("should list contacts in a segment with pagination", func(t *testing.T) {
		segmentId := "segment_test_12345"
		limit := 50
		result, err := client.Segments.ListContacts(segmentId, &ListOptions{Limit: &limit})

		require.NoError(t, err)
		require.NotNil(t, result)
		assert.NotNil(t, result.Data)
	})
}
