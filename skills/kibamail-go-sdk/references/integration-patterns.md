# Integration Patterns — Go SDK

Wiring the Kibamail client into common Go backend shapes. All examples use `context.Context` correctly and share a single `*kibamail.Client` per process.

## Pattern 1 — `net/http`

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "time"

    kibamail "github.com/kibamail/kibamail/sdks/go"
)

type Server struct {
    kb *kibamail.Client
}

func main() {
    httpClient := &http.Client{Timeout: 15 * time.Second}
    kb := kibamail.NewCustomClient(httpClient, os.Getenv("KIBAMAIL_API_KEY"))

    s := &Server{kb: kb}

    mux := http.NewServeMux()
    mux.HandleFunc("POST /signup", s.signup)

    srv := &http.Server{
        Addr:              ":8080",
        Handler:           mux,
        ReadHeaderTimeout: 5 * time.Second,
    }
    log.Fatal(srv.ListenAndServe())
}

type signupReq struct {
    Email     string `json:"email"`
    FirstName string `json:"firstName"`
}

func (s *Server) signup(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
    defer cancel()

    var body signupReq
    if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    res, err := s.kb.Contacts.CreateWithContext(ctx, &kibamail.CreateContactRequest{
        Email:     body.Email,
        FirstName: body.FirstName,
        Topics:    []string{"topic_newsletter"},
    })
    if err != nil {
        writeAPIError(w, err)
        return
    }

    // Fire welcome email
    _, _ = s.kb.Emails.SendWithContext(ctx, &kibamail.SendEmailRequest{
        From:    "Acme <hello@acme.com>",
        To:      body.Email,
        Subject: "Welcome to Acme",
        Template: &kibamail.SendEmailTemplate{
            ID: "me_welcome_v3",
            Variables: map[string]interface{}{"firstName": body.FirstName},
        },
    })

    w.WriteHeader(http.StatusCreated)
    _ = json.NewEncoder(w).Encode(map[string]string{"contactId": res.ID})
}
```

## Pattern 2 — Gin

```go
package main

import (
    "net/http"
    "os"
    "time"

    "github.com/gin-gonic/gin"
    kibamail "github.com/kibamail/kibamail/sdks/go"
)

func main() {
    kb := kibamail.NewCustomClient(
        &http.Client{Timeout: 15 * time.Second},
        os.Getenv("KIBAMAIL_API_KEY"),
    )

    r := gin.Default()
    r.Use(func(c *gin.Context) { c.Set("kb", kb); c.Next() })

    r.POST("/contacts", createContact)
    _ = r.Run(":8080")
}

func createContact(c *gin.Context) {
    kb := c.MustGet("kb").(*kibamail.Client)

    var body kibamail.CreateContactRequest
    if err := c.ShouldBindJSON(&body); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    res, err := kb.Contacts.CreateWithContext(c.Request.Context(), &body)
    if err != nil {
        writeAPIErrorGin(c, err)
        return
    }
    c.JSON(http.StatusCreated, res)
}
```

## Pattern 3 — Echo

```go
e := echo.New()
e.Use(func(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error { c.Set("kb", kb); return next(c) }
})
e.POST("/emails/send", func(c echo.Context) error {
    kb := c.Get("kb").(*kibamail.Client)
    var req kibamail.SendEmailRequest
    if err := c.Bind(&req); err != nil { return err }
    res, err := kb.Emails.SendWithContext(c.Request().Context(), &req)
    if err != nil { return err }
    return c.JSON(http.StatusOK, res)
})
```

## Pattern 4 — chi

```go
r := chi.NewRouter()
r.Use(middleware.Timeout(15 * time.Second))
r.Post("/contacts", func(w http.ResponseWriter, r *http.Request) {
    var body kibamail.CreateContactRequest
    _ = json.NewDecoder(r.Body).Decode(&body)
    res, err := kb.Contacts.CreateWithContext(r.Context(), &body)
    // ...
})
```

## Pattern 5 — Background worker (queue consumer)

```go
type Job struct {
    ContactID string
    OrderID   string
}

