$ErrorActionPreference = 'Stop'
node (Join-Path $PSScriptRoot 'releaseCheck.mjs')
exit $LASTEXITCODE
