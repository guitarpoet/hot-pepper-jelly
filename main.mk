test: $(ALL_DIST)
	$(SILENT) NODEPATH=.:src:spec:node_modules $(JASMINE)
.PHONY: test

debug: $(ALL_DIST)
	$(SILENT) NODEPATH=.:src:spec:node_modules node --inspect-brk $(JASMINE)
.PHONY: debug

clean:
	$(SILENT) $(RM) $(ALL_DIST)
.PHONY: clean
