/** Optional pre-paint bootstrap for the explicitly requested blank-canvas intro.
 * Content remains server-rendered. No JavaScript / reduced motion stays visible;
 * a missing client bundle fails open after 6.5 seconds or the first key press.
 */
export const BUILD_INTRO_SCRIPT = `(function(){try{
  var root=document.documentElement;
  var query=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(query.matches)return;
  root.dataset.buildIntro='pending';
  function reveal(){
    delete root.dataset.buildIntro;
    window.dispatchEvent(new Event('agent-build:reveal'));
  }
  window.addEventListener('keydown',reveal,{once:true});
  window.setTimeout(function(){if(root.dataset.buildIntro==='pending')reveal();},6500);
}catch(e){delete document.documentElement.dataset.buildIntro;}})();`;
