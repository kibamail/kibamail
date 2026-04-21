# Automations — Go SDK Reference

Service: `kb.Automations`. Source: `sdks/go/automations.go`. Automations are DAGs (nodes + edges) that run per-contact in response to a trigger. Author graphs in the dashboard; drive lifecycle and ad-hoc execution from Go.

## Lifecycle

```go
// Create as draft — usually from the dashboard; API call shown for completeness.
a, err := kb.Automations.CreateWithContext(ctx, &kibamail.CreateAutomationRequest{
    Name:        "Post-signup welcome",
    Description: "3-email drip over 7 days",
    Trigger: &kibamail.AutomationTrigger{
        Type: "form.submitted",
        Config: &kibamail.AutomationTriggerConfig{FormId: "form_xyz"},
    },
    Nodes: nodes, // opaque — author in dashboard
    Edges: edges,
})

kb.Automations.PublishWithContext(ctx, a.ID)  // activate
kb.Automations.ArchiveWithContext(ctx, a.ID)  // pause — in-flight runs continue
kb.Automations.DeleteWithContext(ctx, a.ID)   // hard delete (only if archived/draft)
```

## Trigger types

| `Trigger.Type` | Required config |
|---|---|
| `form.submitted` | `FormId` |
| `segment.entered` | `SegmentId` |
| `segment.exited` | `SegmentId` |
| `contact.created` | — |
| `contact.updated` | — |
| `contact.property.changed` | `PropertyName` |
| `event.occurred` | `EventName` |
| `email.engaged` | `EmailEngagementType` ("opened" or "clicked") |
| `api` | — (fire manually via `Trigger()`) |

## Manually trigger for a contact

Useful when a business event isn't wired to a native trigger:

```go
_, err := kb.Automations.TriggerWithContext(ctx, a.ID, &kibamail.TriggerAutomationRequest{
    ContactId: "ct_abc",
    Metadata: map[string]interface{}{
        "orderId": "ord_1",
        "plan":    "pro",
    },
})
```

Metadata is injected into every node's render context and available as `{{ metadata.orderId }}` in template variables.

- Triggers are **idempotent per contact per run** — double-calls in quick succession return the existing run, not a new one.
- Keep `Metadata` < 4 KB. For large blobs, store on the contact as properties and reference those.

## Dry-run with Simulate

Preview the node path a contact would take — without sending emails or mutating state:

```go
sim, err := kb.Automations.SimulateWithContext(ctx, a.ID, &kibamail.SimulateAutomationRequest{
    ContactId: "ct_abc",
    Seed:      ptr(42), // deterministic for A/B decision nodes
})
```

Or with a virtual contact that doesn't exist in the workspace:

```go
kb.Automations.SimulateWithContext(ctx, a.ID, &kibamail.SimulateAutomationRequest{
    Contact: &kibamail.VirtualContact{
        Email:      "virtual@example.com",
        FirstName:  "Jane",
        Properties: map[string]interface{}{"plan": "pro", "country": "US"},
        Topics:     []string{"topic_a"},
    },
})
```

Use Simulate in CI before rolling out property/segment migrations that could change branching behavior.

## Versioning

Every substantive edit should create a new version — in-flight runs keep executing on the version they started on:

```go
kb.Automations.CreateVersionWithContext(ctx, a.ID, &kibamail.UpdateAutomationRequest{
    Nodes: newNodes,
    Edges: newEdges,
})

vs, _ := kb.Automations.ListVersionsWithContext(ctx, a.ID)
// Each version has ParentId linking back to the root automation.
```

New trigger events always execute against the latest published version.

## Listing

```go
kb.Automations.ListWithContext(ctx, &kibamail.ListAutomationsOptions{
    Limit: ptr(25),
    // filter fields — see sdks/go/automations.go for the struct
})
```

## Operational notes

- **Wait nodes hold state in Redis.** A 7-day delay keeps context for 7 days; don't bulk-trigger millions in an hour without capacity planning.
- **Metadata passed to `Trigger` is per-run immutable.** Later trigger calls for the same contact+run won't update it.
- **Segment-entered triggers fire on each entry.** If a contact leaves and re-enters a segment, the automation runs again. Use a deduplication node (or check on the contact) if you want once-only behavior.
