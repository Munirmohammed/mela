// Metro config for an Expo app inside a pnpm + Turborepo monorepo.
// See https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch the whole monorepo so workspace packages (@mela/*) hot-reload.
config.watchFolders = [workspaceRoot]

// 2. Resolve modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. With pnpm's isolated store, disable hierarchical lookup and rely on the
//    explicit nodeModulesPaths above.
config.resolver.disableHierarchicalLookup = true

module.exports = config
