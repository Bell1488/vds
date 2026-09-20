(() => {
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const header=$('.site-header');
  const onScroll=()=>{header?.classList.toggle('scrolled',scrollY>16);document.body.classList.toggle('has-scrolled',scrollY>520)};
  onScroll(); addEventListener('scroll',onScroll,{passive:true});
  const menuBtn=$('[data-menu]'), mobileMenu=$('.mobile-menu');
  menuBtn?.addEventListener('click',()=>{mobileMenu?.classList.toggle('open');document.body.classList.toggle('menu-open',mobileMenu?.classList.contains('open'))});
  $$('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>{mobileMenu?.classList.remove('open');document.body.classList.remove('menu-open')}));
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});$$('.reveal').forEach(el=>io.observe(el))}else $$('.reveal').forEach(el=>el.classList.add('in'));
  $$('.faq-q').forEach(q=>q.addEventListener('click',()=>q.parentElement.classList.toggle('open')));

  const modal=$('#lead-modal'), modalForm=modal?.querySelector('.lead-form'), leadContext=$('#lead-context');
  const modalTitle=$('#modal-title'), modalKicker=$('.modal-head .kicker'), modalSubmit=modalForm?.querySelector('button[type="submit"]');
  const logisticsFields=modalForm?[...['from','to','cargo'].map(n=>modalForm.elements[n]?.closest('.field')).filter(Boolean)]:[];
  const paymentFields=modalForm?[...modalForm.querySelectorAll('[data-payment-field]')]:[];
  const paymentSuccessModal=document.createElement('div'); paymentSuccessModal.className='modal payment-success-modal'; paymentSuccessModal.setAttribute('aria-modal','true'); paymentSuccessModal.setAttribute('role','dialog');
  paymentSuccessModal.innerHTML='<div class="modal-card payment-success-card"><button aria-label="Закрыть" class="close payment-success-close" type="button">&times;</button><div class="payment-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.5"></path></svg></div><div class="payment-success-kicker">Заявка принята</div><h3 id="payment-success-title">Заявка принята.</h3><p>Заявка принята. Мы свяжемся с вами по указанному контакту.</p><a class="btn primary payment-success-action" href="https://t.me/VDS_Logistic_Support" rel="noopener noreferrer" target="_blank">Написать менеджеру в Telegram →</a></div>';
  document.body.appendChild(paymentSuccessModal);
  const closePaymentSuccess=()=>{paymentSuccessModal.classList.remove('open');document.body.classList.remove('menu-open')};
  const closeModal=()=>{modal?.classList.remove('open');document.body.classList.remove('menu-open')};
  const showPaymentSuccess=()=>{closeModal();paymentSuccessModal.classList.add('open');document.body.classList.add('menu-open')};
  const focusFirstRequired=form=>{
    if(!form)return;
    const type=form.elements.payment_type, amount=form.elements.payment_amount_cny;
    if(type&&amount){
      if(!String(type.value||'').trim()){type.focus();return}
      if(type.value!=='consultation'&&!String(amount.value||'').trim()){amount.focus();return}
    }
    const required=[...form.querySelectorAll('input,select,textarea')].find(el=>el.required&&((el.type==='checkbox'&&!el.checked)||!String(el.value||'').trim()));
    if(required){required.focus();return}
  };
  paymentSuccessModal.querySelector('.payment-success-close')?.addEventListener('click',closePaymentSuccess);
  paymentSuccessModal.addEventListener('click',e=>{if(e.target===paymentSuccessModal)closePaymentSuccess()});
  const openModal=(source='unknown')=>{
    if(!modal)return;
    const isPayment=document.body.dataset.page==='payment'||(window.VDSPaymentLead?.confirmed&&source==='topup_calculator');
    modal.classList.add('open'); document.body.classList.add('menu-open'); modal.dataset.source=source;
    logisticsFields.forEach(el=>el.hidden=isPayment); paymentFields.forEach(el=>el.hidden=!isPayment);
    const status=modalForm?.querySelector('.form-status'); if(status){status.className='form-status';status.textContent=''}
    if(isPayment){
      if(modalTitle)modalTitle.textContent='Получить расчёт платежа';
      if(modalKicker)modalKicker.textContent='Оплата поставщику в Китае';
      if(modalSubmit)modalSubmit.textContent='Получить расчёт платежа';
      const calc=source==='topup_calculator'&&window.VDSPaymentLead?.confirmed?window.VDSPaymentLead:null;
      if(calc){if(modalForm.elements.payment_type)modalForm.elements.payment_type.value=calc.payment_type||'';if(modalForm.elements.payment_amount_cny)modalForm.elements.payment_amount_cny.value=calc.amount_cny||'';if(leadContext){leadContext.hidden=false;leadContext.textContent=`Расчёт из калькулятора: ${calc.amount_cny} CNY · ${calc.service_name||''}`}}
      else if(leadContext){leadContext.hidden=true;leadContext.textContent=''}
    }else{
      if(modalTitle)modalTitle.textContent='Расскажите о грузе'; if(modalKicker)modalKicker.textContent='Расчёт маршрута'; if(modalSubmit)modalSubmit.textContent='Получить расчёт маршрута ↗';
      if(leadContext){leadContext.hidden=true;leadContext.textContent=''}
    }
    VDS.goal('lead_open',{source}); setTimeout(()=>focusFirstRequired(modalForm),120);
  };
  $$('[data-lead-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.leadOpen||'cta')));
  $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal)); modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closePaymentSuccess()}});

  const metrikaId=Number(document.body.dataset.metrikaId||0);
  const safeGoalParams=(params={})=>{const allowed=['source','form','lead_type','service','href','label'];const out={};allowed.forEach(k=>{if(typeof params[k]==='string'&&params[k].length<160)out[k]=params[k]});return out};
  window.VDS={goal(name,params={}){const clean=safeGoalParams(params);if(metrikaId&&typeof window.ym==='function')window.ym(metrikaId,'reachGoal',name,clean);window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,...clean})}};
  $$('[data-goal]').forEach(el=>el.addEventListener('click',()=>VDS.goal(el.dataset.goal,{href:el.getAttribute('href')||'',label:el.textContent.trim().slice(0,80)})));
  $$('[data-service]').forEach(el=>el.addEventListener('click',()=>VDS.goal('service_click',{service:el.dataset.service})));

  const qp=new URLSearchParams(location.search), attribution=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid'];
  const storage={get(k){try{return sessionStorage.getItem(k)||''}catch{return ''}},set(k,v){try{sessionStorage.setItem(k,v)}catch{}}};
  attribution.forEach(k=>storage.set('vds_'+k,qp.get(k)||storage.get('vds_'+k)));
  const requestId=()=>window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  $$('.lead-form').forEach(form=>{
    let started=false; form.addEventListener('input',()=>{if(!started){started=true;VDS.goal('lead_start',{form:form.dataset.form||'lead',lead_type:document.body.dataset.page==='payment'?'payment':'logistics'})}},{once:true});
    attribution.forEach(k=>{const i=document.createElement('input');i.type='hidden';i.name=k;i.value=storage.get('vds_'+k);form.appendChild(i)});
    form.addEventListener('submit',async e=>{
      e.preventDefault(); const status=$('.form-status',form), submit=$('button[type="submit"]',form); if(form.website?.value)return; if(!form.reportValidity())return;
      const isPayment=document.body.dataset.page==='payment'||(modal?.classList.contains('open')&&modal.dataset.source==='topup_calculator'&&window.VDSPaymentLead?.confirmed); const type=form.elements.payment_type, amount=form.elements.payment_amount_cny;
      if(isPayment&&type&&amount&&(type.value==='consultation'?amount.value='':(!type.value||!(Number(amount.value)>0)))){if(status){status.className='form-status error';status.textContent='Выберите тип платежа и укажите сумму в CNY либо выберите «Нужна консультация».'}return}
      VDS.goal('lead_submit',{form:form.dataset.form||'lead',lead_type:isPayment?'payment':'logistics'}); submit.disabled=true; if(status){status.className='form-status';status.textContent='Отправляем заявку…'}
      const data=Object.fromEntries(new FormData(form).entries()); data.page=location.href; data.source=modal?.classList.contains('open')?modal.dataset.source:'page_form'; data.client_request_id=form.dataset.requestId||(form.dataset.requestId=requestId());
      if(isPayment){data.lead_type='payment';data.payment=type&&amount?{payment_type:data.payment_type,amount_cny:data.payment_amount_cny||null}:window.VDSPaymentLead}
      try{
        const r=await fetch(form.dataset.endpoint||'/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); const result=await r.json().catch(()=>null);
        if(!r.ok||result?.ok!==true||result.accepted!==true||typeof result.lead_id!=='string'||!result.lead_id)throw new Error('lead_not_accepted');
        if(form.dataset.successLeadId!==result.lead_id){form.dataset.successLeadId=result.lead_id;VDS.goal('lead_success',{form:form.dataset.form||'lead',lead_type:isPayment?'payment':'logistics'});if(isPayment)VDS.goal('payment_lead_success',{form:form.dataset.form||'lead',lead_type:'payment'})}
        if(status){status.className='form-status success';status.textContent='Заявка принята. Мы свяжемся с вами по указанному контакту.'} form.reset(); attribution.forEach(k=>{if(form.elements[k])form.elements[k].value=storage.get('vds_'+k)}); form.dataset.requestId=''; closeModal(); if(isPayment)showPaymentSuccess(); else showToast('Заявка принята. Мы свяжемся с вами по указанному контакту.');
      }catch(err){if(status){status.className='form-status error';status.innerHTML='Не удалось подтвердить приём заявки. Проверьте соединение и повторите попытку или <a href="https://t.me/VDS_Logistic_Support" target="_blank" rel="noopener noreferrer">напишите менеджеру в Telegram</a>.'}}
      finally{submit.disabled=false}
    });
  });
  const toast=$('#toast'); function showToast(text){if(!toast)return;toast.textContent=text;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500)}
  const tilt=$('[data-tilt]'); if(tilt&&matchMedia('(pointer:fine)').matches){tilt.addEventListener('mousemove',e=>{const r=tilt.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;tilt.style.transform=`perspective(1000px) rotateY(${x*7}deg) rotateX(${-y*5}deg)`});tilt.addEventListener('mouseleave',()=>tilt.style.transform='perspective(1000px) rotateY(-4deg) rotateX(2deg)')}

  const calcRoot=$('#topup-calculator');
  if(calcRoot&&document.body.dataset.page==='payment'){
    const amountEl=$('#pay-cny',calcRoot), serviceTabs=$$('.service-tab',calcRoot), rateLabel=$('#pay-rate-label',calcRoot), summary=$('#pay-summary',calcRoot), summaryNote=$('#pay-summary-note',calcRoot), sourceLabel=$('#pay-source',calcRoot);
    const serviceNames={supplier:'Поставщику / инвойс',alipay:'Alipay',wechat:'WeChat Pay',card:'Китайская карта'}; let service='supplier', rates=null, used=false;
    const format=v=>Number.isFinite(v)?v.toLocaleString('ru-RU',{maximumFractionDigits:0})+' ₽':'—';
    const update=()=>{const amount=Math.max(0,Number(amountEl?.value||0));const estimate=rates&&amount>0?amount*Number(rates.CNY):NaN;summary.textContent=estimate?format(estimate):'—';summaryNote.textContent=estimate?'Справочно, без учёта комиссии и коммерческого курса':'Введите сумму в CNY для справочного пересчёта';sourceLabel.textContent=rates?`${rates.source||'Базовый курс'} · ${rates.updated||'дата не указана'}`:'Коммерческий курс не загружен';rateLabel.textContent=rates?`1 CNY ≈ ${Number(rates.CNY).toLocaleString('ru-RU',{maximumFractionDigits:4})} RUB · без комиссии`:'Курс временно недоступен. Запросите коммерческий расчёт';window.VDSPaymentLead=amount>0?{confirmed:true,payment_type:service,service_name:serviceNames[service],amount_cny:amount}:null};
    amountEl?.addEventListener('input',()=>{used=true;update()}); serviceTabs.forEach(tab=>tab.addEventListener('click',()=>{serviceTabs.forEach(t=>t.classList.remove('active'));tab.classList.add('active');service=tab.dataset.payService||'supplier';used=true;update();VDS.goal('payment_service_select',{service})}));
    fetch('/api/rates',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(Number(d.CNY)>0)rates=d;update()}).catch(()=>{rates=null;update()}); update();
    const calcButton=$('[data-lead-open="topup_calculator"]'); calcButton?.addEventListener('click',()=>{if(used)VDS.goal('payment_calc_use',{service})},{capture:true});
  }else if(calcRoot){
    const from=$('#pay-from',calcRoot), to=$('#pay-to',calcRoot), fromCur=$('#pay-from-currency',calcRoot), toCur=$('#pay-to-currency',calcRoot), rateLabel=$('#pay-rate-label',calcRoot), summary=$('#pay-summary',calcRoot), source=$('#pay-source',calcRoot), tabs=$$('.service-tab',calcRoot);
    let rates=null, editing='from', service='alipay'; const names={alipay:'Alipay',wechat:'WeChat Pay',card:'Китайская карта',invoice:'Оплата инвойса'};
    const convert=(v,a,b)=>Number(v)*(rates?.[a]||1)/(rates?.[b]||1); const update=()=>{const a=Math.max(0,Number(from?.value||0)), b=Math.max(0,Number(to?.value||0)); summary.textContent=Number.isFinite(b)&&b>0?`${b.toLocaleString('ru-RU',{maximumFractionDigits:2})} ${toCur?.value||''}`:'—'; rateLabel.textContent=rates?`1 ${toCur.value} ≈ ${convert(1,toCur.value,fromCur.value).toLocaleString('ru-RU',{maximumFractionDigits:4})} ${fromCur.value}`:'Курс временно недоступен'; source.textContent=rates?`${rates.source||'Банк России'} · ${rates.updated||''}`:'Курс временно недоступен'; window.VDSPaymentLead=a>0?{confirmed:true,payment_type:service,service_name:names[service]||service,amount_cny:toCur.value==='CNY'?b:convert(a,fromCur.value,'CNY')}:null};
    const recalc=side=>{editing=side;if(!rates)return update();if(side==='from')to.value=convert(from.value,fromCur.value,toCur.value).toFixed(toCur.value==='RUB'?0:2);else from.value=convert(to.value,toCur.value,fromCur.value).toFixed(fromCur.value==='RUB'?0:2);update()};
    from?.addEventListener('input',()=>recalc('from'));to?.addEventListener('input',()=>recalc('to'));fromCur?.addEventListener('change',()=>recalc(editing));toCur?.addEventListener('change',()=>recalc(editing));tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');service=t.dataset.payService||service;update()}));
    fetch('/api/rates',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(Number(d.CNY)>0)rates={RUB:1,CNY:Number(d.CNY),USD:Number(d.USD)||1,source:d.source,updated:d.updated};recalc('from')}).catch(()=>{rates=null;update()}); update();
  }
})();
