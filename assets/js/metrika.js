// Yandex Metrika loader. Put the real numeric counter ID in <body data-metrika-id="XXXXXXXX">.
(() => {
  const id=Number(document.body.dataset.metrikaId||0); if(!id) return;
  const tagUrl=`https://mc.yandex.ru/metrika/tag.js?id=${id}`;
  (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(let j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r)return;}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script',tagUrl,'ym');
  ym(id,'init',{ssr:true,webvisor:false,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
})();
