const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function loadTs(relative,mocks={}){
 const filename=path.join(root,relative),source=fs.readFileSync(filename,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const mod={exports:{}};
 const resolve=(name)=>{if(Object.hasOwn(mocks,name))return mocks[name];if(name==='server-only')return {};if(name.startsWith('@/'))return loadTs(name.slice(2)+'.ts',mocks);if(name.startsWith('.'))return loadTs(path.relative(root,path.resolve(path.dirname(filename),name))+'.ts',mocks);return require(name);};
 vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename})(resolve,mod,mod.exports);return mod.exports;
}
module.exports={loadTs,root};
