import {prepareLabelPhoto} from './packageLabelPhotos';
test('new label photos are always re-encoded even when the original is small; original filename/metadata are not retained',async()=>{
 const original=new File(['constructed EXIF-like bytes'],'private-location-name.jpg',{type:'image/jpeg'});
 const encoded=new Blob(['larger reconstructed canvas image with no original metadata'],{type:'image/jpeg'});
 const renderImage=jest.fn(async()=>encoded);
 const result=await prepareLabelPhoto(original,'nutrition',{imageEnvironment:{decodeImage:async()=>({source:{},width:100,height:100,close:()=>{}}),renderImage}});
 expect(renderImage).toHaveBeenCalled();expect(result.blob).toBe(encoded);expect(result.blob).not.toBe(original);
 expect(result).not.toHaveProperty('name');expect(result.role).toBe('nutrition');
});
