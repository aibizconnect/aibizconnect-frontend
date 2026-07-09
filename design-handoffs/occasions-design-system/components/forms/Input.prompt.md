**Input** — labelled text field with optional inline icons, hint, and error state.

```jsx
<Input label="Work email" type="email" placeholder="you@firm.com" leftIcon={<MailIcon/>} />
<Input label="Phone" hint="We'll text appointment reminders" />
<Input label="Email" error="Enter a valid address" />
```

- Sizes `sm | md | lg`. Focus shows the brand ring (`--ring-focus`); `error` turns the border red and swaps hint → error text.
- Pair with `Select`, `Checkbox`, `Switch` in forms. Always provide a `label`.
