import React from 'react';

export default function MasterDataView(props: any) {
  const {
    masterSubTab, products, stores, users,
    setEditingProduct, setProductForm, setShowProductModal, handleEditProduct, handleToggleProductStatus,
    setEditingStore, setStoreForm, setShowStoreModal, handleEditStore, setTransferStoreId, setTransferTargetUserId, setShowTransferModal, handleDeleteStore,
    setEditingUser, setUserForm, setShowUserModal, handleEditUser, handleToggleUserStatus
  } = props;

  return (
    <div className="space-y-6">
      {/* SUBTAB: PRODUCTS */}
      {masterSubTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-700">ฐานข้อมูลรายการสินค้าคงคลัง</h3>
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({ sku: '', name: '', price: 0, startDate: '', endDate: '', status: 'ACTIVE' });
                setShowProductModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-transform transform active:scale-95 text-base flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <span>+ เพิ่มสินค้าใหม่</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                  <th className="p-3 w-16 text-center">No.</th>
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
                {products?.map((p: any, index: number) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-center text-slate-500">{index + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{p.code}</td>
                    <td className="p-3 text-slate-600 font-semibold">{p.sku}</td>
                    <td className="p-3 text-slate-600">{p.name}</td>
                    <td className="p-3 font-bold text-emerald-600">฿{Number(p.price).toLocaleString()}</td>
                    <td className="p-3 text-slate-500">{p.startDate || '-'}</td>
                    <td className="p-3 text-slate-500">{p.endDate || '-'}</td>
                    <td className="p-3">
                      <span className={`text-[15px] px-2 py-0.5 rounded-full font-bold ${
                        p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>{p.status}</span>
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-2">
                      <button onClick={() => handleEditProduct(p)} className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[16px] transition-colors">
                        แก้ไข
                      </button>
                      <button onClick={() => handleToggleProductStatus(p)} className={`px-2 py-1 rounded-lg text-[16px] transition-colors ${
                        p.status === 'ACTIVE' ? 'border border-rose-200 hover:bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-700">ฐานข้อมูลร้านขายยาเครือข่ายฝากขาย</h3>
            <button
              onClick={() => {
                setEditingStore(null);
                setStoreForm({ name: '', location: '', assignedUserId: '' });
                setShowStoreModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-transform transform active:scale-95 text-base flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <span>+ เพิ่มร้านค้าใหม่</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                  <th className="p-3 w-16 text-center">No.</th>
                  <th className="p-3">รหัสร้าน</th>
                  <th className="p-3">ชื่อร้านค้า</th>
                  <th className="p-3">ที่ตั้ง/แผนที่</th>
                  <th className="p-3">เซลล์ที่ดูแล</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stores?.map((s: any, index: number) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-center text-slate-500">{index + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{s.code}</td>
                    <td className="p-3 text-slate-600 font-semibold">{s.name}</td>
                    <td className="p-3 text-slate-500">{s.location || '-'}</td>
                    <td className="p-3 font-bold text-emerald-700">{s.assignedUserFullName || '⚠️ ยังไม่มีผู้ดูแล'}</td>
                    <td className="p-3 text-center flex items-center justify-center gap-2">
                      <button onClick={() => handleEditStore(s)} className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[16px] transition-colors">แก้ไข</button>
                      <button onClick={() => { setTransferStoreId(s.id); setTransferTargetUserId(s.assignedUserId || ''); setShowTransferModal(true); }} className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[16px] transition-colors">โอนย้ายเซลล์</button>
                      <button onClick={() => handleDeleteStore(s.id)} className="px-2 py-1 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-[16px] transition-colors">ลบ</button>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-700">ฐานข้อมูลพนักงานและผู้ใช้งานระบบ</h3>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserForm({ username: '', password: '', fullName: '', role: 'SALE', status: 'ACTIVE' });
                setShowUserModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-transform transform active:scale-95 text-base flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <span>+ เพิ่มผู้ใช้งานใหม่</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                  <th className="p-3 w-16 text-center">No.</th>
                  <th className="p-3">รหัสพนักงาน</th>
                  <th className="p-3">ชื่อผู้ใช้ (Username)</th>
                  <th className="p-3">ชื่อ-นามสกุล</th>
                  <th className="p-3">ตำแหน่ง (Role)</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users?.map((u: any, index: number) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-center text-slate-500">{index + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{u.code}</td>
                    <td className="p-3 text-slate-600 font-semibold">{u.username}</td>
                    <td className="p-3 text-slate-600">{u.fullName}</td>
                    <td className="p-3">
                      <span className={`text-[16px] px-2 py-0.5 rounded-full font-bold ${
                        u.role === 'SYSTEM_ADMIN' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{u.role}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[15px] px-2 py-0.5 rounded-full font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>{u.status}</span>
                    </td>
                    <td className="p-3 text-center flex items-center justify-center gap-2">
                      <button onClick={() => handleEditUser(u)} className="px-2 py-1 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[16px] transition-colors">แก้ไข</button>
                      <button onClick={() => handleToggleUserStatus(u)} className={`px-2 py-1 rounded-lg text-[16px] transition-colors ${
                        u.status === 'ACTIVE' ? 'border border-rose-200 hover:bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                      }`}>
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
  );
}
