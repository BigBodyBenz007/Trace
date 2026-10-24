// Fail closed until private durable storage, verified owner sessions, object
// access controls and abuse limits are provisioned. Never accept photos into
// public assets, process memory or ephemeral /tmp as a "shared database".
export default function handler(request,response) {
  response.setHeader('Cache-Control','no-store');
  response.setHeader('Content-Type','application/json');
  if(!['GET','POST'].includes(request.method)){
    response.setHeader('Allow','GET, POST');
    return response.status(405).json({available:false,status:'unavailable'});
  }
  return response.status(503).json({available:false,status:'unavailable',
    code:'private_label_review_not_configured',
    message:'Private submission storage and server owner authentication are not configured. No label or photo was accepted.'});
}
