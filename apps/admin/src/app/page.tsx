'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  authApi,
  productsApi,
  storesApi,
  usersApi,
  inventoryApi,
  transactionsApi,
  dashboardApi,
  BASE,
} from '../lib/api';
import PrintTxn from '../components/PrintTxn';


const formatDate = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${mins}`;
};

const formatDateOnly = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const PaginationControls = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  pageSize, 
  onPageSizeChange, 
  totalItems 
}: { 
  currentPage: number, 
  totalPages: number, 
  onPageChange: (p: number) => void,
  pageSize: number,
  onPageSizeChange: (s: number) => void,
  totalItems: number
}) => {
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages || 1, startPage + 4);
  
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-white">
      <div className="flex items-center gap-2">
        <span className="text-[20px] text-slate-500">แสดงรายการ</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="border border-slate-200 rounded-lg px-2 py-1 text-[20px] text-slate-700 bg-white outline-none focus:border-emerald-500"
        >
          <option value={10}>10</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-[20px] text-slate-500">จากทั้งหมด {totalItems} รายการ</span>
      </div>

      <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <button 
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 border-r border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:bg-slate-50 transition-colors text-[20px] font-bold"
        >
          &laquo;
        </button>
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 border-r border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:bg-slate-50 transition-colors text-[20px] font-bold"
        >
          &lsaquo;
        </button>
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3.5 py-1.5 border-r border-slate-200 transition-colors text-[20px] font-bold ${
              currentPage === page 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            {page}
          </button>
        ))}
        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1.5 border-r border-slate-200 bg-white text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:bg-slate-50 transition-colors text-[20px] font-bold"
        >
          &rsaquo;
        </button>
        <button 
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1.5 bg-white text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:bg-slate-50 transition-colors text-[20px] font-bold"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
};

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<string>('');
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState<boolean>(false);

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
  
  // Dashboard filter states
  const [dashStartDate, setDashStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dashEndDate, setDashEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [dashSaleUserId, setDashSaleUserId] = useState('ยอดรวมทั้งหมด');

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
  const [showProductPicker, setShowProductPicker] = useState<boolean>(false);
  const [showPharmacyPicker, setShowPharmacyPicker] = useState<boolean>(false);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState('');

  // CRUD Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({ sku: '', name: '', price: 0, startDate: '', endDate: '', status: 'ACTIVE' });

  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [storeForm, setStoreForm] = useState({ name: '', location: '', province: '', storageLocation: '', phone: '', assignedUserId: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState({ code: '', username: '', password: '', fullName: '', role: 'SALE', status: 'ACTIVE' });

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStoreId, setTransferStoreId] = useState('');
  const [transferTargetUserId, setTransferTargetUserId] = useState('');

  // Sub-tabs
  const [invSubTab, setInvSubTab] = useState<'sale' | 'pharm'>('sale');
  const [masterSubTab, setMasterSubTab] = useState<'products' | 'stores' | 'users'>('products');
  const [selectedInventoryOwner, setSelectedInventoryOwner] = useState<string>('');
  
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [approvalFilterStatus, setApprovalFilterStatus] = useState<string>('ALL');
  const [approvalSearchText, setApprovalSearchText] = useState<string>('');
  const [singleApproveDocNo, setSingleApproveDocNo] = useState<string | null>(null);

  const [approvalStartDate, setApprovalStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [approvalEndDate, setApprovalEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Pagination for masters
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
  const [storePage, setStorePage] = useState(1);
  const [storePageSize, setStorePageSize] = useState(10);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  
  // Pagination for approvals
  const [approvalPage, setApprovalPage] = useState(1);
  const [approvalPageSize, setApprovalPageSize] = useState(10);

  const handleSelectAllApprovals = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pendingDocs = allTxns.filter((t: any) => t.status === 'PENDING').map((t: any) => t.docNo);
      setSelectedApprovals(pendingDocs);
    } else {
      setSelectedApprovals([]);
    }
  };

  const handleSelectApproval = (docNo: string) => {
    if (selectedApprovals.includes(docNo)) {
      setSelectedApprovals(selectedApprovals.filter(d => d !== docNo));
    } else {
      setSelectedApprovals([...selectedApprovals, docNo]);
    }
  };

  const handleBulkApproveClick = () => {
    if (!selectedApprovals.length) return;
    setShowApproveConfirmModal(true);
  };

  const handleConfirmBulkApprove = async () => {
    if (!selectedApprovals.length || !token) return;
    
    setIsApproving(true);
    try {
      for (const docNo of selectedApprovals) {
         await transactionsApi.approve(docNo, token);
      }
      toast.success('อนุมัติเอกสารทั้งหมดสำเร็จ');
      setSelectedApprovals([]);
      setShowApproveConfirmModal(false);
      const pending = await transactionsApi.pending(token);
      const all = await transactionsApi.list(token);
      setPendingTxns(pending);
      setAllTxns(all);
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setIsApproving(false);
    }
  };
  useEffect(() => {
    const savedToken = localStorage.getItem('otc_token');
    const savedUser = localStorage.getItem('otc_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const fetchData = async () => {
    if (!token) return;
    try {
      if (activeTab === 'dashboard') {
        const statsData = await dashboardApi.getStats(token, {
          startDate: dashStartDate || undefined,
          endDate: dashEndDate || undefined,
          saleUserId: dashSaleUserId === 'ยอดรวมทั้งหมด' ? undefined : dashSaleUserId,
        });
        setStats(statsData);
        setRecentTxns(statsData.recentTxns || []);
        if (users.length === 0) {
          const u = await usersApi.list(token);
          setUsers(u);
        }
      } else if (activeTab === 'approvals') {
        const pending = await transactionsApi.pending(token);
        const all = await transactionsApi.list(token);
        setPendingTxns(pending);
        setAllTxns(all);
        if (stores.length === 0) {
          const s = await storesApi.list(token);
          setStores(s);
        }
        if (inventoryList.length === 0) {
          const inv = await inventoryApi.list(token);
          setInventoryList(inv);
        }
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
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        localStorage.removeItem('otc_token');
        localStorage.removeItem('otc_user');
        setToken(null);
        setUser(null);
      } else {
        console.error('Error fetching data:', err);
      }
    }
  };

  // Fetch data depending on active tab
  useEffect(() => {
    fetchData();
  }, [token, activeTab, dashStartDate, dashEndDate, dashSaleUserId]);

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

  
  const handleDownloadTemplate = (type: string) => {
    let ws;
    let filename = '';
    if (type === 'products') {
      ws = XLSX.utils.json_to_sheet([{
        'SKU': '',
        'ชื่อสินค้า': '',
        'ราคา': '',
        'วันที่เริ่มต้น(DD-MM-YYYY)': '',
        'วันที่สิ้นสุด(DD-MM-YYYY)': ''
      }]);
      filename = 'Products_Template.xlsx';
    } else if (type === 'stores') {
      ws = XLSX.utils.json_to_sheet([{
        'ชื่อร้านค้า': '',
        'ที่อยู่': '',
        'จังหวัด': '',
        'ตำแหน่งเก็บ': '',
        'เบอร์โทรศัพท์': '',
        'รหัสเซลล์ผู้รับผิดชอบ (Optional)': ''
      }]);
      filename = 'Stores_Template.xlsx';
    } else if (type === 'users') {
      ws = XLSX.utils.json_to_sheet([{
        'Username': '',
        'Password': '',
        'ชื่อ-นามสกุล': '',
        'Role (SALE/ADMIN/SYSTEM_ADMIN)': ''
      }]);
      filename = 'Users_Template.xlsx';
    }
    if (ws) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, filename);
    }
  };

  
  const handleExportData = (type: string) => {
    let ws;
    let filename = '';
    if (type === 'products') {
      const exportData = products.map((p: any) => ({
        'SKU': p.sku,
        'ชื่อสินค้า': p.name,
        'ราคา': p.price,
        'วันที่เริ่มต้น(DD-MM-YYYY)': p.startDate ? p.startDate.split('T')[0].split('-').reverse().join('-') : '',
        'วันที่สิ้นสุด(DD-MM-YYYY)': p.endDate ? p.endDate.split('T')[0].split('-').reverse().join('-') : '',
        'สถานะ': p.status,
        'รหัสอ้างอิงระบบ': p.code
      }));
      ws = XLSX.utils.json_to_sheet(exportData);
      filename = 'Products_Export.xlsx';
    } else if (type === 'stores') {
      const exportData = stores.map((s: any) => ({
        'ชื่อร้านค้า': s.name,
        'ที่อยู่': s.location || '',
        'จังหวัด': s.province || '',
        'ตำแหน่งเก็บ': s.storageLocation || '',
        'เบอร์โทรศัพท์': s.phone || '',
        'รหัสเซลล์ผู้รับผิดชอบ': s.assignedUserFullName || s.assignedUserId || '',
        'สถานะ': s.status,
        'รหัสอ้างอิงระบบ': s.code
      }));
      ws = XLSX.utils.json_to_sheet(exportData);
      filename = 'Stores_Export.xlsx';
    } else if (type === 'users') {
      const exportData = users.map((u: any) => ({
        'Username': u.username,
        'ชื่อ-นามสกุล': u.fullName,
        'Role': u.role,
        'สถานะ': u.status,
        'รหัสอ้างอิงระบบ': u.code
      }));
      ws = XLSX.utils.json_to_sheet(exportData);
      filename = 'Users_Export.xlsx';
    }
    
    if (ws) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Export Data');
      XLSX.writeFile(wb, filename);
    }
  };
  const handleDownloadPdf = async (docNo: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE}/api/export/transactions/${docNo}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consignment-${docNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('ไม่สามารถดาวน์โหลด PDF ได้');
    }
  };


  const parseExcelDate = (val: any, fieldName: string, rowIndex: number) => {
    if (!val) return undefined;
    let d: Date | null = null;

    if (typeof val === 'number') {
      d = new Date(Math.round((val - 25569) * 864e5));
    } else if (typeof val === 'string') {
      const parts = val.split(/[-/]/);
      if (parts.length === 3 && parts[2].length === 4) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
      } else {
        d = new Date(val);
      }
    } else {
      d = new Date(val);
    }

    if (!d || isNaN(d.getTime())) {
      throw new Error(`ข้อมูลในคอลัมน์ "${fieldName}" แถวที่ ${rowIndex} ไม่ถูกต้อง (ระบุ: ${val}) กรุณาตรวจสอบให้เป็นรูปแบบวันที่ที่ถูกต้อง`);
    }

    if (d.getFullYear() > 2100) {
      throw new Error(`ข้อมูลปีในคอลัมน์ "${fieldName}" แถวที่ ${rowIndex} ไม่ถูกต้อง (ระบุมาเป็นปี ${d.getFullYear()}) กรุณาระบุเป็นปี ค.ศ. เท่านั้น (เช่น 2026)`);
    }

    return d.toISOString().split('T')[0];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      
      let payload: any[] = [];
      if (importType === 'products') {
        payload = jsonData.map((row: any, idx: number) => ({
          sku: String(row['SKU'] || ''),
          name: String(row['ชื่อสินค้า'] || ''),
          price: Number(Number(row['ราคา'] || 0).toFixed(2)),
          startDate: parseExcelDate(row['วันที่เริ่มต้น(DD-MM-YYYY)'], 'วันที่เริ่มต้น(DD-MM-YYYY)', idx + 2),
          endDate: parseExcelDate(row['วันที่สิ้นสุด(DD-MM-YYYY)'], 'วันที่สิ้นสุด(DD-MM-YYYY)', idx + 2),
        }));
      } else if (importType === 'stores') {
        payload = jsonData.map((row: any) => ({
          name: String(row['ชื่อร้านค้า'] || ''),
          location: String(row['ที่อยู่'] || ''),
          storageLocation: String(row['ตำแหน่งเก็บ'] || ''),
          phone: String(row['เบอร์โทรศัพท์'] || ''),
          assignedUserId: row['รหัสเซลล์ผู้รับผิดชอบ (Optional)'] || undefined
        }));
      } else if (importType === 'users') {
        payload = jsonData.map((row: any) => ({
          username: String(row['Username'] || ''),
          password: String(row['Password'] || ''),
          fullName: String(row['ชื่อ-นามสกุล'] || ''),
          role: String(row['Role (SALE/ADMIN/SYSTEM_ADMIN)'] || 'SALE'),
        }));
      }
      
      setImportPreviewData(payload);
      setShowImportPreviewModal(true);
    } catch (error: any) {
      toast.error(error.message || 'การนำเข้าข้อมูลล้มเหลว กรุณาตรวจสอบไฟล์');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreviewData.length || !token) return;
    try {
      if (importType === 'products') {
        await productsApi.bulkImport(importPreviewData, token);
        toast.success('นำเข้าข้อมูลสินค้าสำเร็จ');
      } else if (importType === 'stores') {
        await storesApi.bulkImport(importPreviewData, token);
        toast.success('นำเข้าข้อมูลร้านค้าสำเร็จ');
      } else if (importType === 'users') {
        await usersApi.bulkImport(importPreviewData, token);
        toast.success('นำเข้าข้อมูลผู้ใช้งานสำเร็จ');
      }
      await fetchData();
      setShowImportPreviewModal(false);
      setImportPreviewData([]);
    } catch (error: any) {
      toast.error(error.message || 'การนำเข้าข้อมูลล้มเหลว');
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
      toast.error(`โหลดรายละเอียดล้มเหลว: ${err.message}`);
    }
  };

  const handleApproveTxnClick = (docNo: string) => {
    setSingleApproveDocNo(docNo);
  };

  const handleConfirmSingleApprove = async () => {
    if (!token || !singleApproveDocNo) return;
    setIsApproving(true);
    try {
      await transactionsApi.approve(singleApproveDocNo, token);
      toast.success('อนุมัติเอกสารสำเร็จ');
      setSelectedTxn(null);
      setSingleApproveDocNo(null);
      // Reload lists
      const pending = await transactionsApi.pending(token);
      const all = await transactionsApi.list(token);
      setPendingTxns(pending);
      setAllTxns(all);
    } catch (err: any) {
      toast.error(`อนุมัติล้มเหลว: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectTxnSubmit = async () => {
    if (!token || !selectedTxn || !rejectReason.trim()) return;
    try {
      await transactionsApi.reject(selectedTxn.docNo, rejectReason, token);
      toast.success('ปฏิเสธเอกสารสำเร็จ');
      setSelectedTxn(null);
      setShowRejectModal(false);
      setRejectReason('');
      const pending = await transactionsApi.pending(token);
      const all = await transactionsApi.list(token);
      setPendingTxns(pending);
      setAllTxns(all);
    } catch (err: any) {
      toast.error(`ปฏิเสธล้มเหลว: ${err.message}`);
    }
  };

  const handleCancelTxnSubmit = async () => {
    if (!token || !selectedTxn) return;
    try {
      await transactionsApi.cancel(selectedTxn.docNo, cancelReason, token);
      toast.success('ยกเลิกเอกสารและคืนยอดสต็อกสำเร็จ');
      setSelectedTxn(null);
      setShowCancelModal(false);
      setCancelReason('');
      const pending = await transactionsApi.pending(token);
      const all = await transactionsApi.list(token);
      setPendingTxns(pending);
      setAllTxns(all);
    } catch (err: any) {
      toast.error(`ยกเลิกล้มเหลว: ${err.message}`);
    }
  };

  // CRUD Product Actions
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, productForm, token);
        toast.success('แก้ไขสินค้าสำเร็จ');
      } else {
        await productsApi.create(productForm, token);
        toast.success('สร้างสินค้าสำเร็จ');
      }
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ sku: '', name: '', price: 0, startDate: '', endDate: '', status: 'ACTIVE' });
      const p = await productsApi.list(token);
      setProducts(p);
    } catch (err: any) {
      toast.error(`ดำเนินการล้มเหลว: ${err.message}`);
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
      toast.error(err.message);
    }
  };

  // CRUD Store Actions
  
  const handleToggleStoreStatus = async (store: any) => {
    if (!token) return;
    try {
      const nextStatus = store.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await storesApi.update(store.id, { ...store, status: nextStatus }, token);
      toast.success('อัปเดตสถานะร้านค้าสำเร็จ');
      const s = await storesApi.list(token);
      setStores(s);
    } catch (err: any) {
      toast.error(`อัปเดตสถานะล้มเหลว: ${err.message}`);
    }
  };

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
        toast.success('แก้ไขร้านค้าสำเร็จ');
      } else {
        await storesApi.create(data, token);
        toast.success('สร้างร้านค้าสำเร็จ');
      }
      setShowStoreModal(false);
      setEditingStore(null);
      setStoreForm({ name: '', location: '', province: '', storageLocation: '', phone: '', assignedUserId: '' });
      const s = await storesApi.list(token);
      setStores(s);
    } catch (err: any) {
      toast.error(`ดำเนินการล้มเหลว: ${err.message}`);
    }
  };

  const handleEditStore = (st: any) => {
    setEditingStore(st);
    setStoreForm({
      name: st.name,
      location: st.location || '',
      province: st.province || '',
      storageLocation: st.storageLocation || '',
      phone: st.phone || '',
      assignedUserId: st.assignedUserId || '',
    });
    setShowStoreModal(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !transferStoreId || !transferTargetUserId) return;
    try {
      await storesApi.transfer(transferStoreId, transferTargetUserId, token);
      toast.success('โอนย้ายความรับผิดชอบร้านค้าสำเร็จ');
      setShowTransferModal(false);
      setTransferStoreId('');
      setTransferTargetUserId('');
      const s = await storesApi.list(token);
      setStores(s);
    } catch (err: any) {
      toast.error(`โอนย้ายล้มเหลว: ${err.message}`);
    }
  };

  const handleDeleteStore = async (id: string) => {
    if (!token || !confirm('ยืนยันลบร้านค้านี้ออกจากระบบ?')) return;
    try {
      await storesApi.delete(id, token);
      toast.success('ลบร้านค้าสำเร็จ');
      const s = await storesApi.list(token);
      setStores(s);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // CRUD User Actions
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingUser) {
        const payload: any = { ...userForm };
        if (!payload.password || payload.password.trim() === '') delete payload.password; // อย่าส่งรหัสผ่านว่าง
        await usersApi.update(editingUser.id, payload, token);
        toast.success('แก้ไขผู้ใช้งานสำเร็จ');
      } else {
        await usersApi.create(userForm, token);
        toast.success('สร้างผู้ใช้งานสำเร็จ');
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ code: '', username: '', password: '', fullName: '', role: 'SALE', status: 'ACTIVE' });
      const u = await usersApi.list(token);
      setUsers(u);
    } catch (err: any) {
      toast.error(`ดำเนินการล้มเหลว: ${err.message}`);
    }
  };

  const handleEditUser = (usr: any) => {
    setEditingUser(usr);
    setUserForm({
      code: usr.code || '',
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
      toast.error(err.message);
    }
  };

  const filteredApprovals = allTxns.filter((t: any) => {
    if (approvalFilterStatus !== 'ALL' && t.status !== approvalFilterStatus) return false;
    
    if (approvalStartDate && approvalEndDate && t.createdAt) {
      const tDateStr = t.createdAt.split('T')[0];
      if (tDateStr < approvalStartDate || tDateStr > approvalEndDate) return false;
    }

    if (approvalSearchText) {
      const s = approvalSearchText.toLowerCase();
      if (
        !(t.docNo?.toLowerCase().includes(s)) &&
        !(t.creatorName?.toLowerCase().includes(s)) &&
        !(t.storeName?.toLowerCase().includes(s))
      ) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-emerald-600 font-bold animate-pulse text-2xl">กำลังโหลดข้อมูลระบบ...</div>
      </div>
    );
  }

  // IF NOT LOGGED IN, RENDER LOGIN SCREEN
  if (!token) {
    return (
      <div className="min-h-screen w-full flex justify-center lg:justify-end relative bg-slate-50">
        {/* Full Image Background (Wider angle because it spans full width) */}
        <div 
          className="absolute inset-0 w-full h-full hidden lg:block"
          style={{ 
            backgroundImage: 'url(/Background.jpg)', 
            backgroundSize: 'cover', 
            backgroundPosition: 'center center'
          }}
        >
          {/* White overlay to make the image faded/lighter */}
          <div className="absolute inset-0 bg-white/60"></div>
        </div>

        {/* Right Side: Login Form Panel (Acts as a sidebar on Desktop) */}
        <div className="w-full lg:w-[45%] xl:w-[35%] max-w-2xl min-h-screen flex items-center justify-center p-8 sm:p-12 lg:p-16 bg-white relative z-10 lg:shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp"
              alt="Nutrition Profess Logo"
              className="h-28 mx-auto object-contain mb-6"
            />
            <h1 className="text-3xl font-bold tracking-wide text-slate-800">Wesell Consignment</h1>
            <p className="text-slate-500 text-[21px] mt-1 uppercase font-semibold tracking-wider">Nutrition Profess Co., Ltd.</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[21px] rounded-xl flex items-center gap-2">
              <span>⚠️ {loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-[21px] font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-[21px] font-normal"
                placeholder="กรอกชื่อผู้ใช้งาน"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[21px] font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-[21px] font-normal"
                placeholder="กรอกรหัสผ่าน"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-[21px] disabled:opacity-50"
            >
              {loggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN: MAIN APP LAYOUT
  return (
    <>
    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
    <div className="flex h-screen overflow-hidden bg-slate-50 print:hidden">
      {/* Sidebar - Clean Light Theme */}
      <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 text-slate-700 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
        <div>
          {/* Brand Header */}
          <div className="p-6 pb-8 border-b border-slate-100 flex flex-col gap-1">
            <img
              src="https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp"
              alt="Nutrition Profess"
              className="h-16 object-contain self-start"
            />
            <h2 className="text-slate-900 font-bold text-[21px] tracking-wide mt-2">Wesell Consignment</h2>
            <span className="text-[18px] text-emerald-600 font-bold uppercase tracking-wider">CONSIGN MANAGEMENT</span>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <span className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
              </span>
              <span className="text-[21px] tracking-wide">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                activeTab === 'approvals'
                  ? 'bg-emerald-50 text-emerald-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <span className={`w-5 h-5 ${activeTab === 'approvals' ? 'text-emerald-600' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>
              </span>
              <span className="text-[21px] tracking-wide">การอนุมัติ</span>
              {pendingTxns.length > 0 && (
                <span className="ml-auto bg-emerald-100 text-emerald-800 text-[18px] font-bold px-2 py-0.5 rounded-full">
                  {pendingTxns.length}
                </span>
              )}
            </button>

            {/* Inventory Checker */}
            <div>
              <button
                onClick={() => toggleAccordion('acc-inventory')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'inventory' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`w-5 h-5 ${activeTab === 'inventory' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
                  </span>
                  <span className="text-[21px] tracking-wide">ตรวจสอบคลังสินค้า</span>
                </div>
                <span className="text-[18px] text-slate-400">{inventoryAccordions['acc-inventory'] ? '▼' : '▶'}</span>
              </button>
              {inventoryAccordions['acc-inventory'] && (
                <div className="pl-9 pr-4 py-1 space-y-1">
                  <button
                    onClick={() => {
                      setInvSubTab('sale');
                      setActiveTab('inventory');
                      setSelectedInventoryOwner('');
                    }}
                    className={`w-full text-left py-1.5 px-2 rounded-lg text-[20px] transition-colors ${
                      activeTab === 'inventory' && invSubTab === 'sale' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
                    }`}
                  >
                    คลังสต็อกของเซลล์
                  </button>
                  <button
                    onClick={() => {
                      setInvSubTab('pharm');
                      setActiveTab('inventory');
                      setSelectedInventoryOwner('');
                    }}
                    className={`w-full text-left py-1.5 px-2 rounded-lg text-[20px] transition-colors ${
                      activeTab === 'inventory' && invSubTab === 'pharm' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === 'masters' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={`w-5 h-5 ${activeTab === 'masters' ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  </span>
                  <span className="text-[21px] tracking-wide">ตั้งค่า</span>
                </div>
                <span className="text-[18px] text-slate-400">{inventoryAccordions['acc-masters'] ? '▼' : '▶'}</span>
              </button>
              {inventoryAccordions['acc-masters'] && (
                <div className="pl-9 pr-4 py-1 space-y-1">
                  <button
                    onClick={() => {
                      setMasterSubTab('products');
                      setActiveTab('masters');
                    }}
                    className={`w-full text-left py-1.5 px-2 rounded-lg text-[20px] transition-colors ${
                      activeTab === 'masters' && masterSubTab === 'products' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
                    }`}
                  >
                    ข้อมูลสินค้า
                  </button>
                  <button
                    onClick={() => {
                      setMasterSubTab('stores');
                      setActiveTab('masters');
                    }}
                    className={`w-full text-left py-1.5 px-2 rounded-lg text-[20px] transition-colors ${
                      activeTab === 'masters' && masterSubTab === 'stores' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
                    }`}
                  >
                    ข้อมูลร้านค้า
                  </button>
                  <button
                    onClick={() => {
                      setMasterSubTab('users');
                      setActiveTab('masters');
                    }}
                    className={`w-full text-left py-1.5 px-2 rounded-lg text-[20px] transition-colors ${
                      activeTab === 'masters' && masterSubTab === 'users' ? 'text-emerald-700 font-bold bg-emerald-50/50' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
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
        <div className="p-4 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-4 shadow-sm border border-slate-100/50">
            <div className="flex flex-col gap-1 px-1">
              <span className="text-[20px] text-slate-400 font-medium">เข้าใช้งานโดย</span>
              <div className="font-bold text-[22px] text-slate-800">{user?.fullName || 'ผู้ดูแลระบบ'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl text-[22px] font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 h-[72px] shrink-0 flex items-center justify-between px-8 sticky top-0 z-50">
          <h2 className="font-bold text-slate-800 text-3xl">
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'approvals' && 'การอนุมัติเอกสารและตรวจสอบรายการ'}
            {activeTab === 'inventory' && (invSubTab === 'sale' ? 'คลังสต็อกของเซลล์' : 'คลังฝากขายร้านยา')}
            {activeTab === 'masters' && `ตั้งค่า > ${masterSubTab === 'products' ? 'ข้อมูลสินค้า' : masterSubTab === 'stores' ? 'ข้อมูลร้านค้า' : 'ข้อมูลผู้ใช้งาน'}`}
          </h2>
          {/* User requested removal of update status here */}
        </header>

        {/* Scrollable Screen Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* ==================== TAB 1: DASHBOARD ==================== */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-4">
              
              {/* Dashboard Filters Header */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-slate-800 text-[24px]">ภาพรวมระบบ (Overview)</h3>
                  <p className="text-[21px] text-slate-500 mt-1">สรุปข้อมูลสถิติการขายและสถานะต่างๆ</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[21px] text-slate-600">ตั้งแต่:</span>
                    <input 
                      type="date" 
                      value={dashStartDate}
                      onChange={(e) => setDashStartDate(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 w-32" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[21px] text-slate-600">ถึง:</span>
                    <input 
                      type="date" 
                      value={dashEndDate}
                      onChange={(e) => setDashEndDate(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 w-32" 
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[21px] text-slate-600">เซลล์:</span>
                    <select 
                      value={dashSaleUserId}
                      onChange={(e) => setDashSaleUserId(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 w-40"
                    >
                      <option value="ยอดรวมทั้งหมด">ยอดรวมทั้งหมด</option>
                      {users.filter(u => u.role === 'SALE').map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4 Solid Color Cards */}
              <div className="grid grid-cols-4 gap-4">
                {/* 1. Green */}
                <div className="bg-[#1a9f60] p-5 rounded-xl shadow-sm text-white flex justify-between items-center h-28 gap-3 overflow-hidden">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-[20px] font-semibold opacity-90 truncate">ยอดขายรวม</span>
                    <h3 className="text-[32px] font-bold truncate" title={`฿${(stats?.totalSalesValue || 0).toLocaleString()}`}>฿{(stats?.totalSalesValue || 0).toLocaleString()}</h3>
                  </div>
                  <div className="w-11 h-11 shrink-0 rounded-lg bg-white/20 flex items-center justify-center text-2xl">💰</div>
                </div>
                
                {/* 2. Blue */}
                <div className="bg-[#3b82f6] p-5 rounded-xl shadow-sm text-white flex justify-between items-center h-28 gap-3 overflow-hidden">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-[20px] font-semibold opacity-90 truncate">สินค้าที่ขายได้</span>
                    <h3 className="text-[32px] font-bold truncate" title={`${(stats?.totalSoldItems || 0).toLocaleString()} ชิ้น`}>{(stats?.totalSoldItems || 0).toLocaleString()} <span className="text-[21px] font-normal">ชิ้น</span></h3>
                  </div>
                  <div className="w-11 h-11 shrink-0 rounded-lg bg-white/20 flex items-center justify-center text-2xl">📦</div>
                </div>

                {/* 3. Purple */}
                <div className="bg-[#6366f1] p-5 rounded-xl shadow-sm text-white flex justify-between items-center h-28 gap-3 overflow-hidden">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-[20px] font-semibold opacity-90 truncate">จำนวนรายการขาย</span>
                    <h3 className="text-[32px] font-bold truncate" title={`${(stats?.approvedSalesCount || 0).toLocaleString()} บิล`}>{(stats?.approvedSalesCount || 0).toLocaleString()} <span className="text-[21px] font-normal">บิล</span></h3>
                  </div>
                  <div className="w-11 h-11 shrink-0 rounded-lg bg-white/20 flex items-center justify-center text-2xl">📄</div>
                </div>

                {/* 4. Orange */}
                <div className="bg-[#f59e0b] p-5 rounded-xl shadow-sm text-white flex justify-between items-center h-28 gap-3 overflow-hidden">
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-[20px] font-semibold opacity-90 truncate">สินค้ายอดนิยม</span>
                    <h3 className="text-[26px] font-bold truncate" title={stats?.topProduct || ''}>{stats?.topProduct || '-'}</h3>
                  </div>
                  <div className="w-11 h-11 shrink-0 rounded-lg bg-white/20 flex items-center justify-center text-2xl">⭐</div>
                </div>
              </div>

              {/* Recent Transactions Table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <h3 className="font-bold text-slate-800 text-[23px]">รายการขายล่าสุด (Approved Sales)</h3>
                  <button className="text-emerald-600 text-[21px] font-bold hover:text-emerald-700">ดูทั้งหมด ➞</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[19px] text-slate-500 font-semibold">
                        <th className="py-4 px-4 w-16 text-center">No.</th>
                        <th className="py-4 px-4 text-center whitespace-nowrap">Doc No.</th>
                        <th className="py-4 px-4 text-center">ประเภท</th>
                        <th className="py-4 px-4 text-center">เซลล์ผู้สร้างเอกสาร</th>
                        <th className="py-4 px-4 text-center">ปลายทาง (เซลล์/ร้านยา)</th>
                        <th className="py-4 px-4 text-center whitespace-nowrap">วันที่ทำรายการ</th>
                        <th className="py-4 px-4 text-center">สถานะ</th>
                        <th className="py-4 px-4 text-left whitespace-nowrap">แก้ไขล่าสุด (โดย)</th>
                        <th className="py-4 px-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTxns.filter((t: any) => t.docType === 'SALE').length > 0 ? (
                        recentTxns.filter((t: any) => t.docType === 'SALE').map((t: any, index: number) => (
                          <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-[20px] text-slate-700">
                            <td className="py-3 px-4 text-center text-slate-500">{index + 1}</td>
                            <td className="py-3 px-4 text-center font-medium text-slate-900 whitespace-nowrap">{t.docNo}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[18px] font-medium">{getDocTypeThai(t.docType, t.returnSubtype)}</span>
                            </td>
                            <td className="py-3 px-4 text-center">{t.creatorName}</td>
                            <td className="py-3 px-4 text-center">{t.storeName || '-'}</td>
                            <td className="py-3 px-4 text-center text-slate-500 whitespace-nowrap">{t.createdAt.substring(0, 10)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[18px] px-3 py-1 rounded-full font-bold shadow-sm ${
                                t.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                t.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>{t.status}</span>
                            </td>
                            <td className="py-3 px-4 text-left text-[18px]">
                              {t.approvedByFullName ? (
                                <div className="flex flex-col">
                                  <div className="text-[19px] font-semibold text-slate-700">{t.approvedByFullName}</div>
                                  <div className="text-[18px] text-slate-400 mt-0.5">{formatDate(t.approvedAt)}</div>
                                </div>
                              ) : <span className="text-[19px] text-slate-400">-</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleViewTxnDetails(t.docNo)}
                                className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                              >
                                รายละเอียด
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 text-[21px]">กำลังโหลด...</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: APPROVALS ==================== */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              {/* Approvals Action Bar & Table Container */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Action Bar */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <span className="text-[21px] text-slate-600">ตัวกรองสถานะ:</span>
                    <select 
                      className="border-2 border-emerald-500 rounded-md px-3 py-1.5 text-[21px] text-slate-700 bg-white w-56 focus:outline-none focus:ring-0"
                      value={approvalFilterStatus}
                      onChange={(e) => setApprovalFilterStatus(e.target.value)}
                    >
                      <option value="ALL">ทั้งหมด</option>
                      <option value="PENDING">เฉพาะรออนุมัติ (Pending)</option>
                      <option value="APPROVED">อนุมัติแล้ว (Approved)</option>
                      <option value="REJECTED">ยกเลิกแล้ว (Canceled)</option>
                    </select>

                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-[21px] text-slate-600">ตั้งแต่:</span>
                      <input 
                        type="date" 
                        value={approvalStartDate}
                        onChange={(e) => setApprovalStartDate(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 w-[140px]" 
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[21px] text-slate-600">ถึง:</span>
                      <input 
                        type="date" 
                        value={approvalEndDate}
                        onChange={(e) => setApprovalEndDate(e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 w-[140px]" 
                      />
                    </div>

                    {selectedApprovals.length > 0 && (
                      <button 
                        onClick={handleBulkApproveClick}
                        disabled={isApproving}
                        className="ml-2 flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 text-[20px]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        {isApproving ? 'กำลังอนุมัติ...' : `อนุมัติที่เลือก (${selectedApprovals.length})`}
                      </button>
                    )}
                  </div>
                  <div className="w-80">
                    <input 
                      type="text" 
                      placeholder="ค้นหา เลขที่เอกสาร, ชื่อเซลล์ หรือชื่อร้านค้า..." 
                      className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                      value={approvalSearchText}
                      onChange={(e) => setApprovalSearchText(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[20px] text-slate-500 font-semibold">
                        <th className="py-4 px-4 w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={selectedApprovals.length > 0 && selectedApprovals.length === allTxns.filter((t: any) => t.status === 'PENDING').length}
                            onChange={handleSelectAllApprovals}
                          />
                        </th>
                        <th className="py-4 px-4 w-16 text-center">No.</th>
                        <th className="py-4 px-4 text-center whitespace-nowrap">Doc No.</th>
                        <th className="py-4 px-4 text-center">ประเภท</th>
                        <th className="py-4 px-4 text-center">เซลล์ผู้สร้างเอกสาร</th>
                        <th className="py-4 px-4 text-center">ปลายทาง (เซลล์/ร้านยา)</th>
                        <th className="py-4 px-4 text-center whitespace-nowrap">วันที่ทำรายการ</th>
                        <th className="py-4 px-4 text-center">สถานะ</th>
                        <th className="py-4 px-4 text-left whitespace-nowrap">แก้ไขล่าสุด (โดย)</th>
                        <th className="py-4 px-4 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApprovals.length > 0 ? (
                        (() => {
                          const paginatedApprovals = filteredApprovals.slice((approvalPage - 1) * approvalPageSize, approvalPage * approvalPageSize);
                          return paginatedApprovals.map((t: any, index: number) => (
                          <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-[20px] text-slate-700">
                            <td className="py-3 px-4 text-center">
                              {t.status === 'PENDING' ? (
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-300 w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  checked={selectedApprovals.includes(t.docNo)}
                                  onChange={() => handleSelectApproval(t.docNo)}
                                />
                              ) : (
                                <input type="checkbox" checked={false} readOnly disabled className="rounded border-slate-200 w-4 h-4 opacity-30 cursor-not-allowed" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">{(approvalPage - 1) * approvalPageSize + index + 1}</td>
                            <td className="py-3 px-4 text-center font-medium text-slate-900 whitespace-nowrap">{t.docNo}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[18px] font-medium">{getDocTypeThai(t.docType, t.returnSubtype)}</span>
                            </td>
                            <td className="py-3 px-4 text-center">{t.creatorName}</td>
                            <td className="py-3 px-4 text-center">{t.docType === 'REQUEST' ? '-' : (t.storeName || '-')}</td>
                            <td className="py-3 px-4 text-center text-slate-500 whitespace-nowrap">{t.createdAt.substring(0, 10)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[18px] px-3 py-1 rounded-full font-bold shadow-sm ${
                                t.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                t.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>{t.status}</span>
                            </td>
                            <td className="py-3 px-4 text-left text-[18px]">
                              {t.approvedByFullName ? (
                                <div className="flex flex-col">
                                  <div className="text-[19px] font-semibold text-slate-700">{t.approvedByFullName}</div>
                                  <div className="text-[18px] text-slate-400 mt-0.5">{formatDate(t.approvedAt)}</div>
                                </div>
                              ) : <span className="text-[19px] text-slate-400">-</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleViewTxnDetails(t.docNo)}
                                className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                              >
                                รายละเอียด
                              </button>
                            </td>
                          </tr>
                        ))
                        })()
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 text-[21px]">ไม่พบรายการที่ตรงกับเงื่อนไข</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls 
                  currentPage={approvalPage} 
                  totalPages={Math.ceil(filteredApprovals.length / approvalPageSize) || 1} 
                  onPageChange={setApprovalPage} 
                  pageSize={approvalPageSize} 
                  onPageSizeChange={setApprovalPageSize} 
                  totalItems={filteredApprovals.length} 
                />
              </div>
            </div>
          )}

          {/* ==================== TAB 3: INVENTORY ==================== */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Action Bar */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <span className="text-[21px] text-slate-600">{invSubTab === 'sale' ? 'เลือกเซลล์:' : 'เลือกร้านค้า:'}</span>
                    <select 
                      className="border-2 border-emerald-500 rounded-md px-3 py-1.5 text-[21px] text-slate-700 bg-white w-64 focus:outline-none focus:ring-0"
                      value={selectedInventoryOwner}
                      onChange={(e) => setSelectedInventoryOwner(e.target.value)}
                    >
                      <option value="">พิมพ์ชื่อเพื่อค้นหา...</option>
                      {invSubTab === 'sale' ? (
                        users.filter((u: any) => u.role === 'SALE').map((u: any) => (
                          <option key={u.id} value={u.id}>{u.code} - {u.fullName}</option>
                        ))
                      ) : (
                        stores.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-64">
                      <input 
                        type="text" 
                        placeholder="ค้นหา รหัสสินค้า, ชื่อสินค้า..." 
                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <button className="px-4 py-1.5 border border-amber-500 text-amber-600 hover:bg-amber-50 rounded-md text-[21px] font-bold transition-all">
                      Export (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[20px] text-slate-500 font-semibold">
                        <th className="py-3 px-4 w-16 text-center">No.</th>
                        <th className="py-3 px-4 text-center">{invSubTab === 'sale' ? 'พนักงานขาย' : 'ร้านยา (Pharmacy)'}</th>
                        <th className="py-3 px-4 text-center">รหัสสินค้า (SKU)</th>
                        <th className="py-3 px-4 text-center">ชื่อสินค้า</th>
                        <th className="py-3 px-4 text-center">จำนวนคงเหลือ</th>
                        <th className="py-3 px-4 text-center">วันที่เริ่ม</th>
                        <th className="py-3 px-4 text-center">วันที่สิ้นสุด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedInventoryOwner ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 text-[21px]">
                            {invSubTab === 'sale' ? 'กรุณาเลือกพนักงานขายเพื่อดูสต็อก' : 'กรุณาเลือกร้านยาเพื่อดูสต็อกฝากขาย'}
                          </td>
                        </tr>
                      ) : inventoryList.filter((inv) => inv.locationType === (invSubTab === 'sale' ? 'SALE' : 'PHARMACY') && (invSubTab === 'sale' ? inv.saleUserId === selectedInventoryOwner : inv.storeId === selectedInventoryOwner) && inv.quantity > 0).length > 0 ? (
                        inventoryList
                          .filter((inv) => inv.locationType === (invSubTab === 'sale' ? 'SALE' : 'PHARMACY') && (invSubTab === 'sale' ? inv.saleUserId === selectedInventoryOwner : inv.storeId === selectedInventoryOwner) && inv.quantity > 0)
                          .map((inv: any, index: number) => {
                            const prd = products.find((p) => p.id === inv.productId);
                            let ownerName = '-';
                            if (invSubTab === 'sale') {
                              const usr = users.find((u) => u.id === inv.saleUserId);
                              ownerName = usr ? `${usr.fullName}` : '-';
                            } else {
                              const st = stores.find((s) => s.id === inv.storeId);
                              ownerName = st ? `${st.code} - ${st.name}` : '-';
                            }

                            return (
                              <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-[21px] text-slate-700">
                                <td className="py-3 px-4 text-center">{index + 1}</td>
                                <td className="py-3 px-4 text-center">{ownerName}</td>
                                <td className="py-3 px-4 text-center">{prd?.sku || '-'}</td>
                                <td className="py-3 px-4 text-center">{prd?.name || '-'}</td>
                                <td className="py-3 px-4 text-center font-bold">{inv.quantity}</td>
                                <td className="py-3 px-4 text-center text-slate-400">{formatDateOnly(prd?.startDate)}</td>
                                <td className="py-3 px-4 text-center text-slate-400">{formatDateOnly(prd?.endDate)}</td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 text-[21px]">
                            ไม่มีสินค้าในสต็อก
                          </td>
                        </tr>
                      )}
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
                    <h3 className="text-[21px] font-bold text-slate-700">ฐานข้อมูลรายการสินค้าคงคลัง</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadTemplate('products')} className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[20px] font-bold transition-all whitespace-nowrap">
                        ดาวน์โหลด Template
                      </button>

                      <button onClick={() => handleExportData('products')} className="px-3 py-1.5 border border-amber-500 text-amber-600 hover:bg-amber-50 rounded-lg text-[20px] font-bold transition-all whitespace-nowrap">
                        Export (.xlsx)
                      </button>
                      <button onClick={() => { setImportType('products'); fileInputRef.current?.click(); }} className="px-3 py-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg text-[20px] font-bold transition-all whitespace-nowrap">
                        Import (.xlsx)
                      </button>
                      <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({ sku: '', name: '', price: 0, startDate: '', endDate: '', status: 'ACTIVE' });
                        setShowProductModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-[21px] flex items-center gap-1.5"
                    >
                      <span>+ เพิ่มสินค้าใหม่</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[21px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                            <th className="p-3 w-16 text-center">No.</th>
                          <th className="p-3">รหัสสินค้า</th>
                          <th className="p-3">SKU</th>
                          <th className="p-3">ชื่อสินค้า</th>
                          <th className="p-3">ราคา</th>
                          <th className="p-3">วันที่เริ่มต้น</th>
                          <th className="p-3">วันที่สิ้นสุด</th>
                          <th className="p-3">สถานะ</th>
                          <th className="p-3">แก้ไขล่าสุด (โดย)</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const totalProductPages = Math.ceil(products.length / productPageSize);
                          const paginatedProducts = products.slice((productPage - 1) * productPageSize, productPage * productPageSize);
                          return paginatedProducts.length > 0 ? (
                            paginatedProducts.map((p: any, index: number) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center text-slate-500">{(productPage - 1) * productPageSize + index + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{p.code}</td>
                            <td className="p-3 text-slate-600 font-semibold">{p.sku}</td>
                            <td className="p-3 text-slate-600">{p.name}</td>
                            <td className="p-3 font-bold text-emerald-600">฿{Number(p.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-3 text-slate-500">{formatDateOnly(p.startDate)}</td>
                            <td className="p-3 text-slate-500">{formatDateOnly(p.endDate)}</td>
                            
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleProductStatus(p)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  p.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    p.status === 'ACTIVE' ? 'translate-x-4.5' : 'translate-x-1'
                                  }`}
                                  style={{ transform: p.status === 'ACTIVE' ? 'translateX(18px)' : 'translateX(4px)' }}
                                />
                              </button>
                            </td>
                            <td className="p-3 text-lg text-slate-500">
                              <div className="flex flex-col">
                                <div className="text-[19px] font-semibold text-slate-700">{p.updatedByFullName || '-'}</div>
                                <div className="text-[18px] text-slate-400 mt-0.5">{formatDate(p.updatedAt || new Date())}</div>
                              </div>
                            </td>
                            <td className="p-3 text-center flex items-center justify-center gap-2">

                              <button
                                onClick={() => handleEditProduct(p)}
                                className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[18px]"
                              >
                                แก้ไข
                              </button>
                              
                            </td>
                          </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="py-12 text-center text-slate-400 text-[21px]">ไม่พบรายการสินค้า</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  <PaginationControls 
                    currentPage={productPage} 
                    totalPages={Math.ceil(products.length / productPageSize) || 1} 
                    onPageChange={setProductPage} 
                    pageSize={productPageSize} 
                    onPageSizeChange={setProductPageSize} 
                    totalItems={products.length} 
                  />
                </div>
              )}

              {/* SUBTAB: STORES */}
              {masterSubTab === 'stores' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="w-80">
                      <input 
                        type="text" 
                        placeholder="ค้นหา ร้านค้า..." 
                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-[21px] text-slate-700 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownloadTemplate('stores')} className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-[21px] font-bold transition-all whitespace-nowrap">
                    ดาวน์โหลด Template
                  </button>

                      <button onClick={() => handleExportData('stores')} className="px-3 py-1.5 border border-amber-500 text-amber-600 hover:bg-amber-50 rounded-lg text-[20px] font-bold transition-all whitespace-nowrap">
                        Export (.xlsx)
                      </button>
                  <button onClick={() => { setImportType('stores'); fileInputRef.current?.click(); }} className="px-3 py-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 rounded-md text-[21px] font-bold transition-all whitespace-nowrap">
                    Import (.xlsx)
                  </button>
                      <button
                        onClick={() => {
                          setEditingStore(null);
                          setStoreForm({ name: '', location: '', province: '', storageLocation: '', phone: '', assignedUserId: '' });
                          setShowStoreModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[21px] font-bold transition-all flex items-center gap-1.5"
                      >
                        <span>+ เพิ่มร้านค้าใหม่</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[20px] text-slate-500 font-semibold">
                            <th className="p-3 w-16 text-center">No.</th>
                          <th className="p-3">รหัสร้านค้า</th>
                          <th className="p-3">ชื่อร้านค้า</th>
                          <th className="p-3">ที่อยู่</th>
                          <th className="p-3">จังหวัด</th>
                          <th className="p-3">ตำแหน่งเก็บ</th>
                          <th className="p-3">เบอร์โทรศัพท์</th>
                          <th className="p-3">เซลล์ผู้รับผิดชอบ</th>
                          <th className="p-3">สถานะ</th>
                          <th className="p-3">แก้ไขล่าสุด (โดย)</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const totalStorePages = Math.ceil(stores.length / storePageSize);
                          const paginatedStores = stores.slice((storePage - 1) * storePageSize, storePage * storePageSize);
                          return paginatedStores.length > 0 ? (
                            paginatedStores.map((s: any, index: number) => (
                          <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-[21px] text-slate-700">
                            <td className="p-3 text-center text-slate-500">{(storePage - 1) * storePageSize + index + 1}</td>
                            <td className="p-3">{s.code}</td>
                            <td className="p-3">{s.name}</td>
                            <td className="p-3">{s.location || '-'}</td>
                            <td className="p-3">{s.province || '-'}</td>
                            <td className="p-3">{s.storageLocation || '-'}</td>
                            <td className="p-3">{s.phone || '-'}</td>
                            <td className="p-3">{s.assignedUserFullName || <span className="text-amber-500 font-semibold">⚠️ ยังไม่มีผู้ดูแล</span>}</td>
                            
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleStoreStatus(s)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    s.status === 'ACTIVE' ? 'translate-x-4.5' : 'translate-x-1'
                                  }`}
                                  style={{ transform: s.status === 'ACTIVE' ? 'translateX(18px)' : 'translateX(4px)' }}
                                />
                              </button>
                            </td>
                            <td className="p-3 text-lg text-slate-500">
                              <div className="flex flex-col">
                                <div className="text-[19px] font-semibold text-slate-700">{s.updatedByFullName || '-'}</div>
                                <div className="text-[18px] text-slate-400 mt-0.5">{formatDate(s.updatedAt || new Date())}</div>
                              </div>
                            </td>

                            <td className="p-3">
                              <button
                                onClick={() => handleEditStore(s)}
                                className="text-emerald-600 hover:underline font-semibold"
                              >
                                แก้ไข / โอนย้าย
                              </button>
                            </td>
                          </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="py-12 text-center text-slate-400 text-[21px]">ไม่พบรายการร้านค้า</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  
                  <PaginationControls 
                    currentPage={storePage} 
                    totalPages={Math.ceil(stores.length / storePageSize) || 1} 
                    onPageChange={setStorePage} 
                    pageSize={storePageSize} 
                    onPageSizeChange={setStorePageSize} 
                    totalItems={stores.length} 
                  />
                </div>
              )}

              {/* SUBTAB: USERS */}
              {masterSubTab === 'users' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[21px] font-bold text-slate-700">ฐานข้อมูลพนักงานและผู้ใช้งานระบบ</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadTemplate('users')} className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[20px] font-bold transition-all whitespace-nowrap">
                        ดาวน์โหลด Template
                      </button>

                      <button onClick={() => handleExportData('users')} className="px-3 py-1.5 border border-amber-500 text-amber-600 hover:bg-amber-50 rounded-lg text-[20px] font-bold transition-all whitespace-nowrap">
                        Export (.xlsx)
                      </button>
                      <button onClick={() => { setImportType('users'); fileInputRef.current?.click(); }} className="px-3 py-1.5 border border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg text-[20px] font-bold transition-all whitespace-nowrap">
                        Import (.xlsx)
                      </button>
                      <button
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ code: '', username: '', password: '', fullName: '', role: 'SALE', status: 'ACTIVE' });
                        setShowUserModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all text-[21px] flex items-center gap-1.5"
                    >
                      <span>+ เพิ่มผู้ใช้งานใหม่</span>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[21px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                            <th className="p-3 w-16 text-center">No.</th>
                          <th className="p-3">รหัสพนักงาน</th>
                          <th className="p-3">ชื่อผู้ใช้ (Username)</th>
                          <th className="p-3">ชื่อ-นามสกุล</th>
                          <th className="p-3">ตำแหน่ง (Role)</th>
                          <th className="p-3">สถานะ</th>
                          <th className="p-3">แก้ไขล่าสุด (โดย)</th>
                          <th className="p-3 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const totalUserPages = Math.ceil(users.length / userPageSize);
                          const paginatedUsers = users.slice((userPage - 1) * userPageSize, userPage * userPageSize);
                          return paginatedUsers.map((u: any, index: number) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-center text-slate-500">{(userPage - 1) * userPageSize + index + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{u.code}</td>
                            <td className="p-3 text-slate-600 font-semibold">{u.username}</td>
                            <td className="p-3 text-slate-600">{u.fullName}</td>
                            <td className="p-3">
                              <span className={`text-[18px] px-2 py-0.5 rounded-full font-bold ${
                                u.role === 'SYSTEM_ADMIN' ? 'bg-purple-100 text-purple-700' :
                                u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>{u.role}</span>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                  u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    u.status === 'ACTIVE' ? 'translate-x-4.5' : 'translate-x-1'
                                  }`}
                                  style={{ transform: u.status === 'ACTIVE' ? 'translateX(18px)' : 'translateX(4px)' }}
                                />
                              </button>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <div className="text-[19px] font-semibold text-slate-700">{u.updatedByFullName || '-'}</div>
                                <div className="text-[18px] text-slate-400 mt-0.5">{formatDate(u.updatedAt || new Date())}</div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleEditUser(u)}
                                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[18px] font-semibold transition-colors"
                              >
                                แก้ไข
                              </button>
                            </td>
                          </tr>
                        ))
                        })()}
                      </tbody>
                    </table>
                  </div>

                  <PaginationControls 
                    currentPage={userPage} 
                    totalPages={Math.ceil(users.length / userPageSize) || 1} 
                    onPageChange={setUserPage} 
                    pageSize={userPageSize} 
                    onPageSizeChange={setUserPageSize} 
                    totalItems={users.length} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ==================== DETAIL/APPROVE MODAL ==================== */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xl">รายละเอียดเอกสาร {selectedTxn.docNo}</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPrintPreview(true)}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-[19px] flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  พิมพ์เอกสาร
                </button>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="w-8 h-8 rounded-full border border-slate-100 hover:bg-slate-50 flex items-center justify-center text-slate-400 text-[21px] font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-[21px]">
                <div>
                  <span className="text-slate-400">ประเภทรายการ:</span>
                  <div className="font-bold text-slate-800">{getDocTypeThai(selectedTxn.docType, selectedTxn.returnSubtype)}</div>
                </div>
                <div>
                  <span className="text-slate-400">ผู้ส่งข้อมูล:</span>
                  <div className="font-bold text-slate-800">{selectedTxn.creatorName}</div>
                </div>
                {selectedTxn.storeName && selectedTxn.storeName !== '-' && selectedTxn.docType !== 'REQUEST' && (
                  <div>
                    <span className="text-slate-400">ร้านขายยา:</span>
                    <div className="font-bold text-slate-800">{selectedTxn.storeName}</div>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">วันที่ส่งข้อมูล:</span>
                  <div className="font-bold text-slate-800">{formatDate(selectedTxn.createdAt)}</div>
                </div>
                {selectedTxn.storeLocation && selectedTxn.storeLocation !== '-' && selectedTxn.docType !== 'REQUEST' && (
                  <div>
                    <span className="text-slate-400">ที่อยู่:</span>
                    <div className="font-bold text-slate-800 whitespace-pre-wrap">{selectedTxn.storeLocation}</div>
                  </div>
                )}
                {selectedTxn.storeProvince && selectedTxn.storeProvince !== '-' && selectedTxn.docType !== 'REQUEST' && (
                  <div>
                    <span className="text-slate-400">จังหวัด:</span>
                    <div className="font-bold text-slate-800">{selectedTxn.storeProvince}</div>
                  </div>
                )}
                {selectedTxn.storeStorageLocation && selectedTxn.storeStorageLocation !== '-' && selectedTxn.docType !== 'REQUEST' && (
                  <div>
                    <span className="text-slate-400">ตำแหน่งเก็บ:</span>
                    <div className="font-bold text-slate-800">{selectedTxn.storeStorageLocation}</div>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">สถานะรายการ:</span>
                  <div>
                    <span className={`text-[18px] px-2.5 py-0.5 rounded-full font-bold ${
                      selectedTxn.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      selectedTxn.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      selectedTxn.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>{selectedTxn.status}</span>
                  </div>
                </div>
                {selectedTxn.approvedByFullName && (
                  <div>
                    <span className="text-slate-400">อัปเดตสถานะโดย:</span>
                    <div className="font-bold text-slate-800">
                      {selectedTxn.approvedByFullName} 
                      {selectedTxn.approvedAt ? <span className="text-[18px] text-slate-400 font-normal ml-2">({formatDate(selectedTxn.approvedAt)})</span> : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Lines Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-[21px] border-collapse">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                    <tr>
                      <th className="p-3 text-center w-16">ลำดับ</th>
                      <th className="p-3">รหัสสินค้า</th>
                      <th className="p-3">ชื่อสินค้า</th>
                      <th className="p-3 text-right">ราคา</th>
                      <th className="p-3 text-right">จำนวนที่ทำรายการ</th>
                      <th className="p-3 text-right">ราคารวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTxn.lines.map((l: any, idx: number) => (
                      <tr key={l.id}>
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-600">{l.productSku}</td>
                        <td className="p-3 text-slate-600">{l.productName}</td>
                        <td className="p-3 text-right text-slate-600">฿{Number(l.productPrice).toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-slate-800">{l.quantity} ชิ้น</td>
                        <td className="p-3 text-right font-black text-slate-800">฿{(l.quantity * Number(l.productPrice)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 border-t border-slate-100">
                      <td colSpan={5} className="p-3 text-right font-bold text-slate-700">ราคาสินค้าทั้งหมด</td>
                      <td className="p-3 text-right font-black text-emerald-600 text-[22px]">
                        ฿{(selectedTxn.lines.reduce((sum: number, line: any) => sum + (Number(line.quantity) * Number(line.productPrice || 0)), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Remark */}
              {selectedTxn.remark && selectedTxn.remark !== '-' && (
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <span className="text-[21px] text-slate-500 font-bold">หมายเหตุ/บันทึก:</span>
                  <div className="font-medium text-slate-800 text-[21px] mt-1 whitespace-pre-wrap">{selectedTxn.remark}</div>
                </div>
              )}

              {/* Evidence Picture */}
              {selectedTxn.evidenceKey && (
                <div className="space-y-2">
                  <span className="text-[21px] text-slate-400">รูปภาพสลิปหลักฐานแนบ:</span>
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
            {(() => {
              const errors = [];
              if (selectedTxn.status === 'PENDING' && selectedTxn.docType !== 'REQUEST') {
                for (const line of selectedTxn.lines || []) {
                  let availableStock = 0;
                  if (selectedTxn.docType === 'SALE' || (selectedTxn.docType === 'RETURN' && selectedTxn.returnSubtype === 'PHARMACY_TO_SALE')) {
                     availableStock = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'PHARMACY' && i.storeId === selectedTxn.storeId)?.quantity || 0;
                  } else {
                     availableStock = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'SALE' && i.saleUserId === selectedTxn.createdBy)?.quantity || 0;
                  }
                  if (line.quantity > availableStock) {
                    errors.push(`"${line.productName || line.productId}" (มี ${availableStock} ขาดอีก ${line.quantity - availableStock})`);
                  }
                }
              }
              const hasStockError = errors.length > 0;

              return (
                <div className="p-6 border-t border-slate-100 flex items-start justify-end gap-3 shrink-0 flex-wrap">
                  {hasStockError && (
                    <div className="text-red-500 mr-auto text-[19px] space-y-1">
                      <div className="font-bold">⚠️ ไม่สามารถอนุมัติได้เนื่องจากสต็อกไม่เพียงพอ:</div>
                      <ul className="list-disc pl-6 text-red-400 font-medium">
                        {errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedTxn(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all text-[21px]"
                  >
                    ปิดหน้าต่าง
                  </button>
                  {selectedTxn.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl font-bold transition-all text-[21px]"
                      >
                        ปฏิเสธเอกสาร
                      </button>
                      <button
                        onClick={() => !hasStockError && handleApproveTxnClick(selectedTxn.docNo)}
                        disabled={hasStockError}
                        className={`px-4 py-2 rounded-xl font-bold transition-all text-[21px] ${
                          hasStockError 
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25'
                        }`}
                      >
                        อนุมัติเอกสาร
                      </button>
                    </>
                  )}
                  {selectedTxn.status === 'APPROVED' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-lg shadow-rose-500/25 transition-all text-[21px]"
                    >
                      ยกเลิกเอกสาร (คืนสต็อก)
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-800 text-[21px]">ระบุเหตุผลการปฏิเสธเอกสาร</h3>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="กรุณาเขียนเหตุผล เช่น รูปหลักฐานไม่ถูกต้อง หรือ สต็อกสินค้าไม่ถูกต้อง..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[21px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg text-[21px]"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleRejectTxnSubmit}
                disabled={!rejectReason.trim()}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[21px] disabled:opacity-50"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT PREVIEW MODAL */}
      {showImportPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="w-full max-w-4xl max-h-[80vh] flex flex-col bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 text-[24px] mb-2">ยืนยันการนำเข้าข้อมูล</h3>
            <p className="text-[21px] text-slate-500 mb-4">
              คุณกำลังจะนำเข้าข้อมูลจำนวน <strong className="text-emerald-600">{importPreviewData.length}</strong> รายการ
              กรุณาตรวจสอบความถูกต้องของข้อมูล (แสดงตัวอย่างสูงสุด 5 รายการแรก)
            </p>
            
            <div className="flex-1 overflow-auto border border-slate-100 rounded-xl mb-4">
              <table className="w-full text-left text-[20px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {importPreviewData.length > 0 && Object.keys(importPreviewData[0]).map(key => (
                      <th key={key} className="p-3 font-semibold text-slate-600">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreviewData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {Object.entries(row).map(([key, val], colIdx) => {
                        let displayValue = String(val ?? '-');
                        if (key.toLowerCase().includes('date') && val) {
                          displayValue = formatDateOnly(val as string);
                        } else if (key === 'price' && val !== undefined) {
                          displayValue = Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                        return (
                          <td key={colIdx} className="p-3 text-slate-600 truncate max-w-[200px]">
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreviewData.length > 5 && (
                <div className="p-3 text-center text-slate-400 text-[19px] bg-slate-50/50">
                  ... และอีก {importPreviewData.length - 5} รายการ
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-auto pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowImportPreviewModal(false);
                  setImportPreviewData([]);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ยืนยันการนำเข้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-800 text-[21px]">ยืนยันการยกเลิกเอกสารที่อนุมัติแล้ว</h3>
            <p className="text-[21px] text-slate-400">ระบบจะทำการดึงยอดสต็อกหักลบกลับด้าน (Rollback) ให้อัตโนมัติ</p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="ระบุเหตุผลการยกเลิก เช่น ลูกค้าขอยกเลิกออเดอร์ (ระบุหรือไม่ระบุก็ได้)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[21px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg text-[21px]"
              >
                ปิด
              </button>
              <button
                onClick={handleCancelTxnSubmit}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[21px]"
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
            <h3 className="font-bold text-slate-800 text-[21px] mb-4">{editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
            <form onSubmit={handleProductSubmit} className="space-y-4 text-[21px]">
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
                  <label className="block text-slate-400 mb-1">วันที่เริ่มต้น (ถ้ามี)</label>
                  <input
                    type="date"
                    value={productForm.startDate}
                    onChange={(e) => setProductForm({ ...productForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">วันที่สิ้นสุด (ถ้ามี)</label>
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
            <h3 className="font-bold text-slate-800 text-[21px] mb-4">{editingStore ? 'แก้ไขร้านค้า' : 'เพิ่มร้านค้าใหม่'}</h3>
            <form onSubmit={handleStoreSubmit} className="space-y-4 text-[21px]">
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
                <label className="block text-slate-400 mb-1">ที่อยู่</label>
                <input
                  type="text"
                  value={storeForm.location}
                  onChange={(e) => setStoreForm({ ...storeForm, location: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น เลขที่ 123 ถนน A"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">จังหวัด</label>
                <input
                  type="text"
                  value={storeForm.province}
                  onChange={(e) => setStoreForm({ ...storeForm, province: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น กรุงเทพมหานคร"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ตำแหน่งเก็บ</label>
                <input
                  type="text"
                  value={storeForm.storageLocation}
                  onChange={(e) => setStoreForm({ ...storeForm, storageLocation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น ชั้น 2"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น 02-123-4567"
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
            <h3 className="font-bold text-slate-800 text-[21px] mb-4">{editingUser ? 'แก้ไขพนักงาน' : 'เพิ่มผู้ใช้งานระบบใหม่'}</h3>
            <form onSubmit={handleUserSubmit} className="space-y-4 text-[21px]">
              <div>
                <label className="block text-slate-400 mb-1">รหัสพนักงาน</label>
                <input
                  type="text"
                  required
                  value={userForm.code}
                  onChange={(e) => setUserForm({ ...userForm, code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                  placeholder="เช่น USR001"
                />
              </div>
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
                  autoComplete="new-password"
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
            <h3 className="font-bold text-slate-800 text-[21px] mb-4">โอนย้ายความรับผิดชอบร้านค้า</h3>
            <form onSubmit={handleTransferSubmit} className="space-y-4 text-[21px]">
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

      {/* Confirm Approve Modal */}
      {showApproveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">ยืนยันการอนุมัติเอกสาร</h3>
              <p className="text-slate-600">คุณต้องการอนุมัติเอกสารจำนวน <span className="font-bold text-emerald-600">{selectedApprovals.length}</span> รายการใช่หรือไม่?</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowApproveConfirmModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkApprove}
                disabled={isApproving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isApproving ? 'กำลังดำเนินการ...' : 'ยืนยันการอนุมัติ'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Single Confirm Approve Modal */}
      {singleApproveDocNo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">ยืนยันการอนุมัติเอกสาร</h3>
              <p className="text-slate-600">คุณต้องการอนุมัติเอกสาร <span className="font-bold text-emerald-600">{singleApproveDocNo}</span> ใช่หรือไม่?</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSingleApproveDocNo(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleApprove}
                disabled={isApproving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isApproving ? 'กำลังดำเนินการ...' : 'ยืนยันการอนุมัติ'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Printable Area / Preview */}
      {showPrintPreview && selectedTxn && (
        <div className="fixed inset-0 z-[100] bg-slate-300 flex flex-col overflow-y-auto print:bg-white print:overflow-visible print:h-auto print:static">
          {/* Toolbar */}
          <div className="sticky top-0 w-full bg-slate-800 text-white p-4 flex justify-between items-center z-10 shadow-lg print:hidden">
            <button onClick={() => setShowPrintPreview(false)} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold flex items-center gap-2 text-[20px] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              ปิดหน้าต่าง
            </button>
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-[19px] hidden sm:block">คุณสามารถเลือกสั่งพิมพ์ หรือดาวน์โหลดเป็น PDF ได้</span>
              
              <button onClick={() => handleDownloadPdf(selectedTxn.docNo)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold flex items-center gap-2 text-[20px] transition-colors shadow-md text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                ดาวน์โหลด PDF
              </button>
              
              <button onClick={() => window.print()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2 text-[20px] transition-colors shadow-md text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                สั่งพิมพ์
              </button>
            </div>
          </div>
          
          {/* A4 Document Preview */}
          <div className="flex-1 py-8 flex justify-center print:p-0">
            <div className="bg-white shadow-2xl print:shadow-none w-full max-w-[210mm] min-h-[297mm]">
               <PrintTxn 
                 txn={selectedTxn} 
                 store={stores.find((s: any) => s.id === selectedTxn.storeId || s.name === selectedTxn.storeName) || {}} 
               />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
const getDocTypeThai = (docType: string, returnSubtype?: string | null) => {
  if (docType === 'REQUEST') return 'เบิกของ';
  if (docType === 'CONSIGN') return 'ฝากขาย';
  if (docType === 'SALE') return 'ขายออก';
  if (docType === 'RETURN') {
    if (returnSubtype === 'PHARMACY_TO_SALE') return 'คืนของ (ร้านยา ➔ เซลล์)';
    if (returnSubtype === 'SALE_TO_COMPANY') return 'คืนของ (เซลล์ ➔ บริษัท)';
    return 'คืนของ';
  }
  return docType;
};


