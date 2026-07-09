**Card** — the primary surface container for dashboard panels, content blocks, and clickable list items. Pair with `CardHeader` for a titled section.

```jsx
<Card padding="md">
  <CardHeader title="Pipeline" subtitle="This month" action={<Badge tone="brand">+12%</Badge>} />
  …
</Card>

<Card interactive onClick={open}>…</Card>
```

- `padding`: `none | sm | md | lg`. `interactive` adds hover lift for clickable cards.
- White surface, 1px subtle border, soft `--shadow-sm`. Don't stack heavy shadows — let the border carry separation.
