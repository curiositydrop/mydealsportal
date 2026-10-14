import {claimDeal,refreshClaim,redeemSavedClaim} from './redemption-api-client.js';
import {savedClaim} from './redemption-client.js';
export function mountRedemption(root,dealId,urls){
 const status=document.createElement('p');status.setAttribute('role','status');
 const code=document.createElement('p');
 const claim=document.createElement('button');claim.textContent='Claim This Deal';
 const redeem=document.createElement('button');redeem.textContent='Redeem In Store';
 const pin=document.createElement('input');pin.type='password';pin.inputMode='numeric';pin.maxLength=4;pin.autocomplete='off';
 const confirm=document.createElement('button');confirm.textContent='Confirm Redemption';
 const history=document.createElement('a');history.href='my-claimed-deals.html';history.textContent='My Claimed Deals';
 root.replaceChildren(claim,code,redeem,pin,confirm,status,history);
 const draw=()=>{const item=savedClaim(dealId);code.textContent=item?.status==='claimed'?item.code:'';claim.hidden=!!item;redeem.hidden=!item||item.status!=='claimed';pin.hidden=confirm.hidden=true;if(item?.status==='redeemed')status.textContent='Already redeemed.'};
 claim.onclick=async()=>{claim.disabled=true;try{await claimDeal(dealId,urls.create);draw()}catch(e){status.textContent=e.message}finally{claim.disabled=false}};
 redeem.onclick=()=>{pin.hidden=confirm.hidden=false;pin.focus()};
 confirm.onclick=async()=>{if(!/^[0-9]{4}$/.test(pin.value)){status.textContent='Four digits required';return}confirm.disabled=true;try{await redeemSavedClaim(dealId,pin.value,urls.redeem);pin.value='';draw();status.textContent='Successfully redeemed.'}catch(e){status.textContent=e.message}finally{confirm.disabled=false}};
 draw();if(savedClaim(dealId))refreshClaim(dealId,urls.status).then(result=>{draw();if(result.expired)status.textContent='Claim expired.'}).catch(()=>{status.textContent='Could not verify claim.'});
}
