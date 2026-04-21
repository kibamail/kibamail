# Automations

Automations are DAGs (nodes + edges) that run per-contact in response to a trigger. Author the graph in the dashboard; drive the lifecycle and ad-hoc executions from the SDK.

## Lifecycle

```go
// Create as draft (usually done in dashboard; API is for programmatic provisioning)
a, _ := kb.Automations.Create(&kibamail.CreateAutomationRequest{
    Name:        "Post-signup welcome",
    Description: "3-email drip over 7 days",
    Trigger: &kibamail.AutomationTrigger{
        Type: "form.submitted",
        Config: &kibamail.AutomationTriggerConfig{FormId: "form_xyz"},
    },
    Nodes: nodes,  // authored upstream; treat as opaque blobs
    Edges: edges,
})

kb.Automations.Publish(a.ID)   // activate — subsequent trigger events fire it
kb.Automations.Archive(a.ID)   // stop accepting new runs; in-flight runs continue
kb.Automations.Delete(a.ID)    // hard delete (only for archived/draft)
```

### Trigger types

| `Trigger.Type` | Config fields |
|---|---|
| `form.submitted` | `FormId` |
| `segment.entered` / `segment.exited` | `SegmentId` |
| `contact.created` / `contact.updated` | — |
| `contact.property.changed` | `PropertyName` |
| `event.occurred` | `EventName` |
| `email.engaged` | `EmailEngagementType` ("opened"/"clicked") |
| `api` | — (manually via `Trigger()`) |

## Manually trigger for a contact

Useful from app code when a business event happens that isn't wired to a native trigger:

```go
_, err := kb.Automations.Trigger(a.ID, &kibamail.TriggerAutomationRequest{
    ContactId: "ct_abc",
    Metadata:  map[string]interface{}{"orderId": "ord_1", "plan": "pro"},
})
```

Metadata is passed to every node in the run context and is available in template variables (e.g. `{{ metadata.orderId }}`).

## Versioning

Every edit to a live automation should create a new version:

```go
kb.Automations.CreateVersion(a.ID, &kibamail.UpdateAutomationRequest{
    Nodes: newNodes, Edges: newEdges,
})

vs, _ := kb.Automations.ListVersions(a.ID)
// vs.Data contains the version chain; Automation.ParentId links a version back to the parent
```

In-flight runs finish on the version they started under; new trigger events use the latest published version.

## Dry-run with Simulate

Preview the branch/nodes a given contact would traverse — without sending emails or mutating state:

```go
sim, _ := kb.Automations.Simulate(a.ID, &kibamail.SimulateAutomationRequest{
    ContactId: "ct_abc",
    Seed:      ptr(42), // deterministic for A/B branches
})
// or use a virtual contact that doesn't exist in the workspace:
sim2, _ := kb.Automations.Simulate(a.ID, &kibamail.SimulateAutomationRequest{
    Contact: &kibamail.VirtualContact{
        Email: "virtual@example.com",
        Properties: map[string]interface{}{"plan":"pro","country":"US"},
        Topics: []string{"topic_a"},
    },
})
```

Use this to ensure decision nodes route correctly after a property migration.

## Listing

```go
kb.Automations.List(&kibamail.ListAutomationsOptions{
    Limit:  ptr(25),
    // + any filter fields the API supports; see sdks/go/automations.go for the struct
})
```

## Operational notes

- **Triggers are deduplicated per contact per run.** Triggering twice in quick succession won't start two parallel runs — the second call returns the existing run.
- **Metadata size is capped.** Keep payloads small (<4 KB) — move large blobs to contact properties.
- **Wait nodes keep time in Redis.** A 7-day delay holds state for 7 days; don't bulk-trigger millions in a single hour without capacity planning.
