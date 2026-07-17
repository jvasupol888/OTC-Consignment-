import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.21.139:3001';
const { width } = Dimensions.get('window');

// Premium Theme
const theme = {
  colors: {
    primary: '#10b981',
    primaryDark: '#059669',
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    medium: {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  }
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'pharmacy' | 'txn'>('personal');
  const [loading, setLoading] = useState<boolean>(false);

  // Login inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [mobileStats, setMobileStats] = useState<any>({
    saleStockCount: 0, saleStockValue: 0, pharmStockCount: 0, pharmStockValue: 0,
  });

  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  // Txn Form
  const [docType, setDocType] = useState<'REQUEST' | 'CONSIGN' | 'SALE' | 'RETURN'>('REQUEST');
  const [returnSubtype, setReturnSubtype] = useState<'PHARMACY_TO_SALE' | 'SALE_TO_COMPANY' | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [txnLines, setTxnLines] = useState<any[]>([]); 
  const [evidenceKey, setEvidenceKey] = useState<string | null>(null);
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, productsRes, storesRes, invRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/mobile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/stores`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMobileStats(await statsRes.json());
      const pData = await productsRes.json();
      setProducts(pData.filter((p: any) => p.status === 'ACTIVE'));
      setStores(await storesRes.json());
      setInventoryList(await invRes.json());
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        setToken(null);
        setUser(null);
        Alert.alert('เซสชันหมดอายุ', 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', `โหลดข้อมูลล้มเหลว: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('คำเตือน', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'รหัสผ่านหรือชื่อผู้ใช้ไม่ถูกต้อง');
      setToken(body.accessToken);
      setUser(body.user);
    } catch (err: any) {
      Alert.alert('เข้าสู่ระบบล้มเหลว', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null); setUser(null); setUsername(''); setPassword('');
    setTxnLines([]); setEvidenceKey(null); setEvidenceUri(null); setRemark('');
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพในเครื่องเพื่ออัปโหลดหลักฐาน');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setEvidenceUri(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploadingImage(true);
    try {
      const fileName = uri.split('/').pop() || 'upload.jpg';
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type } as any);
      
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'อัปโหลดภาพล้มเหลว');
      setEvidenceKey(body.evidenceKey);
      Alert.alert('สำเร็จ', 'อัปโหลดรูปภาพหลักฐานเรียบร้อยแล้ว');
    } catch (err: any) {
      Alert.alert('ข้อผิดพลาด', `อัปโหลดหลักฐานล้มเหลว: ${err.message}`);
      setEvidenceUri(null); setEvidenceKey(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const addTxnLine = (productId: string, quantity: number) => {
    if (!productId) return;
    const existing = txnLines.find(l => l.productId === productId);
    if (existing) {
      setTxnLines(txnLines.map(l => l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l));
    } else {
      setTxnLines([...txnLines, { productId, quantity }]);
    }
  };

  const removeTxnLine = (productId: string) => setTxnLines(txnLines.filter(l => l.productId !== productId));

  const handleSubmitTxn = async () => {
    if (txnLines.length === 0) return Alert.alert('คำเตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
    const needsStore = ['CONSIGN', 'SALE'].includes(docType) || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE');
    if (needsStore && !selectedStoreId) return Alert.alert('คำเตือน', 'กรุณาเลือกร้านขายยา');
    if (docType === 'RETURN' && !returnSubtype) return Alert.alert('คำเตือน', 'กรุณาระบุประเภทการคืนสินค้า');
    if (docType === 'SALE' && !evidenceKey) return Alert.alert('คำเตือน', 'การขายของร้านยาจำเป็นต้องแนบภาพสลิปหลักฐานการเงิน');

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ docType, returnSubtype, storeId: selectedStoreId || null, lines: txnLines, evidenceKey, remark }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'ส่งธุรกรรมล้มเหลว');
      Alert.alert('สำเร็จ', `ส่งรายการธุรกรรมสำเร็จ เลขที่: ${body.docNo}`);
      setTxnLines([]); setEvidenceKey(null); setEvidenceUri(null); setRemark(''); setSelectedStoreId('');
      loadData();
    } catch (err: any) {
      Alert.alert('เกิดข้อผิดพลาด', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // RENDER: LOGIN
  // ----------------------------------------------------
  if (!token) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginContainer}>
        <StatusBar style="dark" />
        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <Image source={{ uri: 'https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp' }} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>OTC Consignment</Text>
            <Text style={styles.companyName}>Sale Representative App</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อผู้ใช้งาน</Text>
            <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholder="เช่น USR001" placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} secureTextEntry autoCapitalize="none" />
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
              <Text style={styles.primaryBtnText}>เข้าสู่ระบบ</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ----------------------------------------------------
  // RENDER: MAIN APP
  // ----------------------------------------------------
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.substring(0, 2)}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{user?.fullName}</Text>
            <Text style={styles.profileRole}>รหัส: {user?.code}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>ออกระบบ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        {/* TAB 1: PERSONAL STOCK */}
        {activeTab === 'personal' && (
          <View style={styles.tabContent}>
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.summaryTitle}>สต็อกในมือ (Sale Stock)</Text>
              <Text style={styles.summaryCount}>{mobileStats.saleStockCount} ชิ้น</Text>
              <Text style={styles.summaryValue}>มูลค่ารวม ฿{mobileStats.saleStockValue.toLocaleString()}</Text>
              <View style={styles.cardGlow} />
            </View>
            <Text style={styles.sectionTitle}>รายการสินค้า</Text>
            {inventoryList.filter(inv => inv.locationType === 'SALE' && inv.saleUserId === user.sub).map(inv => {
              const prd = products.find(p => p.id === inv.productId);
              if (!prd) return null;
              return (
                <View key={inv.id} style={styles.itemRow}>
                  <View>
                    <Text style={styles.itemSku}>{prd.sku}</Text>
                    <Text style={styles.itemName}>{prd.name}</Text>
                    <Text style={styles.itemPrice}>฿{Number(prd.price).toLocaleString()}</Text>
                  </View>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.itemQty}>{inv.quantity}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: PHARMACY STOCK */}
        {activeTab === 'pharmacy' && (
          <View style={styles.tabContent}>
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.info }]}>
              <Text style={styles.summaryTitle}>สต็อกฝากขาย (Pharmacy Stock)</Text>
              <Text style={styles.summaryCount}>{mobileStats.pharmStockCount} ชิ้น</Text>
              <Text style={styles.summaryValue}>มูลค่ารวม ฿{mobileStats.pharmStockValue.toLocaleString()}</Text>
              <View style={styles.cardGlow} />
            </View>
            <Text style={styles.sectionTitle}>ร้านขายยาที่รับผิดชอบ</Text>
            {stores.map(store => {
              const isExpanded = expandedStoreId === store.id;
              const storeInv = inventoryList.filter(i => i.locationType === 'PHARMACY' && i.storeId === store.id);
              return (
                <View key={store.id} style={styles.storeBlock}>
                  <TouchableOpacity style={styles.storeHeader} onPress={() => setExpandedStoreId(isExpanded ? null : store.id)}>
                    <View style={styles.storeIcon}><Text style={styles.storeIconText}>🏪</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.storeCode}>{store.code}</Text>
                      <Text style={styles.storeName}>{store.name}</Text>
                    </View>
                    <Text style={styles.arrowIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.storeInvList}>
                      {storeInv.length > 0 ? storeInv.map(inv => {
                        const prd = products.find(p => p.id === inv.productId);
                        return (
                          <View key={inv.id} style={styles.storeInvRow}>
                            <Text style={styles.storeInvName}>{prd?.name || inv.productId}</Text>
                            <Text style={styles.storeInvQty}>{inv.quantity} ชิ้น</Text>
                          </View>
                        );
                      }) : <Text style={styles.emptyText}>ไม่มีสต็อกในร้านนี้</Text>}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 3: TRANSACTIONS */}
        {activeTab === 'txn' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>สร้างรายการใหม่</Text>
            
            {/* Doc Type Selection */}
            <View style={styles.typeGrid}>
              {[
                { type: 'REQUEST', label: 'เบิกของเข้าตัว', icon: '📦' },
                { type: 'CONSIGN', label: 'นำไปฝากขาย', icon: '🏪' },
                { type: 'SALE', label: 'ขายออกจริง', icon: '💰' },
                { type: 'RETURN', label: 'คืนสินค้า', icon: '🔄' },
              ].map(t => (
                <TouchableOpacity 
                  key={t.type} 
                  style={[styles.typeBtn, docType === t.type && styles.typeBtnActive]}
                  onPress={() => { setDocType(t.type as any); setTxnLines([]); }}
                >
                  <Text style={styles.typeBtnIcon}>{t.icon}</Text>
                  <Text style={[styles.typeBtnText, docType === t.type && styles.typeBtnTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Form Fields */}
            <View style={styles.formCard}>
              {docType === 'RETURN' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>ประเภทการคืน</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.subTypeBtn, returnSubtype === 'PHARMACY_TO_SALE' && styles.subTypeBtnActive]} onPress={() => setReturnSubtype('PHARMACY_TO_SALE')}>
                      <Text style={[styles.subTypeBtnText, returnSubtype === 'PHARMACY_TO_SALE' && styles.subTypeBtnTextActive]}>ร้านค้า ➜ เซลล์</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.subTypeBtn, returnSubtype === 'SALE_TO_COMPANY' && styles.subTypeBtnActive]} onPress={() => setReturnSubtype('SALE_TO_COMPANY')}>
                      <Text style={[styles.subTypeBtnText, returnSubtype === 'SALE_TO_COMPANY' && styles.subTypeBtnTextActive]}>เซลล์ ➜ บริษัท</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {(['CONSIGN', 'SALE'].includes(docType) || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE')) && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>เลือกร้านขายยาเป้าหมาย</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                    {stores.map(store => (
                      <TouchableOpacity key={store.id} style={[styles.storeChip, selectedStoreId === store.id && styles.storeChipActive]} onPress={() => setSelectedStoreId(store.id)}>
                        <Text style={[styles.storeChipText, selectedStoreId === store.id && styles.storeChipTextActive]}>{store.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>เลือกสินค้าที่ทำรายการ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                  {products.map(p => (
                    <TouchableOpacity key={p.id} style={styles.productCard} onPress={() => addTxnLine(p.id, 1)}>
                      <Text style={styles.productSku}>{p.sku}</Text>
                      <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                      <View style={styles.productAddBtn}><Text style={styles.productAddBtnText}>+ 1</Text></View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {txnLines.length > 0 && (
                <View style={styles.selectedList}>
                  <Text style={styles.label}>รายการที่เลือกแล้ว:</Text>
                  {txnLines.map((line, idx) => {
                    const p = products.find(prod => prod.id === line.productId);
                    return (
                      <View key={idx} style={styles.selectedRow}>
                        <Text style={styles.selectedName}>{p?.name}</Text>
                        <View style={styles.qtyControl}>
                          <TouchableOpacity onPress={() => addTxnLine(line.productId, -1)} disabled={line.quantity <= 1}><Text style={styles.qtyBtn}>-</Text></TouchableOpacity>
                          <Text style={styles.qtyText}>{line.quantity}</Text>
                          <TouchableOpacity onPress={() => addTxnLine(line.productId, 1)}><Text style={styles.qtyBtn}>+</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => removeTxnLine(line.productId)} style={{ marginLeft: 12 }}><Text style={styles.removeBtn}>✕</Text></TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {docType === 'SALE' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>อัปโหลดสลิปโอนเงิน (จำเป็น)</Text>
                  {!evidenceUri ? (
                    <TouchableOpacity style={styles.uploadBox} onPress={handlePickImage}>
                      <Text style={styles.uploadIcon}>📸</Text>
                      <Text style={styles.uploadText}>แตะเพื่อเลือกรูปสลิป</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.previewBox}>
                      <Image source={{ uri: evidenceUri }} style={styles.previewImage} />
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <TouchableOpacity style={styles.repickBtn} onPress={handlePickImage}>
                          <Text style={styles.repickBtnText}>เปลี่ยนรูป</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>หมายเหตุ (ทางเลือก)</Text>
                <TextInput style={styles.inputArea} value={remark} onChangeText={setRemark} placeholder="พิมพ์หมายเหตุถึงแอดมิน..." multiline numberOfLines={3} />
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={handleSubmitTxn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>ส่งรายการยืนยัน</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Tab Navigation */}
      <View style={styles.bottomNav}>
        {[
          { id: 'personal', label: 'สต็อกของฉัน', icon: '📦' },
          { id: 'pharmacy', label: 'สต็อกร้านยา', icon: '🏪' },
          { id: 'txn', label: 'ทำรายการ', icon: '📝' }
        ].map(tab => (
          <TouchableOpacity key={tab.id} style={styles.navItem} onPress={() => setActiveTab(tab.id as any)}>
            <Text style={[styles.navIcon, activeTab === tab.id && styles.navIconActive]}>{tab.icon}</Text>
            <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>{tab.label}</Text>
            {activeTab === tab.id && <View style={styles.navIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ----------------------------------------------------
// PREMIUM STYLESHEET
// ----------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loginContainer: { flex: 1, backgroundColor: '#e2e8f0', justifyContent: 'center', padding: 24 },
  loginCard: { backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: 32, ...theme.shadows.medium },
  loginHeader: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, marginBottom: 16, borderRadius: theme.radius.round },
  appName: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
  companyName: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  input: { backgroundColor: '#f1f5f9', borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border },
  inputArea: { backgroundColor: '#f1f5f9', borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, minHeight: 80 },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingVertical: 16, alignItems: 'center', ...theme.shadows.medium },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  header: { backgroundColor: theme.colors.card, paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: theme.radius.round, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  profileName: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  profileRole: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  logoutBtn: { padding: 8, backgroundColor: theme.colors.dangerLight, borderRadius: theme.radius.sm },
  logoutBtnText: { color: theme.colors.danger, fontWeight: '700', fontSize: 12 },

  content: { flex: 1, padding: 20 },
  tabContent: { gap: 20 },
  
  summaryCard: { borderRadius: theme.radius.xl, padding: 24, overflow: 'hidden', ...theme.shadows.medium },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  summaryCount: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 4 },
  summaryValue: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  cardGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginTop: 8 },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.card, padding: 16, borderRadius: theme.radius.lg, marginBottom: 12, ...theme.shadows.soft },
  itemSku: { fontSize: 11, color: theme.colors.primary, fontWeight: '800', marginBottom: 4 },
  itemName: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 2 },
  itemPrice: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' },
  qtyBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.radius.full },
  itemQty: { fontSize: 18, fontWeight: '900', color: theme.colors.text },

  storeBlock: { backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, marginBottom: 12, overflow: 'hidden', ...theme.shadows.soft },
  storeHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  storeIcon: { width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' },
  storeIconText: { fontSize: 18 },
  storeCode: { fontSize: 11, color: theme.colors.info, fontWeight: '800', marginBottom: 2 },
  storeName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  arrowIcon: { fontSize: 14, color: theme.colors.textMuted },
  storeInvList: { padding: 16, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: theme.colors.border },
  storeInvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  storeInvName: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  storeInvQty: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  emptyText: { textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 12, fontSize: 13 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeBtn: { width: (width - 52) / 2, backgroundColor: theme.colors.card, borderRadius: theme.radius.lg, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', ...theme.shadows.soft },
  typeBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.successLight },
  typeBtnIcon: { fontSize: 24, marginBottom: 8 },
  typeBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  typeBtnTextActive: { color: theme.colors.primaryDark },

  formCard: { backgroundColor: theme.colors.card, padding: 20, borderRadius: theme.radius.xl, ...theme.shadows.soft, marginTop: 8 },
  formGroup: { marginBottom: 20 },
  subTypeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: theme.radius.md, borderWidth: 1, borderColor: 'transparent' },
  subTypeBtnActive: { backgroundColor: theme.colors.successLight, borderColor: theme.colors.primary },
  subTypeBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  subTypeBtnTextActive: { color: theme.colors.primaryDark },
  
  storeChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: theme.radius.full, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  storeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryDark },
  storeChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  storeChipTextActive: { color: '#fff' },

  productCard: { width: 140, backgroundColor: '#f8fafc', borderRadius: theme.radius.lg, padding: 12, marginRight: 12, borderWidth: 1, borderColor: theme.colors.border },
  productSku: { fontSize: 10, color: theme.colors.primary, fontWeight: '800' },
  productName: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginVertical: 4 },
  productAddBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.radius.sm, paddingVertical: 6, alignItems: 'center', marginTop: 8 },
  productAddBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  selectedList: { backgroundColor: '#f8fafc', padding: 16, borderRadius: theme.radius.lg, gap: 12, marginBottom: 20 },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { fontSize: 18, fontWeight: '800', color: theme.colors.primary, paddingHorizontal: 8 },
  qtyText: { fontSize: 15, fontWeight: '800', color: theme.colors.text, minWidth: 20, textAlign: 'center' },
  removeBtn: { fontSize: 16, fontWeight: '800', color: theme.colors.danger },

  uploadBox: { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: theme.colors.primaryLight, borderStyle: 'dashed', borderRadius: theme.radius.lg, padding: 24, alignItems: 'center' },
  uploadIcon: { fontSize: 24, marginBottom: 8 },
  uploadText: { fontSize: 13, fontWeight: '700', color: theme.colors.primaryDark },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#f8fafc', padding: 12, borderRadius: theme.radius.lg },
  previewImage: { width: 64, height: 64, borderRadius: theme.radius.md },
  repickBtn: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.md },
  repickBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.text },

  bottomNav: { flexDirection: 'row', backgroundColor: theme.colors.card, paddingBottom: Platform.OS === 'ios' ? 24 : 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, ...theme.shadows.soft },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navIcon: { fontSize: 20, opacity: 0.5, marginBottom: 4 },
  navIconActive: { opacity: 1 },
  navLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
  navLabelActive: { color: theme.colors.primaryDark },
  navIndicator: { position: 'absolute', top: -12, width: 32, height: 4, backgroundColor: theme.colors.primary, borderRadius: 2 },
});
