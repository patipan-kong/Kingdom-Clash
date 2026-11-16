import {messages} from './messages';

export const locales=['en','th','ja'] as const;
export type Locale=typeof locales[number];
export type TranslationKey=keyof typeof messages;
type Params=Readonly<Record<string,string|number>>;
const preferenceKey='kingdom-clash.locale.v1';
const isLocale=(value:unknown):value is Locale=>locales.some(locale=>locale===value);

function savedLocale():Locale{
 try{const value=globalThis.localStorage?.getItem(preferenceKey);if(isLocale(value))return value;}catch{/* Storage is optional. */}
 return 'en';
}

let locale=savedLocale();
export const currentLocale=()=>locale;

export function translate(key:TranslationKey,language:Locale,params:Params={}):string{
 const row=messages[key] as readonly (string|undefined)[];
 return (row[locales.indexOf(language)]??row[0]??key).replace(/\{(\w+)\}/g,(token,name)=>String(params[name]??token));
}
export const t=(key:TranslationKey,params?:Params)=>translate(key,locale,params);

const chapterTitles={
 'first-war':'firstWar','burning-frontier':'burningFrontier','frozen-crown':'frozenCrown',
 'conquered-lands':'conqueredLands','rise-of-the-heroes':'riseOfHeroes',
} as const satisfies Record<string,TranslationKey>;
export function chapterTitle(chapter:{id:string;title:string}){
 const key=chapterTitles[chapter.id as keyof typeof chapterTitles];
 return key?t(key):chapter.title;
}
export const missionTitle=(id:string,title:string)=>id==='campaign-01'?t('ford'):title;

export const localeFont=(english:string,language=locale)=>language==='en'?english:
 `"${language==='th'?'Noto Sans Thai':'Noto Sans JP'}", ${english}`;

export async function prepareLocale(language:Locale){
 if(language==='en')return;
 const family=localeFont('sans-serif',language);
 const sample=language==='th'?'เริ่มแคมเปญ':'キャンペーン';
 try{
  await Promise.all([document.fonts.load(`400 16px ${family}`,sample),document.fonts.load(`700 16px ${family}`,sample)]);
 }catch{/* Keep the platform fallback available if the font fails to load. */}
}

export function applyDocumentLocale(){
 document.documentElement.lang=locale;
 const title=document.querySelector('#rotate strong'),hint=document.querySelector('#rotate span');
 if(title)title.textContent=t('rotate');
 if(hint)hint.textContent=t('rotateHint');
}

export async function selectLocale(language:Locale){
 await prepareLocale(language);
 locale=language;
 try{globalThis.localStorage?.setItem(preferenceKey,language);}catch{/* Keep the selection for this session. */}
 applyDocumentLocale();
}
