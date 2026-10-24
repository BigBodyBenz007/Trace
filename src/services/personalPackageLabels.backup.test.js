import { webcrypto } from 'crypto';
import fixture from './__fixtures__/personalPackageLabel.json';
import { createTraceBackup, validateTraceBackup, restoreTraceBackup } from './traceBackup';
import { sha256CanonicalJson } from './traceBackupIntegrity';
import { savePersonalLabel, readPersonalLabels, PERSONAL_LABEL_KEY } from './personalPackageLabels';
const storage=(data={})=>{const map=new Map(Object.entries(data));return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};};
function database(initial=[]){
 let rows=[...initial];
 return {records:()=>rows,transaction(name,mode){
  let next=[...rows];const tx={objectStore:()=>({
   getAll(){const r={};setTimeout(()=>{r.result=rows;r.onsuccess?.();},0);return r;},
   get(id){const r={};setTimeout(()=>{r.result=rows.find(x=>x.id===id);r.onsuccess?.();},0);return r;},
   put(p){next=next.filter(x=>x.id!==p.id).concat(p);},delete(id){next=next.filter(x=>x.id!==id);},clear(){next=[];}
  })};if(mode==='readwrite')setTimeout(()=>{rows=next;tx.oncomplete?.();},0);return tx;
 }};
}
test('personal panel and one photo copy survive real backup validation and restore; old entries stay snapshots',async()=>{
 const photo={id:'label-photo-test',role:'nutrition',mimeType:'image/jpeg',bytes:5,blob:new Blob(['image'],{type:'image/jpeg'})};
 const p={...fixture.profile,photos:[{id:photo.id,role:photo.role,mimeType:photo.mimeType,bytes:photo.bytes}]};
 const from=storage(),db=database();await savePersonalLabel(p,[photo],{storage:from,openDatabase:async()=>db});
 const archived=await createTraceBackup({storage:from,openDatabase:async()=>db,cryptoProvider:webcrypto});
 expect(archived.schemaVersion).toBe(10);expect(archived.data.photos).toHaveLength(1);expect(archived.data.structured.personalPackageLabels).toEqual([p]);
 const to=storage(),other=database();await restoreTraceBackup(archived,{confirmed:true,storage:to,openDatabase:async()=>other,cryptoProvider:webcrypto});
 expect(readPersonalLabels(to)).toEqual([p]);expect(other.records()).toHaveLength(1);expect(other.records()[0].blob.size).toBe(5);
 const broken=JSON.parse(JSON.stringify(archived));broken.data.structured.personalPackageLabels[0].photos[0].id='missing';
 // Verify reference validation after a correctly recomputed integrity manifest.
 broken.integrity.structured.digest=await sha256CanonicalJson(broken.data.structured,webcrypto);
 await expect(validateTraceBackup(broken,{cryptoProvider:webcrypto})).rejects.toThrow('missing referenced photo');
 expect(readPersonalLabels(to)).toEqual([p]);
});
test('real schema-9 inventory remains supported and restores no invented personal labels',async()=>{
 const from=storage(),db=database();const backup=await createTraceBackup({storage:from,openDatabase:async()=>db,cryptoProvider:webcrypto});
 delete backup.data.structured.personalPackageLabels;backup.schemaVersion=9;
 const domains=backup.integrity.structured.domains.filter(k=>k!==PERSONAL_LABEL_KEY);
 backup.integrity.structured={...backup.integrity.structured,domains,domainCount:domains.length,digest:await sha256CanonicalJson(backup.data.structured,webcrypto)};
 const to=storage({[PERSONAL_LABEL_KEY]:JSON.stringify([fixture.profile])});
 await restoreTraceBackup(backup,{confirmed:true,storage:to,openDatabase:async()=>database(),cryptoProvider:webcrypto});
 expect(readPersonalLabels(to)).toEqual([]);
});
test('failed photo storage or local quota cannot publish a personal profile pointing to missing evidence',async()=>{
 const current=JSON.stringify([fixture.profile]);const target=storage({[PERSONAL_LABEL_KEY]:current});
 const p={...fixture.profile,id:'new',editionId:'new',photos:[{id:'photo',role:'nutrition',mimeType:'image/jpeg',bytes:5}]};
 const photo={...p.photos[0],blob:new Blob(['image'],{type:'image/jpeg'})};
 await expect(savePersonalLabel(p,[photo],{storage:target,openDatabase:async()=>{throw Error('quota');}})).rejects.toThrow('quota');
 expect(target.getItem(PERSONAL_LABEL_KEY)).toBe(current);
 const db=database(),quota={...target,setItem:()=>{throw Error('local quota');}};
 await expect(savePersonalLabel(p,[photo],{storage:quota,openDatabase:async()=>db})).rejects.toThrow('local quota');
 expect(db.records()).toEqual([]);expect(target.getItem(PERSONAL_LABEL_KEY)).toBe(current);
});
