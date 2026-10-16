// Optional business dashboard component; not connected to live dashboard yet.
import {redemptionApi} from "./redemption-api-client.js";
export function mountStorePinSetup(root,user,endpoint){
 const title=document.createElement("h3");
 title.textContent="In-store redemption PIN";
 const note=document.createElement("p");
 note.textContent="Choose a private four-digit PIN for staff. Keep it secret from customers.";
 const input=document.createElement("input");
 input.type="password";
 input.inputMode="numeric";
 input.maxLength=4;
 input.autocomplete="new-password";
 input.placeholder="4-digit store PIN";
 const button=document.createElement("button");
 button.textContent="Save Store PIN";
 const status=document.createElement("p");
 status.setAttribute("role","status");
 root.replaceChildren(title,note,input,button,status);
 button.onclick=async()=>{
  if(!/^[0-9]{4}$/.test(input.value)){status.textContent="Enter exactly four digits.";return}
  button.disabled=true;
  status.textContent="Saving...";
  try{
   const token=await user.getIdToken();
   await redemptionApi(endpoint)({pin:input.value},token);
   status.textContent="Store PIN saved. Staff can use it for redemption.";
  }catch(e){status.textContent=e.message||"Unable to save PIN."}
  finally{input.value="";button.disabled=false}
 };
}
