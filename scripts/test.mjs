import ts from 'typescript';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const dir of ['simulation','data','world','ui']){
 await mkdir(`.test-build/${dir}`,{recursive:true});
 for(const name of await readdir(`src/${dir}`))if(name.endsWith('.ts')){
  const result=ts.transpileModule(await readFile(`src/${dir}/${name}`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  await writeFile(`.test-build/${dir}/${name.replace('.ts','.js')}`,result.outputText);
 }
}
await writeFile('.test-build/package.json','{"type":"commonjs"}');
const requested=process.argv.slice(2),files=(await readdir('tests')).filter(f=>f.endsWith('.cjs')&&(!requested.length||requested.includes(f)));
if(requested.some(f=>!files.includes(f)))throw new Error('Unknown focused test file');
const result=spawnSync(process.execPath,['--test',...files.map(f=>'tests/'+f)],{stdio:'inherit'});process.exit(result.status??1);
