import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Modal,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';

// --- Global Font Apply ---
import { DBHeaventBase64 } from './font-base64';

if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(`
    @font-face {
      font-family: 'DBHeavent';
      src: url(data:font/ttf;base64,${DBHeaventBase64}) format('truetype');
    }
  `));
  document.head.appendChild(style);
}

const applyFont = (origin: any) => {
  const flattened = StyleSheet.flatten(origin.props.style) || {};
  if (!flattened.fontFamily || flattened.fontFamily === 'System' || flattened.fontFamily === 'sans-serif') {
    return React.cloneElement(origin, {
      style: { fontFamily: 'DBHeavent', ...flattened }
    });
  }
  return origin;
};

const oldTextRender = (Text as any).render;
if (oldTextRender) {
  (Text as any).render = function (...args: any[]) {
    const origin = oldTextRender.call(this, ...args);
    return applyFont(origin);
  };
} else {
  if (!(Text as any).defaultProps) (Text as any).defaultProps = {};
  (Text as any).defaultProps.style = { fontFamily: 'DBHeavent' };
}

const oldTextInputRender = (TextInput as any).render;
if (oldTextInputRender) {
  (TextInput as any).render = function (...args: any[]) {
    const origin = oldTextInputRender.call(this, ...args);
    return applyFont(origin);
  };
} else {
  if (!(TextInput as any).defaultProps) (TextInput as any).defaultProps = {};
  (TextInput as any).defaultProps.style = { fontFamily: 'DBHeavent' };
}
// -------------------------

const API_URL = (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL) ? process.env.EXPO_PUBLIC_API_URL : 'http://localhost:3001';
const { width } = Dimensions.get('window');

