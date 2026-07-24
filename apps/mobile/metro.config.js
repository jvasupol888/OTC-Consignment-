const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Removed disableHierarchicalLookup to allow pnpm to resolve peer dependencies

const modulesToForce = ['react', 'react-dom', 'react-native', 'react-native-web'];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check if the module name matches exactly or is a sub-path (e.g., 'react/jsx-runtime')
  const baseModuleName = moduleName.split('/')[0];
  if (modulesToForce.includes(baseModuleName)) {
    // Resolve to the root node_modules directory
    const resolvedPath = path.resolve(workspaceRoot, 'node_modules', moduleName);
    return context.resolveRequest(context, resolvedPath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.blockList = [
  /.*\.docker-data.*/,
];

module.exports = config;
