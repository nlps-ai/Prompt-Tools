#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 验证项目配置...\n');

// 检查必要文件
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'src-tauri/Cargo.toml',
  'src-tauri/tauri.conf.json',
  'src-tauri/src/main.rs',
  'src-tauri/src/lib.rs',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.github/workflows/build-test.yml'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allFilesExist = false;
  }
});

// 检查package.json配置
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('\n📦 Package.json 检查:');
  
  const requiredScripts = ['dev', 'build', 'typecheck', 'tauri'];
  requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
      console.log(`✅ 脚本: ${script}`);
    } else {
      console.log(`❌ 缺少脚本: ${script}`);
      allFilesExist = false;
    }
  });

  const requiredDeps = ['@tauri-apps/api'];
  requiredDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`✅ 依赖: ${dep}`);
    } else {
      console.log(`❌ 缺少依赖: ${dep}`);
      allFilesExist = false;
    }
  });

  const requiredDevDeps = ['@tauri-apps/cli', 'typescript', 'vite'];
  requiredDevDeps.forEach(dep => {
    if (pkg.devDependencies && pkg.devDependencies[dep]) {
      console.log(`✅ 开发依赖: ${dep}`);
    } else {
      console.log(`❌ 缺少开发依赖: ${dep}`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log('❌ 无法解析 package.json');
  allFilesExist = false;
}

// 检查Tauri配置
try {
  const tauriConf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  console.log('\n🦀 Tauri 配置检查:');
  
  if (tauriConf.build && tauriConf.build.beforeBuildCommand) {
    console.log(`✅ beforeBuildCommand: ${tauriConf.build.beforeBuildCommand}`);
  } else {
    console.log('❌ 缺少 beforeBuildCommand');
    allFilesExist = false;
  }

  if (tauriConf.build && tauriConf.build.frontendDist) {
    console.log(`✅ frontendDist: ${tauriConf.build.frontendDist}`);
  } else {
    console.log('❌ 缺少 frontendDist');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ 无法解析 src-tauri/tauri.conf.json');
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 所有配置检查通过！项目已准备好进行自动构建。');
  console.log('\n📝 下一步:');
  console.log('1. 提交所有更改到 Git');
  console.log('2. 推送到 GitHub');
  console.log('3. 创建标签进行发布: git tag v0.1.0 && git push origin v0.1.0');
} else {
  console.log('❌ 发现配置问题，请修复后重试。');
  process.exit(1);
}