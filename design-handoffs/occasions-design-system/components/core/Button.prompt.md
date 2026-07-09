**Button** — the primary call-to-action control; use `primary` for the single main action per view, `secondary` for supporting actions, `ghost` for low-emphasis/inline actions, `danger` for destructive ones.

```jsx
<Button variant="primary" size="md" onClick={save}>Save changes</Button>
<Button variant="secondary" leftIcon={<PlusIcon/>}>New contact</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" loading>Deleting…</Button>
```

- Variants: `primary` (brand blue + brand shadow), `secondary` (white, bordered), `ghost` (blue text, tinted hover), `danger` (red).
- Sizes: `sm` 34px · `md` 42px · `lg` 52px.
- Props: `leftIcon` / `rightIcon`, `fullWidth`, `loading`, `disabled`. Render as a link with `as="a"` + `href`.
- Only one `primary` per screen region. Pair with Montserrat SemiBold automatically.
