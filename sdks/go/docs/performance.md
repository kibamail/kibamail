# Performance & production practices

This SDK is a thin wrapper over the HTTP API. Almost all performance comes from how you hold and call the `Client`.

## Reuse one `Client` per process

```go
var kb = kibamail.NewClient("kbm_live_...") // package-level or injected singleton
```

- `NewClient` builds a `*http.Client` with sensible defaults (keep-alives, connection pooling).
- Creating a new client per request is a leak — every one allocates a new transport and TCP/TLS pool.
- It is safe for concurrent use from any number of goroutines.

## Always use `*WithContext` in production code

```go
ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
defer cancel()

res, err := kb.Emails.SendWithContext(ctx, req)
```

The convenience `Send(req)` methods call `context.Background()` internally — fine for scripts, wrong for servers. Without a context:

- Your inbound HTTP request handler can't cancel the outbound call.
- Deployment shutdowns have to wait the full default TCP timeout.
- A hung Kibamail call ties up a goroutine forever.

## Customize the HTTP client

Pass your own `*http.Client` via `NewCustomClient` to plug in metrics / tracing / retry / rate-limiting:

```go
httpClient := &http.Client{
    Timeout: 15 * time.Second,
    Transport: &tracingTransport{ // your wrapper
        next: &http.Transport{
            MaxIdleConns:        200,
            MaxIdleConnsPerHost: 50,
            IdleConnTimeout:     90 * time.Second,
            TLSHandshakeTimeout: 10 * time.Second,
        },
    },
}
kb := kibamail.NewCustomClient(httpClient, apiKey)
```

Keep `MaxIdleConnsPerHost` high (≥ 50) if you send at high QPS — the Go default of 2 is a common source of tail-latency stalls.

## Pagination — cursor, not offset

All `List*` endpoints use cursor-based pagination. Don't concat-scan; stream through:

```go
limit := 200
var cursor *string

for {
    page, err := kb.Contacts.ListWithContext(ctx, &kibamail.ListOptions{Limit: &limit, After: cursor})
    if err != nil { return err }
    for _, c := range page.Data { _ = process(c) }
    if !page.HasMore { break }
    last := page.Data[len(page.Data)-1].ID
    cursor = &last
}
```

- Max `Limit` is 200. Requesting more is silently capped.
- Pages are not stable across concurrent writes — if you need a snapshot, use `Search` with a pinned `createdAt <= :t0` filter.

## Rate limits

The API enforces per-workspace and per-key limits. The SDK exposes the headers on 429s via `*RateLimitError`:

```go
var rl *kibamail.RateLimitError
if errors.As(err, &rl) {
    wait, _ := strconv.Atoi(rl.RetryAfter)
    time.Sleep(time.Duration(wait) * time.Second)
}
```

**Never fire-and-forget a tight retry loop on 429.** Respect `RetryAfter`; if absent, back off exponentially starting at 1s.

## Bulk operations

The SDK has no batch endpoints. For bulk:

- **Contacts import:** use the dashboard CSV import or the `contact-imports` API (not yet in this SDK).
- **Transactional burst:** send concurrently with a bounded worker pool (e.g. 16 goroutines feeding `Emails.Send`); reuse the same `Client`; cap concurrency below the documented rate limit for your plan.
- **Deletes / tagging:** prefer `Segments` + automations to mass-mutate contacts instead of looping `Update`.

## Observability

Every error includes `RequestID`. Log it on every failure:

```go
log.Error().
    Str("request_id", apiErr.RequestID).
    Str("code", apiErr.Code).
    Int("status", apiErr.StatusCode).
    Msg(apiErr.Message)
```

Support tickets with a `RequestID` are triaged ~10x faster than without.

## TLS / endpoint override

For staging or self-hosted deployments:

```go
os.Setenv("KIBAMAIL_BASE_URL", "https://api.staging.kibamail.com")
kb := kibamail.NewClient(apiKey) // picks up env
// or explicit:
kb.BaseURL, _ = url.Parse("https://api.staging.kibamail.com/")
```

`BaseURL` is a `*url.URL`; keep the trailing slash so relative paths (e.g. `v1/emails`) resolve correctly.

## What this SDK does *not* do (yet)

- No automatic retries.
- No built-in idempotency keys.
- No streaming endpoints.
- No contact-import endpoint.
- No inbox WebSocket support.

Build these in a thin wrapper above the SDK; the `*WithContext` + injectable `HTTPClient` surface is designed for exactly that.
