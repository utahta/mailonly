.PHONY: build start test typecheck clean

node_modules: package-lock.json
	npm ci
	@node -e "fs.utimesSync('node_modules', new Date(), new Date())"

build: node_modules
	npm run build

start: build
	npm start

test: node_modules
	npm test

typecheck: node_modules
	npm run typecheck

clean:
	node -e "fs.rmSync('dist', { recursive: true, force: true })"
