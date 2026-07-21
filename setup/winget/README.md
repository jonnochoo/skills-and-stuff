# winget

winget is Windows' built-in package manager for installing, updating, and removing apps from the command line.

winget itself is what [setup](../README.md) uses to install everything.

## Useful commands

Show installed packages:

```powershell
winget list
```

Show installed packages that have an update available:

```powershell
winget upgrade
```

Upgrade a specific package:

```powershell
winget upgrade --id <PackageId> -e
```

Upgrade everything that has an update available:

```powershell
winget upgrade --all
```
