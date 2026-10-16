// Pure rate-limit calculations, shared by draft redemption endpoints.
export const WINDOW_MS=60*60*1000;
export const LOCK_MS=15*60*1000;
export const MAX_ATTEMPTS=5;
export function attemptState(previous,now=Date.now()){
 const start=Number.isFinite(previous?.windowStart)?previous.windowStart:now;
 const inWindow=now-start<WINDOW_MS&&now>=start;
 const attempts=(inWindow?(previous?.attempts||0):0)+1;
 return {windowStart:inWindow?start:now,attempts,lockedUntil:attempts>=MAX_ATTEMPTS?now+LOCK_MS:0};
}
export function blocked(previous,now=Date.now()){
 return (previous?.lockedUntil||0)>now || ((previous?.attempts||0)>=MAX_ATTEMPTS && now-(previous?.windowStart||0)<WINDOW_MS);
}
