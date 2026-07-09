**IconButton** — square, icon-only button for toolbars, table-row actions, and compact controls; always pass `label` for accessibility.

```jsx
<IconButton label="More options" variant="ghost"><MoreIcon/></IconButton>
<IconButton label="Add" variant="primary"><PlusIcon/></IconButton>
```

- Same variant language as Button: `primary`, `secondary` (default), `ghost`.
- Sizes `sm` 34 · `md` 42 · `lg` 52 — match the adjacent Button size.
