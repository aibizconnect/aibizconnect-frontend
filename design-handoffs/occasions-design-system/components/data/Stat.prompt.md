**Stat** — KPI block for dashboards: label, large display value, optional trend delta + icon.

```jsx
<Stat label="Pipeline value" value="$48,920" delta="12.4%" icon={<DollarIcon/>} />
<Stat label="No-shows" value="3" delta="-8%" />
```

- Value uses the display font. Up = green, down = red (inferred from a leading `-`, or force with `deltaDirection`).
- Drop several into a grid of `Card`s for the dashboard overview row.
