import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTC Sale App</Text>
      <Text>เชื่อมต่อ API: {API_URL}</Text>
      <Text style={styles.todo}>TODO: Login → สต็อกของฉัน → ทำรายการ (ถ่ายสลิป)</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  todo: { marginTop: 16, color: '#666', textAlign: 'center' },
});
