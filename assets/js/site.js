(() => {
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const header=$('.site-header');
  const onScroll=()=>{header?.classList.toggle('scrolled',scrollY>16);document.body.classList.toggle('has-scrolled',scrollY>520)}; onScroll(); addEventListener('scroll',onScroll,{passive:true});

  const menuBtn=$('[data-menu]'), mobileMenu=$('.mobile-menu');
  menuBtn?.addEventListener('click',()=>{mobileMenu?.classList.toggle('open');document.body.classList.toggle('menu-open',mobileMenu?.classList.contains('open'));});
  $$('.mobile-menu a').forEach(a=>a.addEventListener('click',()=>{mobileMenu?.classList.remove('open');document.body.classList.remove('menu-open')}));

  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});
  $$('.reveal').forEach(el=>io.observe(el));

  $$('.faq-q').forEach(q=>q.addEventListener('click',()=>q.parentElement.classList.toggle('open')));

  const modal=$('#lead-modal');
  const leadContext=$('#lead-context');
  const modalTitle=$('#modal-title');
  const modalKicker=$('.modal-head .kicker');
  const modalForm=modal?.querySelector('.lead-form');
  const logisticsFields=modalForm ? ['from','to','cargo'].map(n=>modalForm.elements[n]?.closest('.field')).filter(Boolean) : [];
  const modalSubmit=modalForm?.querySelector('button[type="submit"]');
  const paymentSuccessModal=document.createElement('div');
  paymentSuccessModal.className='modal payment-success-modal';
  paymentSuccessModal.setAttribute('aria-labelledby','payment-success-title');
  paymentSuccessModal.setAttribute('aria-modal','true');
  paymentSuccessModal.setAttribute('role','dialog');
  paymentSuccessModal.innerHTML='<div class="modal-card payment-success-card"><button aria-label="Закрыть" class="close payment-success-close" type="button">&times;</button><div class="payment-success-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4.2 4.2L19 6.5"></path></svg></div><div class="payment-success-kicker">Заявка отправлена</div><h3 id="payment-success-title">Спасибо! Данные получены.</h3><p>Менеджер уже получил вашу заявку на обмен. Вы можете сразу написать ему в Telegram.</p><a class="btn primary payment-success-action" href="https://t.me/VDS_Logistic_Support" rel="noopener noreferrer" target="_blank">Перейти в чат с менеджером &rarr;</a></div>';
  document.body.appendChild(paymentSuccessModal);
  const closePaymentSuccess=()=>{paymentSuccessModal.classList.remove('open');document.body.classList.remove('menu-open')};
  const showPaymentSuccess=()=>{closeModal();paymentSuccessModal.classList.add('open');document.body.classList.add('menu-open');setTimeout(()=>paymentSuccessModal.querySelector('.payment-success-action')?.focus(),120)};
  paymentSuccessModal.querySelector('.payment-success-close')?.addEventListener('click',closePaymentSuccess);
  paymentSuccessModal.addEventListener('click',e=>{if(e.target===paymentSuccessModal)closePaymentSuccess()});
  addEventListener('keydown',e=>{if(e.key==='Escape')closePaymentSuccess()});
  const openModal=(source='unknown')=>{
    if(!modal)return;
    modal.classList.add('open');document.body.classList.add('menu-open');modal.dataset.source=source;
    const isPayment=window.VDSPaymentLead && (source==='topup_calculator' || document.body.dataset.page==='payment');
    logisticsFields.forEach(el=>el.hidden=!!isPayment);
    if(isPayment){
      if(modalTitle) modalTitle.textContent='Заявка на пополнение';
      if(modalKicker) modalKicker.textContent='Платёж в Китае';
      if(modalSubmit) modalSubmit.textContent='Отправить заявку на пополнение ↗';
      if(leadContext){leadContext.hidden=false;leadContext.textContent=window.VDSPaymentLead.summary||''}
    }else{
      if(modalTitle) modalTitle.textContent='Расскажите о грузе';
      if(modalKicker) modalKicker.textContent='Расчёт маршрута';
      if(modalSubmit) modalSubmit.textContent='Получить расчёт маршрута ↗';
      if(leadContext){leadContext.hidden=true;leadContext.textContent=''}
    }
    VDS.goal('lead_open',{source});setTimeout(()=>$('#modal-name')?.focus(),120)
  };
  const closeModal=()=>{modal?.classList.remove('open');document.body.classList.remove('menu-open')};
  $$('[data-lead-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.leadOpen||'cta')));
  $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
  modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

  // Yandex Metrika is initialized only when body[data-metrika-id] contains a real numeric counter ID.
  const metrikaId=Number(document.body.dataset.metrikaId||0);
  window.VDS={
    goal(name,params={}){
      if(metrikaId && typeof window.ym==='function') window.ym(metrikaId,'reachGoal',name,params);
      window.dataLayer=window.dataLayer||[]; window.dataLayer.push({event:name,...params});
    }
  };

  $$('[data-goal]').forEach(el=>el.addEventListener('click',()=>VDS.goal(el.dataset.goal,{href:el.getAttribute('href')||'',label:el.textContent.trim().slice(0,80)})));
  $$('[data-service]').forEach(el=>el.addEventListener('click',()=>VDS.goal('service_click',{service:el.dataset.service})));

  // Preserve attribution parameters with the lead.
  const qp=new URLSearchParams(location.search); const attribution=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid'];
  attribution.forEach(k=>sessionStorage.setItem('vds_'+k,qp.get(k)||sessionStorage.getItem('vds_'+k)||''));

  $$('.lead-form').forEach(form=>{
    let started=false;
    form.addEventListener('input',()=>{if(!started){started=true;VDS.goal('lead_start',{form:form.dataset.form||'lead'})}},{once:true});
    attribution.forEach(k=>{let i=document.createElement('input');i.type='hidden';i.name=k;i.value=sessionStorage.getItem('vds_'+k)||'';form.appendChild(i)});
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const status=$('.form-status',form); const submit=$('button[type="submit"]',form);
      if(form.website?.value) return;
      if(!form.reportValidity()) return;
      VDS.goal('lead_submit',{form:form.dataset.form||'lead'});
      submit.disabled=true; if(status){status.className='form-status';status.textContent='Отправляем заявку…'}
      const data=Object.fromEntries(new FormData(form).entries()); data.page=location.href; data.source=modal?.classList.contains('open')?modal.dataset.source:'page_form'; const isPaymentLead=window.VDSPaymentLead && (data.source==='topup_calculator' || document.body.dataset.page==='payment'); if(isPaymentLead){data.lead_type='payment';data.payment=window.VDSPaymentLead}
      try{
        const endpoint=form.dataset.endpoint||'/api/lead';
        const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if(!r.ok) throw new Error('request_failed');
        VDS.goal('lead_success',{form:form.dataset.form||'lead'});
        if(status){status.className='form-status success';status.textContent='Заявка отправлена. Мы свяжемся с вами по указанному контакту.'}
        form.reset(); closeModal(); if(isPaymentLead) showPaymentSuccess(); else showToast('Заявка отправлена. Спасибо!');
      }catch(err){
        if(status){status.className='form-status error';status.textContent='Не удалось отправить заявку. Пожалуйста, повторите попытку позже.'}
      }finally{submit.disabled=false}
    });
  });

  const toast=$('#toast'); function showToast(text){if(!toast)return;toast.textContent=text;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500)}

  // Subtle 3D tilt for the route HUD.
  const tilt=$('[data-tilt]'); if(tilt && matchMedia('(pointer:fine)').matches){
    tilt.addEventListener('mousemove',e=>{const r=tilt.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;tilt.style.transform=`perspective(1000px) rotateY(${x*7}deg) rotateX(${-y*5}deg)`});
    tilt.addEventListener('mouseleave',()=>tilt.style.transform='perspective(1000px) rotateY(-4deg) rotateX(2deg)');
  }

  const calcRoot=$('#topup-calculator');
  if(calcRoot){
    const fromEl=$('#pay-from',calcRoot), toEl=$('#pay-to',calcRoot), fromCur=$('#pay-from-currency',calcRoot), toCur=$('#pay-to-currency',calcRoot);
    const rateLabel=$('#pay-rate-label',calcRoot), summary=$('#pay-summary',calcRoot), summaryNote=$('#pay-summary-note',calcRoot), sourceLabel=$('#pay-source',calcRoot), swap=$('#pay-swap',calcRoot);
    const tabs=$$('.service-tab',calcRoot);
    const serviceNames={alipay:'Alipay',wechat:'WeChat Pay',card:'Китайская карта',invoice:'Оплата инвойса'};
    let service='alipay', editing='from', goalSent=false;
    let rates={RUB:1,CNY:12.5457,USD:84.1732,updated:'17.09.2026',source:'ЦБ РФ · резервный ориентир'};

    const symbol=c=>({RUB:'₽',CNY:'¥',USD:'$'}[c]||c);
    const format=(v,c)=>{
      if(!Number.isFinite(v)) return '—';
      const max=c==='RUB'?0:2;
      const str=v.toLocaleString('ru-RU',{maximumFractionDigits:max,minimumFractionDigits:0});
      return c==='RUB'?`${str} ₽`:c==='CNY'?`${str} ¥`:`$${str}`;
    };
    const convert=(amount,a,b)=>amount*(rates[a]||1)/(rates[b]||1);
    const markUse=()=>{if(!goalSent){goalSent=true;VDS.goal('payment_calc_use',{service})}};
    const updatePaymentLead=()=>{
      const amountFrom=Math.max(0,Number(fromEl.value||0));
      const amountTo=Math.max(0,Number(toEl.value||0));
      const usdEq=convert(amountFrom,fromCur.value,'USD');
      const below=usdEq<Number(calcRoot.dataset.minUsd||100);
      summary.textContent=format(amountTo,toCur.value);
      summaryNote.textContent=below?'Сумма ниже минимального ориентира $100':'Финальный курс подтвердит менеджер';
      summaryNote.style.color=below?'#e3bd55':'';
      rateLabel.textContent=`1 ${toCur.value} ≈ ${(rates[toCur.value]/rates[fromCur.value]).toLocaleString('ru-RU',{maximumFractionDigits:4})} ${fromCur.value} · базовый ориентир ${rates.source} ${rates.updated}`;
      sourceLabel.textContent=`${rates.source} · ${rates.updated}`;
      window.VDSPaymentLead={
        type:'payment',service,service_name:serviceNames[service],
        give_amount:amountFrom,give_currency:fromCur.value,
        receive_amount:amountTo,receive_currency:toCur.value,
        rate_source:rates.source,rate_updated:rates.updated,
        summary:`${serviceNames[service]} · ${format(amountFrom,fromCur.value)} → ≈ ${format(amountTo,toCur.value)}`
      };
    };
    const recalc=(side='from')=>{
      editing=side;
      if(side==='from'){
        const v=Math.max(0,Number(fromEl.value||0));
        toEl.value=convert(v,fromCur.value,toCur.value).toFixed(toCur.value==='RUB'?0:2);
      }else{
        const v=Math.max(0,Number(toEl.value||0));
        fromEl.value=convert(v,toCur.value,fromCur.value).toFixed(fromCur.value==='RUB'?0:2);
      }
      updatePaymentLead();
    };
    const ensureOption=(select,val)=>{if(![...select.options].some(o=>o.value===val)){const o=document.createElement('option');o.value=val;o.textContent=`${val} ${symbol(val)}`;select.appendChild(o)}};
    ['RUB','USD','CNY'].forEach(c=>{ensureOption(fromCur,c);ensureOption(toCur,c)});

    fromEl.addEventListener('input',()=>{markUse();recalc('from')});
    toEl.addEventListener('input',()=>{markUse();recalc('to')});
    fromCur.addEventListener('change',()=>{markUse();recalc(editing)});
    toCur.addEventListener('change',()=>{markUse();recalc(editing)});
    swap?.addEventListener('click',()=>{
      markUse();
      const a=fromCur.value,b=toCur.value,av=fromEl.value,bv=toEl.value;
      fromCur.value=b;toCur.value=a;fromEl.value=bv;toEl.value=av;editing='from';recalc('from');
      VDS.goal('payment_calc_swap',{from:fromCur.value,to:toCur.value});
    });
    tabs.forEach(tab=>tab.addEventListener('click',()=>{
      tabs.forEach(t=>t.classList.remove('active'));tab.classList.add('active');service=tab.dataset.payService||'alipay';markUse();recalc(editing);VDS.goal('payment_service_select',{service});
    }));

    const loadRates=async()=>{
      try{
        const r=await fetch('/api/rates',{headers:{'Accept':'application/json'}});
        if(!r.ok) throw new Error('rate_api_unavailable');
        const d=await r.json();
        if(Number(d.CNY)>0 && Number(d.USD)>0){rates={RUB:1,CNY:Number(d.CNY),USD:Number(d.USD),updated:d.updated||'сегодня',source:d.source||'курс VDS'};recalc(editing)}
      }catch(e){recalc(editing)}
    };
    recalc('from');loadRates();
  }
})();
