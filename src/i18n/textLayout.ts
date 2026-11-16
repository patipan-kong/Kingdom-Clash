import type Phaser from 'phaser';
import {currentLocale} from './index';

// Phaser's default wrap only breaks on spaces. Keep EN metrics and wrapping as-is.
export function localizedWrap(width:number):Phaser.Types.GameObjects.Text.TextWordWrap{
 const locale=currentLocale();
 if(locale==='en'||typeof Intl.Segmenter!=='function')return {width};
 const words=new Intl.Segmenter(locale,{granularity:'word'});
 const graphemes=new Intl.Segmenter(locale,{granularity:'grapheme'});
 return {width,callback:(value,text)=>value.split('\n').flatMap(paragraph=>{
  const lines:string[]=[],parts:string[]=[];
  for(const {segment} of words.segment(paragraph)){
   const last=parts.at(-1);
   if(last&&locale==='ja'&&(/^[、。）」』】！？]/.test(segment)||/[（「『【]$/.test(last)))parts[parts.length-1]+=segment;
   else parts.push(segment);
  }
  let line='';
  const fits=(value:string)=>text.context.measureText(value).width<=width;
  for(const part of parts){
   if(line&&!fits(line+part)){lines.push(line.trimEnd());line='';}
   const next=line?part:part.trimStart();
   if(fits(next)){line+=next;continue;}
   for(const {segment} of graphemes.segment(next)){
    if(line&&!fits(line+segment)){lines.push(line);line='';}
    line+=segment;
   }
  }
  lines.push(line.trimEnd());
  return lines;
 })};
}
