import type Phaser from 'phaser';
import {currentLocale} from './index';

export function fitLocalizedLine(text:Phaser.GameObjects.Text,value:string,width:number,suffix=''){
 text.setText(value);
 if(text.width<=width)return;
 const locale=currentLocale();
 const line=suffix?value.slice(0,-suffix.length):value;
 const glyphs=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(locale,{granularity:'grapheme'}).segment(line)].map(part=>part.segment):Array.from(line);
 while(glyphs.length&&text.width>width){glyphs.pop();text.setText(glyphs.join('').trimEnd()+'…'+suffix);}
}

const appliedWrap=new WeakMap<Phaser.GameObjects.Text,{width:number;advanced:boolean}>();

export function wrapLocalizedText(text:Phaser.GameObjects.Text,width:number,advanced=false){
 const applied=appliedWrap.get(text);
 if(applied?.width===width&&applied.advanced===advanced)return text;
 appliedWrap.set(text,{width,advanced});
 const wrap=localizedWrap(width);
 return wrap.callback?text.setWordWrapCallback(wrap.callback):text.setWordWrapWidth(width,advanced);
}

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
