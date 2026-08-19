**Select** — dropdown styled to match `Input`. Use native `<option>` children.

```jsx
<Select label="Lead stage" defaultValue="new">
  <option value="new">New</option>
  <option value="qualified">Qualified</option>
  <option value="won">Closed — Won</option>
</Select>
```

- Same sizes, label, hint, and error behavior as `Input`. Custom chevron is built in.
