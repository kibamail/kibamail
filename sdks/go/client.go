package kibamail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"
)

const (
	version     = "0.0.1-alpha.0"
	userAgent   = "kibamail-go/" + version
	contentType = "application/json"
)

var defaultBaseURL = getEnv("KIBAMAIL_BASE_URL", "https://api.kibamail.com")

var defaultHTTPClient = &http.Client{
	Timeout: time.Minute,
}

// Client handles communication with Kibamail API.
type Client struct {
	// HTTP client
	client *http.Client

	// Api Key
	ApiKey string

	// Base URL
	BaseURL *url.URL

	// User agent for client
	UserAgent string

	// HTTP headers
	headers map[string]string

	// Services
	Contacts          ContactsSvc
	Topics            TopicsSvc
	Segments          SegmentsSvc
	Forms             FormsSvc
	ApiKeys           ApiKeysSvc
	ContactProperties ContactPropertiesSvc
	Emails            EmailsSvc
	Domains           DomainsSvc
	Broadcasts        BroadcastsSvc
	Automations       AutomationsSvc
	Events            EventsSvc
	MarketingEmails   MarketingEmailsSvc
	Inbox             InboxSvc
}

// NewClient is the default client constructor
func NewClient(apiKey string) *Client {
	return NewCustomClient(defaultHTTPClient, apiKey)
}

// NewCustomClient builds a new Kibamail API client, using a provided Http client.
func NewCustomClient(httpClient *http.Client, apiKey string) *Client {
	if httpClient == nil {
		httpClient = defaultHTTPClient
	}

	baseURL, _ := url.Parse(defaultBaseURL)

	c := &Client{
		client:    httpClient,
		BaseURL:   baseURL,
		UserAgent: userAgent,
		ApiKey:    apiKey,
		headers:   make(map[string]string),
	}

	// Initialize all resource instances
	c.Contacts = &ContactsSvcImpl{client: c}
	c.Topics = &TopicsSvcImpl{client: c}
	c.Segments = &SegmentsSvcImpl{client: c}
	c.Forms = &FormsSvcImpl{client: c}
	c.ApiKeys = &ApiKeysSvcImpl{client: c}
	c.ContactProperties = &ContactPropertiesSvcImpl{client: c}
	c.Emails = &EmailsSvcImpl{client: c}
	c.Domains = &DomainsSvcImpl{client: c}
	c.Broadcasts = &BroadcastsSvcImpl{client: c}
	c.Automations = &AutomationsSvcImpl{client: c}
	c.Events = &EventsSvcImpl{client: c}
	c.MarketingEmails = &MarketingEmailsSvcImpl{client: c}
	c.Inbox = &InboxSvcImpl{client: c}

	return c
}

// NewRequest builds and returns a new HTTP request object
// based on the given arguments
func (c *Client) NewRequest(ctx context.Context, method, path string, params interface{}) (*http.Request, error) {
	u, err := c.BaseURL.Parse(path)
	if err != nil {
		return nil, err
	}

	var req *http.Request
	req, err = http.NewRequestWithContext(ctx, method, u.String(), nil)
	if err != nil {
		return nil, err
	}

	if params != nil {
		buf := new(bytes.Buffer)
		err = json.NewEncoder(buf).Encode(params)
		if err != nil {
			return nil, err
		}

		req.Body = io.NopCloser(buf)
		req.Header.Set("Content-Type", contentType)
	}

	for k, v := range c.headers {
		req.Header.Add(k, v)
	}

	req.Header.Set("Accept", contentType)
	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	return req, nil
}

// FileUpload represents a file to upload in a multipart request.
type FileUpload struct {
	Name     string
	Contents io.Reader
}

// NewMultipartRequest builds a multipart/form-data request with the given files.
func (c *Client) NewMultipartRequest(ctx context.Context, method, path string, fieldName string, files []FileUpload) (*http.Request, error) {
	u, err := c.BaseURL.Parse(path)
	if err != nil {
		return nil, err
	}

	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)

	for _, f := range files {
		part, err := writer.CreateFormFile(fieldName, f.Name)
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(part, f.Contents); err != nil {
			return nil, err
		}
	}

	if err := writer.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	for k, v := range c.headers {
		req.Header.Add(k, v)
	}

	req.Header.Set("Accept", contentType)
	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	return req, nil
}

// Perform sends the request to the Kibamail API
func (c *Client) Perform(req *http.Request, ret interface{}) (*http.Response, error) {
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Handle possible errors.
	// Any 2xx status code is considered success
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, handleError(resp)
	}

	if resp.StatusCode != http.StatusNoContent && ret != nil {
		if w, ok := ret.(io.Writer); ok {
			_, err = io.Copy(w, resp.Body)
			if err != nil {
				return nil, err
			}
		} else {
			if resp.Body != nil {
				err = json.NewDecoder(resp.Body).Decode(ret)
				if err != nil {
					return nil, err
				}
			}
		}
	}

	return resp, err
}

// ListOptions contains pagination parameters for list methods
type ListOptions struct {
	Limit  *int    `json:"limit,omitempty"`
	After  *string `json:"after,omitempty"`
	Before *string `json:"before,omitempty"`
}

// buildPaginationQuery constructs query parameters for pagination
func buildPaginationQuery(options *ListOptions) string {
	if options == nil {
		return ""
	}

	query := make(url.Values)
	if options.Limit != nil {
		query.Set("limit", fmt.Sprintf("%d", *options.Limit))
	}
	if options.After != nil {
		query.Set("after", *options.After)
	}
	if options.Before != nil {
		query.Set("before", *options.Before)
	}

	if len(query) > 0 {
		return "?" + query.Encode()
	}
	return ""
}
