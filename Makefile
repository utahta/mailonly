.PHONY: build start dist test typecheck clean

node_modules: package-lock.json
	npm ci
	@node -e "fs.utimesSync('node_modules', new Date(), new Date())"

build: node_modules
	npm run build

start: build
	npm start

# Cleans first so files deleted from src/ are not packaged. The steps are in
# the recipe because make -j runs prerequisites in parallel.
dist:
	$(MAKE) clean
	$(MAKE) build
	npm run dist

test: node_modules
	npm test

typecheck: node_modules
	npm run typecheck

clean:
	node -e "fs.rmSync('dist', { recursive: true, force: true }); fs.rmSync('release', { recursive: true, force: true })"
