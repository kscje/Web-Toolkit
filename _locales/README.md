# Generated Chrome Locale Files

Do not edit `messages.json` files in this directory by hand.

Maintain extension copy in `locales/en.json` and `locales/zh.json`, then run:

```sh
node scripts/generate_locales.js
```

Chrome still requires the `_locales/*/messages.json` layout for `__MSG_*` values in `manifest.json`, so this directory is kept as generated output.
