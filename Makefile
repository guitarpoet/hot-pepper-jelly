################################################################################
#
# The makefile for hot-pepper-jelly
#
# @author Jack
# @version 1.0
# @date Thu Nov 30 11:26:35 2017
#
################################################################################


#===============================================================================
#
# Debug
#
#===============================================================================

ifdef DEV
	SILENT := 
else
	SILENT := @
endif

#===============================================================================
#
# Variables
#
#===============================================================================


NINJA := ninja
CAT := cat
CD := cd
ECHO := echo
COMMIT = $(shell $(GIT) rev-parse --short HEAD)
CP := cp
CTAGS := ctags -R
DVIPDF := dvipdf
ECHO := echo
GIT := git
JAR := jar
JAVA := java
JDB := jldb
JSON_PP := json_pp
LATEX := latex
M4 := m4 -I /opt/local/include/ -I m4
MAVEN := mvn
MKDIR := mkdir -p
PHP := php
RM := rm -rf
RSYNC := rsync -avz -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null" --progress 
SASS := sass
SCP := scp
MESON := meson
SSH := ssh
SUDO := sudo
UGLIFYJS := uglifyjs
UNZIP := unzip
RELOAD_CHROME := $(SILENT) sh chrome.sh reload
RELOAD_SAFARI := $(SILENT) sh safari.sh reload
XELATEX := xelatex
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

#===============================================================================
#
# Core Functions
#
#===============================================================================

rwildcard=$(foreach d,$(wildcard $1*),$(call rwildcard,$d/,$2) $(filter $(subst *,%,$2),$d))
uniq = $(if $(1),$(strip $(word 1,$(1)) $(call uniq,$(filter-out $(word 1,$(1)),$(1)))))
ssh_exec = $(shell $(SSH) root@$(1) $(2))

#===============================================================================
#
# Tasks
#
#===============================================================================

test: $(ALL_DIST)
	$(SILENT) NODEPATH=.:src:spec:node_modules $(JASMINE)
.PHONY: test

debug: $(ALL_DIST)
	$(SILENT) NODEPATH=.:src:spec:node_modules node --inspect-brk $(JASMINE)
.PHONY: debug

clean:
	$(SILENT) $(RM) $(ALL_DIST)
.PHONY: clean

config_test: $(ALL_DIST)
	$(SILENT) NODEPATH=.:src:spec:node_modules node tests/config_test.js
.PHONY: config_test

publish: $(ALL_DIST)
	$(SILENT) npm publish
.PHONY: publish

