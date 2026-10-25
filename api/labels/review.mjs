import service from './_service.cjs';
export default function handler(request,response) { return service.handle('review',request,response); }
