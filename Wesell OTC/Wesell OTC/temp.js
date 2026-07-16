<script>
  let activeMobileTab = 'cellstock';
  let mProducts = [];
  let mStores = [];
  let mInventory = [];
  let mTransactions = [];
  let currentDocType = 'Consign';

  function isSameId(id1, id2) {
    const s1 = String(id1 || '').trim();
    const s2 = String(id2 || '').trim();
    if (s1 === s2) return true;
    if (s1 !== '' && s2 !== '' && !isNaN(s1) && !isNaN(s2)) {
      return Number(s1) === Number(s2);
    }
    return false;
  }

  function mobileDebugLog(msg) {
    const logDiv = document.createElement('div');
    logDiv.className = 'text-[10px] text-rose-600 bg-rose-50 border border-rose-200 p-1 mb-1 rounded';
    logDiv.textContent = msg;
    const container = document.getElementById('m-inhand-list');
    if(container) {
      // Don't clear, just append to top
      container.insertBefore(logDiv, container.firstChild);
    }
  }

  window.initializeMobilePanel = function() {
    try {
      mobileDebugLog("initializeMobilePanel STAGE 1: Started");
      
      if (!currentUser) {
        mobileDebugLog("initializeMobilePanel ERROR: currentUser is " + JSON.stringify(currentUser));
        return;
      }
      
      mobileDebugLog("initializeMobilePanel STAGE 2: currentUser exists: " + currentUser.FullName);
      
      const nameEl = document.getElementById('mobile-user-name');
      if (nameEl) {
        nameEl.textContent = currentUser.FullName || 'เนเธกเนเธเธเธเธทเนเธญ (Empty)';
        mobileDebugLog("initializeMobilePanel STAGE 3: Name set to " + nameEl.textContent);
      } else {
        mobileDebugLog("initializeMobilePanel ERROR: mobile-user-name element not found!");
      }
      
      mobileDebugLog("initializeMobilePanel STAGE 4: Calling refreshMobileData");
      refreshMobileData();
    } catch(e) {
      mobileDebugLog("initializeMobilePanel CRASH: " + e.message);
    }
  };

  function refreshMobileData() {
    google.script.run
      .withSuccessHandler(function(data) {
        try {
          if (!data) throw new Error("เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธเธฒเธเน€เธเธดเธฃเนเธเน€เธงเธญเธฃเน");
          mProducts = data.products || [];
          mStores = (data.stores || []).filter(s => isSameId(s.Assigned_UserID, currentUser.UserID));
          mInventory = data.inventory || [];
          mTransactions = (data.transactions || []).filter(t => isSameId(t.CreatedBy, currentUser.UserID));
          
          populateMobileStores();
          renderMobileStock();
          renderMobileHistory();
        } catch(e) {
          const errDiv = `<div class="text-red-500 text-center py-4 text-xs font-bold bg-red-50 rounded-xl border border-red-200">Error (UI): ${e.message}</div>`;
          document.getElementById('m-inhand-list').innerHTML = errDiv;
          document.getElementById('m-pharmacy-consign-list').innerHTML = errDiv;
        }
      })
      .withFailureHandler(function(err) {
        const errDiv = `<div class="text-red-500 text-center py-4 text-xs font-bold bg-red-50 rounded-xl border border-red-200">Error (Server): ${err.message}</div>`;
        document.getElementById('m-inhand-list').innerHTML = errDiv;
        document.getElementById('m-pharmacy-consign-list').innerHTML = errDiv;
      })
      .getAllMobileData();
  }

  function switchMobileTab(tab) {
    activeMobileTab = tab;
    const tabs = ['cellstock', 'pharmstock', 'actions', 'history'];
    tabs.forEach(t => {
      document.getElementById(`msec-${t}`).classList.add('hidden');
      document.getElementById(`m-nav-${t}`).className = "flex-1 flex flex-col items-center justify-center py-2 text-slate-400 hover:text-emerald-600 transition-all";
    });

    document.getElementById(`msec-${tab}`).classList.remove('hidden');
    document.getElementById(`m-nav-${tab}`).className = "flex-1 flex flex-col items-center justify-center py-2 text-emerald-600 font-bold transition-all";
  }

  function renderMobileStock() {
    const listContainer = document.getElementById('m-inhand-list');
    listContainer.innerHTML = '';

    const inHand = mInventory.filter(i => i.LocationType === 'Cell_Stock' && isSameId(i.LocationID, currentUser.UserID));
    let totalInHand = 0;

    if (inHand.length === 0) {
      listContainer.innerHTML = `<div class="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs font-semibold">เนเธกเนเธกเธตเธชเธดเธเธเนเธฒเธเธเน€เธซเธฅเธทเธญเนเธเธเธฅเธฑเธเธเธญเธเธเธธเธ“</div>`;
    } else {
      inHand.forEach(item => {
        const prod = mProducts.find(p => p.ProductID === item.ProductID);
        const qty = Number(item.Quantity);
        totalInHand += qty;

        const el = document.createElement('div');
        el.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between";
        el.innerHTML = `
          <div>
            <h4 class="font-bold text-slate-800 text-xs">${prod ? prod.ProductName : item.ProductID}</h4>
            <span class="text-[10px] text-slate-400 font-bold uppercase">SKU: ${prod ? prod.SKU : '-'}</span>
          </div>
          <div class="text-right">
            <span class="text-[9px] text-slate-400 font-bold">เธเธเน€เธซเธฅเธทเธญ</span>
            <p class="text-base font-black text-emerald-600">${qty.toLocaleString()}</p>
          </div>
        `;
        listContainer.appendChild(el);
      });
    }

    document.getElementById('m-cell-stock-count').textContent = totalInHand.toLocaleString();

    let totalPharm = 0;
    const pharmContainer = document.getElementById('m-pharmacy-consign-list');
    pharmContainer.innerHTML = '';

    if (mStores.length === 0) {
      pharmContainer.innerHTML = `<div class="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs font-semibold">เธเธธเธ“เนเธกเนเธกเธตเธฃเนเธฒเธเธเธฒเธขเธขเธฒเธ—เธตเนเนเธ”เนเธฃเธฑเธเธกเธญเธเธซเธกเธฒเธขเธ”เธนเนเธฅ</div>`;
      const pCount = document.getElementById('m-pharm-stock-count');
      if (pCount) pCount.textContent = '0';
      return;
    }
    
    mStores.forEach(store => {
      const storeStock = mInventory.filter(i => i.LocationType === 'Pharmacy_Stock' && isSameId(i.LocationID, store.StoreID) && Number(i.Quantity) > 0);
      storeStock.forEach(item => {
         totalPharm += Number(item.Quantity);
      });
    });
    
    const pCountEl = document.getElementById('m-pharm-stock-count');
    if (pCountEl) pCountEl.textContent = totalPharm.toLocaleString();

    let html = `
      <div class="mb-4 relative">
        <label class="block text-[10px] font-bold text-slate-500 mb-1">เธเนเธเธซเธฒเธฃเนเธฒเธเธเนเธฒเน€เธเธทเนเธญเธ”เธนเธชเธ•เนเธญเธ</label>
        <input type="hidden" id="m-dashboard-store-id">
        <input type="text" id="m-dashboard-store-search" onfocus="showDashboardStoreOptions()" oninput="filterDashboardStoreOptions()" placeholder="เธเธดเธกเธเนเธเธทเนเธญเธฃเนเธฒเธเธเนเธฒเน€เธเธทเนเธญเธเนเธเธซเธฒ..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-700 placeholder-slate-400">
        
        <div id="m-dashboard-store-dropdown" class="hidden absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
    `;
    
    mStores.forEach(store => {
      html += `
          <div class="px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-emerald-50 store-opt" data-id="${store.StoreID}" data-name="${store.StoreName}" onclick="selectDashboardStore('${store.StoreID}', '${store.StoreName}')">
            <div class="font-bold text-xs text-slate-700">${store.StoreName}</div>
            <div class="text-[9px] text-slate-400">${store.Location}</div>
          </div>
      `;
    });

    html += `
        </div>
      </div>
      <div id="m-dashboard-store-stock-container"></div>
    `;
    pharmContainer.innerHTML = html;
  }

  function showDashboardStoreOptions() {
    document.getElementById('m-dashboard-store-dropdown').classList.remove('hidden');
    filterDashboardStoreOptions();
  }

  function filterDashboardStoreOptions() {
    const term = document.getElementById('m-dashboard-store-search').value.toLowerCase();
    const opts = document.querySelectorAll('#m-dashboard-store-dropdown .store-opt');
    opts.forEach(el => {
      const name = el.getAttribute('data-name').toLowerCase();
      if (name.includes(term)) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function selectDashboardStore(id, name) {
    document.getElementById('m-dashboard-store-id').value = id;
    document.getElementById('m-dashboard-store-search').value = name;
    document.getElementById('m-dashboard-store-dropdown').classList.add('hidden');
    renderDashboardStoreStock(id);
  }

  document.addEventListener('click', function(e) {
    const searchInput = document.getElementById('m-dashboard-store-search');
    const dropdown = document.getElementById('m-dashboard-store-dropdown');
    if (searchInput && dropdown) {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    }
  });

  function renderDashboardStoreStock(storeId) {
    const container = document.getElementById('m-dashboard-store-stock-container');
    
    if (!storeId) {
      container.innerHTML = '';
      return;
    }

    const store = mStores.find(s => s.StoreID === storeId);
    const storeStock = mInventory.filter(i => i.LocationType === 'Pharmacy_Stock' && isSameId(i.LocationID, storeId) && Number(i.Quantity) > 0);
    
    let stockRowsHtml = '';
    if (storeStock.length === 0) {
      stockRowsHtml = `<div class="text-[10px] text-slate-400 py-6 text-center font-bold">เนเธกเนเธกเธตเธชเธดเธเธเนเธฒเธเธฒเธเธเธฒเธขเธเธเน€เธซเธฅเธทเธญเนเธเธฃเนเธฒเธเธเธตเน</div>`;
    } else {
      storeStock.forEach(item => {
        const prod = mProducts.find(p => p.ProductID === item.ProductID);
        stockRowsHtml += `
          <div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <div>
              <span class="font-bold text-xs text-slate-700">${prod ? prod.ProductName : item.ProductID}</span><br>
              <span class="text-[9px] text-slate-400">SKU: ${prod ? prod.SKU : '-'}</span>
            </div>
            <span class="font-bold text-xs text-emerald-600">${Number(item.Quantity).toLocaleString()} เธเธดเนเธ</span>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden fade-in">
        <div class="px-4 py-3 bg-emerald-50/20 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 class="font-bold text-slate-800 text-xs">${store.StoreName}</h4>
            <span class="text-[9px] text-slate-400">${store.Location}</span>
          </div>
        </div>
        <div class="p-4">
          ${stockRowsHtml}
        </div>
      </div>
    `;
  }

  function toggleAccordion(id) {
    const el = document.getElementById(`content-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    if (el.classList.contains('hidden')) {
      el.classList.remove('hidden');
      arrow.classList.add('rotate-180');
    } else {
      el.classList.add('hidden');
      arrow.classList.remove('rotate-180');
    }
  }

  function renderMobileHistory() {
    const container = document.getElementById('m-history-list');
    container.innerHTML = '';

    if (mTransactions.length === 0) {
      container.innerHTML = `<div class="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">เนเธกเนเธกเธตเธเธฃเธฐเธงเธฑเธ•เธดเธเธฒเธฃเธ—เธณเธฃเธฒเธขเธเธฒเธฃ</div>`;
      return;
    }

    const unique = [];
    const seen = new Set();
    mTransactions.forEach(item => {
      if (!seen.has(item.DocNo)) {
        seen.add(item.DocNo);
        unique.push(item);
      }
    });

    unique.forEach(tx => {
      const el = document.createElement('div');
      el.className = "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3";
      
      let typeBadge = "";
      if (tx.DocType === 'Restock') typeBadge = "bg-blue-50 text-blue-700 border border-blue-100";
      else if (tx.DocType === 'Consign') typeBadge = "bg-indigo-50 text-indigo-700 border border-indigo-100";
      else if (tx.DocType === 'Sale') typeBadge = "bg-emerald-50 text-emerald-700 border border-emerald-100";
      else if (tx.DocType === 'Return') typeBadge = "bg-purple-50 text-purple-700 border border-purple-100";

      let statusBadge = "";
      if (tx.Status === 'Pending') statusBadge = "bg-amber-100 text-amber-800";
      else if (tx.Status === 'Approved') statusBadge = "bg-emerald-100 text-emerald-800";
      else if (tx.Status === 'Cancelled') statusBadge = "bg-rose-100 text-rose-800";

      const lines = mTransactions.filter(t => t.DocNo === tx.DocNo);
      let itemsSummary = lines.map(line => {
        const prod = mProducts.find(p => p.ProductID === line.ProductID);
        return `${prod ? prod.ProductName : line.ProductID} (x${line.Quantity})`;
      }).join(', ');

      const dest = tx.DocType === 'Restock' || (tx.DocType === 'Return' && tx.ReturnSubtype === 'Cell_to_Company') ?
        'เธเธฅเธฑเธเนเธเธกเธทเธญเน€เธเธฅเธฅเน' : 
        (mStores.find(s => s.StoreID === tx.LocationID) ? mStores.find(s => s.StoreID === tx.LocationID).StoreName : tx.LocationID);

      el.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-slate-400">${tx.Timestamp}</span>
          <span class="px-2 py-0.5 rounded text-[9px] font-bold ${statusBadge}">${tx.Status}</span>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded text-[9px] font-bold ${typeBadge}">${tx.DocType}</span>
            <span class="text-xs font-black text-slate-800">${tx.DocNo}</span>
          </div>
          <p class="text-[10px] text-slate-500 mt-1 font-semibold truncate">เน€เธเนเธฒเธซเธกเธฒเธข: ${dest}</p>
          <p class="text-[10px] text-slate-500 mt-1 font-normal line-clamp-2">เธฃเธฒเธขเธเธฒเธฃ: ${itemsSummary}</p>
          ${tx.Remark ? `<p class="text-[10px] text-slate-500 mt-1 font-normal line-clamp-2">เธซเธกเธฒเธขเน€เธซเธ•เธธ: ${tx.Remark}</p>` : ''}
        </div>
      `;
      container.appendChild(el);
    });
  }

  function populateMobileStores() {
    const select = document.getElementById('mform-store');
    select.innerHTML = '';
    mStores.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.StoreID;
      opt.textContent = s.StoreName;
      select.appendChild(opt);
    });
  }

  // ==============================================
  // MOB FORM OVERLAY ACTIONS & LOGIC
  // ==============================================
  function openForm(docType) {
    currentDocType = docType;
    document.getElementById('m-form-title').textContent = 
      docType === 'Restock' ? 'เธเธญเน€เธเธดเธเธเธญเธเน€เธเนเธฒเธชเธ•เนเธญเธเน€เธเธฅเธฅเน' :
      docType === 'Consign' ? 'เธเธฑเธเธ—เธถเธเธเธฒเธเธเธฒเธขเธซเธเนเธฒเธฃเนเธฒเธเธขเธฒ' :
      docType === 'Sale' ? 'เธฃเธฒเธขเธเธฒเธเธเธฒเธขเธเธฃเธดเธเธญเธญเธเธซเธเนเธฒเธฃเนเธฒเธ' : 'เธ—เธณเธฃเธฒเธขเธเธฒเธฃเธชเนเธเธเธทเธเธชเธดเธเธเนเธฒ';

    document.getElementById('m-form-subtitle').textContent = docType + ' Form';

    document.getElementById('mform-return-subtype-sec').classList.add('hidden');
    document.getElementById('mform-store-sec').classList.add('hidden');
    document.getElementById('mform-slip-sec').classList.add('hidden');

    if (docType === 'Consign' || docType === 'Sale') {
      document.getElementById('mform-store-sec').classList.remove('hidden');
    }
    
    if (docType === 'Sale') {
      document.getElementById('mform-remark-sec').classList.remove('hidden');
      document.getElementById('mform-slip-sec').classList.remove('hidden');
    }

    if (docType === 'Return') {
      document.getElementById('mform-return-subtype-sec').classList.remove('hidden');
      document.getElementById('mform-return-subtype').value = 'Pharmacy_to_Cell';
    }
    
    document.getElementById('mform-store').value = '';
    document.getElementById('mform-remark').value = '';
    document.getElementById('mform-cart').innerHTML = '';
    document.getElementById('mform-slip-label').textContent = 'เธเธ”เน€เธเธทเนเธญเน€เธเธดเธ”เธเธฅเนเธญเธ / เนเธเธเธฃเธนเธเธ เธฒเธ';
    document.getElementById('mform-slip-preview-container').classList.add('hidden');
    document.getElementById('mform-slip-preview').src = '';

    addCartItemRow();
    toggleFormInputs();

    document.getElementById('m-form-overlay').classList.remove('hidden');
  }

  function closeForm() {
    document.getElementById('m-form-overlay').classList.add('hidden');
  }

  function toggleFormInputs() {
    const rSubtype = document.getElementById('mform-return-subtype').value;
    const storeSec = document.getElementById('mform-store-sec');
    
    if (currentDocType === 'Return') {
      if (rSubtype === 'Pharmacy_to_Cell') {
        storeSec.classList.remove('hidden');
      } else {
        storeSec.classList.add('hidden');
      }
    }
    loadProductStockLimits();
  }

  function loadProductStockLimits() {
    const container = document.getElementById('mform-cart');
    for (let i = 0; i < container.children.length; i++) {
      const rowId = container.children[i].id;
      if (rowId && rowId.startsWith('cart-row-')) {
        const idx = rowId.replace('cart-row-', '');
        const hiddenProd = document.getElementById(`cart-item-prod-${idx}`);
        const prevValue = hiddenProd ? hiddenProd.value : null;
        
        populateCartRowProducts(idx);
        
        const prods = window[`cartAvailableProducts_${idx}`] || [];
        if (prevValue && prods.some(p => p.ProductID === prevValue)) {
          const p = prods.find(x => x.ProductID === prevValue);
          hiddenProd.value = p.ProductID;
          document.getElementById(`cart-item-search-${idx}`).value = `${p.ProductName || 'เนเธกเนเธกเธตเธเธทเนเธญเธชเธดเธเธเนเธฒ'} [${p.SKU || 'เนเธกเนเธกเธตเธฃเธซเธฑเธช'}]`;
        }
      }
    }
  }

  function addCartItemRow() {
    const container = document.getElementById('mform-cart');
    const idx = container.children.length;

    const row = document.createElement('div');
    row.className = "flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 relative fade-in";
    row.id = `cart-row-${idx}`;

    row.innerHTML = `
      <div class="flex-1 space-y-1 relative" id="cart-prod-container-${idx}">
        <input type="hidden" id="cart-item-prod-${idx}">
        <div class="relative">
          <input type="text" id="cart-item-search-${idx}" placeholder="เธเธดเธกเธเนเธเนเธเธซเธฒเธชเธดเธเธเนเธฒ..." onkeyup="filterProductOptions(${idx})" onfocus="showProductOptions(${idx})" autocomplete="off" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-text text-slate-700">
          <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg class="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        <div id="cart-item-options-${idx}" class="hidden absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
        </div>
        <span class="text-[9px] text-slate-400 font-bold block mt-1" id="cart-item-limit-lbl-${idx}">เธกเธตเนเธซเนเธชเธฑเนเธ: - เธเธดเนเธ</span>
      </div>
      <div class="w-20">
        <input type="number" min="1" id="cart-item-qty-${idx}" class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-slate-700" value="1">
      </div>
      <button type="button" onclick="removeCartItemRow(${idx})" class="text-rose-500 p-1 hover:bg-rose-50 rounded-lg">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;

    container.appendChild(row);
    populateCartRowProducts(idx);
  }

  function removeCartItemRow(idx) {
    const container = document.getElementById('mform-cart');
    const row = document.getElementById(`cart-row-${idx}`);
    if (container.children.length > 1) {
      row.remove();
    } else {
      alert("เธ•เนเธญเธเธกเธตเธฃเธฒเธขเธเธฒเธฃเธชเธดเธเธเนเธฒเธญเธขเนเธฒเธเธเนเธญเธข 1 เธฃเธฒเธขเธเธฒเธฃ");
    }
  }

  function populateCartRowProducts(idx) {
    let availableProducts = [];
    const storeId = document.getElementById('mform-store').value;
    const rSubtype = document.getElementById('mform-return-subtype').value;

    if (currentDocType === 'Restock') {
      availableProducts = mProducts;
    } 
    else if (currentDocType === 'Consign' || (currentDocType === 'Return' && rSubtype === 'Cell_to_Company')) {
      const stockInHand = mInventory.filter(i => i.LocationType === 'Cell_Stock' && isSameId(i.LocationID, currentUser.UserID) && Number(i.Quantity) > 0);
      availableProducts = mProducts.filter(p => stockInHand.some(i => i.ProductID === p.ProductID));
    } 
    else if (currentDocType === 'Sale' || (currentDocType === 'Return' && rSubtype === 'Pharmacy_to_Cell')) {
      const stockInStore = mInventory.filter(i => i.LocationType === 'Pharmacy_Stock' && isSameId(i.LocationID, storeId) && Number(i.Quantity) > 0);
      availableProducts = mProducts.filter(p => stockInStore.some(i => i.ProductID === p.ProductID));
    }

    window[`cartAvailableProducts_${idx}`] = availableProducts;
    
    const hiddenProd = document.getElementById(`cart-item-prod-${idx}`);
    const searchInput = document.getElementById(`cart-item-search-${idx}`);
    
    if (availableProducts.length === 0) {
      hiddenProd.value = "";
      searchInput.value = "";
      searchInput.placeholder = "เนเธกเนเธกเธตเธชเธดเธเธเนเธฒเนเธซเนเน€เธฅเธทเธญเธ";
    } else {
      hiddenProd.value = availableProducts[0].ProductID;
      searchInput.value = `${availableProducts[0].ProductName || 'เนเธกเนเธกเธตเธเธทเนเธญเธชเธดเธเธเนเธฒ'} [${availableProducts[0].SKU || 'เนเธกเนเธกเธตเธฃเธซเธฑเธช'}]`;
      searchInput.placeholder = "เธเธดเธกเธเนเธเนเธเธซเธฒเธชเธดเธเธเนเธฒ...";
    }
    
    renderProductOptions(idx, "");
    updateRowLimitLabel(idx);
  }

  function renderProductOptions(idx, searchTxt) {
    const container = document.getElementById(`cart-item-options-${idx}`);
    if (!container) return;
    const prods = window[`cartAvailableProducts_${idx}`] || [];
    container.innerHTML = '';
    
    const term = searchTxt.toLowerCase();
    const filtered = prods.filter(p => String(p.ProductName || '').toLowerCase().includes(term) || String(p.SKU || '').toLowerCase().includes(term));
    
    if (filtered.length === 0) {
      container.innerHTML = `<div class="p-2 text-xs text-slate-400 text-center">เนเธกเนเธเธเธชเธดเธเธเนเธฒ</div>`;
      return;
    }
    
    filtered.forEach(p => {
      const div = document.createElement('div');
      div.className = "px-3 py-2 border-b border-slate-100 text-[10px] font-semibold text-slate-700 hover:bg-emerald-50 cursor-pointer transition-colors";
      div.textContent = `${p.ProductName || 'เนเธกเนเธกเธตเธเธทเนเธญเธชเธดเธเธเนเธฒ'} [${p.SKU || 'เนเธกเนเธกเธตเธฃเธซเธฑเธช'}]`;
      div.onclick = function() {
        document.getElementById(`cart-item-prod-${idx}`).value = p.ProductID;
        document.getElementById(`cart-item-search-${idx}`).value = `${p.ProductName || 'เนเธกเนเธกเธตเธเธทเนเธญเธชเธดเธเธเนเธฒ'} [${p.SKU || 'เนเธกเนเธกเธตเธฃเธซเธฑเธช'}]`;
        container.classList.add('hidden');
        updateRowLimitLabel(idx);
      };
      container.appendChild(div);
    });
  }

  function filterProductOptions(idx) {
    const txt = document.getElementById(`cart-item-search-${idx}`).value;
    renderProductOptions(idx, txt);
  }

  function showProductOptions(idx) {
    document.querySelectorAll('[id^="cart-item-options-"]').forEach(el => el.classList.add('hidden'));
    const input = document.getElementById(`cart-item-search-${idx}`);
    input.select();
    document.getElementById(`cart-item-options-${idx}`).classList.remove('hidden');
    renderProductOptions(idx, "");
  }

  document.addEventListener('click', function(e) {
    const cart = document.getElementById('mform-cart');
    if (!cart) return;
    if (e.target.closest('[id^="cart-prod-container-"]')) return;
    document.querySelectorAll('[id^="cart-item-options-"]').forEach(el => el.classList.add('hidden'));
  });

  function updateRowLimitLabel(idx) {
    const hiddenProd = document.getElementById(`cart-item-prod-${idx}`);
    const lbl = document.getElementById(`cart-item-limit-lbl-${idx}`);
    if (!hiddenProd || !lbl) return;

    const pId = hiddenProd.value;
    const storeId = document.getElementById('mform-store').value;
    const rSubtype = document.getElementById('mform-return-subtype').value;

    let limit = Infinity;
    let limitText = "เนเธกเนเธเธณเธเธฑเธ”";

    if (currentDocType === 'Restock') {
      limitText = "เธชเธฑเนเธเนเธ”เนเนเธกเนเธเธณเธเธฑเธ” (เธฃเธญเนเธญเธ”เธกเธดเธเธญเธเธธเธกเธฑเธ•เธด)";
    } 
    else if (currentDocType === 'Consign' || (currentDocType === 'Return' && rSubtype === 'Cell_to_Company')) {
      const item = mInventory.find(i => i.LocationType === 'Cell_Stock' && isSameId(i.LocationID, currentUser.UserID) && i.ProductID === pId);
      limit = item ? Number(item.Quantity) : 0;
      limitText = `เธกเธตเนเธเธชเธ•เนเธญเธเน€เธเธฅเธฅเน: ${limit.toLocaleString()} เธเธดเนเธ`;
    } 
    else if (currentDocType === 'Sale' || (currentDocType === 'Return' && rSubtype === 'Pharmacy_to_Cell')) {
      const item = mInventory.find(i => i.LocationType === 'Pharmacy_Stock' && String(i.LocationID) === String(storeId) && i.ProductID === pId);
      limit = item ? Number(item.Quantity) : 0;
      limitText = `เธกเธตเธซเธเนเธฒเธฃเนเธฒเธเธขเธฒ: ${limit.toLocaleString()} เธเธดเนเธ`;
    }

    lbl.textContent = limitText;
    lbl.dataset.limit = limit;
  }

  function previewSlip(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      document.getElementById('mform-slip-label').textContent = file.name;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('mform-slip-preview').src = e.target.result;
        document.getElementById('mform-slip-preview-container').classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  }

  function submitMobileForm() {
    const submitBtn = document.getElementById('mform-submit-btn');
    const storeId = document.getElementById('mform-store').value;
    const rSubtype = document.getElementById('mform-return-subtype').value;
    const remark = document.getElementById('mform-remark').value;
    
    const items = [];
    const cartRows = document.getElementById('mform-cart').children;
    
    let hasValidationError = false;

    for (let i = 0; i < cartRows.length; i++) {
      const hiddenProd = cartRows[i].querySelector('input[type="hidden"]');
      const inputSearch = cartRows[i].querySelector('input[type="text"]');
      const inputQty = cartRows[i].querySelector('input[type="number"]');
      const limitLbl = cartRows[i].querySelector('span');

      if (hiddenProd && inputQty && limitLbl) {
        const qty = Number(inputQty.value);
        const limit = Number(limitLbl.dataset.limit);
        const pId = hiddenProd.value;

        if (!pId || pId === "") {
          alert("เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ—เธณเธฃเธฒเธขเธเธฒเธฃเนเธ”เน เน€เธเธทเนเธญเธเธเธฒเธเนเธกเนเธกเธตเธชเธดเธเธเนเธฒเนเธซเนเน€เธฅเธทเธญเธเนเธเธเธฒเธเธฃเธฒเธขเธเธฒเธฃ");
          hasValidationError = true;
          break;
        }

        if (isNaN(qty) || qty <= 0) {
          alert("เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเธณเธเธงเธเธชเธดเธเธเนเธฒเนเธซเนเธ–เธนเธเธ•เนเธญเธ (เธกเธฒเธเธเธงเนเธฒ 0)");
          hasValidationError = true;
          break;
        }

        if (qty > limit) {
          const prodName = inputSearch ? inputSearch.value : pId;
          alert(`เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ—เธณเธฃเธฒเธขเธเธฒเธฃเนเธ”เนเน€เธเธทเนเธญเธเธเธฒเธเธกเธตเธชเธดเธเธเนเธฒเนเธกเนเธเธญ: ${prodName} เธ•เนเธญเธเธเธฒเธฃ ${qty} เธเธดเนเธเนเธ•เนเธเธฃเนเธญเธกเนเธเนเธเธฒเธ ${limit} เธเธดเนเธ`);
          hasValidationError = true;
          break;
        }

        items.push({
          ProductID: pId,
          Quantity: qty,
          CreatedBy: currentUser.UserID
        });
      }
    }

    if (hasValidationError || items.length === 0) return;

    const slipInput = document.getElementById('mform-slip-input');
    let base64Image = "";
    let fileName = "";

    if (currentDocType === 'Sale') {
      if (!slipInput.files || slipInput.files.length === 0) {
        alert("เธเธฃเธธเธ“เธฒเธ–เนเธฒเธขเธฃเธนเธเธชเธฅเธดเธเธซเธฃเธทเธญเธซเธฅเธฑเธเธเธฒเธเนเธเธเธชเนเธ!");
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> เธเธณเธฅเธฑเธเธชเนเธเธเนเธญเธกเธนเธฅ...`;

    let locationId = currentUser.UserID;
    if (currentDocType === 'Consign' || currentDocType === 'Sale') {
      locationId = storeId;
    } else if (currentDocType === 'Return') {
      if (rSubtype === 'Pharmacy_to_Cell') {
        locationId = storeId;
      } else {
        locationId = currentUser.UserID;
      }
    }

    const nextStep = function(imgB64) {
      google.script.run
        .withSuccessHandler(function(res) {
          submitBtn.disabled = false;
          submitBtn.textContent = "เธชเนเธเธเธณเธเธญ";
          closeForm();
          document.getElementById('m-success-docno').textContent = res.docNo;
          document.getElementById('m-success-modal').classList.remove('hidden');
          setTimeout(() => refreshMobileData(), 100);
        })
        .withFailureHandler(function(err) {
          submitBtn.disabled = false;
          submitBtn.textContent = "เธชเนเธเธเธณเธเธญ";
          alert("เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธชเนเธเธฃเธฒเธขเธเธฒเธฃ: " + err.message);
        })
        .submitTransaction(currentDocType, currentDocType === 'Return' ? rSubtype : 'N/A', locationId, items, imgB64, fileName, remark);
    };

    if (slipInput.files && slipInput.files[0]) {
      const file = slipInput.files[0];
      fileName = file.name;
      const reader = new FileReader();
      reader.onload = function(e) {
        nextStep(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      nextStep("");
    }
  }
</script>