// Ultra Premium Theme
const theme = {
  colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#d1fae5',
    secondary: '#0f172a',
    background: '#ffffff',
    card: '#ffffff',
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#2563eb',
  },
  shadows: {
    soft: {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    card: {
      shadowColor: '#94a3b8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    floating: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
      elevation: 10,
    }
  },
  radius: {
    md: 16,
    lg: 24,
    xl: 32,
    round: 9999,
  }
};

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 33, color: 'red', fontWeight: 'bold' }}>Something went wrong.</Text>
          <Text style={{ marginTop: 10 }}>{this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [fontsLoaded, fontError] = useFonts({
    DBHeavent: require('./assets/fonts/DBHeavent.ttf'),
  });

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'pharmacy' | 'txn' | 'history'>('home');
  const [loading, setLoading] = useState<boolean>(false);

  // Login inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [mobileStats, setMobileStats] = useState<any>({
    saleStockCount: 0, saleStockValue: 0, pharmStockCount: 0, pharmStockValue: 0,
  });

  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [showPharmacyPicker, setShowPharmacyPicker] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedHistoryTxn, setSelectedHistoryTxn] = useState<any>(null);

  // Txn Form
  const [docType, setDocType] = useState<'REQUEST' | 'CONSIGN' | 'SALE' | 'RETURN'>('REQUEST');
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [returnSubtype, setReturnSubtype] = useState<'PHARMACY_TO_SALE' | 'SALE_TO_COMPANY' | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [txnLines, setTxnLines] = useState<any[]>([]); 
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showTxnStorePicker, setShowTxnStorePicker] = useState(false);
  const [evidenceKey, setEvidenceKey] = useState<string | null>(null);
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (fontError) {
      console.error('Font failed to load:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  useEffect(() => {
    if (token && activeTab) {
      loadData(true);
    }
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const loadData = async (background = false) => {
    if (!token) return;
    if (!background) setLoading(true);
    try {
      const [statsRes, productsRes, storesRes, invRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/mobile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/stores`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/inventory`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMobileStats(await statsRes.json());
      const pData = await productsRes.json();
      setProducts(pData.filter((p: any) => p.status === 'ACTIVE'));
      const allStores = await storesRes.json();
      setStores(allStores.filter((s: any) => s.assignedUserId === (user?.id || user?.sub)));
      setInventoryList(await invRes.json());
      
      const historyData = await historyRes.json();
      setHistoryList(Array.isArray(historyData) ? historyData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []);
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        setToken(null);
        setUser(null);
        Alert.alert('เซสชันหมดอายุ', 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', `โหลดข้อมูลล้มเหลว: ${err.message}`);
      }
    } finally {
      if (!background) setLoading(false);
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
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพในเครื่องเพื่ออัปโหลดหลักฐาน');
        return;
      }
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
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', { uri, name: fileName, type } as any);
      }
      
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
      if (existing.quantity + quantity <= 0) {
        setTxnLines(txnLines.filter(l => l.productId !== productId));
      } else {
        setTxnLines(txnLines.map(l => l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l));
      }
    } else if (quantity > 0) {
      setTxnLines([...txnLines, { productId, quantity }]);
    }
  };

  const handleSubmitTxn = async () => {
    if (txnLines.length === 0) return Alert.alert('คำเตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
    const needsStore = ['CONSIGN', 'SALE'].includes(docType) || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE');
    if (needsStore && !selectedStoreId) return Alert.alert('คำเตือน', 'กรุณาเลือกร้านขายยา');
    if (docType === 'RETURN' && !returnSubtype) return Alert.alert('คำเตือน', 'กรุณาระบุประเภทการคืนสินค้า');
    if (docType === 'SALE' && !evidenceKey) return Alert.alert('คำเตือน', 'การขายของร้านยาจำเป็นต้องแนบภาพสลิปหลักฐานการเงิน');

    // Validate stock limits before allowing submission
    if (docType !== 'REQUEST') {
      for (const line of txnLines) {
        const prd = products.find((p: any) => p.id === line.productId);
        let availableStock = 0;
        let invItem: any;
        if (docType === 'SALE' || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE')) {
           invItem = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'PHARMACY' && i.storeId === selectedStoreId);
        } else {
           invItem = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'SALE');
        }
        availableStock = invItem ? (invItem.quantity - (invItem.reservedQuantity || 0)) : 0;
        
        if (line.quantity > availableStock) {
          return Alert.alert('คำเตือน', `ไม่สามารถทำรายการได้เนื่องจาก ${prd?.name || 'สินค้า'} มีจำนวนในสต็อกไม่เพียงพอ (มี ${availableStock} ชิ้น แต่ระบุ ${line.quantity} ชิ้น)`);
        }
      }
    }
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
      setShowTxnModal(false);
      loadData();
      setActiveTab('history');
    } catch (err: any) {
      Alert.alert('เกิดข้อผิดพลาด', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded && !fontError) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  // --- LOGIN SCREEN ---
  if (!token) {
    return (
      <ImageBackground 
        source={require('./assets/Background.jpg')} 
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.6)', justifyContent: 'center' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', padding: 24, maxWidth: 500, alignSelf: 'center', width: '100%' }}>
            
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 32, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}>
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <Image 
                  source={{ uri: 'https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp' }}
                  style={{ width: 200, height: 80, resizeMode: 'contain', marginBottom: 16 }}
                />
              </View>
              
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 4, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 }}>
                  <Feather name="user" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />
                  <TextInput
                    style={[{ flex: 1, paddingVertical: 14, fontFamily: 'DBHeavent', fontSize: 32, color: theme.colors.text }, Platform.OS === 'web' && { outlineStyle: 'none' }] as any}
                    placeholder="ชื่อผู้ใช้งาน"
                    placeholderTextColor="#94a3b8"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 4, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Feather name="lock" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />
                  <TextInput
                    style={[{ flex: 1, paddingVertical: 14, fontFamily: 'DBHeavent', fontSize: 32, color: theme.colors.text }, Platform.OS === 'web' && { outlineStyle: 'none' }] as any}
                    placeholder="รหัสผ่าน"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              <TouchableOpacity style={{ backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 100, alignItems: 'center', shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 }} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: 'DBHeavent', fontSize: 30, color: '#fff', fontWeight: 'bold' }}>เข้าสู่ระบบ</Text>}
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    );
  }

  // --- MAIN APP COMPONENT ---
  
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

  const renderStatusBadge = (status: string) => {
    let bg = '#f1f5f9', color = '#64748b', text = status;
    if (status === 'PENDING') { bg = '#fffbeb'; color = '#d97706'; text = 'รออนุมัติ'; }
    if (status === 'APPROVED') { bg = '#ecfdf5'; color = '#059669'; text = 'อนุมัติแล้ว'; }
    if (status === 'REJECTED') { bg = '#fef2f2'; color = '#dc2626'; text = 'ปฏิเสธ'; }
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{text}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ flex: 1, width: '100%', maxWidth: 768, alignSelf: 'center', position: 'relative' }}>
      <StatusBar style="dark" />

      {/* App Header */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <Image 
            source={{ uri: 'https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp' }}
            style={{ width: 110, height: 44, resizeMode: 'contain' }}
          />
          <View style={{ marginLeft: 10, borderLeftWidth: 1, borderLeftColor: theme.colors.border, paddingLeft: 10, flex: 1 }}>
            <Text style={[styles.headerGreeting, { color: theme.colors.text }]} numberOfLines={1}>{user?.fullName || 'เซลล์'}</Text>
            <Text style={[styles.headerRole, { color: theme.colors.textMuted }]} numberOfLines={1}>Sale Agent</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border }]}>
          <Text style={[styles.logoutText, { color: '#ef4444' }]}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.mainScroll} 
        contentContainerStyle={styles.mainScrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        
        {/* TAB 1: HOME (PERSONAL) */}
        {activeTab === 'home' && (
          <View style={styles.tabContent}>
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryDark }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.summaryTitleDark, { color: '#d1fae5' }]}>สต็อกในมือเซลล์</Text>
                  <Text style={[styles.summaryCountDark, { color: '#ffffff' }]}>{mobileStats.saleStockCount} <Text style={[styles.summaryUnitDark, { color: '#d1fae5' }]}>ชิ้น</Text></Text>
                </View>
                <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Feather name="box" size={24} color="#ffffff" /></View>
              </View>
              <Text style={[styles.summaryValueDark, { color: '#d1fae5' }]}>รวมมูลค่า <Text style={[styles.highlightText, { color: '#ffffff' }]}>฿{(Number(mobileStats?.saleStockValue) || 0).toLocaleString()}</Text></Text>
            </View>
            
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>สินค้าคงเหลือในคลังคุณ</Text>
            </View>
            
            {(() => {
              const activeInventory = inventoryList.filter(i => i.locationType === 'SALE' && i.quantity > 0);
              
              if (activeInventory.length === 0) {
                return (
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 32, alignItems: 'center', borderColor: '#e2e8f0', borderWidth: 1, borderStyle: 'dashed', marginTop: 8 }}>
                    <Feather name="inbox" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
                    <Text style={{ fontFamily: 'DBHeavent', fontSize: 28, color: '#64748b', textAlign: 'center' }}>ไม่มีสินค้าในคลัง</Text>
                    <Text style={{ fontFamily: 'DBHeavent', fontSize: 25, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>ขณะนี้คุณยังไม่มีสินค้าคงเหลือในคลัง หรือสินค้าทั้งหมดถูกกระจายไปยังร้านยาแล้ว</Text>
                  </View>
                );
              }

              return activeInventory.map(inv => {
                const prd = products.find(p => p.id === inv.productId);
                if (!prd) return null;
                const unitPrice = Number(prd.price || 0);
                const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
                return (
                  <View key={inv.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{prd.name}</Text>
                      <Text style={styles.itemSku}>SKU : {prd.sku}</Text>
                      <Text style={styles.itemPrice}>฿{(Number(unitPrice) || 0).toLocaleString()}</Text>
                      <Text style={{ fontFamily: 'DBHeavent', fontSize: 21, color: '#64748b', marginTop: 4 }}>
                        🗓 เริ่ม: {formatDate(prd.startDate)} - สิ้นสุด: {formatDate(prd.endDate)}
                      </Text>
                    </View>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.itemQty}>{inv.quantity} ชิ้น</Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        )}

        {/* TAB 2: PHARMACY STOCK */}
        {activeTab === 'pharmacy' && (() => {
          let currentPharmCount = 0;
          let currentPharmValue = 0;
          
          if (expandedStoreId) {
             const storeInv = inventoryList.filter(i => i.locationType === 'PHARMACY' && i.storeId === expandedStoreId && i.quantity > 0);
             currentPharmCount = storeInv.reduce((acc, row) => acc + (row.quantity ?? 0), 0);
             currentPharmValue = storeInv.reduce((acc, row) => {
               const prd = products.find(p => p.id === row.productId);
               return acc + (row.quantity ?? 0) * Number(prd?.price ?? 0);
             }, 0);
          }

          return (
          <View style={styles.tabContent}>
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.info, borderColor: '#1d4ed8' }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.summaryTitleDark, { color: '#eff6ff' }]}>สต็อกฝากขายร้านยา</Text>
                  <Text style={[styles.summaryCountDark, { color: '#ffffff' }]}>{currentPharmCount} <Text style={[styles.summaryUnitDark, { color: '#eff6ff' }]}>ชิ้น</Text></Text>
                </View>
                <View style={[styles.summaryIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Feather name="home" size={24} color="#ffffff" /></View>
              </View>
              <Text style={[styles.summaryValueDark, { color: '#eff6ff' }]}>รวมมูลค่า <Text style={[styles.highlightText, { color: '#ffffff' }]}>฿{(Number(currentPharmValue) || 0).toLocaleString()}</Text></Text>
            </View>

            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>สต็อกแยกร้านค้า</Text>
                <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowPharmacyPicker(true)}>
                  <Feather name="search" size={16} color="#fff" />
                  <Text style={styles.addItemBtnText}>เลือกร้านยา</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!expandedStoreId ? (
              <View style={styles.emptyPrdBox}>
                <Feather name="home" size={48} color={theme.colors.border} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyPrdText}>กรุณาเลือกร้านขายยาเพื่อดูสต็อก</Text>
              </View>
            ) : (
              stores.filter(s => s.id === expandedStoreId).map(store => {
                const storeInv = inventoryList.filter(i => i.locationType === 'PHARMACY' && i.storeId === store.id && i.quantity > 0);
                return (
                  <View key={store.id} style={styles.storeBlock}>
                    <View style={styles.storeHeader}>
                      <View style={styles.storeIcon}><Feather name="home" size={24} color="#3b82f6" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.storeName}>{store.name}</Text>
                        <Text style={styles.storeCode}>{store.phone || '-'}</Text>
                      </View>
                      <TouchableOpacity style={[styles.expandBtn, { backgroundColor: '#fee2e2' }]} onPress={() => setExpandedStoreId(null)}>
                        <Feather name="x" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.storeInvList}>
                      {storeInv.length > 0 ? storeInv.map(inv => {
                        const prd = products.find(p => p.id === inv.productId);
                        const unitPrice = Number(prd?.price || 0);
                        const totalValue = unitPrice * (inv.quantity ?? 0);
                        const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';
                        return (
                          <View key={inv.id} style={styles.storeInvRow}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={styles.storeInvName}>{prd?.name || inv.productId}</Text>
                              <Text style={{ fontFamily: 'DBHeavent', fontSize: 23, color: theme.colors.textMuted, marginTop: 2, fontWeight: 'bold' }}>
                                ฿{(Number(unitPrice) || 0).toLocaleString()} / ชิ้น
                              </Text>
                              <Text style={{ fontFamily: 'DBHeavent', fontSize: 21, color: '#64748b', marginTop: 2 }}>
                                🗓 เริ่ม: {formatDate(prd?.startDate)} - สิ้นสุด: {formatDate(prd?.endDate)}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                              <Text style={styles.storeInvQty}>{inv.quantity} ชิ้น</Text>
                              <Text style={{ fontFamily: 'DBHeavent', fontSize: 24, color: '#3b82f6', marginTop: 2, fontWeight: 'bold' }}>
                                ฿{(Number(totalValue) || 0).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        );
                      }) : <Text style={styles.emptyText}>ไม่มีสต็อกค้างในร้านนี้</Text>}
                    </View>
                  </View>
                );
              })
            )}

            {/* Pharmacy Picker Modal */}
            <Modal visible={showPharmacyPicker} animationType="fade" transparent={true} onRequestClose={() => setShowPharmacyPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: '#fff', borderRadius: theme.radius.xl, maxHeight: '80%', padding: 20 }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.formHeaderTitle}>เลือกร้านขายยา</Text>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPharmacyPicker(false)}>
                      <Feather name="x" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ paddingBottom: 12 }}>
                    <View style={styles.searchBox}>
                      <Feather name="search" size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput 
                        style={{ flex: 1, fontFamily: 'DBHeavent', fontSize: 25 }}
                        placeholder="ค้นหาชื่อร้าน..."
                        value={storeSearchQuery}
                        onChangeText={setStoreSearchQuery}
                      />
                      {storeSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setStoreSearchQuery('')}>
                          <Feather name="x-circle" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {stores
                      .filter(s => s.name.toLowerCase().includes(storeSearchQuery.toLowerCase()))
                      .map(store => {
                      return (
                        <TouchableOpacity 
                          key={store.id} 
                          style={styles.productPickerItem}
                          onPress={() => { setExpandedStoreId(store.id); setShowPharmacyPicker(false); setStoreSearchQuery(''); }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prdSelectName}>{store.name}</Text>
                            <Text style={styles.itemSku}>{store.phone || 'ไม่มีเบอร์โทรศัพท์'}</Text>
                          </View>
                          <Feather name="chevron-right" size={20} color={theme.colors.border} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
          );
        })()}

        {/* TAB 3: TRANSACTIONS (GRID STYLE) */}
        {activeTab === 'txn' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>เลือกทำรายการ</Text>
            </View>
            
            <View style={styles.gridContainer}>
              {[
                { type: 'REQUEST', label: 'เบิกของ', desc: 'เติมสต็อกเข้าตัวเอง', icon: 'box', color: '#10b981' },
                { type: 'CONSIGN', label: 'ฝากขาย', desc: 'นำไปวางที่ร้านยา', icon: 'home', color: '#3b82f6' },
                { type: 'SALE', label: 'ขายออก', desc: 'ตัดสต็อกเมื่อขายได้', icon: 'dollar-sign', color: '#f59e0b' },
                { type: 'RETURN', label: 'คืนของ', desc: 'คืนสินค้าเข้าบริษัท', icon: 'refresh-ccw', color: '#ef4444' },
              ].map(t => {
                return (
                  <TouchableOpacity 
                    key={t.type} 
                    style={styles.gridCard}
                    onPress={() => { setDocType(t.type as any); setTxnLines([]); setShowTxnModal(true); }}
                  >
                    <View style={[styles.gridIconBox, { backgroundColor: `${t.color}15` }]}>
                      <Feather name={t.icon as any} size={28} color={t.color} />
                    </View>
                    <Text style={[styles.gridTitle, { textAlign: 'center' }]}>{t.label}</Text>
                    <Text style={[styles.gridDesc, { textAlign: 'center' }]}>{t.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Modal visible={showTxnModal} animationType="slide" transparent={true} onRequestClose={() => setShowTxnModal(false)}>
              <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                  <View style={styles.formCard}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.formHeaderTitle}>รายละเอียดการ{docType === 'REQUEST' ? 'เบิก' : docType === 'CONSIGN' ? 'ฝากขาย' : docType === 'SALE' ? 'ขาย' : 'คืน'}</Text>
                      <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTxnModal(false)}>
                        <Feather name="x" size={24} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              
              {docType === 'RETURN' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>ประเภทการคืน</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
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
                  <Text style={styles.label}>เลือกร้านขายยาปลายทาง/ต้นทาง</Text>
                  <TouchableOpacity 
                    style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => setShowTxnStorePicker(true)}
                  >
                    <Text style={{ fontFamily: 'DBHeavent', fontSize: 26, color: selectedStoreId ? theme.colors.text : theme.colors.textMuted }}>
                      {selectedStoreId ? stores.find(s => s.id === selectedStoreId)?.name : 'กดเพื่อเลือกร้านขายยา...'}
                    </Text>
                    <Feather name="chevron-down" size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.label, { marginBottom: 0 }]}>เลือกสินค้า ({txnLines.length} รายการ)</Text>
                  <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowProductPicker(true)}>
                    <Feather name="plus" size={16} color="#fff" />
                    <Text style={styles.addItemBtnText}>เพิ่มสินค้า</Text>
                  </TouchableOpacity>
                </View>

                {txnLines.length === 0 ? (
                  <View style={styles.emptyPrdBox}>
                    <Text style={styles.emptyPrdText}>ยังไม่มีรายการสินค้า</Text>
                  </View>
                ) : (
                  txnLines.map((line, idx) => {
                    const prd = products.find(p => p.id === line.productId);
                    if (!prd) return null;
                    
                    let availableStock = 0;
                    let invItem: any;
                    if (docType === 'SALE' || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE')) {
                       invItem = inventoryList.find((i: any) => i.productId === prd.id && i.locationType === 'PHARMACY' && i.storeId === selectedStoreId);
                    } else {
                       invItem = inventoryList.find((i: any) => i.productId === prd.id && i.locationType === 'SALE');
                    }
                    availableStock = invItem ? (invItem.quantity - (invItem.reservedQuantity || 0)) : 0;

                    return (
                      <View key={idx} style={styles.prdSelectRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.prdSelectName}>{prd.name}</Text>
                          <Text style={styles.prdSelectStock}>
                            {docType === 'REQUEST' ? `เบิก: ${line.quantity} ชิ้น` : `พร้อมใช้: `}
                            {docType !== 'REQUEST' && (
                              <Text style={{fontWeight:'bold'}}>
                                {availableStock}
                                {invItem?.reservedQuantity > 0 && <Text style={{fontSize: 16, color: '#f97316', fontWeight: 'normal'}}> (ติดจอง {invItem.reservedQuantity})</Text>}
                              </Text>
                            )}
                          </Text>
                        </View>
                        <View style={styles.qtyControls}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => addTxnLine(prd.id, -1)}>
                            <Feather name="minus" size={16} color={theme.colors.text} />
                          </TouchableOpacity>
                          <TextInput 
                            style={styles.qtyText} 
                            keyboardType="numeric" 
                            selectTextOnFocus
                            value={line.quantity > 0 ? String(line.quantity) : ''}
                            onChangeText={(text) => {
                              const val = parseInt(text.replace(/[^0-9]/g, ''), 10);
                              setTxnLines(prev => prev.map(l => l.productId === prd.id ? { ...l, quantity: isNaN(val) ? 0 : val } : l));
                            }} 
                            onBlur={() => {
                              if (line.quantity === 0) {
                                setTxnLines(prev => prev.filter(l => l.productId !== prd.id));
                              }
                            }}
                          />
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => addTxnLine(prd.id, 1)}>
                            <Feather name="plus" size={16} color={theme.colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: '#fee2e2', marginLeft: 8 }]} onPress={() => setTxnLines(txnLines.filter(l => l.productId !== prd.id))}>
                            <Feather name="trash-2" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>หมายเหตุเพิ่มเติม (ถ้ามี)</Text>
                <TextInput
                  style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                  placeholder="เพิ่มรายละเอียด..."
                  value={remark}
                  onChangeText={setRemark}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>แนบสลิป/หลักฐาน {docType === 'SALE' && <Text style={{ color: theme.colors.danger }}>*ต้องแนบ</Text>}</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={handlePickImage} disabled={uploadingImage}>
                  <Text style={styles.uploadBtnText}>{uploadingImage ? 'กำลังอัปโหลด...' : (evidenceUri ? '📸 เปลี่ยนรูปภาพใหม่' : '📸 กดเพื่ออัปโหลดรูปภาพ')}</Text>
                </TouchableOpacity>
                {evidenceUri && (
                  <View style={styles.evidencePreview}>
                    <Image source={{ uri: evidenceUri }} style={styles.previewImg} />
                  </View>
                )}
              </View>
                    </ScrollView>

                    {(() => {
                      if (docType === 'REQUEST') return null;
                      const errors = [];
                      for (const line of txnLines) {
                        const prd = products.find((p: any) => p.id === line.productId);
                        let availableStock = 0;
        let invItem: any;
        if (docType === 'SALE' || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE')) {
           invItem = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'PHARMACY' && i.storeId === selectedStoreId);
        } else {
           invItem = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'SALE');
        }
        availableStock = invItem ? (invItem.quantity - (invItem.reservedQuantity || 0)) : 0;
                        if (line.quantity > availableStock) {
                          errors.push(`"${prd?.name || 'สินค้า'}" (มี ${availableStock} ขาด ${line.quantity - availableStock})`);
                        }
                      }
                      if (errors.length === 0) return null;
                      return (
                        <View style={{ marginTop: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: theme.radius.lg, borderWidth: 1, borderColor: '#fca5a5' }}>
                          <Text style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: 4 }}>⚠️ สต็อกไม่เพียงพอ ไม่สามารถทำรายการได้:</Text>
                          {errors.map((e, i) => (
                            <Text key={i} style={{ color: '#ef4444', marginLeft: 8 }}>• {e}</Text>
                          ))}
                        </View>
                      );
                    })()}

                    {(() => {
                      let hasStockError = false;
                      if (docType !== 'REQUEST') {
                        for (const line of txnLines) {
                          let availableStock = 0;
        let invItem: any;
        if (docType === 'SALE' || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE')) {
           invItem = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'PHARMACY' && i.storeId === selectedStoreId);
        } else {
           invItem = inventoryList.find((i: any) => i.productId === line.productId && i.locationType === 'SALE');
        }
        availableStock = invItem ? (invItem.quantity - (invItem.reservedQuantity || 0)) : 0;
                          if (line.quantity > availableStock) {
                            hasStockError = true; break;
                          }
                        }
                      }
                      return (
                        <TouchableOpacity 
                          style={[styles.submitBtn, hasStockError && { backgroundColor: '#cbd5e1' }]} 
                          onPress={handleSubmitTxn} 
                          disabled={loading || hasStockError}
                        >
                          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>ยืนยันการทำรายการ</Text>}
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </KeyboardAvoidingView>
              </View>
            </Modal>

            <Modal visible={showProductPicker} animationType="fade" transparent={true} onRequestClose={() => setShowProductPicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: '#fff', borderRadius: theme.radius.xl, maxHeight: '80%', padding: 20 }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.formHeaderTitle}>เลือกสินค้าที่ต้องการ</Text>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowProductPicker(false)}>
                      <Feather name="x" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ paddingBottom: 12 }}>
                    <View style={styles.searchBox}>
                      <Feather name="search" size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput 
                        style={{ flex: 1, fontFamily: 'DBHeavent', fontSize: 25 }}
                        placeholder="ค้นหาชื่อสินค้า หรือ SKU..."
                        value={productSearchQuery}
                        onChangeText={setProductSearchQuery}
                      />
                      {productSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setProductSearchQuery('')}>
                          <Feather name="x-circle" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {products
                      .filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()))
                      .map(prd => {
                      const isSelected = txnLines.some(l => l.productId === prd.id);
                      if (isSelected) return null; // Hide already selected
                      
                      let availableStock = 0;
                    let invItem: any;
                    if (docType === 'SALE' || (docType === 'RETURN' && returnSubtype === 'PHARMACY_TO_SALE')) {
                       invItem = inventoryList.find((i: any) => i.productId === prd.id && i.locationType === 'PHARMACY' && i.storeId === selectedStoreId);
                    } else {
                       invItem = inventoryList.find((i: any) => i.productId === prd.id && i.locationType === 'SALE');
                    }
                    availableStock = invItem ? (invItem.quantity - (invItem.reservedQuantity || 0)) : 0;

                      // Only hide products if they are out of stock and it's not a REQUEST transaction
                      if (docType !== 'REQUEST' && availableStock <= 0) return null;

                      return (
                        <TouchableOpacity 
                          key={prd.id} 
                          style={styles.productPickerItem}
                          onPress={() => { addTxnLine(prd.id, 1); setShowProductPicker(false); setProductSearchQuery(''); }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prdSelectName}>{prd.name}</Text>
                            <Text style={styles.itemSku}>SKU : {prd.sku}</Text>
                            <Text style={styles.itemSku}>ราคา : ฿{prd.price}</Text>
                          </View>
                          <View style={styles.stockBadge}>
                            <Text style={styles.stockBadgeText}>
                              พร้อมใช้: {availableStock}
                              {invItem?.reservedQuantity > 0 && ` (ติดจอง ${invItem.reservedQuantity})`}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Modal visible={showTxnStorePicker} animationType="fade" transparent={true} onRequestClose={() => setShowTxnStorePicker(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: '#fff', borderRadius: theme.radius.xl, maxHeight: '80%', padding: 20 }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.formHeaderTitle}>เลือกร้านขายยา</Text>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTxnStorePicker(false)}>
                      <Feather name="x" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ paddingBottom: 12 }}>
                    <View style={styles.searchBox}>
                      <Feather name="search" size={18} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput 
                        style={{ flex: 1, fontFamily: 'DBHeavent', fontSize: 25 }}
                        placeholder="ค้นหาชื่อร้าน..."
                        value={storeSearchQuery}
                        onChangeText={setStoreSearchQuery}
                      />
                      {storeSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setStoreSearchQuery('')}>
                          <Feather name="x-circle" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {stores
                      .filter(s => s.name.toLowerCase().includes(storeSearchQuery.toLowerCase()))
                      .map(store => {
                      return (
                        <TouchableOpacity 
                          key={store.id} 
                          style={styles.productPickerItem}
                          onPress={() => { 
                            if (selectedStoreId !== store.id) setTxnLines([]); 
                            setSelectedStoreId(store.id); 
                            setShowTxnStorePicker(false); 
                            setStoreSearchQuery(''); 
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prdSelectName}>{store.name}</Text>
                            <Text style={styles.itemSku}>{store.phone || 'ไม่มีเบอร์โทรศัพท์'}</Text>
                          </View>
                          <Feather name="chevron-right" size={20} color={theme.colors.border} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        )}

        {/* TAB 4: HISTORY (TIMELINE) */}
        {activeTab === 'history' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ประวัติย้อนหลัง</Text>
            </View>
            
            {historyList.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="clock" size={56} color={theme.colors.textMuted} style={{marginBottom: 16}} />
                <Text style={styles.emptyText}>ยังไม่มีประวัติการทำรายการ</Text>
              </View>
            ) : (
              <View style={styles.timelineContainer}>
                {historyList.map((txn, index) => (
                  <TouchableOpacity key={txn.id} style={styles.timelineItem} onPress={() => setSelectedHistoryTxn(txn)} activeOpacity={0.7}>
                    {/* Timeline Line */}
                    {index !== historyList.length - 1 && <View style={styles.timelineLine} />}
                    
                    {/* Timeline Dot */}
                    <View style={[
                      styles.timelineDot,
                      txn.docType === 'REQUEST' ? { backgroundColor: '#10b981' } :
                      txn.docType === 'CONSIGN' ? { backgroundColor: '#3b82f6' } :
                      txn.docType === 'SALE' ? { backgroundColor: '#f59e0b' } : { backgroundColor: '#ef4444' }
                    ]} />
                    
                    {/* Card */}
                    <View style={styles.timelineCard}>
                      <View style={styles.historyHeader}>
                        <View>
                          <Text style={styles.historyDocNo}>{txn.docNo}</Text>
                          <Text style={styles.historyDate}>{new Date(txn.createdAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        {renderStatusBadge(txn.status)}
                      </View>
                      
                      <View style={styles.historyBody}>
                        <View style={{flexDirection: 'row', gap: 8}}>
                          <Text style={styles.historyTag}>{getDocTypeThai(txn.docType, txn.returnSubtype)}</Text>
                          {txn.storeId && <Text style={[styles.historyTag, {backgroundColor: '#eff6ff', color: '#1d4ed8'}]}>{stores.find(s => s.id === txn.storeId)?.name || 'ร้านยา'}</Text>}
                        </View>
                        
                        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                           <Text style={{ fontFamily: 'DBHeavent', color: theme.colors.textMuted, fontSize: 24 }}>
                             ทั้งหมด {txn.lines?.length || 0} รายการ
                           </Text>
                           <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                             <Text style={{ fontFamily: 'DBHeavent', color: theme.colors.primaryDark, fontSize: 24, marginRight: 4 }}>
                               ดูรายละเอียด
                             </Text>
                             <Feather name="chevron-right" size={16} color={theme.colors.primaryDark} />
                           </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* History Details Modal */}
            <Modal visible={!!selectedHistoryTxn} animationType="fade" transparent={true} onRequestClose={() => setSelectedHistoryTxn(null)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: '#fff', borderRadius: theme.radius.xl, maxHeight: '85%', padding: 20 }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.formHeaderTitle}>รายละเอียดรายการ</Text>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedHistoryTxn(null)}>
                      <Feather name="x" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    {selectedHistoryTxn && (
                      <>
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontFamily: 'DBHeavent', fontSize: 30, color: theme.colors.text }}>{selectedHistoryTxn.docNo}</Text>
                          <Text style={{ fontFamily: 'DBHeavent', fontSize: 25, color: theme.colors.textMuted, marginTop: 4 }}>
                            {new Date(selectedHistoryTxn.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: selectedHistoryTxn.approvedByFullName ? 8 : 20 }}>
                          <Text style={styles.historyTag}>{getDocTypeThai(selectedHistoryTxn.docType, selectedHistoryTxn.returnSubtype)}</Text>
                          {selectedHistoryTxn.storeId && (
                            <Text style={[styles.historyTag, {backgroundColor: '#eff6ff', color: '#1d4ed8'}]}>
                              {stores.find(s => s.id === selectedHistoryTxn.storeId)?.name || 'ร้านยา'}
                            </Text>
                          )}
                          <View style={{ marginTop: 2 }}>{renderStatusBadge(selectedHistoryTxn.status)}</View>
                        </View>

                        {selectedHistoryTxn.approvedByFullName && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <Feather name={selectedHistoryTxn.status === 'REJECTED' ? "user-x" : "user-check"} size={16} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={{ fontFamily: 'DBHeavent', fontSize: 24, color: theme.colors.textMuted }}>
                              {selectedHistoryTxn.status === 'REJECTED' ? 'ปฏิเสธโดย: ' : 'อนุมัติโดย: '} 
                              <Text style={{ color: theme.colors.text }}>{selectedHistoryTxn.approvedByFullName}</Text>
                            </Text>
                          </View>
                        )}
                        
                        {selectedHistoryTxn.remark && (
                          <View style={{ marginBottom: 20 }}>
                            <Text style={{ fontFamily: 'DBHeavent', fontSize: 25, color: theme.colors.text, marginBottom: 6 }}>หมายเหตุ</Text>
                            <Text style={styles.historyRemark}>{selectedHistoryTxn.remark}</Text>
                          </View>
                        )}

                        <Text style={{ fontFamily: 'DBHeavent', fontSize: 28, color: theme.colors.text, marginBottom: 12 }}>รายการสินค้า</Text>
                        <View style={{ backgroundColor: theme.colors.background, borderRadius: theme.radius.lg, overflow: 'hidden' }}>
                          {(selectedHistoryTxn.lines || []).map((l: any, idx: number) => {
                            const prd = products.find(p => p.id === l.productId);
                            const unitPrice = Number(prd?.price || 0);
                            const total = unitPrice * (l.quantity || 0);
                            return (
                              <View key={idx} style={{ padding: 16, borderBottomWidth: idx < selectedHistoryTxn.lines.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                  <Text style={{ fontFamily: 'DBHeavent', fontSize: 26, color: theme.colors.text, fontWeight: 'bold' }}>{prd?.name || l.productId}</Text>
                                  {prd?.sku && <Text style={{ fontFamily: 'DBHeavent', fontSize: 22, color: theme.colors.textMuted }}>SKU : {prd.sku}</Text>}
                                  <Text style={{ fontFamily: 'DBHeavent', fontSize: 24, color: theme.colors.textMuted, marginTop: 4 }}>฿{(Number(unitPrice) || 0).toLocaleString()} / ชิ้น</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={{ fontFamily: 'DBHeavent', fontSize: 28, color: theme.colors.primaryDark }}>{l.quantity} ชิ้น</Text>
                                  <Text style={{ fontFamily: 'DBHeavent', fontSize: 25, color: theme.colors.textMuted, marginTop: 4 }}>฿{(Number(total) || 0).toLocaleString()}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                        {selectedHistoryTxn.evidenceKey && (
                          <View style={{ marginTop: 20 }}>
                            <Text style={{ fontFamily: 'DBHeavent', fontSize: 28, color: theme.colors.text, marginBottom: 12, fontWeight: 'bold' }}>รูปภาพหลักฐาน</Text>
                            <Image 
                              source={{ uri: selectedHistoryTxn.evidenceKey.startsWith('http') ? selectedHistoryTxn.evidenceKey : `${API_URL}/api/upload/file/${selectedHistoryTxn.evidenceKey}` }} 
                              style={{ width: '100%', height: 300, borderRadius: theme.radius.md, resizeMode: 'contain', backgroundColor: '#f1f5f9' }} 
                            />
                          </View>
                        )}
                        <View style={{ height: 40 }} />
                      </>
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        )}
        <View style={{ height: 150 }} /> 
      </ScrollView>

      {/* Floating Bottom Navigation */}
      <View style={styles.floatingNavContainer}>
        <View style={styles.floatingNav}>
          {[
            { key: 'home', label: 'คลัง', icon: 'box' },
            { key: 'pharmacy', label: 'ฝากขาย', icon: 'home' },
            { key: 'txn', label: 'ทำรายการ', icon: 'edit-3' },
            { key: 'history', label: 'ประวัติ', icon: 'clock' },
          ].map(nav => {
            const isActive = activeTab === nav.key;
            return (
              <TouchableOpacity key={nav.key} style={styles.navItem} onPress={() => setActiveTab(nav.key as any)}>
                <View style={[styles.navIconBg, isActive && styles.navIconBgActive]}>
                  <Feather name={nav.icon as any} size={20} color={isActive ? theme.colors.primaryDark : '#94a3b8'} />
                </View>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{nav.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      </View>
    </SafeAreaView>
  );
}

// ULTRA PREMIUM STYLES WITH KANIT
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginWrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  loginBgTop: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '45%',
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: 32,
    alignItems: 'center',
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 58,
  },
  loginTitle: {
    fontFamily: 'DBHeavent',
    fontSize: 43,
    color: theme.colors.text,
    marginBottom: 4,
    fontWeight: "bold",
    },
  loginSubtitle: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.textMuted,
    marginBottom: 32,
    fontWeight: "bold",
    },
  inputGroup: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.text,
    marginBottom: 8,
    fontWeight: "bold",
    },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputSleek: {
    flex: 1,
    paddingVertical: 16,
    fontFamily: 'DBHeavent',
    fontSize: 28,
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.text,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    width: '100%',
    padding: 18,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    marginTop: 16,
    ...theme.shadows.soft,
  },
  primaryBtnText: {
    fontFamily: 'DBHeavent',
    color: '#fff',
    fontSize: 30,
  },
  // Main App Styles
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    fontFamily: 'DBHeavent',
    fontSize: 35,
    color: '#fff',
  },
  headerGreeting: {
    fontFamily: 'DBHeavent',
    fontSize: 30,
    color: '#fff',
    fontWeight: "bold",
    },
  headerRole: {
    fontFamily: 'DBHeavent',
    fontSize: 24,
    color: theme.colors.primaryLight,
    fontWeight: "bold",
    },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.round,
    marginLeft: 8,
    paddingVertical: 8,
    borderRadius: theme.radius.round,
  },
  logoutText: {
    fontFamily: 'DBHeavent',
    fontSize: 23,
    color: '#fff',
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    padding: 24,
    paddingTop: 8,
  },
  tabContent: {
    flex: 1,
  },
  summaryCard: {
    borderRadius: theme.radius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryTitleDark: {
    fontFamily: 'DBHeavent',
    fontSize: 24,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: "bold",
    },
  summaryCountDark: {
    fontFamily: 'DBHeavent',
    fontSize: 43,
    color: theme.colors.text,
  },
  summaryUnitDark: {
    fontSize: 28,
    color: theme.colors.textMuted,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 33,
  },
  summaryValueDark: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.textMuted,
  },
  highlightText: {
    fontFamily: 'DBHeavent',
    color: theme.colors.primary,
    fontSize: 30,
  },
  sectionHeader: {
    marginBottom: 16,
    fontWeight: "bold",
    },
  sectionTitle: {
    fontFamily: 'DBHeavent',
    fontSize: 33,
    color: theme.colors.text,
    fontWeight: "bold",
    },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 20,
    borderRadius: theme.radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  itemInfo: {
    flex: 1,
  },
  itemSku: {
    fontFamily: 'DBHeavent',
    fontSize: 24,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: "bold",
    },
  itemName: {
    fontFamily: 'DBHeavent',
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: 6,
    fontWeight: "bold",
    },
  itemPrice: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.primary,
  },
  qtyBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
  },
  itemQty: {
    fontFamily: 'DBHeavent',
    fontSize: 33,
    color: theme.colors.primaryDark,
  },
  // Store Blocks
  storeBlock: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  storeIconText: {
    fontSize: 38,
  },
  storeName: {
    fontFamily: 'DBHeavent',
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: 2,
    fontWeight: "bold",
    },
  storeCode: {
    fontFamily: 'DBHeavent',
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  expandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  arrowIcon: {
    fontFamily: 'DBHeavent',
    fontSize: 23,
    color: theme.colors.textMuted,
  },
  arrowIconActive: {
    color: '#fff',
    transform: [{ rotate: '180deg' }]
  },
  storeInvList: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderBottomLeftRadius: theme.radius.lg,
    borderBottomRightRadius: theme.radius.lg,
  },
  storeInvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  storeInvName: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.text,
    fontWeight: "bold",
    },
  storeInvQty: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  emptyText: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.textMuted,
    textAlign: 'center',
    padding: 20,
  },
  // GRID Txn
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    gap: 16,
    marginBottom: 32,
    marginTop: 8,
  },
  gridCard: {
    width: '47%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  gridIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  gridTitle: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.text,
    marginBottom: 4,
    fontWeight: "bold",
    },
  gridDesc: {
    fontFamily: 'DBHeavent',
    fontSize: 21,
    color: theme.colors.textMuted,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
  },
  formHeaderTitle: {
    fontFamily: 'DBHeavent',
    fontSize: 30,
    color: theme.colors.primary,
    fontWeight: "bold",
    },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.text,
    marginBottom: 12,
    fontWeight: "bold",
    },
  subTypeBtn: {
    flex: 1,
    padding: 14,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subTypeBtnActive: {
    backgroundColor: theme.colors.primaryDark,
  },
  subTypeBtnText: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.textMuted,
  },
  subTypeBtnTextActive: {
    color: '#fff',
  },
  pillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.round,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  pillBtnText: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.textMuted,
  },
  pillBtnTextActive: {
    color: '#fff',
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    gap: 4,
  },
  addItemBtnText: {
    fontFamily: 'DBHeavent',
    fontSize: 24,
    color: '#fff',
  },
  emptyPrdBox: {
    backgroundColor: theme.colors.background,
    padding: 20,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyPrdText: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.textMuted,
  },
  productPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stockBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.round,
  },
  stockBadgeText: {
    fontFamily: 'DBHeavent',
    fontSize: 23,
    color: theme.colors.textMuted,
    fontWeight: "bold",
    },
  prdSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  prdSelectName: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.text,
    fontWeight: "bold",
    },
  prdSelectStock: {
    fontFamily: 'DBHeavent',
    fontSize: 23,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: "bold",
    },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.round,
    padding: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  qtyText: {
    fontFamily: 'DBHeavent',
    fontSize: 28,
    width: 50,
    padding: 0,
    textAlign: 'center',
    color: theme.colors.text,
  },
  uploadBtn: {
    padding: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.radius.xl,
    alignItems: 'center',
  },
  uploadBtnText: {
    fontFamily: 'DBHeavent',
    fontSize: 26,
    color: theme.colors.textMuted,
  },
  evidencePreview: {
    marginTop: 16,
    alignItems: 'center',
  },
  previewImg: {
    width: '100%',
    height: 250,
    borderRadius: theme.radius.xl,
    resizeMode: 'cover',
  },
  submitBtn: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    marginTop: 12,
    ...theme.shadows.soft,
  },
  submitBtnText: {
    fontFamily: 'DBHeavent',
    color: '#fff',
    fontSize: 30,
  },
  // Timeline History
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -24,
    width: 2,
    backgroundColor: theme.colors.border,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: theme.colors.background,
    marginRight: 16,
    zIndex: 10,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    fontWeight: "bold",
    },
  historyDocNo: {
    fontFamily: 'DBHeavent',
    fontSize: 28,
    color: theme.colors.text,
  },
  historyDate: {
    fontFamily: 'DBHeavent',
    fontSize: 24,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.round,
  },
  badgeText: {
    fontFamily: 'DBHeavent',
    fontSize: 23,
  },
  historyBody: {},
  historyTag: {
    fontFamily: 'DBHeavent',
    fontSize: 23,
    backgroundColor: theme.colors.background,
    color: theme.colors.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: "bold",
    },
  historyLines: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyLineName: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.text,
    fontWeight: "bold",
    },
  historyLineQty: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.primaryDark,
  },
  historyRemark: {
    fontFamily: 'DBHeavent',
    fontSize: 25,
    color: theme.colors.text,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: theme.radius.md,
    fontWeight: "normal",
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 78,
    marginBottom: 16,
  },
  // Floating Nav
  floatingNavContainer: {
    position: Platform.OS === 'web' ? 'fixed' as any : 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  floatingNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff', // Light bottom nav
    borderRadius: theme.radius.round,
    padding: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  navIconBg: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
  },
  navIconBgActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  navLabel: {
    fontFamily: 'DBHeavent',
    fontSize: 23,
    color: theme.colors.textMuted, // #64748b
    fontWeight: "bold",
    },
  navLabelActive: {
    color: theme.colors.primaryDark,
    fontFamily: 'DBHeavent',
    fontWeight: "bold",
    },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  }
});
