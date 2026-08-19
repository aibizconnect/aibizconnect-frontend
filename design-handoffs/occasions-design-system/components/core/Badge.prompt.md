**Badge** — compact pill for statuses, counts, and category labels (e.g. lead stage, plan tier).

```jsx
<Badge tone="success" dot>Active</Badge>
<Badge tone="brand">Pro</Badge>
<Badge tone="warning" dot>Follow-up due</Badge>
<Badge tone="danger" solid>Overdue</Badge>
```

- Tones: `neutral`, `brand`, `success`, `warning`, `danger`. Soft tint by default; `solid` for high emphasis.
- `dot` adds a leading status dot — good for pipeline/lead states.
