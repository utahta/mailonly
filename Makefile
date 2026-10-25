.PHONY: build start test typecheck clean

node_modules: package-lock.json
	npm ci
	@touch node_modules

build: node_modules
	npm run build

start: build
	npm start

test: node_modules
	npm test

typecheck: node_modules
	npm run typecheck

clean:
	rm -rf dist
