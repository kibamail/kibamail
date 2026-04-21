# Errors & retries

Every non-2xx response from the Kibamail API is parsed into a typed Go error. This guide shows exactly what the SDK returns and how to handle it.

## The two error types

### `*kibamail.APIError` — structured server error (400/401/403/404/409/422/5xx)

```go
type APIError struct {
    StatusCode       int
    Type             string                 // e.g. "validation_error"
    Code             string                 // stable machine code, e.g. "contact_already_exists"
    Message          string                 // human-readable
    Hint             string                 // optional actionable hint
    RequestID        string                 // propagate to support tickets
    ValidationErrors []APIValidationError   // field-level details for 422s
    Details          map[string]interface{} // free-form extras
}
```

Source: `sdks/go/errors.go:19-35`.

### `*kibamail.RateLimitError` — 429 with window metadata

```go
type RateLimitError struct {
    Message    string
    Limit      string // ratelimit-limit header
    Remaining  string // ratelimit-remaining header
    Reset      string // ratelimit-reset (seconds)
    RetryAfter string // retry-after (seconds)
}
```

Implements `errors.Is(err, kibamail.ErrRateLimit)`. Source: `sdks/go/errors.go:54-81`.

## Canonical handler

```go
import (
    "errors"
    "log"
    "time"

    kibamail "github.com/kibamail/kibamail/sdks/go"
)

_, err := kb.Emails.Send(req)
switch {
case err == nil:
    // success

case errors.Is(err, kibamail.ErrRateLimit):
    var rl *kibamail.RateLimitError
    errors.As(err, &rl)
    log.Printf("rate limited, retry after %ss (req-id=%s)", rl.RetryAfter, rl.Message)
    // back off, then retry

case func() bool { var e *kibamail.APIError; return errors.As(err, &e) }():
    var apiErr *kibamail.APIError
    errors.As(err, &apiErr)
    switch apiErr.StatusCode {
    case 400, 422:
        for _, v := range apiErr.ValidationErrors {
            log.Printf("  %s: %s (%s)", v.Field, v.Message, v.Code)
        }
    case 401, 403:
        log.Fatalf("auth: %s", apiErr.Message)
    case 404:
        // idempotent "already gone" — often safe to ignore
    case 409:
        // conflict; often means "already exists" — treat as success in upsert
    case 500, 502, 503, 504:
        // transient — retry with backoff
    }
    log.Printf("api error %d %s: %s (req-id=%s)", apiErr.StatusCode, apiErr.Code, apiErr.Message, apiErr.RequestID)

default:
    // transport-level error (DNS, TLS, connection reset, context cancellation)
    log.Printf("transport: %v", err)
}
```

## Retry policy (recommended)

| Condition | Retry? | Strategy |
|---|---|---|
| Transport error (`net.OpError`, `context.DeadlineExceeded`) | **yes** | exponential, jitter, 3 attempts |
| `429` / `*RateLimitError` | **yes** | honor `RetryAfter` header; never retry faster |
| `500 / 502 / 503 / 504` | **yes** | exponential, jitter, cap at 3 attempts |
| `408` | **yes** | single retry |
| `409 contact_already_exists` and similar | **no** | handle as business logic |
| `4xx validation_error` | **no** | fix the request |
| `401 / 403` | **no** | rotate the API key |

There is no built-in retry in the SDK — keep a thin retry wrapper around your calls so you control the policy. The `Client.HTTPClient` field (`sdks/go/client.go`) is a `*http.Client` you can customize (timeout, transport, proxy).

## Idempotency

- `POST v1/emails` is **not** automatically idempotent. If you retry after a transport error, you may send twice. Add an `Idempotency-Key` header via a custom transport, or de-dupe on your side using `metadata`.
- `POST v1/contacts` is not idempotent either, but conflicts return `409 contact_already_exists` — catch and treat as upsert.
- `PUT /v1/<resource>/{id}` calls are idempotent by nature.
- `DELETE /v1/<resource>/{id}` returns 404 on double-delete; treat as success.

## Validation errors — example

```json
{
  "error": {
    "type": "validation_error",
    "code": "validation_failed",
    "message": "Request validation failed",
    "validationErrors": [
      { "field": "from",    "code": "unverified_sender", "message": "Sender domain is not verified" },
      { "field": "to[0]",   "code": "invalid_email",     "message": "Must be a valid email address" }
    ],
    "requestId": "req_01JABCD..."
  }
}
```

Always surface `RequestID` in your own logs — support needs it to trace.
