SRC := src
# All source code files are in the src folder, let's count them out
ALL_SRC := $(shell find $(SRC) -name "*.ts" -not -name *.d.ts) core.ts node.ts
# Translate the names from ts to js for all the dist files
ALL_DIST := $(ALL_SRC:.ts=.js)
TSC := $(shell which tsc)
TSC_OPTIONS := --sourceMap true --module es6 --moduleResolution node --target ES2018 --allowJs true --experimentalDecorators true --module commonjs --lib es6 --allowUnreachableCode false --allowUnusedLabels false --noUnusedLocals true
JASMINE := ./node_modules/.bin/jasmine

%.js: %.ts
	$(TSC) $(TSC_OPTIONS) $<
