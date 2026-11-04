import {chromium} from '@playwright/test';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=process.env.AUDIO_EVIDENCE_ROOT||'docs/audio-foundation/assets';
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5217/?encounter=extended';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:780,height:360}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.visualReady);
 const analysis=await page.evaluate(()=>{
  const g=window.kingdomGame,keys=['bgm-exploration','bgm-battle','bgm-critical','sfx-guardian-impact','sfx-keep-warning','sfx-build-complete','sfx-banner-captured','sfx-victory','sfx-defeat'];
  const db=x=>x>0?20*Math.log10(x):-120,round=x=>Math.round(x*1000)/1000;
  return keys.map(key=>{
   const b=g.cache.audio.get(key);if(!b)return {file:key+'.mp3',loaded:false};
   const channels=Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i)),step=Math.round(b.sampleRate*.01),bins=[];let energy=0,peak=0,clipped=0;
   for(let i=0;i<b.length;i+=step){let sum=0,count=0;for(const c of channels)for(let j=i;j<Math.min(i+step,b.length);j++){const v=c[j];sum+=v*v;count++;peak=Math.max(peak,Math.abs(v));if(Math.abs(v)>=.999)clipped++;}bins.push(Math.sqrt(sum/count));energy+=sum;}
   const threshold=10**(-50/20),first=bins.findIndex(x=>x>=threshold),last=bins.findLastIndex(x=>x>=threshold);
   const rms=(start,end)=>{let sum=0,n=0;for(const c of channels)for(let i=Math.max(0,Math.floor(start*b.sampleRate));i<Math.min(b.length,Math.floor(end*b.sampleRate));i++){sum+=c[i]*c[i];n++;}return Math.sqrt(sum/Math.max(1,n));};
   let seamJump=0;for(const c of channels)seamJump=Math.max(seamJump,Math.abs(c[0]-c[c.length-1]));
   let tailPeakAt=0,tailPeak=0;const tailStart=Math.max(0,bins.length-500);for(let i=tailStart;i<bins.length;i++)if(bins[i]>tailPeak){tailPeak=bins[i];tailPeakAt=i*.01;}
   return {file:key+'.mp3',loaded:true,durationSeconds:round(b.duration),sampleRate:b.sampleRate,channels:b.numberOfChannels,frames:b.length,rmsDb:round(db(Math.sqrt(energy/(b.length*b.numberOfChannels)))),peakDb:round(db(peak)),samplesAtOrAbove0999:clipped,leadingSilenceSeconds:round(first<0?b.duration:first*.01),trailingSilenceSeconds:round(last<0?b.duration:Math.max(0,b.duration-(last+1)*.01)),silenceThresholdDb:-50,start1sRmsDb:round(db(rms(0,1))),end1sRmsDb:round(db(rms(b.duration-1,b.duration))),startQuarterRmsDb:round(db(rms(0,.25))),endQuarterRmsDb:round(db(rms(b.duration-.25,b.duration))),seamSampleJump:round(seamJump),last5sPeakAtSeconds:round(tailPeakAt),envelope100msDb:Array.from({length:Math.ceil(bins.length/10)},(_,i)=>round(db(Math.sqrt(bins.slice(i*10,i*10+10).reduce((n,x)=>n+x*x,0)/bins.slice(i*10,i*10+10).length))))};
  });
 });
 function mpegInfo(b){
  let offset=0,frames=0,sampleRate,bitrateKbps,channels;const rates=[44100,48000,32000],bitrates=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
  while(offset+4<=b.length){const h=b.readUInt32BE(offset),version=(h>>>19)&3,layer=(h>>>17)&3,rateIndex=(h>>>10)&3,bitrateIndex=(h>>>12)&15;
   if((h>>>21)!==2047||version!==3||layer!==1||rateIndex===3||!bitrates[bitrateIndex])break;
   const rate=rates[rateIndex],bitrate=bitrates[bitrateIndex],size=Math.floor(144000*bitrate/rate)+((h>>>9)&1);if(offset+size>b.length)break;
   sampleRate??=rate;bitrateKbps??=bitrate;channels??=((h>>>6)&3)===3?1:2;offset+=size;frames++;
  }
  return {codec:frames?'MPEG-1 Layer III':'Unrecognized',sourceSampleRate:sampleRate,firstFrameBitrateKbps:bitrateKbps,sourceChannels:channels,mpegFrames:frames,parsedBytes:offset,unparsedBytes:b.length-offset};
 }
 const files=[];for(const name of (await readdir('public/assets/audio')).filter(n=>n.endsWith('.mp3'))){const bytes=await readFile('public/assets/audio/'+name);files.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),mpegFrameSync:bytes[0]===255&&(bytes[1]&224)===224,id3v2:bytes.toString('ascii',0,3)==='ID3',id3v1:bytes.toString('ascii',bytes.length-128,bytes.length-125)==='TAG',...mpegInfo(bytes),...analysis.find(a=>a.file===name)});}
 await writeFile(root+'/asset-inventory.json',JSON.stringify({url,analysis:'Actual Phaser-decoded PCM; 10ms windows; silence threshold -50dBFS. Automated measurements, not subjective listening.',errors,files},null,2));
 console.log(JSON.stringify(files.map(({envelope100msDb,...rest})=>rest),null,2));if(files.length!==9||files.some(f=>!f.loaded)||errors.length)throw Error('Asset inventory failed');
}finally{await browser.close();}
