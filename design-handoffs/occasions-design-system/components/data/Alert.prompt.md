**Alert** — inline status banner with a built-in icon per tone.

```jsx
<Alert tone="success" title="Campaign sent" onClose={dismiss}>
  Your newsletter reached 1,204 contacts.
</Alert>
<Alert tone="warning" title="Payment method expiring soon" />
```

- Tones: `info` (brand blue), `success`, `warning`, `danger`. Pass `onClose` to make it dismissible.
- Icon + colors are matched automatically — don't override the tone palette.
