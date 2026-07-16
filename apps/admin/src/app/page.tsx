export default function HomePage() {
  return (
    <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <h1>ระบบฝากขาย OTC — Admin Panel</h1>
      <p>โครง Next.js พร้อมแล้ว เชื่อมต่อ API ที่ <code>{process.env.NEXT_PUBLIC_API_URL}</code></p>
      <ul>
        <li>TODO: หน้า Login (ใช้ <code>authApi.login</code> ใน <code>src/lib/api.ts</code>)</li>
        <li>TODO: Dashboard (pending / สต็อกรวม / เซลล์)</li>
        <li>TODO: หน้าอนุมัติรายการ (approve / reject / cancel)</li>
        <li>TODO: Master Data (users / products / stores) + import xlsx</li>
      </ul>
    </main>
  );
}