func processReceiptJob(ctx context.Context, kb *kibamail.Client, j Job) error {
    // Bound per-call
    jobCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()

    _, err := kb.Emails.SendWithContext(jobCtx, &kibamail.SendEmailRequest{
        From: "billing@acme.com",
        To:   resolveEmail(j.ContactID),
        Template: &kibamail.SendEmailTemplate{
            ID: "me_receipt_v2",
            Variables: map[string]interface{}{"orderId": j.OrderID},
        },
        Metadata: map[string]string{
            "idempotencyKey": "receipt_" + j.OrderID,
            "orderId":        j.OrderID,
        },
    })
    return err
}
```

## Canonical error handler (shared helper)

```go
func writeAPIError(w http.ResponseWriter, err error) {
    var apiErr *kibamail.APIError
    if errors.As(err, &apiErr) {
        log.Printf("kibamail: code=%s msg=%s reqId=%s", apiErr.Code, apiErr.Message, apiErr.RequestID)
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(apiErr.StatusCode)
        _ = json.NewEncoder(w).Encode(map[string]any{
            "code":             apiErr.Code,
            "message":          apiErr.Message,
            "hint":             apiErr.Hint,
            "requestId":        apiErr.RequestID,
            "validationErrors": apiErr.ValidationErrors,
        })
        return
    }

    var rl *kibamail.RateLimitError
    if errors.As(err, &rl) {
        w.Header().Set("Retry-After", rl.RetryAfter)
        http.Error(w, "rate limited — retry in "+rl.RetryAfter+"s", http.StatusTooManyRequests)
        return
    }

    // transport / context error
    http.Error(w, "internal error", http.StatusInternalServerError)
}
```

## Retry wrapper (exponential backoff + jitter)

```go
import (
    "math/rand"
    "time"
)

func retryable(err error) bool {
    var rl *kibamail.RateLimitError
    if errors.As(err, &rl) { return true }
    var apiErr *kibamail.APIError
    if errors.As(err, &apiErr) {
        return apiErr.StatusCode >= 500 || apiErr.StatusCode == 408
    }
    // transport errors are typically retryable
    return err != nil && !errors.Is(err, context.Canceled)
}

func withRetry[T any](ctx context.Context, fn func(context.Context) (T, error)) (T, error) {
    var zero T
    attempts := 3
    base := 250 * time.Millisecond

    for i := 0; i < attempts; i++ {
        v, err := fn(ctx)
        if err == nil { return v, nil }
        if !retryable(err) || i == attempts-1 { return zero, err }

        var rl *kibamail.RateLimitError
        if errors.As(err, &rl) && rl.RetryAfter != "" {
            if d, perr := time.ParseDuration(rl.RetryAfter + "s"); perr == nil {
                select {
                case <-time.After(d):
                case <-ctx.Done():
                    return zero, ctx.Err()
                }
                continue
            }
        }

        backoff := base * (1 << i)
        jitter := time.Duration(rand.Int63n(int64(backoff) / 2))
        select {
        case <-time.After(backoff + jitter):
        case <-ctx.Done():
            return zero, ctx.Err()
        }
    }
    return zero, errors.New("unreachable")
}

// Usage:
res, err := withRetry(ctx, func(ctx context.Context) (*kibamail.SendEmailResponse, error) {
    return kb.Emails.SendWithContext(ctx, req)
})
```

## Graceful shutdown

The SDK has no shutdown hook — HTTP connection pooling is handled by `*http.Client`. Best practice:

```go
// In main(), after server.Shutdown(ctx):
if t, ok := httpClient.Transport.(*http.Transport); ok {
    t.CloseIdleConnections()
}
```

Run this after your HTTP server has stopped accepting new requests to drain idle Kibamail connections cleanly.

## Testing — mock the HTTP transport

Don't mock the SDK; stub the transport:

```go
type stubTransport struct {
    fn func(*http.Request) (*http.Response, error)
}
func (s *stubTransport) RoundTrip(r *http.Request) (*http.Response, error) { return s.fn(r) }

httpClient := &http.Client{Transport: &stubTransport{
    fn: func(r *http.Request) (*http.Response, error) {
        assert.Equal(t, "/v1/contacts", r.URL.Path)
        body := `{"id":"ct_mock"}`
        return &http.Response{
            StatusCode: 201,
            Header:     http.Header{"Content-Type": []string{"application/json"}},
            Body:       io.NopCloser(strings.NewReader(body)),
        }, nil
    },
}}
kb := kibamail.NewCustomClient(httpClient, "kb_test_key")
```

This gives you full control over what the SDK "sees" without network calls and without hand-rolling interface mocks for every service.
