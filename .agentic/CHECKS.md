# portfolio Checks

Run the light agentic doctor before handoff:

```powershell
python C:\Users\sergi\.codex\agentic-coding\scripts\agentic_doctor.py C:\Users\sergi\Syncthing\portfolio
```

## Standard

```powershell
npm run build
npm run lint
npm run format:check
npm test
```

## UI/navigation/responsive

```powershell
npm run build
npm run preview
npm run test:integration
```

## Maintenance

```powershell
npm run jscpd
npm run test:coverage
```

If a check is skipped, write the reason in the active work-pack `handoff.md`.
