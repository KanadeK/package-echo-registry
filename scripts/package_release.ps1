$ErrorActionPreference = 'Stop'
node (Join-Path $PSScriptRoot 'packageRelease.mjs')
exit $LASTEXITCODE
