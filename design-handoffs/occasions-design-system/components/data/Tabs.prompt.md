**Tabs** — segmented control for switching views inside a panel (e.g. Contacts / Companies / Deals).

```jsx
<Tabs
  defaultValue="all"
  onChange={setView}
  tabs={[
    { value: 'all', label: 'All', count: 248 },
    { value: 'new', label: 'New', count: 12 },
    { value: 'won', label: 'Won' },
  ]}
/>
```

- Pill style on a sunken track; active tab is a white chip with brand-blue text. Supports `icon` and `count` per tab.
