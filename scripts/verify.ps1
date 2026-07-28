$ErrorActionPreference = 'Stop'
node (Join-Path $PSScriptRoot 'verify.mjs')
exit $LASTEXITCODE
