.PHONY: all

parser_deps := $(wildcard /typescript/*.ts)

scripts\main.js: $(parser_deps)
	powershell tsc typescript\main.ts -t es2018 --outDir scripts
