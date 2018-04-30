test: $(ALL_DIST)
	$(SILENT) NODEPATH=.:src:spec:node_modules $(JASMINE)
clean:
	$(SILENT) $(RM) $(ALL_DIST)
.PHONY: clean
