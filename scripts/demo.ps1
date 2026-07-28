$ErrorActionPreference = 'Stop'
node (Join-Path $PSScriptRoot 'demo.mjs')
exit $LASTEXITCODE
