'use client';

import { useState, useEffect } from 'react';
import {
  authApi,
  productsApi,
  storesApi,
  usersApi,
  inventoryApi,
  transactionsApi,
  dashboardApi,
} from '../lib/api';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  // Form states for login
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [pendingTxns, setPendingTxns] = useState<any[]>([]);
  const [allTxns, setAllTxns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);

  // Accordion states
  const [inventoryAccordions, setInventoryAccordions] = useState<Record<string, boolean>>({
    'acc-inventory': true,
    'acc-masters': false,
  });

  // Modal / Selection states
  const [selectedTxn, setSelectedTxn] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // CRUD Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ sku: '', name: '', price: 0, startDate: '', endDate: '', status: 'ACTIVE' });

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [storeForm, setStoreForm] = useState({ name: '', location: '', assignedUserId: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', fullName: '', role: 'SALE', status: 'ACTIVE' });

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStoreId, setTransferStoreId] = useState('');
  const [transferTargetUserId, setTransferTargetUserId] = useState('');

  // Sub-tabs
  const [invSubTab, setInvSubTab] = useState<'sale' | 'pharm'>('sale');
  const [masterSubTab, setMasterSubTab] = useState<'products' | 'stores' | 'users'>('products');

  useEffect(() => {
    const savedToken = localStorage.getItem('otc_token');
    const savedUser = localStorage.getItem('otc_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Fetch data depending on active tab
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        if (activeTab === 'dashboard') {
          const statsData = await dashboardApi.getStats(token);
          setStats(statsData);
          setRecentTxns(statsData.recentTxns || []);
        } else if (activeTab === 'approvals') {
          const pending = await transactionsApi.pending(token);
          const all = await transactionsApi.list(token);
          setPendingTxns(pending);
          setAllTxns(all);
        } else if (activeTab === 'inventory') {
          const data = await inventoryApi.list(token);
          setInventoryList(data);
          // Pre-fetch stores and users to display names nicely
          const p = await productsApi.list(token);
          setProducts(p);
          const s = await storesApi.list(token);
          setStores(s);
          const u = await usersApi.list(token);
          setUsers(u);
        } else if (activeTab === 'masters') {
          const p = await productsApi.list(token);
          setProducts(p);
          const s = await storesApi.list(token);
          setStores(s);
          const u = await usersApi.list(token);
          setUsers(u);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [token, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    try {
      const response = await authApi.login(usernameInput, passwordInput);
      if (response.user.role === 'SALE') {
        throw new Error('ระบบนี้สงวนไว้สำหรับแอดมินเท่านั้น');
      }
      localStorage.setItem('otc_token', response.accessToken);
      localStorage.setItem('otc_user', JSON.stringify(response.user));
      setToken(response.accessToken);
      setUser(response.user);
    } catch (err: any) {
      setLoginError(err.message || 'เข้าสู่ระบบล้มเหลว');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('otc_token');
    localStorage.removeItem('otc_user');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  const toggleAccordion = (key: string) => {
    setInventoryAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleViewTxnDetails = async (docNo: string) => {
    if (!token) return;
    try {
      const detailed = await transactionsApi.get(docNo, token);
      setSelectedTxn(detailed);
    } catch (err: any) {
      alert(`โหลดรายละเอียดล้มเหลว: ${err.message}`);
    }
  };

  const handleApproveTxn = async (docNo: string) => {
    if (!token || !confirm(`ยืนยันการอนุมัติเอกสาร ${docNo}?`)) return;
    try {
      await transactionsApi.approve(docNo, token);
      alert('อนุมัติเอกสารสำเร็จ');
      setSelectedTxn(null);
      // Reload lists
      const pending = await transactionsApi.pending(token);
      const all = await transactionsApi.list(token);
      setPendingTxns(pending);
      setAllTxns(all);
    } catch (err: any) {
      alert(`อนุมัติล้มเหลว: ${err.message}`);
    }
  };

  const handleRejectTxnSubmit = async () => {
    if (!token || !selectedTxn || !rejectReason.trim()) return;
    try {
      await transactionsApi.reject(selectedTxn.docNo, rejectReason, token);
      alert('ปฏิเสธเอกสารสำเร็จ');
      setSelectedTxn(null);
      setShowRejectModal(false);
      setRejectReason('');
      const pending = await transactionsApi.pending(token);
      const all = await transactionsApi.list(token);
      setPendingTxns(pending);
      setAllTxns(all);
    } catch (err: any) {
      alert(`ปฏิเสธล้มเหลว: ${err.message}`);
    }
  };

  const handleCancelTxnSubmit = async () => {
    if (!token || !selectedTxn) return;
    try {
      await transactionsApi.cancel(selectedTxn.docNo, cancelReason, token);
      alert('ยกเลิกเอกสารและคืนยอดสต็อกสำเร็จ');
      setSelectedTxn(null);
      setShowCancelModal(false);
      setCancelReason('');
      const pending = await transactionsApi.pending(token);
      const all = await transactionsApi.list(token);
      setPendingTxns(pending);
      setAllTxns(all);
    } catch (err: any) {
      alert(`ยกเลิกล้มเหลว: ${err.message}`);
    }
  };

  // CRUD Product Actions
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, productForm, token);
        alert('แก้ไขสินค้าสำเร็จ');
      } else {
        await productsApi.create(productForm, token);
        alert('สร้างสินค้าสำเร็จ');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ sku: '', name: '', price: 0, startDate: '', endDate: '', status: 'ACTIVE' });
      const p = await productsApi.list(token);
      setProducts(p);
    } catch (err: any) {
      alert(`ดำเนินการล้มเหลว: ${err.message}`);
    }
  };

  const handleEditProduct = (prd: any) => {
    setEditingProduct(prd);
    setProductForm({
      sku: prd.sku,
      name: prd.name,
      price: Number(prd.price),
      startDate: prd.startDate || '',
      endDate: prd.endDate || '',
      status: prd.status,
    });
    setShowProductModal(true);
  };

  const handleToggleProductStatus = async (prd: any) => {
    if (!token) return;
    const nextStatus = prd.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`ยืนยันการเปลี่ยนสถานะสินค้า ${prd.sku} เป็น ${nextStatus}?`)) return;
    try {
      await productsApi.update(prd.id, { ...prd, price: Number(prd.price), status: nextStatus }, token);
      const p = await productsApi.list(token);
      setProducts(p);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CRUD Store Actions
  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const data = {
        ...storeForm,
        assignedUserId: storeForm.assignedUserId || null,
      };
      if (editingStore) {
        await storesApi.update(editingStore.id, data, token);
        alert('แก้ไขร้านค้าสำเร็จ');
      } else {
        await storesApi.create(data, token);
        alert('สร้างร้านค้าสำเร็จ');
      }
      setShowStoreModal(false);
      setEditingStore(null);
      setStoreForm({ name: '', location: '', assignedUserId: '' });
      const s = await storesApi.list(token);
      setStores(s);
    } catch (err: any) {
      alert(`ดำเนินการล้มเหลว: ${err.message}`);
    }
  };

  const handleEditStore = (st: any) => {
    setEditingStore(st);
    setStoreForm({
      name: st.name,
      location: st.location || '',
      assignedUserId: st.assignedUserId || '',
    });
    setShowStoreModal(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !transferStoreId || !transferTargetUserId) return;
    try {
      await storesApi.transfer(transferStoreId, transferTargetUserId, token);
      alert('โอนย้ายความรับผิดชอบร้านค้าสำเร็จ');
      setShowTransferModal(false);
      setTransferStoreId('');
      setTransferTargetUserId('');
      const s = await storesApi.list(token);
      setStores(s);
    } catch (err: any) {
      alert(`โอนย้ายล้มเหลว: ${err.message}`);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!token || !confirm('ยืนยันลบร้านค้านี้ออกจากระบบ?')) return;
    try {
      await storesApi.delete(id, token);
      alert('ลบร้านค้าสำเร็จ');
      const s = await storesApi.list(token);
      setStores(s);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CRUD User Actions
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingUser) {
        const payload: any = { ...userForm };
        if (!payload.password) delete payload.password; // อย่าส่งรหัสผ่านว่าง
        await usersApi.update(editingUser.id, payload, token);
        alert('แก้ไขผู้ใช้งานสำเร็จ');
      } else {
        await usersApi.create(userForm, token);
        alert('สร้างผู้ใช้งานสำเร็จ');
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ username: '', password: '', fullName: '', role: 'SALE', status: 'ACTIVE' });
      const u = await usersApi.list(token);
      setUsers(u);
    } catch (err: any) {
      alert(`ดำเนินการล้มเหลว: ${err.message}`);
    }
  };

  const handleEditUser = (usr: any) => {
    setEditingUser(usr);
    setUserForm({
      username: usr.username,
      password: '',
      fullName: usr.fullName,
      role: usr.role,
      status: usr.status,
    });
    setShowUserModal(true);
  };

  const handleToggleUserStatus = async (usr: any) => {
    if (!token) return;
    const nextStatus = usr.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!confirm(`ยืนยันการเปลี่ยนสถานะผู้ใช้งาน ${usr.username} เป็น ${nextStatus}?`)) return;
    try {
      await usersApi.update(usr.id, { ...usr, status: nextStatus }, token);
      const u = await usersApi.list(token);
      setUsers(u);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-emerald-600 font-bold animate-pulse text-lg">กำลังโหลดข้อมูลระบบ...</div>
      </div>
    );
  }

  // IF NOT LOGGED IN, RENDER LOGIN SCREEN
  if (!token) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#f4fbf7] via-[#ffffff] to-[#e8f5e9] p-4 relative overflow-hidden">
        <div className="absolute top-24 left-24 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-24 right-24 w-72 h-72 bg-green-100/40 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl p-8 text-slate-800 relative z-10">
          <div className="text-center mb-8">
            <img
              src="https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp"
              alt="Nutrition Profess Logo"
              className="h-16 mx-auto object-contain mb-4"
            />
            <h1 className="text-xl font-bold tracking-wide text-slate-800">Wesell Consignment</h1>
            <p className="text-slate-500 text-xs mt-1 uppercase font-semibold tracking-wider">Nutrition Profess Co., Ltd. (Admin Panel)</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
              <span>⚠️ {loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm font-semibold"
                placeholder="กรอกชื่อผู้ใช้งาน"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm font-semibold"
                placeholder="กรอกรหัสผ่าน"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOGGED IN: MAIN APP LAYOUT
  return (
    <div className="min-h-screen flex overflow-hidden h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 text-slate-600">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col gap-2">
            <img
              src="https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp"
              alt="Nutrition Profess"
              className="h-10 object-contain self-start"
            />
            <div>
              <h2 className="text-slate-800 font-extrabold text-sm tracking-wide">Wesell Consignment</h2>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Consign Management</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-700 font-bold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-sm">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-left transition-all ${
                activeTab === 'approvals'
                  ? 'bg-emerald-50 text-emerald-700 font-bold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-sm">การอนุมัติ</span>
            </button>

            {/* Inventory Checker */}
            <div>
              <button
                onClick={() => toggleAccordion('acc-inventory')}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all text-left"
              >
                <span className="text-sm">ตรวจสอบคลังสินค้า</span>
                <span className="text-xs">{inventoryAccordions['acc-inventory'] ? '▼' : '▶'}</span>
              </button>
              {inventoryAccordions['acc-inventory'] && (
                <div className="pl-8 pr-4 py-1 space-y-1">
                  <button
                    onClick={() => {
                      setInvSubTab('sale');
                      setActiveTab('inventory');
                    }}
                    className={`w-full text-left py-1 text-xs ${
                      activeTab === 'inventory' && invSubTab === 'sale' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    คลังสต็อกของเซลล์
                  </button>
                  <button
                    onClick={() => {
                      setInvSubTab('pharm');
                      setActiveTab('inventory');
                    }}
                    className={`w-full text-left py-1 text-xs ${
                      activeTab === 'inventory' && invSubTab === 'pharm' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    คลังฝากขายร้านยา
                  </button>
                </div>
              )}
            </div>

            {/* Master Data */}
            <div>
              <button
                onClick={() => toggleAccordion('acc-masters')}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all text-left"
              >
                <span className="text-sm">ตั้งค่า</span>
                <span className="text-xs">{inventoryAccordions['acc-masters'] ? '▼' : '▶'}</span>
              </button>
              {inventoryAccordions['acc-masters'] && (
                <div className="pl-8 pr-4 py-1 space-y-1">
                  <button
                    onClick={() => {
                      setMasterSubTab('products');
                      setActiveTab('masters');
                    }}
                    className={`w-full text-left py-1 text-xs ${
                      activeTab === 'masters' && masterSubTab === 'products' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    ข้อมูลสินค้า
                  </button>
                  <button
                    onClick={() => {
                      setMasterSubTab('stores');
                      setActiveTab('masters');
                    }}
                    className={`w-full text-left py-1 text-xs ${
                      activeTab === 'masters' && masterSubTab === 'stores' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    ข้อมูลร้านค้า
                  </button>
                  <button
                    onClick={() => {
                      setMasterSubTab('users');
                      setActiveTab('masters');
                    }}
                    className={`w-full text-left py-1 text-xs ${
                      activeTab === 'masters' && masterSubTab === 'users' ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    ข้อมูลผู้ใช้งาน
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
              AD
            </div>
            <div>
              <div className="font-bold text-xs text-slate-800">{user?.fullName}</div>
              <div className="text-[9px] text-slate-400 font-semibold">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 py-2 border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-xs font-bold transition-all text-center"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 shrink-0 flex items-center justify-between px-8">
          <h2 className="font-bold text-slate-800 text-base">
            {activeTab === 'dashboard' && 'Dashboard ภาพรวม'}
            {activeTab === 'approvals' && 'ระบบการอนุมัติธุรกรรม'}
            {activeTab === 'inventory' && `ตรวจสอบสต็อกคงเหลือ (${invSubTab === 'sale' ? 'คลังส่วนตัวเซลล์' : 'คลังฝากขายร้านยา'})`}
            {activeTab === 'masters' && `จัดการข้อมูลระบบ (${masterSubTab === 'products' ? 'สินค้า' : masterSubTab === 'stores' ? 'ร้านค้า' : 'ผู้ใช้งาน'})`}
          </h2>
        </header>

        {/* Scrollable Screen Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* ==================== TAB 1: DASHBOARD ==================== */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">รายการรออนุมัติ</span>
                  <h3 className="text-3xl font-black text-amber-500">{stats.pendingCount} <span className="text-xs font-normal text-slate-400">ใบ</span></h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">พนักงานขายที่ทำงานอยู่</span>
                  <h3 className="text-3xl font-black text-indigo-600">{stats.activeSalesCount} <span className="text-xs font-normal text-slate-400">คน</span></h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ยอดขายสินค้าฝากขายสะสม</span>
                  <h3 className="text-3xl font-black text-emerald-600">฿{stats.totalSalesValue.toLocaleString()}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ร้านค้าเครือข่ายฝากขาย</span>
                  <h3 className="text-3xl font-black text-slate-700">{stats.totalStores} <span className="text-xs font-normal text-slate-400">ร้าน</span></h3>
                </div>
              </div>

              {/* Chart & Recent Activity */}
              <div className="grid grid-cols-3 gap-6">
                {/* SVG Chart */}
                <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-700 mb-4">แนวโน้มยอดขายสัปดาห์นี้ (7 วันล่าสุด)</h4>
                  {stats.chartData.length > 0 ? (
                    <div>
                      {/* Calculate SVG Polyline points */}
                      {(() => {
                        const maxValue = Math.max(...stats.chartData.map((d: any) => d.value), 1000);
                        const points = stats.chartData.map((d: any, i: number) => {
                          const x = 50 + (i * (430 / Math.max(stats.chartData.length - 1, 1)));
                          const y = 170 - (d.value / maxValue) * 150;
                          return `${x},${y}`;
                        }).join(' ');

                        return (
                          <svg viewBox="0 0 500 200" className="w-full h-48">
                            <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="50" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="50" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="50" y1="170" x2="480" y2="170" stroke="#cbd5e1" strokeWidth="1.5" />
                            <polyline points={points} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {stats.chartData.map((d: any, i: number) => {
                              const x = 50 + (i * (430 / Math.max(stats.chartData.length - 1, 1)));
                              const y = 170 - (d.value / maxValue) * 150;
                              return (
                                <g key={i}>
                                  <circle cx={x} cy={y} r="4" fill="#10b981" />
                                  <text x={x} y={y - 8} fontSize="8" fontWeight="bold" fill="#047857" textAnchor="middle">
                                    ฿{d.value}
                                  </text>
                                  <text x={x} y="185" fontSize="8" fill="#64748b" textAnchor="middle">
                                    {d.date.substring(5)}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-xs">ยังไม่มีข้อมูลยอดขายในสัปดาห์นี้</div>
                  )}
                </div>

                {/* Recent Transactions */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-4">ประวัติรายการล่าสุด</h4>
                    <div className="space-y-3">
                      {recentTxns.map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <div>
                            <div className="font-bold text-xs text-slate-800">{t.docNo}</div>
                            <div className="text-[10px] text-slate-400">{t.creatorName} ({t.docType})</div>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                            t.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: APPROVALS ==================== */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-4">รายการเอกสารรอการอนุมัติสต็อก</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="p-3">เลขที่เอกสาร</th>
                        <th className="p-3">ประเภท</th>
                        <th className="p-3">ผู้ทำรายการ</th>
                        <th className="p-3">ร้านค้า</th>
                        <th className="p-3">วันที่ส่งรายการ</th>
                        <th className="p-3 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingTxns.length > 0 ? (
                        pendingTxns.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{t.docNo}</td>
                            <td className="p-3 font-semibold text-slate-600">{t.docType} {t.returnSubtype ? `(${t.returnSubtype})` : ''}</td>
                            <td className="p-3 text-slate-600">{t.creatorName}</td>
                            <td className="p-3 text-slate-600">{t.storeName || '-'}</td>
                            <td className="p-3 text-slate-400">{new Date(t.createdAt).toLocaleString('th-TH')}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleViewTxnDetails(t.docNo)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all text-[11px]"
                              >
                                ตรวจสอบและอนุมัติ
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">🎉 ไม่มีรายการค้างรออนุมัติในระบบ</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* All Transactions Log */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-4">บันทึกธุรกรรมทั้งหมดในระบบ</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="p-3">เลขที่เอกสาร</th>
                        <th className="p-3">ประเภท</th>
                        <th className="p-3">ผู้ส่ง</th>
                        <th className="p-3">ร้านค้า</th>
                        <th className="p-3">สถานะ</th>
                        <th className="p-3">วันที่ทำรายการ</th>
                        <th className="p-3 text-center">ดูข้อมูล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allTxns.map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-bold text-slate-800">{t.docNo}</td>
                          <td className="p-3 text-slate-600">{t.docType}</td>
                          <td className="p-3 text-slate-600">{t.creatorName}</td>
                          <td className="p-3 text-slate-600">{t.storeName || '-'}</td>
                          <td className="p-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                              t.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                            }`}>{t.status}</span>
                          </td>
                          <td className="p-3 text-slate-400">{new Date(t.createdAt).toLocaleString('th-TH')}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleViewTxnDetails(t.docNo)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold transition-all text-[11px]"
                            >
                              ดูรายละเอียด
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: INVENTORY ==================== */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-700 mb-4">
                  {invSubTab === 'sale' ? 'สต็อกสินค้าคงเหลือส่วนตัวของพนักงานขาย (Sale In-hand Stock)' : 'สต็อกสินค้าฝากขายในตู้ร้านขายยา (Pharmacy Consigned Stock)'}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                        <th className="p-3">{invSubTab === 'sale' ? 'รหัส/ชื่อเซลล์' : 'รหัส/ชื่อร้านค้า'}</th>
                        <th className="p-3">รหัสสินค้า (SKU)</th>
                        <th className="p-3">ชื่อสินค้า</th>
                        <th className="p-3">ราคาสินค้า</th>
                        <th className="p-3 text-right">จำนวนสต็อกคงเหลือ</th>
                        <th className="p-3 text-right">มูลค่ารวม</th>
                        <th className="p-3 text-center">อัปเดตล่าสุด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryList
                        .filter((inv) => inv.locationType === (invSubTab === 'sale' ? 'SALE' : 'PHARMACY'))
                        .map((inv: any) => {
                          const prd = products.find((p) => p.id === inv.productId);
                          let ownerName = '-';
                          if (invSubTab === 'sale') {
                            const usr = users.find((u) => u.id === inv.saleUserId);
                            ownerName = usr ? `${usr.code} - ${usr.fullName}` : '-';
                          } else {
                            const st = stores.find((s) => s.id === inv.storeId);
                            ownerName = st ? `${st.code} - ${st.name}` : '-';
                          }

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-800">{ownerName}</td>
                              <td className="p-3 text-slate-600 font-semibold">{prd?.sku || '-'}</td>
                              <td className="p-3 text-slate-600">{prd?.name || '-'}</td>
                              <td className="p-3 text-slate-600">฿{Number(prd?.price || 0).toLocaleString()}</td>
                              <td className="p-3 text-right font-black text-slate-800">{inv.quantity} ชิ้น</td>
                              <td className="p-3 text-right font-black text-emerald-600">฿{(inv.quantity * Number(prd?.price || 0)).toLocaleString()}</td>
                              <td className="p-3 text-center text-slate-400">{new Date(inv.updatedAt).toLocaleString('th-TH')}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: MASTERS ==================== */}
          {activeTab === 'masters' && (
            <div className="space-y-6">
              {/* SUBTAB: PRODUCTS */}
              {masterSubTab === 'products' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-700">ฐานข้อมูลรายการสินค้าคงคลัง</h3>
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({ sku: '', name: '', price: 0, startDate: '', endDate: '', status: 'ACTIVE' });
                        setShowProductModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5"
                    >
                      <span>+ เพิ่มสินค้าใหม่</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                          <th className="p-3">รหัสสินค้า</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3">ชื่อสินค้า</th>
                          <th className="p-3">ราคา</th>
                          <th className="p-3">วันเริ่มสัญญา</th>
                          <th className="p-3">วันสิ้นสุดสัญญา</th>
                          <th className="p-3">สถานะ</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{p.code}</td>
                            <td className="p-3 text-slate-600 font-semibold">{p.sku}</td>
                            <td className="p-3 text-slate-600">{p.name}</td>
                            <td className="p-3 font-bold text-emerald-600">฿{Number(p.price).toLocaleString()}</td>
                            <td className="p-3 text-slate-500">{p.startDate || '-'}</td>
                            <td className="p-3 text-slate-500">{p.endDate || '-'}</td>
                            <td className="p-3">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>{p.status}</span>
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditProduct(p)}
                                className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px]"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleToggleProductStatus(p)}
                                className={`px-2 py-1 rounded-lg text-[10px] ${
                                  p.status === 'ACTIVE' ? 'border border-rose-200 hover:bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {p.status === 'ACTIVE' ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB: STORES */}
              {masterSubTab === 'stores' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-700">ฐานข้อมูลร้านขายยาเครือข่ายฝากขาย</h3>
                    <button
                      onClick={() => {
                        setEditingStore(null);
                        setStoreForm({ name: '', location: '', assignedUserId: '' });
                        setShowStoreModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5"
                    >
                      <span>+ เพิ่มร้านค้าใหม่</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                          <th className="p-3">รหัสร้าน</th>
                          <th className="p-3">ชื่อร้านค้า</th>
                          <th className="p-3">ที่ตั้ง/แผนที่</th>
                          <th className="p-3">เซลล์ที่ดูแล</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stores.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{s.code}</td>
                            <td className="p-3 text-slate-600 font-semibold">{s.name}</td>
                            <td className="p-3 text-slate-500">{s.location || '-'}</td>
                            <td className="p-3 font-bold text-emerald-700">{s.assignedUserFullName || '⚠️ ยังไม่มีผู้ดูแล'}</td>
                            <td className="p-3 text-center flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditStore(s)}
                                className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px]"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => {
                                  setTransferStoreId(s.id);
                                  setTransferTargetUserId(s.assignedUserId || '');
                                  setShowTransferModal(true);
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px]"
                              >
                                โอนย้ายเซลล์
                              </button>
                              <button
                                onClick={() => handleDeleteStore(s.id)}
                                className="px-2 py-1 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-[10px]"
                              >
                                ลบ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUBTAB: USERS */}
              {masterSubTab === 'users' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-700">ฐานข้อมูลพนักงานและผู้ใช้งานระบบ</h3>
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ username: '', password: '', fullName: '', role: 'SALE', status: 'ACTIVE' });
                        setShowUserModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5"
                    >
                      <span>+ เพิ่มผู้ใช้งานใหม่</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                          <th className="p-3">รหัสพนักงาน</th>
                          <th className="p-3">ชื่อผู้ใช้ (Username)</th>
                          <th className="p-3">ชื่อ-นามสกุล</th>
                          <th className="p-3">ตำแหน่ง (Role)</th>
                          <th className="p-3">สถานะ</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u: any) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-800">{u.code}</td>
                            <td className="p-3 text-slate-600 font-semibold">{u.username}</td>
                            <td className="p-3 text-slate-600">{u.fullName}</td>
                            <td className="p-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                u.role === 'SYSTEM_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>{u.role}</span>
                            </td>
                            <td className="p-3">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                                u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>{u.status}</span>
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditUser(u)}
                                className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px]"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2 py-1 rounded-lg text-[10px] ${
                                  u.status === 'ACTIVE' ? 'border border-rose-200 hover:bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {u.status === 'ACTIVE' ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ==================== DETAIL/APPROVE MODAL ==================== */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">รายละเอียดเอกสาร {selectedTxn.docNo}</h3>
              <button
                onClick={() => setSelectedTxn(null)}
                className="w-8 h-8 rounded-full border border-slate-100 hover:bg-slate-50 flex items-center justify-center text-slate-400 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">ประเภทรายการ:</span>
                  <div className="font-bold text-slate-800">{selectedTxn.docType} {selectedTxn.returnSubtype ? `(${selectedTxn.returnSubtype})` : ''}</div>
                </div>
                <div>
                  <span className="text-slate-400">ผู้ส่งข้อมูล:</span>
                  <div className="font-bold text-slate-800">{selectedTxn.creatorName}</div>
                </div>
                <div>
                  <span className="text-slate-400">ร้านขายยา:</span>
                  <div className="font-bold text-slate-800">{selectedTxn.storeName || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">วันที่ส่งข้อมูล:</span>
                  <div className="font-bold text-slate-800">{new Date(selectedTxn.createdAt).toLocaleString('th-TH')}</div>
                </div>
                <div>
                  <span className="text-slate-400">หมายเหตุ/บันทึก:</span>
                  <div className="font-bold text-slate-800">{selectedTxn.remark || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400">สถานะรายการ:</span>
                  <div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      selectedTxn.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      selectedTxn.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      selectedTxn.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>{selectedTxn.status}</span>
                  </div>
                </div>
              </div>

              {/* Lines Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3">รหัสสินค้า</th>
                      <th className="p-3">ชื่อสินค้า</th>
                      <th className="p-3 text-right">ราคา</th>
                      <th className="p-3 text-right">จำนวนที่ทำรายการ</th>
                      <th className="p-3 text-right">ราคารวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTxn.lines.map((l: any) => (
                      <tr key={l.id}>
                        <td className="p-3 font-semibold text-slate-600">{l.productSku}</td>
                        <td className="p-3 text-slate-600">{l.productName}</td>
                        <td className="p-3 text-right text-slate-600">฿{Number(l.productPrice).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-slate-800">{l.quantity} ชิ้น</td>
                        <td className="p-3 text-right font-black text-slate-800">฿{(l.quantity * Number(l.productPrice)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Evidence Picture */}
              {selectedTxn.evidenceKey && (
                <div className="space-y-2">
                  <span className="text-xs text-slate-400">รูปภาพสลิปหลักฐานแนบ:</span>
                  <div className="border border-slate-100 rounded-2xl p-4 flex items-center justify-center bg-slate-50/50">
                    <img
                      src={`${BASE}/api/upload/file/${selectedTxn.evidenceKey}`}
                      alt="Evidence Slip"
                      className="max-h-80 object-contain rounded-xl shadow-md"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedTxn(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all text-xs"
              >
                ปิดหน้าต่าง
              </button>
              {selectedTxn.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl font-bold transition-all text-xs"
                  >
                    ปฏิเสธเอกสาร
                  </button>
                  <button
                    onClick={() => handleApproveTxn(selectedTxn.docNo)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 transition-all text-xs"
                  >
                    อนุมัติเอกสาร
                  </button>
                </>
              )}
              {selectedTxn.status === 'APPROVED' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-lg shadow-rose-500/25 transition-all text-xs"
                >
                  ยกเลิกเอกสาร (คืนสต็อก)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">ระบุเหตุผลการปฏิเสธเอกสาร</h3>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="กรุณาเขียนเหตุผล เช่น รูปหลักฐานไม่ถูกต้อง หรือ สต็อกสินค้าไม่ถูกต้อง..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRejectTxnSubmit}
                disabled={!rejectReason.trim()}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs disabled:opacity-50"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">ยืนยันการยกเลิกเอกสารที่อนุมัติแล้ว</h3>
            <p className="text-xs text-slate-400">ระบบจะทำการดึงยอดสต็อกหักลบกลับด้าน (Rollback) ให้อัตโนมัติ</p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="ระบุเหตุผลการยกเลิก เช่น ลูกค้าขอยกเลิกออเดอร์ (ระบุหรือไม่ระบุก็ได้)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs"
              >
                ปิด
              </button>
              <button
                onClick={handleCancelTxnSubmit}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs"
              >
                ยืนยันยกเลิก & Rollback สต็อก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CREATE/EDIT PRODUCT MODAL ==================== */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-sm mb-4">{editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">รหัส SKU</label>
                <input
                  type="text"
                  required
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น PRODUCT-A"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ชื่อสินค้า</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="กรอกชื่อสินค้า"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ราคา (บาท)</label>
                <input
                  type="number"
                  required
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น 350"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">วันเริ่มสัญญา (ถ้ามี)</label>
                  <input
                    type="date"
                    value={productForm.startDate}
                    onChange={(e) => setProductForm({ ...productForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">วันสิ้นสุดสัญญา (ถ้ามี)</label>
                  <input
                    type="date"
                    value={productForm.endDate}
                    onChange={(e) => setProductForm({ ...productForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE/EDIT STORE MODAL ==================== */}
      {showStoreModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-sm mb-4">{editingStore ? 'แก้ไขร้านค้า' : 'เพิ่มร้านค้าใหม่'}</h3>
            <form onSubmit={handleStoreSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">ชื่อร้านขายยา</label>
                <input
                  type="text"
                  required
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น ร้านดรักสโตร์ สาขา A"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ที่อยู่/ทำเล</label>
                <input
                  type="text"
                  value={storeForm.location}
                  onChange={(e) => setStoreForm({ ...storeForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น กรุงเทพฯ หรือ ลิงก์แผนที่ Google Maps"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">พนักงานเซลล์ที่ดูแล (โอนย้ายทีหลังได้)</label>
                <select
                  value={storeForm.assignedUserId}
                  onChange={(e) => setStoreForm({ ...storeForm, assignedUserId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none"
                >
                  <option value="">-- ยังไม่มีพนักงานดูแล --</option>
                  {users.filter(u => u.role === 'SALE').map(u => (
                    <option key={u.id} value={u.id}>{u.code} - {u.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CREATE/EDIT USER MODAL ==================== */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-sm mb-4">{editingUser ? 'แก้ไขพนักงาน' : 'เพิ่มผู้ใช้งานระบบใหม่'}</h3>
            <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Username (ชื่อล็อกอิน)</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น sale.somchai"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">รหัสผ่าน {editingUser && '(กรอกเฉพาะเมื่อต้องการเปลี่ยนรหัสผ่าน)'}</label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น รหัสผ่าน 6 หลักขึ้นไป"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ชื่อ-นามสกุลพนักงาน</label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ตำแหน่ง (Role)</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none"
                >
                  <option value="SALE">SALE (เซลล์ขายยา)</option>
                  <option value="ADMIN">ADMIN (ผู้ดูแลจัดการ)</option>
                  <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (ผู้ดูแลสูงสุด)</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== TRANSFER ASSIGNED USER MODAL ==================== */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-sm mb-4">โอนย้ายความรับผิดชอบร้านค้า</h3>
            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <p className="text-slate-400">เลือกพนักงานเซลล์ที่จะให้มารับหน้าที่ดูแลร้านค้าแทน:</p>
              <div>
                <label className="block text-slate-400 mb-1">เลือกผู้ดูแลคนใหม่</label>
                <select
                  required
                  value={transferTargetUserId}
                  onChange={(e) => setTransferTargetUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none"
                >
                  <option value="">-- กรุณาเลือกเซลล์ --</option>
                  {users.filter(u => u.role === 'SALE').map(u => (
                    <option key={u.id} value={u.id}>{u.code} - {u.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!transferTargetUserId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  ยืนยันการโอนย้าย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
