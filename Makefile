.PHONY: verify demo package release-check

verify:
	node scripts/verify.mjs

demo:
	node scripts/demo.mjs

package:
	npm run package

release-check:
	npm run release-check
