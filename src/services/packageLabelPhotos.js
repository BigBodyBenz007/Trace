import { ingestPhotoFiles, PHOTO_INGESTION_POLICY } from './photoIngestion';
export async function prepareLabelPhoto(file, role, {imageEnvironment} = {}) {
  const prepared = await ingestPhotoFiles([file], {...(imageEnvironment ? {imageEnvironment} : {}),policy:{...PHOTO_INGESTION_POLICY,maxPhotosPerEntry:4,
    alwaysReencode:true,optimizeAboveBytes:0,maxInputBytesPerPhoto:15*1024*1024,maxInputBytesPerSelection:15*1024*1024,
    maxStoredBytesPerPhoto:2*1024*1024,maxStoredBytesPerSelection:8*1024*1024,maxLongEdgePixels:2400}});
  // optimizeAboveBytes=0 forces canvas re-encoding, dropping EXIF/location metadata.
  const image = prepared.photos[0];
  const id = 'package-label-photo-'+(crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16))).map(v=>v.toString(16).padStart(2,'0')).join(''));
  return {id,role,mimeType:image.blob.type,bytes:image.blob.size,blob:image.blob,createdAt:new Date().toISOString()};
}
