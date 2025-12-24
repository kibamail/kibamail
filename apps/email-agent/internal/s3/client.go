// Package s3 provides S3-compatible storage client for email content
package s3

import (
	"bytes"
	"context"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/rs/zerolog"

	"github.com/kibamail/email-agent/internal/domain"
	kiberrors "github.com/kibamail/email-agent/internal/errors"
	"github.com/kibamail/email-agent/internal/observability"
)

// Config contains S3 client configuration
type Config struct {
	Endpoint        string
	Region          string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	ForcePathStyle  bool
}

// Client wraps the S3 client
type Client struct {
	client  *s3.Client
	bucket  string
	logger  zerolog.Logger
	metrics *observability.Metrics
}

// NewClient creates a new S3 client
func NewClient(cfg Config, logger zerolog.Logger, metrics *observability.Metrics) (*Client, error) {
	s3Logger := logger.With().Str("component", "s3").Logger()

	// Create AWS config
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, kiberrors.Wrap(err, "failed to load AWS config")
	}

	// Create S3 client with custom endpoint
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.Endpoint != "" {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
		}
		o.UsePathStyle = cfg.ForcePathStyle
	})

	s3Logger.Info().
		Str("endpoint", cfg.Endpoint).
		Str("bucket", cfg.Bucket).
		Str("region", cfg.Region).
		Msg("S3 client initialized")

	return &Client{
		client:  client,
		bucket:  cfg.Bucket,
		logger:  s3Logger,
		metrics: metrics,
	}, nil
}

// DownloadEmailContent downloads HTML and text content for an email
func (c *Client) DownloadEmailContent(ctx context.Context, contentKey string) (*domain.EmailContent, error) {
	start := time.Now()

	if c.metrics != nil {
		c.metrics.S3DownloadsTotal.Inc()
	}

	content := &domain.EmailContent{}

	// Download HTML content
	htmlKey := contentKey + "/content.html"
	htmlContent, err := c.downloadFile(ctx, htmlKey)
	if err != nil {
		if !kiberrors.Is(err, kiberrors.ErrContentNotFound) {
			if c.metrics != nil {
				c.metrics.S3DownloadErrors.Inc()
			}
			return nil, kiberrors.Wrapf(err, "failed to download HTML content: %s", htmlKey)
		}
		c.logger.Debug().Str("key", htmlKey).Msg("HTML content not found")
	} else {
		content.HTML = htmlContent
	}

	// Download text content (optional)
	textKey := contentKey + "/content.txt"
	textContent, err := c.downloadFile(ctx, textKey)
	if err != nil {
		if !kiberrors.Is(err, kiberrors.ErrContentNotFound) {
			c.logger.Warn().Err(err).Str("key", textKey).Msg("failed to download text content")
		}
		// Text content is optional, continue without it
	} else {
		content.Text = textContent
	}

	// At least one content type must be present
	if content.HTML == "" && content.Text == "" {
		if c.metrics != nil {
			c.metrics.S3DownloadErrors.Inc()
		}
		return nil, kiberrors.Mark(
			kiberrors.Newf("no content found for key: %s", contentKey),
			kiberrors.ErrContentNotFound,
		)
	}

	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.S3DownloadDuration.Observe(duration.Seconds())
	}

	c.logger.Debug().
		Str("content_key", contentKey).
		Bool("has_html", content.HTML != "").
		Bool("has_text", content.Text != "").
		Dur("duration_ms", duration).
		Msg("downloaded email content")

	return content, nil
}

// downloadFile downloads a single file from S3
func (c *Client) downloadFile(ctx context.Context, key string) (string, error) {
	resp, err := c.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check for not found error
		// AWS SDK v2 uses different error types
		return "", kiberrors.Mark(
			kiberrors.Wrapf(err, "failed to get object: %s", key),
			kiberrors.ErrContentNotFound,
		)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", kiberrors.Wrap(err, "failed to read object body")
	}

	return string(data), nil
}

// FileExists checks if a file exists in S3
func (c *Client) FileExists(ctx context.Context, key string) (bool, error) {
	_, err := c.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// Check for not found
		return false, nil
	}
	return true, nil
}

// HealthCheck performs a health check on S3 connectivity
func (c *Client) HealthCheck(ctx context.Context) error {
	_, err := c.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(c.bucket),
	})
	if err != nil {
		return kiberrors.Wrap(err, "S3 health check failed")
	}
	return nil
}

// DownloadAttachment downloads a file from S3 and returns raw bytes
func (c *Client) DownloadAttachment(ctx context.Context, key string) ([]byte, error) {
	start := time.Now()

	resp, err := c.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		if c.metrics != nil {
			c.metrics.S3DownloadErrors.Inc()
		}
		return nil, kiberrors.Mark(
			kiberrors.Wrapf(err, "failed to get attachment: %s", key),
			kiberrors.ErrContentNotFound,
		)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		if c.metrics != nil {
			c.metrics.S3DownloadErrors.Inc()
		}
		return nil, kiberrors.Wrap(err, "failed to read attachment body")
	}

	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.S3DownloadDuration.Observe(duration.Seconds())
	}

	c.logger.Debug().
		Str("key", key).
		Int("size_bytes", len(data)).
		Dur("duration_ms", duration).
		Msg("downloaded attachment")

	return data, nil
}

// Upload uploads data to S3
func (c *Client) Upload(ctx context.Context, key string, data []byte, contentType string) error {
	start := time.Now()

	if c.metrics != nil {
		c.metrics.S3UploadsTotal.Inc()
	}

	_, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		if c.metrics != nil {
			c.metrics.S3UploadErrors.Inc()
		}
		return kiberrors.Wrapf(err, "failed to upload to S3: %s", key)
	}

	duration := time.Since(start)
	if c.metrics != nil {
		c.metrics.S3UploadDuration.Observe(duration.Seconds())
	}

	c.logger.Debug().
		Str("key", key).
		Int("size_bytes", len(data)).
		Str("content_type", contentType).
		Dur("duration_ms", duration).
		Msg("uploaded to S3")

	return nil
}
