(function(root){
'use strict';
const MAX=2000;
function time(s){
 const m=String(s).trim().match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})[.,](\d{3})$/);
 if(!m||+m[2]>59||+m[3]>59) throw Error('Use HH:MM:SS.mmm, for example 00:01:25.500.');
 const n=((+(m[1]||0)*60 + +m[2])*60 + +m[3])*1000 + +m[4];
 if(n>359999999)throw Error('Times must be below 100 hours.');return n;
}
function stamp(n,comma=false){if(!Number.isFinite(n)||n<0)throw Error('Invalid time.'); n=Math.round(n);const h=Math.floor(n/3600000),m=Math.floor(n/60000)%60,s=Math.floor(n/1000)%60;return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':')+(comma?',':'.')+String(n%1000).padStart(3,'0');}
const chars=s=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(s)].length:[...s].length;
function validate(cues){if(!Array.isArray(cues)||!cues.length||cues.length>MAX)throw Error('A project needs 1–2,000 captions.');cues.forEach((c,i)=>{if(!c||typeof c.text!=='string'||c.text.length>10000||!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end<=c.start||c.end>359999999)throw Error('Caption '+(i+1)+' has invalid text or timing.');});return cues;}
function parse(src){
 if(typeof src!=='string'||src.length>2000000)throw Error('Choose a text subtitle file under 2 MB.');
 src=src.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();const vtt=src.startsWith('WEBVTT');let warnings=[];let cues=[];
 for(const [bi,block] of src.split(/\n[ \t]*\n/).entries()){
  const lines=block.split('\n');if(vtt&&/^(WEBVTT|NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(lines[0])){if(!lines[0].startsWith('WEBVTT'))warnings.push('A VTT note, style or region block was omitted.');continue;}
  let ti=lines.findIndex(l=>l.includes('-->'));if(ti<0||ti>1)throw Error('Block '+(bi+1)+' is not a supported subtitle cue. Import SRT or basic VTT.');
  let t=lines[ti].match(/^(\S+)\s+-->\s+(\S+)(.*)$/);if(!t)throw Error('Invalid cue timing in block '+(bi+1));
  let raw=lines.slice(ti+1).join('\n'),text=raw.replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
  if(t[3].trim()||raw!==text)warnings.push('Formatting/positioning removed; output uses plain captions.');
  cues.push({start:time(t[1]),end:time(t[2]),text});
 }
 validate(cues);const ordered=cues.every((c,i)=>!i||c.start>=cues[i-1].start);if(!ordered)warnings.push('Cues reordered by start time.');
 return {cues:cues.sort((a,b)=>a.start-b.start),warnings:[...new Set(warnings)]};
}
function issues(cues,limits={cps:20,line:42,min:800}){let out=[];cues.forEach((c,i)=>{
 const dur=c.end-c.start, rate=chars(c.text.replace(/\s/g,''))/(dur/1000),add=(code,label,severity='review')=>out.push({index:i,code,label,severity});
 if(!c.text.trim())add('empty','Empty caption','error');
 if(dur<limits.min)add('short','Less than '+limits.min/1000+' seconds');
 if(rate>limits.cps)add('fast',rate.toFixed(1)+' characters/sec');
 if(c.text.split('\n').some(l=>chars(l)>limits.line))add('long','Line exceeds '+limits.line+' characters');
 if(c.text.split('\n').length>2)add('lines','More than two lines');
 if(c.text.includes('-->'))add('arrow','Arrow marker inside caption text','error');
 if(/\n\s*\n/.test(c.text))add('blankline','Blank line inside caption text','error');
 for(let j=i-1;j>=0;j--){if(cues[j].end>c.start&&cues[j].start<c.end){add('overlap','Overlaps caption '+(j+1));break;}}
 });return out;}
function wrap(text,width=42){const words=text.trim().split(/\s+/),lines=[];let line='';for(const w of words){if(line&&chars(line+' '+w)>width){lines.push(line);line=w;}else line+=(line?' ':'')+w;}if(line)lines.push(line);return lines.join('\n');}
function shift(cues,delta){if(!Number.isFinite(delta))throw Error('Enter a numeric offset.');const d=Math.round(delta);const out=cues.map(c=>({...c,start:c.start+d,end:c.end+d}));validate(out);return out;}
function clip(cues,a,b){if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a)throw Error('Clip end must be after its start.');return cues.filter(c=>c.end>a&&c.start<b).map(c=>({start:Math.max(c.start,a)-a,end:Math.min(c.end,b)-a,text:c.text}));}
function serialize(cues,format='srt'){validate(cues);if(issues(cues).some(x=>x.severity==='error'))throw Error('Resolve empty captions, blank internal lines or arrow markers before exporting.');return (format==='vtt'?'WEBVTT\n\n':'')+cues.map((c,i)=>(format==='srt'?i+1+'\n':'')+stamp(c.start,format==='srt')+' --> '+stamp(c.end,format==='srt')+'\n'+(format==='vtt'?c.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):c.text)).join('\n\n')+'\n';}
function split(cues,index){const c=cues[index],words=c.text.trim().split(/\s+/);if(words.length<2||c.end-c.start<400)throw Error('Splitting requires at least two words and 0.4 seconds.');const cut=Math.ceil(words.length/2),mid=Math.round(c.start+(c.end-c.start)*cut/words.length);let out=cues.map(c=>({...c}));out.splice(index,1,{start:c.start,end:mid,text:words.slice(0,cut).join(' ')},{start:mid,end:c.end,text:words.slice(cut).join(' ')});validate(out);return out;}
function merge(cues,index){if(index>=cues.length-1)throw Error('There is no next caption.');const a=cues[index],b=cues[index+1],out=cues.map(c=>({...c}));out.splice(index,2,{start:a.start,end:Math.max(a.end,b.end),text:a.text.trim()+' '+b.text.trim()});return out;}
function validateClips(clips){if(!Array.isArray(clips)||clips.length>50)throw Error('A batch can hold up to 50 clips.');for(const c of clips)if(!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>120||!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<0||c.end<=c.start||c.end>359999999)throw Error('A batch clip has an invalid name or range.');return clips;}
function restore(raw){const p=JSON.parse(raw);if(p.schema!=='caption-desk/1'||typeof p.title!=='string'||p.title.length>200)throw Error('This is not a Caption Desk backup.');validate(p.cues);if(p.clips!==undefined)validateClips(p.clips);return {...(p.clips?{clips:p.clips.map(c=>({name:c.name,start:c.start,end:c.end}))}:{}),title:p.title,cues:p.cues.map(c=>({start:c.start,end:c.end,text:c.text})).sort((a,b)=>a.start-b.start)};}
const demo=[
 [0,4200,'A good edit helps the listener follow the thought.'],
 [4100,7300,'But a short clip can lose the sentence that explains it.'],
 [7500,11000,'Before choosing the strongest line, listen to what comes before it.'],
 [11300,11800,'Context matters.'],
 [12400,16900,'A subtitle is a promise: these are the words the speaker said.'],
 [17500,21000,'Correct the recognition error. Preserve the meaning.'],
 [21500,25600,'A pause can give an important thought room to land.'],
 [26000,30000,'You can shorten the clip without changing the claim.'],
 [30500,34500,'తెలుగు పదాలను కూడా ఇక్కడ సవరించవచ్చు.'],
 [35000,38500,'Check names, numbers and every quoted reference.'],
 [39000,43000,'A strong opening still needs a complete ending.'],
 [43500,48000,'Choose a start and end, then export captions for that exact cut.'],
 [48500,52500,'The new file begins at zero. Your source stays in place.'],
 [53000,57200,'Read it once in silence. Then watch it with the sound on.'],
 [57500,62000,'When the words and timing agree, the message becomes easier to follow.'],
 [62500,66000,'This is a fictional practice transcript, not a recorded sermon.']
].map(([start,end,text])=>({start,end,text}));
const api={time,stamp,chars,parse,validate,issues,wrap,shift,clip,serialize,split,merge,restore,validateClips,demo};
if(typeof module!=='undefined')module.exports=api;root.Captions=api;
})(typeof window==='undefined'?globalThis:window);
