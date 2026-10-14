import {claimDeal,refreshClaim,redeemSavedClaim} from "./redemption-api-client.js";
import {savedClaim} from "./redemption-client.js";

// Isolated UI module. Production pages do not import this file.
export function mountRedemption(root,dealId,urls){
  const status=document.createElement("p");
  const code=document.createElement("p");
  const claim=document.createElement("button");
  const redeem=document.createElement("button");
  const pin=document.createElement("input");
  const confirm=document.createElement("button");
  status.setAttribute("role","status");
  claim.textContent="Claim This Deal";
  redeem.textContent="Redeem In Store";
  pin.type="password";
  pin.inputMode="numeric";
  pin.maxLength=4;
  pin.placeholder="Cashier PIN";
  confirm.textContent="Confirm Redemption";
  root.replaceChildren(claim,code,redeem,pin,confirm,status);
  const draw=()=>{
    const item=savedClaim(dealId);
    code.textContent=item?.status==="claimed"?item.code:"";
    claim.hidden=!!item;
    redeem.hidden=!item||item.status!=="claimed";
    pin.hidden=true;
    confirm.hidden=true;
    if(item?.status==="redeemed")status.textContent="Redeemed. This code cannot be used again.";
  };
  claim.onclick=async()=>{
    claim.disabled=true;
    try{await claimDeal(dealId,urls.create);draw()}
    catch(e){status.textContent=e.message}
    finally{claim.disabled=false}
  };
  redeem.onclick=()=>{pin.hidden=false;confirm.hidden=false;pin.focus()};
  confirm.onclick=async()=>{
    if(!/^[0-9]{4}$/.test(pin.value)){status.textContent="Enter a four-digit PIN";return}
    confirm.disabled=true;
    try{
      await redeemSavedClaim(dealId,pin.value,urls.redeem);
      pin.value="";
      draw();
      status.textContent="Successfully redeemed. Show this confirmation to the cashier.";
    }catch(e){status.textContent=e.message}
    finally{confirm.disabled=false}
  };
  draw();
  if(savedClaim(dealId))refreshClaim(dealId,urls.status).then(result=>{
    draw();
    if(result.expired)status.textContent="This claim has expired.";
  }).catch(()=>{status.textContent="Could not verify claim status."});
}
