import ts from 'typescript';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const dir of ['simulation','data','world']){
 await mkdir(`.test-build/${dir}`,{recursive:true});
 for(const name of await readdir(`src/${dir}`))if(name.endsWith('.ts')){
  const result=ts.transpileModule(await readFile(`src/${dir}/${name}`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  await writeFile(`.test-build/${dir}/${name.replace('.ts','.js')}`,result.outputText);
 }
}
await writeFile('.test-build/package.json','{"type":"commonjs"}');
const result=spawnSync(process.execPath,['--test','tests/simulation.cjs'],{stdio:'inherit'});process.exit(result.status??1);
